<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, MapTrifold, PencilSimple, Plus, ShieldAlert } from '../icons'
import ConfirmationModal from '../components/common/ConfirmationModal.vue'
import GoalsMap from '../components/platform/roadmap/GoalsMap.vue'
import LevelMap from '../components/platform/roadmap/LevelMap.vue'
import StopSheet from '../components/platform/roadmap/StopSheet.vue'
import GoalSheet from '../components/platform/roadmap/GoalSheet.vue'
import { deleteRoadmap, listRoadmaps, saveRoadmap } from '../api/roadmapService'
import { initAuth, useAuth } from '../composables/useAuth'
import { isPlatformAdmin } from '../api/platformService'
import { useToast } from '../composables/useToast'
import { addSide, canMove, groupStops, moveStop, progressOf, putStop, removeStop } from '../utils/roadmap'

// Ekkly's own roadmaps, a page of their own off the platform console: where
// Ekkly is heading. Each goal has a road of its own, the steps taken to it
// and the sidetracks along the way, and the goals join up: one comes after
// another, or several run side by side.
//
// Two levels, each the whole screen under a slim bar. /platform/roadmaps is
// every goal on one map (GoalsMap), joined by roads where one leads into the
// next; /platform/roadmaps/:id is one goal's road (LevelMap), changed from
// the map itself: tap a stop to change it, the dashed stop at the top of the
// road to add the next step, the goal to change the goal and what it comes
// after. A page rather than a console section, because the maps need the
// room, and so back and a shared link land on the same goal.
//
// Every change is shown at once and saved after (lib/platform/roadmaps.js),
// put back if the server refuses, so a step marked done moves the flag
// without waiting on the network.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { user } = useAuth()

const roadmaps = ref([])
const loading = ref(true)
const allowed = ref(true)
const saving = ref(false)

watch(
  () => user.value?.uid,
  async (uid) => {
    await initAuth()
    loading.value = true
    allowed.value = await isPlatformAdmin(uid)
    if (!allowed.value) {
      loading.value = false
      return
    }
    try {
      roadmaps.value = await listRoadmaps()
    } catch (error) {
      console.error('Error loading roadmaps:', error)
      toast.error(error.message || 'Could not load the roadmaps.')
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const selected = computed(() => roadmaps.value.find((r) => r.id === route.params.id) || null)

const HOME = '/platform/roadmaps'
const openGoal = (id) => router.push(`${HOME}/${id}`)
const showAll = () => router.push(HOME)

const progress = computed(() => progressOf(selected.value?.stops || []))
const reachedCount = computed(() => roadmaps.value.filter((r) => progressOf(r.stops).reached).length)

const replaceLocal = (roadmap) => {
  roadmaps.value = roadmaps.value.map((r) => (r.id === roadmap.id ? roadmap : r))
}

const persist = async (stops, fields = {}) => {
  const before = selected.value
  const next = { ...before, ...fields, stops }
  replaceLocal(next)
  saving.value = true
  try {
    replaceLocal(await saveRoadmap(next))
    return true
  } catch (error) {
    console.error('Error saving the roadmap:', error)
    replaceLocal(before)
    toast.error(error.message || 'Could not save that change. Please try again.')
    return false
  } finally {
    saving.value = false
  }
}

/* ------------------------------------------------------------------ goal */

const goalSheet = ref({ show: false, isNew: false })

const startGoal = () => (goalSheet.value = { show: true, isNew: true })
const editGoal = () => (goalSheet.value = { show: true, isNew: false })

// A goal may come after any other but the ones already after it, near or
// far, which would close a loop.
const goalChoices = computed(() => {
  const self = goalSheet.value.isNew ? null : selected.value
  if (!self) return roadmaps.value
  const later = new Set([self.id])
  let grew = true
  while (grew) {
    grew = false
    roadmaps.value.forEach((r) => {
      if (!later.has(r.id) && (r.after || []).some((id) => later.has(id))) {
        later.add(r.id)
        grew = true
      }
    })
  }
  return roadmaps.value.filter((r) => !later.has(r.id))
})

const saveGoal = async ({ title, why, after }) => {
  if (goalSheet.value.isNew) {
    saving.value = true
    try {
      const created = await saveRoadmap({ title, why, after, stops: [] })
      roadmaps.value = [created, ...roadmaps.value]
      openGoal(created.id)
      goalSheet.value.show = false
    } catch (error) {
      console.error('Error adding a goal:', error)
      toast.error(error.message || 'Could not add that goal. Please try again.')
    } finally {
      saving.value = false
    }
    return
  }
  goalSheet.value.show = false
  await persist(selected.value.stops, { title, why, after })
}

/* ----------------------------------------------------------------- stops */

const stopSheet = ref({ show: false, stopId: '', kind: 'step', parentId: '' })

const sheetStop = computed(() => selected.value?.stops.find((s) => s.id === stopSheet.value.stopId) || null)

// A step's number on the road, or for a sidetrack the number and name of the
// step it left.
const sheetPlace = computed(() => {
  const groups = groupStops(selected.value?.stops || [])
  const { stopId, parentId, kind } = stopSheet.value
  if (kind === 'side') {
    const at = groups.findIndex((g) => g.step.id === parentId || g.sides.some((s) => s.id === stopId))
    return { number: at + 1, parentTitle: groups[at]?.step.title || '' }
  }
  const at = groups.findIndex((g) => g.step.id === stopId)
  return { number: at >= 0 ? at + 1 : groups.length + 1, parentTitle: '' }
})

const sheetMoves = computed(() =>
  sheetStop.value ? canMove(selected.value.stops, sheetStop.value.id) : { earlier: false, later: false }
)

const openStop = (id) => {
  const stop = selected.value.stops.find((s) => s.id === id)
  if (stop) stopSheet.value = { show: true, stopId: id, kind: stop.kind, parentId: '' }
}
const addStep = () => (stopSheet.value = { show: true, stopId: '', kind: 'step', parentId: '' })
const startSide = (stepId) => (stopSheet.value = { show: true, stopId: '', kind: 'side', parentId: stepId })

const saveStop = (stop) => {
  const { parentId } = stopSheet.value
  const stops = parentId ? addSide(selected.value.stops, parentId, stop) : putStop(selected.value.stops, stop)
  stopSheet.value.show = false
  persist(stops)
}

const move = (id, by) => persist(moveStop(selected.value.stops, id, by))

/* ---------------------------------------------------------------- delete */

const confirm = ref({ show: false, title: '', message: '', run: null })

const askDeleteStop = (id) => {
  const groups = groupStops(selected.value.stops)
  const group = groups.find((g) => g.step.id === id)
  const stop = selected.value.stops.find((s) => s.id === id)
  confirm.value = {
    show: true,
    title: group ? 'Delete this step?' : 'Delete this sidetrack?',
    message:
      group && group.sides.length
        ? `“${stop.title}” and the ${group.sides.length === 1 ? 'sidetrack' : `${group.sides.length} sidetracks`} taken off it will be gone for good.`
        : `“${stop.title}” will be gone for good.`,
    run: () => {
      stopSheet.value.show = false
      persist(removeStop(selected.value.stops, id))
    },
  }
}

const askDeleteRoadmap = () => {
  const roadmap = selected.value
  confirm.value = {
    show: true,
    title: 'Delete this goal?',
    message: `“${roadmap.title}” and every stop on its road will be gone for good.`,
    run: async () => {
      goalSheet.value.show = false
      try {
        await deleteRoadmap(roadmap.id)
        // The goals that came after it now simply start on their own.
        roadmaps.value = roadmaps.value
          .filter((r) => r.id !== roadmap.id)
          .map((r) => ({ ...r, after: (r.after || []).filter((id) => id !== roadmap.id) }))
        router.replace(HOME)
        toast.success('Goal deleted')
      } catch (error) {
        console.error('Error deleting the goal:', error)
        toast.error(error.message || 'Could not delete that goal. Please try again.')
      }
    },
  }
}
</script>

<template>
  <div class="flex h-dvh flex-col bg-white dark:bg-gray-900">
    <!-- A slim bar: the way back, where you are, and the one thing to do. -->
    <header
      class="flex shrink-0 items-center gap-2 border-b border-gray-100 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 dark:border-gray-800"
    >
      <button
        type="button"
        @click="selected ? showAll() : router.push('/platform')"
        :aria-label="selected ? 'All goals' : 'Back to the console'"
        class="flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <ArrowLeft class="size-5" />
      </button>

      <div class="min-w-0 flex-1">
        <h1 class="truncate text-base font-bold text-gray-900 dark:text-white">
          {{ selected ? selected.title : 'Roadmaps' }}
        </h1>
        <p v-if="!loading && allowed" class="truncate text-xs text-gray-500 dark:text-gray-400">
          <template v-if="selected">{{ progress.done }} of {{ progress.steps }} steps</template>
          <template v-else-if="roadmaps.length">
            {{ roadmaps.length }} {{ roadmaps.length === 1 ? 'goal' : 'goals' }}<template v-if="reachedCount"> · {{ reachedCount }} reached</template>
          </template>
        </p>
      </div>

      <button
        v-if="selected"
        type="button"
        @click="editGoal"
        aria-label="Change this goal"
        class="flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <PencilSimple class="size-5" />
      </button>
      <button
        v-else-if="allowed && roadmaps.length"
        type="button"
        @click="startGoal"
        class="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        <Plus class="size-4" />
        New goal
      </button>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center" aria-busy="true">
      <Loader2 class="size-6 animate-spin text-gray-300" />
    </div>

    <div v-else-if="!allowed" class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <ShieldAlert class="size-10 text-gray-300 dark:text-gray-600" />
      <p class="mt-3 text-lg text-gray-700 dark:text-gray-200">Platform administrators only</p>
    </div>

    <!-- Nothing yet, and the way to begin. -->
    <div v-else-if="!roadmaps.length" class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span class="flex size-20 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-light/15">
        <MapTrifold class="size-10 text-primary dark:text-primary-light" />
      </span>
      <p class="mt-4 text-xl font-black text-gray-900 dark:text-white">No goals yet</p>
      <p class="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
        Name where Ekkly is heading, then add the steps as they are taken.
      </p>
      <button
        type="button"
        @click="startGoal"
        class="mt-5 flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        <Plus class="size-4" />
        Add a goal
      </button>
    </div>

    <!-- Into a goal and back out: one map fades into the other, together
         rather than one after the other, and nothing slides. -->
    <div v-else class="relative flex min-h-0 flex-1 flex-col">
      <Transition name="fade">
        <LevelMap
          v-if="selected"
          :key="selected.id"
          :roadmap="selected"
          @open-stop="openStop"
          @add-step="addStep"
          @open-goal="editGoal"
        />
        <GoalsMap v-else :roadmaps="roadmaps" @open="openGoal" />
      </Transition>
    </div>

    <StopSheet
      :show="stopSheet.show"
      :stop="sheetStop"
      :kind="stopSheet.kind"
      :number="sheetPlace.number"
      :parent-title="sheetPlace.parentTitle"
      :moves="sheetMoves"
      :saving="saving"
      @close="stopSheet.show = false"
      @save="saveStop"
      @delete="askDeleteStop"
      @move="move"
      @add-side="startSide"
    />

    <GoalSheet
      :show="goalSheet.show"
      :roadmap="goalSheet.isNew ? null : selected"
      :others="goalChoices"
      :saving="saving"
      @close="goalSheet.show = false"
      @save="saveGoal"
      @delete="askDeleteRoadmap"
    />

    <ConfirmationModal
      v-model:show="confirm.show"
      :title="confirm.title"
      :message="confirm.message"
      confirm-text="Delete"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @confirm="confirm.run?.()"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
/* The one leaving stays where it was, under the one arriving. */
.fade-leave-active {
  position: absolute;
  inset: 0;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>

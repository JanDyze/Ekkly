<script setup>
import { computed, onActivated, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MapTrifold, PencilSimple, Plus } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import SelectMenu from '../common/SelectMenu.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import GoalsMap from './roadmap/GoalsMap.vue'
import LevelMap from './roadmap/LevelMap.vue'
import StopSheet from './roadmap/StopSheet.vue'
import GoalSheet from './roadmap/GoalSheet.vue'
import { deleteRoadmap, listRoadmaps, saveRoadmap } from '../../api/roadmapService'
import { useToast } from '../../composables/useToast'
import { addSide, canMove, groupStops, moveStop, progressOf, putStop, removeStop } from '../../utils/roadmap'

// Ekkly's own roadmaps, in the console: where Ekkly is heading. Each goal has
// a road of its own, the steps taken to it and the sidetracks along the way,
// and the goals join up: one comes after another, or several run side by
// side.
//
// So the section has two levels. All goals (GoalsMap) is every goal on one
// map, joined by roads where one leads into the next; opening a goal shows
// its road (LevelMap), changed from the map itself: tap a stop to change it,
// the dashed stop at the top of the road to add the next step, the goal to
// change the goal and what it comes after.
//
// Every change is shown at once and saved after (lib/platform/roadmaps.js),
// put back if the server refuses, so a step marked done moves the flag
// without waiting on the network.

const route = useRoute()
const router = useRouter()
const toast = useToast()

const roadmaps = ref([])
const loading = ref(true)
const saving = ref(false)

const load = async () => {
  try {
    roadmaps.value = await listRoadmaps()
  } catch (error) {
    console.error('Error loading roadmaps:', error)
    toast.error(error.message || 'Could not load the roadmaps.')
  } finally {
    loading.value = false
  }
}
onActivated(load)

// The open goal lives in the URL, beside the console's own ?section=; with
// none, the map of every goal is open.
const selected = computed(() => roadmaps.value.find((r) => r.id === route.query.roadmap) || null)

// Opening a goal pushes, so back returns to the map of them all; choosing
// another from the menu replaces.
const openGoal = (id) => router.push({ query: { ...route.query, roadmap: id } })
const choose = (id) => {
  const { roadmap: _drop, ...rest } = route.query
  router.replace({ query: id ? { ...rest, roadmap: id } : rest })
}
const showAll = () => {
  const { roadmap: _drop, ...rest } = route.query
  router.push({ query: rest })
}

const options = computed(() => [
  { value: '', label: 'All goals' },
  ...roadmaps.value.map((r) => ({ value: r.id, label: r.title })),
])
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
        choose('')
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
  <div class="flex min-h-0 flex-1 flex-col">
    <SectionCard
      class="flex min-h-0 flex-1 flex-col"
      :icon="MapTrifold"
      title="Roadmaps"
      subtitle="Where Ekkly is heading: every goal, the steps taken to each and the sidetracks along the way"
    >
      <template #actions>
        <button
          v-if="roadmaps.length"
          type="button"
          @click="startGoal"
          class="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          <span class="hidden sm:inline">New goal</span>
        </button>
      </template>

      <div v-if="loading" class="min-h-0 flex-1 animate-pulse bg-gray-100 dark:bg-gray-700/40" aria-busy="true"></div>

      <!-- Nothing yet, and the way to begin. -->
      <div v-else-if="!roadmaps.length" class="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-14 text-center dark:bg-gray-900">
        <span class="flex size-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-light/15">
          <MapTrifold class="size-8 text-primary dark:text-primary-light" />
        </span>
        <p class="mt-4 text-lg font-bold text-gray-900 dark:text-white">No goals yet</p>
        <p class="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          Name where Ekkly is heading, then add the steps as they are taken, and the sidetracks too.
        </p>
        <button
          type="button"
          @click="startGoal"
          class="mt-5 flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          Add a goal
        </button>
      </div>

      <template v-else>
        <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <button
            v-if="selected"
            type="button"
            @click="showAll"
            class="-ml-1 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowLeft class="size-4" />
            All goals
          </button>
          <SelectMenu
            :model-value="selected?.id || ''"
            :options="options"
            aria-label="Goal"
            field-class="h-9 min-w-48 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            @update:model-value="choose"
          />
          <p class="min-w-0 flex-1 text-sm text-gray-600 dark:text-gray-300">
            <template v-if="selected">
              <span class="font-semibold text-gray-900 dark:text-white">{{ progress.done }} of {{ progress.steps }}</span>
              {{ progress.steps === 1 ? 'step' : 'steps' }} done<template v-if="progress.sides">
                · {{ progress.sides }} {{ progress.sides === 1 ? 'sidetrack' : 'sidetracks' }}</template
              >
            </template>
            <template v-else>
              <span class="font-semibold text-gray-900 dark:text-white">{{ roadmaps.length }}</span>
              {{ roadmaps.length === 1 ? 'goal' : 'goals' }}<template v-if="reachedCount"> · {{ reachedCount }} reached</template>
            </template>
          </p>
          <button
            v-if="selected"
            type="button"
            @click="editGoal"
            class="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <PencilSimple class="size-4" />
            Goal
          </button>
        </div>
        <p v-if="selected?.why" class="line-clamp-2 shrink-0 border-b border-gray-100 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          {{ selected.why }}
        </p>

        <LevelMap v-if="selected" :roadmap="selected" @open-stop="openStop" @add-step="addStep" @open-goal="editGoal" />
        <GoalsMap v-else :roadmaps="roadmaps" @open="openGoal" />
      </template>
    </SectionCard>

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

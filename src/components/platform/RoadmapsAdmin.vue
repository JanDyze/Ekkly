<script setup>
import { computed, onActivated, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MapTrifold, PencilSimple, Plus } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import SelectMenu from '../common/SelectMenu.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import LevelMap from './roadmap/LevelMap.vue'
import StopSheet from './roadmap/StopSheet.vue'
import GoalSheet from './roadmap/GoalSheet.vue'
import { deleteRoadmap, listRoadmaps, saveRoadmap } from '../../api/roadmapService'
import { useToast } from '../../composables/useToast'
import { addSide, canMove, groupStops, moveStop, progressOf, putStop, removeStop } from '../../utils/roadmap'

// Ekkly's own roadmaps, in the console: where Ekkly is heading, the steps
// taken to get there, and the sidetracks along the way. Each is drawn as a
// level map (LevelMap) and changed from it: tap a stop to change it, the
// dashed stop at the top of the road to add the next step, the goal to
// change the goal itself.
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

// The open roadmap lives in the URL, beside the console's own ?section=.
const selected = computed(
  () => roadmaps.value.find((r) => r.id === route.query.roadmap) || roadmaps.value[0] || null
)
const choose = (id) => router.replace({ query: { ...route.query, roadmap: id } })

const options = computed(() => roadmaps.value.map((r) => ({ value: r.id, label: r.title })))
const progress = computed(() => progressOf(selected.value?.stops || []))

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

const startRoadmap = () => (goalSheet.value = { show: true, isNew: true })
const editGoal = () => (goalSheet.value = { show: true, isNew: false })

const saveGoal = async ({ title, why }) => {
  if (goalSheet.value.isNew) {
    saving.value = true
    try {
      const created = await saveRoadmap({ title, why, stops: [] })
      roadmaps.value = [created, ...roadmaps.value]
      choose(created.id)
      goalSheet.value.show = false
    } catch (error) {
      console.error('Error starting a roadmap:', error)
      toast.error(error.message || 'Could not start that roadmap. Please try again.')
    } finally {
      saving.value = false
    }
    return
  }
  goalSheet.value.show = false
  await persist(selected.value.stops, { title, why })
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
    title: 'Delete this roadmap?',
    message: `“${roadmap.title}” and every stop on it will be gone for good.`,
    run: async () => {
      goalSheet.value.show = false
      try {
        await deleteRoadmap(roadmap.id)
        roadmaps.value = roadmaps.value.filter((r) => r.id !== roadmap.id)
        if (roadmaps.value[0]) choose(roadmaps.value[0].id)
        toast.success('Roadmap deleted')
      } catch (error) {
        console.error('Error deleting the roadmap:', error)
        toast.error(error.message || 'Could not delete that roadmap. Please try again.')
      }
    },
  }
}
</script>

<template>
  <div class="space-y-4">
    <SectionCard
      :icon="MapTrifold"
      title="Roadmaps"
      subtitle="Where Ekkly is heading: the end goal, the steps taken and the sidetracks along the way"
    >
      <template #actions>
        <button
          v-if="roadmaps.length"
          type="button"
          @click="startRoadmap"
          class="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          <span class="hidden sm:inline">New roadmap</span>
        </button>
      </template>

      <div v-if="loading" class="h-[68dvh] min-h-105 animate-pulse bg-gray-100 dark:bg-gray-700/40" aria-busy="true"></div>

      <!-- Nothing yet, and the way to begin. -->
      <div v-else-if="!roadmaps.length" class="flex flex-col items-center bg-gray-50 px-6 py-14 text-center dark:bg-gray-900">
        <span class="flex size-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-light/15">
          <MapTrifold class="size-8 text-primary dark:text-primary-light" />
        </span>
        <p class="mt-4 text-lg font-bold text-gray-900 dark:text-white">No roadmaps yet</p>
        <p class="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          Name where Ekkly is heading, then add the steps as they are taken, and the sidetracks too.
        </p>
        <button
          type="button"
          @click="startRoadmap"
          class="mt-5 flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          Start a roadmap
        </button>
      </div>

      <template v-else-if="selected">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <SelectMenu
            v-if="roadmaps.length > 1"
            :model-value="selected.id"
            :options="options"
            aria-label="Roadmap"
            field-class="h-9 min-w-48 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            @update:model-value="choose"
          />
          <p class="min-w-0 flex-1 text-sm text-gray-600 dark:text-gray-300">
            <span class="font-semibold text-gray-900 dark:text-white">{{ progress.done }} of {{ progress.steps }}</span>
            {{ progress.steps === 1 ? 'step' : 'steps' }} done<template v-if="progress.sides">
              · {{ progress.sides }} {{ progress.sides === 1 ? 'sidetrack' : 'sidetracks' }}</template
            >
          </p>
          <button
            type="button"
            @click="editGoal"
            class="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <PencilSimple class="size-4" />
            Goal
          </button>
        </div>
        <p v-if="selected.why" class="border-b border-gray-100 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          {{ selected.why }}
        </p>

        <LevelMap :roadmap="selected" @open-stop="openStop" @add-step="addStep" @open-goal="editGoal" />
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

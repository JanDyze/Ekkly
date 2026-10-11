<script setup>
import { computed, ref } from 'vue'
import { Plus } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import TaskRow from './TaskRow.vue'
import { TASKS } from './cast'

// Scene: a task in one line. Somebody types into the box above the list,
// presses Add, and the box empties for the next one while the task joins the
// list under "No due date": no drawer, no form, the details for later.

const draft = ref('')
const pressed = ref(false)
const added = ref(false)
const { at, type, still } = useSceneTimeline()

const NEW = { title: 'Buy candles for Christmas Eve', who: 'Unassigned', due: '', when: '', ministry: 'Worship' }
const typed = type(draft, NEW.title, 800, 55)
at(typed + 350, () => (pressed.value = true))
at(typed + 600, () => {
  draft.value = ''
  added.value = true
})

const TODAY = [TASKS.bulletins, TASKS.lola]
const open = computed(() => (added.value ? 4 : 3))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">Everyone’s</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ open }} open</p>
    </div>

    <!-- The box that adds one: dashed until it is being typed in. -->
    <div
      :class="[
        'st-rise mt-3 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 dark:bg-gray-800',
        draft ? 'border-solid border-primary dark:border-primary-light' : 'border-dashed border-gray-300 dark:border-gray-600',
      ]"
      style="--d: 80ms"
    >
      <Plus class="size-5 shrink-0 text-gray-400" />
      <span :class="['min-w-0 flex-1 truncate text-sm', draft ? '' : 'text-gray-400', still || added ? '' : 'st-caret']">{{ draft || 'Add a task...' }}</span>
      <span
        :class="[
          'relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium',
          draft ? 'st-filled bg-primary text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
          pressed && !added ? 'st-tap' : '',
        ]"
      >
        Add
      </span>
    </div>

    <p class="st-rise mt-4 mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 160ms">
      Today <span class="ml-1 tabular-nums opacity-70">2</span>
    </p>
    <div class="st-rise divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700" style="--d: 220ms">
      <TaskRow v-for="t in TODAY" :key="t.title" :task="t" />
    </div>

    <p class="st-rise mt-4 mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 300ms">
      No due date <span class="ml-1 tabular-nums opacity-70">{{ added ? 2 : 1 }}</span>
    </p>
    <div class="st-rise divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700" style="--d: 360ms">
      <TaskRow :task="TASKS.cable" />
      <div v-if="added" class="st-rise rounded-b-2xl bg-primary/5 dark:bg-primary-light/10">
        <TaskRow :task="NEW" />
      </div>
    </div>
  </div>
</template>

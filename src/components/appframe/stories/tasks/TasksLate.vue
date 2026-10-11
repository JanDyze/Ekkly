<script setup>
import { ref } from 'vue'
import { MagnifyingGlass } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import TaskRow from './TaskRow.vue'
import { TASKS } from './cast'

// Scene: what is late, first. The list opens with the overdue ones on top, in
// red, then today's. Then "overdue" is typed into the search — a word the
// rows only show, never store, which the search reaches anyway — and the list
// is the late ones and nothing else.

const query = ref('')
const { type, still } = useSceneTimeline()
type(query, 'overdue', 2300, 110)

const LATE = [TASKS.water, TASKS.minutes]
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">Everyone’s</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">3 open</p>
    </div>

    <div class="st-rise mt-3 flex h-10 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 80ms">
      <MagnifyingGlass class="size-4 text-gray-400" />
      <span :class="['text-sm', query ? '' : 'text-gray-400', query && !still ? 'st-caret' : '']">{{ query || 'Search tasks' }}</span>
    </div>

    <p class="st-rise mt-4 mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400" style="--d: 200ms">
      Overdue <span class="ml-1 tabular-nums opacity-70">2</span>
    </p>
    <div class="st-rise divide-y divide-red-100 rounded-2xl bg-white ring-1 ring-red-200 dark:divide-red-900/40 dark:bg-gray-800 dark:ring-red-900/50" style="--d: 260ms">
      <TaskRow v-for="t in LATE" :key="t.title" :task="t" />
    </div>

    <Transition name="fold">
      <div v-if="query.length < 7">
        <p class="st-rise mt-4 mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 500ms">
          Today <span class="ml-1 tabular-nums opacity-70">1</span>
        </p>
        <div class="st-rise rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 560ms">
          <TaskRow :task="TASKS.lola" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fold-leave-active {
  transition: opacity 0.3s ease;
}
.fold-leave-to {
  opacity: 0;
}
</style>

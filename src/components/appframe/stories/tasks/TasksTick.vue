<script setup>
import { ref } from 'vue'
import { ChevronDown } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import TaskRow from './TaskRow.vue'
import { TASKS } from './cast'

// Scene: ticked off on the way out. Ben's own list; his thumb lands on the box
// of today's task, it fills green and is struck through with his name on it,
// and then it folds away into Done at the foot, leaving the week's two.

const ticked = ref(false)
const filed = ref(false)
const { at } = useSceneTimeline()
at(1500, () => (ticked.value = true))
at(2900, () => (filed.value = true))

const WEEK = [TASKS.chairs, TASKS.projector]
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">Mine</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ filed ? 2 : 3 }} open</p>
    </div>

    <template v-if="!filed">
      <p class="st-rise mt-4 mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 100ms">
        Today <span class="ml-1 tabular-nums opacity-70">1</span>
      </p>
      <div class="st-rise rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 160ms">
        <TaskRow :task="TASKS.bulletins" :done="ticked" done-by="Ben Santos" :tapped="ticked" />
      </div>
    </template>

    <p class="st-rise mt-4 mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 240ms">
      This week <span class="ml-1 tabular-nums opacity-70">2</span>
    </p>
    <div class="st-rise divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700" style="--d: 300ms">
      <TaskRow v-for="t in WEEK" :key="t.title" :task="t" />
    </div>

    <!-- What is finished, at the foot, opened to show the one just done. -->
    <template v-if="filed">
      <p class="st-rise mt-4 mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <ChevronDown class="size-4" />
        Done <span class="tabular-nums opacity-70">1</span>
      </p>
      <div class="st-rise rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 80ms">
        <TaskRow :task="TASKS.bulletins" done done-by="Ben Santos" />
      </div>
    </template>
  </div>
</template>

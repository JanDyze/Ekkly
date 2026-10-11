<script setup>
import { computed, ref } from 'vue'
import { BookOpen } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: writing the message ahead. The preacher types the title, the passage
// lands with its words, and the outline's points come in one at a time — the
// same outline the screen team puts up on Sunday.

const title = ref('')
const passage = ref(false)
const shown = ref(0)
const { at, type, still } = useSceneTimeline()

const typed = type(title, 'The man in the tree', 600, 70)
at(typed + 300, () => (passage.value = true))
const POINTS = ['Jesus sees the one others ignore', 'Jesus calls him by name', 'Jesus changes a whole house']
POINTS.forEach((_, i) => at(typed + 1100 + i * 450, () => (shown.value = i + 1)))

const points = computed(() => POINTS.slice(0, shown.value))
</script>

<template>
  <div class="flex h-full flex-col px-4 pt-6">
    <p class="st-rise text-xl font-bold">Sunday, October 19</p>
    <p class="st-rise text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">Ben preaching · Series: Jesus meets people</p>

    <div class="st-rise mt-4" style="--d: 150ms">
      <p class="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Title of the message</p>
      <div class="flex h-10 items-center rounded-lg bg-white px-3 ring-2 ring-primary dark:bg-gray-800 dark:ring-primary-light">
        <span :class="['truncate text-sm font-semibold', still ? '' : 'st-caret']">{{ title }}</span>
      </div>
    </div>

    <div
      v-if="passage"
      class="st-pop mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <BookOpen class="mt-0.5 size-4 shrink-0 text-primary dark:text-primary-light" />
      <span class="min-w-0">
        <span class="block text-sm font-semibold">Luke 19:1-10</span>
        <span class="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">
          <sup class="font-semibold">10</sup> For the Son of man is come to seek and to save that which was lost.
        </span>
      </span>
    </div>

    <p v-if="points.length" class="st-rise mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Outline</p>
    <ol class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="(point, i) in points"
        :key="point"
        class="st-rise flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary-light/15 dark:text-primary-light">
          {{ i + 1 }}
        </span>
        <span class="min-w-0 truncate text-sm">{{ point }}</span>
      </li>
    </ol>
  </div>
</template>

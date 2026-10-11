<script setup>
import { computed, ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import VideoRow from './VideoRow.vue'
import { CARDS, length } from './month'

// Scene: the month, already a video. Nobody starts it: the studio opens on
// October, and the cards the calendar makes arrive in the running order one
// after another — the opening, the events in date order, the Sundays, the
// small groups, the closing — while the count and the length add themselves
// up in the header.

const shown = ref(0)
const { at } = useSceneTimeline()
CARDS.forEach((_, i) => at(350 + i * 380, () => (shown.value = i + 1)))

const arrived = computed(() => CARDS.slice(0, shown.value))
// What the header counts: everything announced, not the opening and closing.
const count = computed(() => arrived.value.filter((c) => c.id !== 'intro' && c.id !== 'outro').length)
const seconds = computed(() => arrived.value.reduce((sum, c) => sum + c.seconds, 0))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">October</p>
      <p class="text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {{ shown ? `${count} ${count === 1 ? 'announcement' : 'announcements'} · ${length(seconds)}` : 'Reading the calendar…' }}
      </p>
    </div>

    <p class="st-rise mt-4 flex items-baseline gap-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400" style="--d: 100ms">
      In this video
      <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ shown }}</span>
    </p>
    <div class="st-rise mt-2 flex flex-col gap-0.5 rounded-2xl bg-white p-1.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 150ms">
      <VideoRow v-for="c in arrived" :key="c.id" :card="c" class="st-rise" />
      <!-- Room kept for the cards still to come, so the list does not grow
           under the eye while it fills. -->
      <div v-for="n in CARDS.length - shown" :key="`gap-${n}`" class="h-11" />
    </div>
  </div>
</template>

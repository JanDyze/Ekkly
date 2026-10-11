<script setup>
import { computed, ref } from 'vue'
import { CalendarX } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import VideoCard from './VideoCard.vue'
import VideoRow from './VideoRow.vue'
import { card } from './month'

// Scene: plans change, and the video with them. Youth Camp is moved on the
// calendar, and nobody edits the video: its card turns into a Postponed card
// with the new date by itself, its row in the running order says so, and
// the home warns that a video already posted may still say it is on.

const moved = ref(false)
const { at } = useSceneTimeline()
at(1400, () => (moved.value = true))

const camp = card('camp')
const POSTPONED = {
  ...camp,
  id: 'camp-postponed',
  icon: CalendarX,
  eyebrow: 'Postponed',
  when: 'Now Fri, Nov 7 · 6:00 PM',
  detail: 'Now Fri, Nov 7 · 6:00 PM',
}
const shownCard = computed(() => (moved.value ? POSTPONED : camp))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <VideoCard :card="shownCard" />
    </div>

    <p class="st-rise mt-4 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400" style="--d: 100ms">In this video</p>
    <div class="st-rise mt-2 rounded-2xl bg-white p-1.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 150ms">
      <VideoRow :card="shownCard" current />
    </div>

    <!-- The home's card for it: a video posted at the start of the month
         still says the camp is on the 24th. -->
    <div
      v-if="moved"
      class="st-rise mt-4 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30"
      style="--d: 900ms"
    >
      <div class="flex items-center gap-2">
        <CalendarX class="size-4 text-amber-700 dark:text-amber-300" />
        <p class="text-xs font-semibold text-amber-800 dark:text-amber-200">Postponed</p>
      </div>
      <p class="mt-1 text-base font-bold text-amber-950 dark:text-amber-50">Youth Camp 2026</p>
      <p class="text-xs text-amber-900 dark:text-amber-100">A video already posted may still say it is on.</p>
    </div>
  </div>
</template>

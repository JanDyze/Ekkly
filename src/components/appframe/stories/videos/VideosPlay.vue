<script setup>
import { computed, ref } from 'vue'
import { MusicNotes } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import VideoCard from './VideoCard.vue'
import VideoRow from './VideoRow.vue'
import { TOTAL, card, length } from './month'

// Scene: watching it before it is posted. The player runs through the cards,
// each over its photo in the church's colour, the time moving under it and
// the card playing lit in the running order below — and a tap on a row would
// jump the player there, as the studio's does.

const PLAYS = ['camp', 'thanks', 'groups'].map(card)
// Where each card starts in the video, in seconds: after the opening.
const STARTS = [5, 13, 21]

// Which of them is playing. With reduced motion it stays on the first.
const index = ref(0)
const { at, still } = useSceneTimeline()
if (!still) {
  at(1500, () => (index.value = 1))
  at(2900, () => (index.value = 2))
}

const playing = computed(() => PLAYS[index.value])
const time = computed(() => STARTS[index.value] + 2)
</script>

<template>
  <div class="px-4 pt-5">
    <div class="st-rise">
      <VideoCard :card="playing" />
    </div>

    <div class="st-rise mt-2 flex items-center gap-2" style="--d: 80ms">
      <div class="h-1 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
        <div class="h-full rounded-full bg-primary transition-[width] duration-700 ease-out dark:bg-primary-light" :style="{ width: `${(time / TOTAL) * 100}%` }" />
      </div>
      <span class="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{{ length(time) }} / {{ length(TOTAL) }}</span>
    </div>

    <div class="st-rise mt-2 flex items-center gap-2 px-0.5 text-xs text-gray-500 dark:text-gray-400" style="--d: 120ms">
      <MusicNotes class="size-4 shrink-0" />
      <span class="flex-1">Morning</span>
      <span class="font-medium text-primary dark:text-primary-light">Change</span>
    </div>

    <p class="st-rise mt-4 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400" style="--d: 180ms">In this video</p>
    <div class="st-rise mt-2 flex flex-col gap-0.5 rounded-2xl bg-white p-1.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 220ms">
      <VideoRow v-for="(c, i) in PLAYS" :key="c.id" :card="c" :current="i === index" />
    </div>
  </div>
</template>

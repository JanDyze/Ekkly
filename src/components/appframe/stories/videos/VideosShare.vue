<script setup>
import { onUnmounted, ref } from 'vue'
import { CheckCircle, DownloadSimple, FilmSlate, ShareNetwork } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { TOTAL, length } from './month'

// Scene: the file, made and shared. The video plays through once while it
// records — fifty-two seconds, run quickly here — and then it can be saved,
// or on a phone handed straight to Facebook or Messenger through the share
// sheet: Share is pressed.

const state = ref('ready')
const progress = ref(0)
const pressed = ref('')
const { at, still } = useSceneTimeline()

let frame = 0
const record = (duration) => {
  const start = performance.now()
  const tick = (now) => {
    progress.value = Math.min(1, (now - start) / duration)
    if (progress.value < 1) frame = requestAnimationFrame(tick)
    else state.value = 'done'
  }
  frame = requestAnimationFrame(tick)
}
onUnmounted(() => cancelAnimationFrame(frame))

if (still) {
  state.value = 'done'
  progress.value = 1
} else {
  at(700, () => (pressed.value = 'start'))
  at(950, () => {
    state.value = 'recording'
    record(1700)
  })
  at(3600, () => (pressed.value = 'share'))
}
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-center gap-3">
      <span class="st-filled flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
        <FilmSlate class="size-5 text-white" />
      </span>
      <div class="min-w-0">
        <p class="truncate text-base font-bold">{{ state === 'done' ? 'Your video is ready' : 'Make the video file' }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Wide 1920 × 1080 · MP4 · {{ length(TOTAL) }}</p>
      </div>
    </div>

    <div class="st-rise mt-4 rounded-2xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 100ms">
      <template v-if="state === 'ready'">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          The video plays through once while it records, so this takes {{ length(TOTAL) }}. Keep this screen open until it finishes.
        </p>
        <span
          :class="[
            'st-filled relative mt-4 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white',
            pressed === 'start' ? 'st-tap bg-primary-hover' : 'bg-primary',
          ]"
        >
          <FilmSlate class="size-5" />
          Start recording
        </span>
      </template>

      <template v-else-if="state === 'recording'">
        <div class="flex items-baseline justify-between text-sm">
          <span class="font-medium">Recording…</span>
          <span class="tabular-nums text-gray-500 dark:text-gray-400">{{ length(progress * TOTAL) }} of {{ length(TOTAL) }}</span>
        </div>
        <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
          <div class="h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${Math.round(progress * 100)}%` }" />
        </div>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Keep this screen open. Switching apps or locking the phone pauses the recording.</p>
      </template>

      <template v-else>
        <div class="st-rise flex items-center gap-2 text-sm">
          <CheckCircle class="size-5 shrink-0 text-primary dark:text-primary-light" />
          <span class="min-w-0 truncate">October 2026 announcements.mp4</span>
        </div>
        <div class="st-rise mt-4 grid grid-cols-2 gap-2" style="--d: 120ms">
          <span
            :class="[
              'st-filled relative flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white',
              pressed === 'share' ? 'st-tap bg-primary-hover' : 'bg-primary',
            ]"
          >
            <ShareNetwork class="size-5" />
            Share
          </span>
          <span class="flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            <DownloadSimple class="size-5" />
            Save
          </span>
        </div>
        <p class="st-rise mt-3 text-center text-xs text-gray-500 dark:text-gray-400" style="--d: 240ms">To Facebook, Messenger or anywhere else</p>
      </template>
    </div>
  </div>
</template>

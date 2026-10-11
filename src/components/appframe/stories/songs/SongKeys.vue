<script setup>
import { ref } from 'vue'
import { Pause, Play, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf, song } from './cast'

// Scene: every leader's key. A song opens the way the song list's sheet does:
// its recording, which plays right there, and under it the key each song
// leader takes it in — different leaders, different keys, kept per song so
// the band is never guessing on Sunday morning.

const goodness = song('goodness')
const KEYS = [
  { p: person('mica'), key: 'A' },
  { p: person('bea'), key: 'G' },
  { p: person('jerome'), key: 'B♭' },
]

const playing = ref(false)
const { at } = useSceneTimeline()
at(2600, () => (playing.value = true))
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="st-rise flex shrink-0 items-center justify-between gap-3 rounded-t-[28px] border-b border-primary/20 bg-white bg-linear-to-r from-primary/10 to-transparent px-4 pb-3.5 pt-5 dark:border-primary-light/20 dark:bg-gray-800 dark:from-primary-light/10">
      <span class="min-w-0">
        <span class="block truncate text-base font-semibold">{{ goodness.title }}</span>
        <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ goodness.category }}</span>
      </span>
      <span class="flex shrink-0 items-center gap-1">
        <span class="px-2 text-xs font-bold text-primary dark:text-primary-light">Open editor</span>
        <X class="size-5 text-gray-400" />
      </span>
    </div>

    <div class="flex flex-col gap-4 p-4">
      <!-- The recording, playing in the app. -->
      <div class="st-rise relative aspect-video w-full rounded-xl bg-gray-900" style="--d: 120ms">
        <img :src="goodness.thumb" alt="" class="absolute inset-0 h-full w-full rounded-xl object-cover" />
        <span class="absolute inset-0 rounded-xl bg-black/20" />
        <span
          :class="[
            'absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white',
            playing ? 'st-tap bg-black/40' : 'bg-red-600',
          ]"
        >
          <Pause v-if="playing" class="size-5" />
          <Play v-else class="size-5" />
        </span>
        <span v-if="playing" class="absolute inset-x-3 bottom-2.5 h-1 rounded-full bg-white/30">
          <span class="song-progress block h-full rounded-full bg-red-500" />
        </span>
      </div>

      <div>
        <p class="st-rise mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400" style="--d: 400ms">Keys</p>
        <ul class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          <li
            v-for="(row, i) in KEYS"
            :key="row.p.id"
            class="st-rise flex items-center gap-3 px-3 py-2"
            :style="{ '--d': `${550 + i * 200}ms` }"
          >
            <StoryFace :person="row.p" size="size-7 text-[10px]" />
            <span class="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">{{ nameOf(row.p) }}</span>
            <span class="st-pop shrink-0 text-sm font-semibold text-primary dark:text-primary-light" :style="{ '--d': `${750 + i * 200}ms` }">{{ row.key }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The recording's progress, creeping along once it plays. */
.song-progress {
  width: 12%;
  animation: song-progress 1.6s linear both;
}
@keyframes song-progress {
  from {
    width: 0%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .song-progress {
    animation: none;
  }
}
</style>

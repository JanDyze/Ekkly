<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import VideoCard from './VideoCard.vue'
import { card } from './month'

// Scene: a look of the church's own. Look and sound redraws this month's
// video with every choice, on the church's own first announcement rather than
// a sample: Bold, then Night, then Dawn are tapped and the player changes with
// each. Chosen once, it is how every month's video looks.

const LOOKS = [
  { key: 'bold', label: 'Bold' },
  { key: 'light', label: 'Light' },
  { key: 'night', label: 'Night' },
  { key: 'dawn', label: 'Dawn' },
]
const SHAPES = ['Wide', 'Tall', 'Square', 'Portrait']

const look = ref('bold')
const tapped = ref('')
const { at } = useSceneTimeline()
const choose = (ms, key) => {
  at(ms, () => (tapped.value = key))
  at(ms + 200, () => (look.value = key))
}
choose(1300, 'night')
choose(2700, 'dawn')

const camp = card('camp')

// Each look's own little swatch, mixed from the accent as the card's are.
const P = 'var(--color-primary)'
const SWATCH = {
  bold: `color-mix(in oklab, ${P} 85%, black)`,
  light: `color-mix(in oklab, white 90%, ${P})`,
  night: `color-mix(in oklab, var(--color-gray-950) 80%, ${P})`,
  dawn: `linear-gradient(160deg, color-mix(in oklab, ${P} 70%, black), var(--color-amber-200))`,
}
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">Look and sound</p>
    <p class="st-rise text-xs text-gray-500 dark:text-gray-400" style="--d: 40ms">Used for every month’s video</p>

    <div class="st-rise mt-3" style="--d: 100ms">
      <VideoCard :card="camp" :look="look" />
    </div>

    <p class="st-rise mt-4 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400" style="--d: 180ms">Look</p>
    <div class="mt-1.5 grid grid-cols-4 gap-2">
      <span
        v-for="(l, i) in LOOKS"
        :key="l.key"
        :class="[
          'st-rise relative flex flex-col items-center gap-1 rounded-xl bg-white p-1.5 ring-2 dark:bg-gray-800',
          look === l.key ? 'text-primary ring-primary dark:text-primary-light dark:ring-primary-light' : 'ring-gray-200 dark:ring-gray-700',
          tapped === l.key ? 'st-tap' : '',
        ]"
        :style="{ '--d': `${240 + i * 60}ms` }"
      >
        <span class="h-8 w-full rounded-lg ring-1 ring-black/5" :style="{ background: SWATCH[l.key] }" />
        <span class="text-[11px] font-semibold">{{ l.label }}</span>
      </span>
    </div>

    <p class="st-rise mt-4 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400" style="--d: 500ms">Shape</p>
    <div class="st-rise mt-1.5 flex gap-1.5" style="--d: 540ms">
      <span
        v-for="(s, i) in SHAPES"
        :key="s"
        :class="[
          'rounded-full px-3 py-1.5 text-xs font-medium',
          i === 0 ? 'st-filled bg-primary text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
        ]"
      >
        {{ s }}
      </span>
    </div>
  </div>
</template>

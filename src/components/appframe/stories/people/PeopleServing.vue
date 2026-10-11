<script setup>
import StoryFace from '../StoryFace.vue'
import { CAST } from './cast'

// Scene: who serves where. How much of the church serves at all fills in
// first, then each ministry by size, and last the people serving nowhere yet,
// as a card of their own, because they are the ones somebody should be asking.

const MINISTRIES = [
  { name: 'Worship', count: 18, faces: ['ana', 'ella', 'grace'] },
  { name: 'Ushers', count: 12, faces: ['ben', 'mark'] },
  { name: 'Kids', count: 10, faces: ['carla', 'joy'] },
]
const MOST = 18
const faceOf = (id) => CAST.find((p) => p.id === id)
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">Ministries</p>

    <div class="st-rise mt-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 100ms">
      <div class="flex items-baseline justify-between">
        <p class="text-[28px] font-black tabular-nums tracking-tight">68%</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">of the church serves</p>
      </div>
      <div class="mt-3 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700">
        <div class="st-grow h-full w-[68%] rounded-full bg-primary dark:bg-primary-light" style="--d: 400ms" />
      </div>
    </div>

    <ul class="mt-3 flex flex-col gap-1.5">
      <li
        v-for="(m, i) in MINISTRIES"
        :key="m.name"
        class="st-rise rounded-2xl bg-white px-3 py-2.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        :style="{ '--d': `${900 + i * 160}ms` }"
      >
        <div class="flex items-center gap-2">
          <span class="flex-1 text-sm font-semibold">{{ m.name }}</span>
          <span class="flex -space-x-1.5">
            <StoryFace v-for="id in m.faces" :key="id" :person="faceOf(id)" size="size-6 text-[9px] ring-2 ring-white dark:ring-gray-800" />
          </span>
          <span class="w-6 text-right text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">{{ m.count }}</span>
        </div>
        <div class="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            class="st-grow h-full rounded-full bg-primary/60 dark:bg-primary-light/60"
            :style="{ width: `${(m.count / MOST) * 100}%`, '--d': `${1100 + i * 160}ms` }"
          />
        </div>
      </li>
    </ul>

    <div class="st-pop mt-3 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30" style="--d: 2200ms">
      <span class="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-300">14</span>
      <span class="text-sm leading-snug text-amber-900 dark:text-amber-100">serving nowhere yet. Worth asking.</span>
    </div>
  </div>
</template>

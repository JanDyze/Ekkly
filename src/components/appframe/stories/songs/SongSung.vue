<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import SongThumb from './SongThumb.vue'
import { song } from './cast'

// Scene: what the church sings most. The year's most sung arrive, each with
// how many Sundays it has been on climbing as it lands, read from the
// schedules; under them the songs resting longest, the ones a worship leader
// might bring back.

const MOST = [
  { s: song('goodness'), line: 'Planned for Oct 18', times: 14 },
  { s: song('waymaker'), line: 'Last sung Oct 4', times: 11 },
  { s: song('ikaw'), line: 'Last sung Sep 27', times: 9 },
]
const RESTING = [{ s: song('hosanna'), line: 'Last sung Apr 19', rested: '5 months' }]

const times = ref(MOST.map(() => 0))
const { at } = useSceneTimeline()
MOST.forEach((row, i) => {
  for (let n = 1; n <= row.times; n++) at(600 + i * 250 + n * 50, () => (times.value[i] = n))
})
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Most sung</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">This year</p>
    </div>

    <p class="st-rise mb-1.5 mt-4 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 100ms">
      Most sung this year <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">10</span>
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li v-for="(row, i) in MOST" :key="row.s.id" class="st-rise flex items-center gap-3 px-4 py-2.5" :style="{ '--d': `${200 + i * 160}ms` }">
        <SongThumb :src="row.s.thumb" :play="false" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ row.s.title }}</span>
          <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ row.line }}</span>
        </span>
        <span class="shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
          {{ times[i] }}<span class="font-normal text-gray-400 dark:text-gray-500">×</span>
        </span>
      </li>
    </ul>

    <p class="st-rise mb-1.5 mt-5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 1700ms">
      Not sung lately <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">4</span>
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li v-for="(row, i) in RESTING" :key="row.s.id" class="st-rise flex items-center gap-3 px-4 py-2.5" :style="{ '--d': `${1850 + i * 160}ms` }">
        <SongThumb :src="row.s.thumb" :play="false" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ row.s.title }}</span>
          <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ row.line }}</span>
        </span>
        <span class="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">{{ row.rested }}</span>
      </li>
    </ul>
    <p class="st-rise mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 2000ms">Three months or more, and on no Sunday to come.</p>
  </div>
</template>

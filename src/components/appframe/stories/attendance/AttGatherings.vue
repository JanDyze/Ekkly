<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryRing from './StoryRing.vue'

// Scene: how full each gathering was. The month's gatherings arrive the way
// the Gatherings section lists them — the day, the name, its kind as a stripe
// and a chip, how many of how many — and each ring fills to its turnout. The
// one nobody has counted yet says so, and a thumb goes to it.

const ROWS = [
  { id: 'sun11', day: 11, weekday: 'Sun', title: 'Sunday Service', kind: 'Worship', bar: 'bg-blue-500', chip: 'bg-blue-500 text-white', present: 132, expected: 160 },
  { id: 'wed7', day: 7, weekday: 'Wed', title: 'Prayer Meeting', kind: 'Prayer', bar: 'bg-purple-500', chip: 'bg-purple-500 text-white', present: 24, expected: 40 },
  { id: 'sat10', day: 10, weekday: 'Sat', title: 'Youth Night', kind: 'Fellowship', bar: 'bg-teal-500', chip: 'bg-teal-500 text-white', present: 38, expected: 45 },
  { id: 'sun4', day: 4, weekday: 'Sun', title: 'Sunday Service', kind: 'Worship', bar: 'bg-blue-500', chip: 'bg-blue-500 text-white', present: 141, expected: 160 },
  { id: 'fri2', day: 2, weekday: 'Fri', title: 'Leaders’ Meeting', kind: 'Meeting', bar: 'bg-slate-500', chip: 'bg-slate-500 text-white', present: null, expected: 12 },
]

// Each ring starts empty and fills once its row has landed.
const shares = ref(ROWS.map(() => 0))
const tapped = ref(false)
const { at } = useSceneTimeline()
ROWS.forEach((row, i) => {
  if (row.present !== null) at(700 + i * 160, () => (shares.value[i] = Math.round((row.present / row.expected) * 100)))
})
at(2900, () => (tapped.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Gatherings</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">This month</p>
    </div>

    <p class="st-rise mb-1.5 mt-4 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 80ms">
      October 2026 <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">9</span>
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li
        v-for="(row, i) in ROWS"
        :key="row.id"
        :class="[
          'st-rise relative flex items-center gap-3 py-2 pl-4 pr-3',
          row.present === null && tapped ? 'st-tap text-primary dark:text-primary-light' : '',
          i === 0 ? 'rounded-t-2xl' : '',
          i === ROWS.length - 1 ? 'rounded-b-2xl' : '',
        ]"
        :style="{ '--d': `${150 + i * 100}ms` }"
      >
        <!-- The kind of gathering, as a stripe down the edge, faint while
             nothing is recorded. -->
        <span :class="['absolute inset-y-0 left-0 w-1', row.bar, row.present === null ? 'opacity-30' : '', i === 0 ? 'rounded-tl-2xl' : '', i === ROWS.length - 1 ? 'rounded-bl-2xl' : '']" />
        <span class="w-10 shrink-0 text-center">
          <span class="block text-xl font-bold leading-none tabular-nums text-gray-900 dark:text-white">{{ row.day }}</span>
          <span class="mt-0.5 block text-[11px] uppercase text-gray-400 dark:text-gray-500">{{ row.weekday }}</span>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-gray-900 dark:text-white">{{ row.title }}</span>
          <span class="mt-0.5 flex items-center gap-2">
            <span :class="['rounded px-1.5 py-0.5 text-[11px]', row.chip, row.present === null ? 'opacity-60' : '']">{{ row.kind }}</span>
            <span v-if="row.present !== null" class="text-xs text-gray-500 dark:text-gray-400">
              <span class="font-semibold tabular-nums text-gray-700 dark:text-gray-200">{{ row.present }}</span> of {{ row.expected }}
            </span>
            <span v-else class="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-400 dark:border-gray-600 dark:text-gray-500">Not recorded</span>
          </span>
        </span>
        <StoryRing v-if="row.present !== null" :share="shares[i]" />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { KINDS } from './cast'

// Scene: every week, laid out. The week arrives a day at a time, Sunday to
// Saturday, the way Every week draws it: a row a day, each gathering's time
// first so the day reads down like a timetable, today filled, the quiet days
// faint. The place is said once, under the week, unless one is elsewhere.

const DAYS = [
  { key: 'sun', short: 'Sun', today: true, gatherings: [{ time: '9:00 AM', title: 'Sunday Service', kind: 'worship' }] },
  { key: 'mon', short: 'Mon', gatherings: [] },
  { key: 'tue', short: 'Tue', gatherings: [] },
  { key: 'wed', short: 'Wed', gatherings: [{ time: '7:00 PM', title: 'Prayer Meeting', kind: 'prayer' }] },
  { key: 'thu', short: 'Thu', gatherings: [] },
  { key: 'fri', short: 'Fri', gatherings: [{ time: '7:00 PM', title: 'Youth Night', kind: 'fellowship', note: 'Fellowship hall' }] },
  { key: 'sat', short: 'Sat', gatherings: [] },
]

const tapped = ref(false)
const { at } = useSceneTimeline()
at(2700, () => (tapped.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Every week</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">3 gatherings, 3 days</p>
    </div>

    <p class="st-rise mb-1.5 mt-4 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 120ms">When we meet</p>
    <div class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <div
        v-for="(day, i) in DAYS"
        :key="day.key"
        :class="[
          'st-rise flex gap-2.5 px-3',
          day.gatherings.length ? 'py-1.5' : 'py-1',
          day.today ? 'rounded-t-2xl bg-primary/5 dark:bg-primary-light/5' : '',
          i === DAYS.length - 1 ? 'rounded-b-2xl' : '',
        ]"
        :style="{ '--d': `${250 + i * 140}ms` }"
      >
        <span
          :class="[
            'flex w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase leading-none',
            day.gatherings.length ? 'h-11' : 'h-7',
            day.today
              ? 'st-filled bg-primary text-white'
              : day.gatherings.length
                ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                : 'text-gray-300 dark:text-gray-600',
          ]"
        >
          {{ day.short }}
        </span>
        <ul v-if="day.gatherings.length" class="flex min-w-0 flex-1 flex-col justify-center">
          <li
            v-for="g in day.gatherings"
            :key="g.title"
            :class="[
              'relative -mx-1.5 grid grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-x-2 rounded-lg px-1.5 py-0.5',
              tapped && day.key === 'fri' ? 'st-tap text-primary dark:text-primary-light' : '',
            ]"
          >
            <span class="text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">{{ g.time }}</span>
            <span class="min-w-0">
              <span class="flex min-w-0 items-center gap-1.5">
                <span :class="['size-2 shrink-0 rounded-full', KINDS[g.kind].dot]" />
                <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ g.title }}</span>
              </span>
              <span v-if="g.note" class="mt-0.5 block truncate pl-3.5 text-xs text-gray-500 dark:text-gray-400">{{ g.note }}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <p class="st-rise mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 1300ms">At the main sanctuary unless it says otherwise.</p>
  </div>
</template>

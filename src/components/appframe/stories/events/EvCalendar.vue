<script setup>
import { computed, ref } from 'vue'
import { Cake, ChevronDown, ChevronLeft, ChevronRight } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { KINDS, person, nameOf } from './cast'

// Scene: the month on one grid. October arrives a week at a time, drawn the
// way the Calendar draws a phone's month: a grey dot for each weekly
// gathering, a pink one for a birthday, and a coloured disc for anything out
// of the ordinary. A thumb taps the 23rd and the day opens under the grid.

const LEAD = [27, 28, 29, 30]
const DISCS = {
  10: ['fellowship'],
  17: ['special'],
  23: ['outreach', 'fellowship'],
  31: ['fellowship'],
}
const BIRTHDAYS = [3, 16, 23]
// Sunday service on Sundays, prayer meeting on Wednesdays.
const routineOf = (day) => (day % 7 === 4 ? 1 : day % 7 === 0 ? 1 : 0)

const cells = computed(() => [
  ...LEAD.map((day) => ({ key: `s${day}`, day, out: true, routine: 0, discs: [], birthday: false })),
  ...Array.from({ length: 31 }, (_, i) => {
    const day = i + 1
    return { key: `o${day}`, day, out: false, routine: routineOf(day), discs: DISCS[day] || [], birthday: BIRTHDAYS.includes(day) }
  }),
])
const weeks = computed(() => Array.from({ length: 5 }, (_, w) => cells.value.slice(w * 7, w * 7 + 7)))

const selected = ref(0)
const { at } = useSceneTimeline()
at(2300, () => (selected.value = 23))

const nestor = person('nestor')
</script>

<template>
  <div class="px-3 pt-4">
    <div class="st-rise rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <!-- The month's strip: the arrows either side of its name, and Today
           on the right. -->
      <div class="flex items-center gap-1 border-b border-gray-200 px-1.5 py-1.5 dark:border-gray-700">
        <ChevronLeft class="size-8 p-1.5 text-gray-500 dark:text-gray-400" />
        <span class="flex h-8 items-center gap-1 px-1 text-sm font-semibold">
          October 2026
          <ChevronDown class="size-4 text-gray-400" />
        </span>
        <ChevronRight class="size-8 p-1.5 text-gray-500 dark:text-gray-400" />
        <span class="ml-auto px-2 text-xs font-semibold text-primary dark:text-primary-light">Today</span>
      </div>

      <div class="p-2">
        <div class="mb-1 grid grid-cols-7 gap-1">
          <span v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="d" class="text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400">
            {{ d }}
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <div v-for="(week, w) in weeks" :key="w" class="st-rise grid grid-cols-7 gap-1" :style="{ '--d': `${200 + w * 120}ms` }">
            <span
              v-for="cell in week"
              :key="cell.key"
              :class="[
                'flex h-9 flex-col rounded-lg p-1',
                cell.out
                  ? 'border border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/50'
                  : selected === cell.day
                    ? 'st-tap relative border border-transparent bg-primary/10 text-primary ring-2 ring-inset ring-primary dark:bg-primary/20 dark:ring-primary-light'
                    : cell.day === 11
                      ? 'border border-primary/30 bg-primary/5 dark:bg-primary/10'
                      : 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
              ]"
            >
              <span class="flex items-center justify-between gap-0.5">
                <span
                  :class="[
                    'text-[11px] font-medium leading-none',
                    cell.day === 11 && !cell.out
                      ? 'st-filled -m-0.5 flex size-4 items-center justify-center rounded-full bg-primary font-bold text-white'
                      : cell.out
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-gray-900 dark:text-white',
                  ]"
                >
                  {{ cell.day }}
                </span>
                <span class="flex items-center gap-0.5">
                  <span v-if="cell.birthday" class="size-1 rounded-full bg-pink-400 dark:bg-pink-400/80" />
                  <span v-for="n in cell.routine" :key="n" class="size-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                </span>
              </span>
              <span v-if="cell.discs.length" class="flex flex-1 items-center justify-center">
                <span
                  v-for="(kind, i) in cell.discs"
                  :key="kind"
                  :class="['st-pop size-3.5 rounded-full ring-2 ring-white dark:ring-gray-800', KINDS[kind].dot, i > 0 ? '-ml-1.5' : '']"
                  :style="{ '--d': `${900 + w * 120 + i * 80}ms` }"
                />
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- The day that was tapped, under the grid. -->
    <section v-if="selected" class="st-rise mt-3" style="--d: 150ms">
      <p class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Friday, October 23</p>
      <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
        <li class="flex items-center gap-3 px-4 py-2">
          <span :class="['size-2.5 shrink-0 rounded-full', KINDS.outreach.dot]" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-medium leading-snug">Youth Camp</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">6:00 AM · Tanay, Rizal</span>
          </span>
        </li>
        <li class="flex items-center gap-3 px-4 py-2">
          <Cake class="size-4 shrink-0 text-pink-500 dark:text-pink-400" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-medium leading-snug">{{ nameOf(nestor) }}</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">Birthday · turns 40</span>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

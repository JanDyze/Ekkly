<script setup>
import { Cake } from '../../../../icons'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'

// Scene: never miss a birthday. Today's comes first, in the church's colour,
// then the rest of the week, each with how old they turn, so a greeting on
// Sunday is never a week late.

const today = person('joy')
const WEEK = [
  { p: person('ben'), day: 'Thu', date: 16, turning: 42 },
  { p: person('carla'), day: 'Sat', date: 18, turning: 17 },
  { p: person('grace'), day: 'Sun', date: 19, turning: 65 },
]
const LATER = [person('mark'), person('ella')]
</script>

<template>
  <div class="px-4 pt-5">
    <p class="st-rise text-xl font-bold">Birthdays</p>

    <p class="st-rise mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 100ms">Today</p>
    <div class="st-pop st-filled relative mt-2 flex items-center gap-3 rounded-2xl bg-primary p-4 text-white" style="--d: 250ms">
      <StoryFace :person="today" size="size-14 text-lg ring-2 ring-white" />
      <span class="min-w-0 flex-1">
        <span class="block text-lg font-bold leading-tight">{{ nameOf(today) }}</span>
        <span class="block text-sm text-white/80">Turns 30 today</span>
      </span>
      <Cake class="st-pop size-8 shrink-0 text-white/90" style="--d: 700ms" />
    </div>

    <p class="st-rise mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 900ms">This week</p>
    <ul class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="(b, i) in WEEK"
        :key="b.p.id"
        class="st-rise flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        :style="{ '--d': `${1050 + i * 180}ms` }"
      >
        <span class="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light">
          <span class="text-[9px] font-bold uppercase">{{ b.day }}</span>
          <span class="mt-0.5 text-sm font-bold tabular-nums">{{ b.date }}</span>
        </span>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ nameOf(b.p) }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">Turns {{ b.turning }}</span>
      </li>
    </ul>

    <div class="st-rise mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400" style="--d: 1800ms">
      <span class="flex -space-x-2">
        <StoryFace v-for="p in LATER" :key="p.id" :person="p" size="size-7 text-[10px] ring-2 ring-gray-50 dark:ring-gray-900" />
      </span>
      and 9 more this month
    </div>
  </div>
</template>

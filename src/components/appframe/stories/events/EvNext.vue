<script setup>
import { ref } from 'vue'
import { ChevronRight, Sparkle } from '../../../../icons'
import AppArt from '../../../common/AppArt.vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: what is on next. The Events home's card that is always there says
// what is next, then the seven days ahead fill in along its foot, a dot for
// each thing on; under it, the one-off coming up that people have to plan
// for, and a thumb goes to it.

const WEEK = [
  { date: '11', letter: 'S', count: 2, today: true },
  { date: '12', letter: 'M', count: 0 },
  { date: '13', letter: 'T', count: 0 },
  { date: '14', letter: 'W', count: 1 },
  { date: '15', letter: 'T', count: 0 },
  { date: '16', letter: 'F', count: 1 },
  { date: '17', letter: 'S', count: 2 },
]

const tapped = ref(false)
const { at } = useSceneTimeline()
at(3100, () => (tapped.value = true))
</script>

<template>
  <div class="flex flex-col gap-3 px-4 pt-6">
    <!-- What is on next, in the church's colour, the week along its foot. -->
    <div class="st-rise st-filled relative rounded-[24px] border border-black/15 bg-primary px-4 pb-3 pt-3.5 text-white dark:border-black/40">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <p class="inline-flex max-w-full rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">Good morning, Joy</p>
          <p class="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight">Sunday Service</p>
          <p class="mt-1 truncate text-sm text-white/75">Today · 9:00 AM · Sanctuary</p>
        </div>
        <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
          <AppArt app-key="events" :play="1" class="size-9" />
        </span>
      </div>
      <div class="mt-3 grid grid-cols-7 gap-1">
        <span
          v-for="(day, i) in WEEK"
          :key="day.date"
          :class="['st-pop flex flex-col items-center gap-1 rounded-xl py-1.5', day.today ? 'bg-white/20 ring-1 ring-white/50' : '']"
          :style="{ '--d': `${500 + i * 110}ms` }"
        >
          <span class="text-[10px] font-semibold uppercase text-white/70">{{ day.letter }}</span>
          <span class="text-sm font-bold tabular-nums">{{ day.date }}</span>
          <span class="flex h-1.5 gap-0.5">
            <span v-for="n in day.count" :key="n" class="st-pop size-1.5 rounded-full bg-white" :style="{ '--d': `${1300 + i * 110 + n * 60}ms` }" />
          </span>
        </span>
      </div>
    </div>

    <!-- A one-off coming up, with who it is for. -->
    <div
      :class="[
        'st-rise relative rounded-[24px] border bg-white px-4 pb-3 pt-3.5 dark:bg-gray-800',
        tapped ? 'st-tap border-primary text-primary dark:border-primary-light dark:text-primary-light' : 'border-gray-200 dark:border-gray-700',
      ]"
      style="--d: 1700ms"
    >
      <div class="flex items-start gap-3">
        <span class="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light">
          <span class="text-[10px] font-bold uppercase">Oct</span>
          <span class="mt-0.5 text-lg font-bold tabular-nums">23</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light">
            <Sparkle class="size-4 shrink-0" />
            <span class="truncate">Coming up</span>
          </p>
          <p class="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white">Youth Camp</p>
          <p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">Oct 23 · 6:00 AM · Tanay</p>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-1.5 pr-7">
        <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">Youth</span>
        <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">Young adults</span>
        <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 line-through decoration-2 opacity-70 dark:bg-gray-700 dark:text-gray-200">Kids</span>
      </div>
      <ChevronRight class="absolute bottom-4 right-4 size-5 text-gray-300 dark:text-gray-600" />
    </div>
  </div>
</template>

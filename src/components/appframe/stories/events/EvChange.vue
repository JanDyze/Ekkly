<script setup>
import { ref } from 'vue'
import { CalendarX, Check, ChevronRight, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: a change of plan told to everyone. Family Day's status sheet is
// open; Postponed is tapped, the new date picked and the reason typed, and
// Mark it pressed. Then the Events home as everyone else sees it: the change
// leads, in amber, the old date crossed out beside the new one — because a
// gathering nobody hears is off is how someone drives to a locked building.

const choice = ref('cancelled')
const movedTo = ref('')
const reason = ref('')
const pressed = ref(false)
const told = ref(false)
const { at, type, still } = useSceneTimeline()

at(900, () => (choice.value = 'postponed'))
at(1300, () => (movedTo.value = 'Oct 31, 2026'))
const typed = type(reason, 'Bagyo, signal no. 2', 1600, 45)
at(typed + 250, () => (pressed.value = true))
at(typed + 650, () => (told.value = true))

const OPTIONS = [
  { key: 'cancelled', label: 'Cancelled', hint: 'It is not happening at all' },
  { key: 'postponed', label: 'Postponed', hint: 'Not on this date — moved, or moving' },
]
</script>

<template>
  <!-- The sheet, until it is marked. -->
  <div v-if="!told" class="flex h-full flex-col">
    <div class="st-rise flex shrink-0 items-start justify-between gap-3 rounded-t-[28px] border-b border-gray-200 bg-white px-4 pb-3 pt-5 dark:border-gray-700 dark:bg-gray-800">
      <span class="min-w-0">
        <span class="block truncate text-base font-bold">Family Day</span>
        <span class="block truncate text-xs text-gray-500 dark:text-gray-400">2026-10-17 · 8:00 AM</span>
      </span>
      <X class="size-5 shrink-0 text-gray-400" />
    </div>

    <div class="flex flex-col gap-3 p-4">
      <div class="st-rise flex flex-col gap-2" style="--d: 100ms">
        <span
          v-for="option in OPTIONS"
          :key="option.key"
          :class="[
            'relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
            choice === option.key ? 'border-primary bg-primary/5 dark:border-primary-light dark:bg-primary-light/10' : 'border-gray-200 dark:border-gray-700',
            choice === option.key && option.key === 'postponed' ? 'st-tap text-primary dark:text-primary-light' : '',
          ]"
        >
          <span class="min-w-0 flex-1">
            <span :class="['block text-sm font-semibold', choice === option.key ? 'text-primary dark:text-primary-light' : 'text-gray-900 dark:text-white']">
              {{ option.label }}
            </span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ option.hint }}</span>
          </span>
          <Check v-if="choice === option.key" class="size-4.5 shrink-0 text-primary dark:text-primary-light" />
        </span>
      </div>

      <div v-if="choice === 'postponed'" class="st-rise" style="--d: 0ms">
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Moved to <span class="font-normal text-gray-400">(if known)</span></p>
        <p class="h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700">
          <span v-if="movedTo" class="st-pop inline-block" style="--d: 0ms">{{ movedTo }}</span>
        </p>
      </div>

      <div class="st-rise" style="--d: 180ms">
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Reason <span class="font-normal text-gray-400">(optional)</span></p>
        <p class="h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700">
          <span v-if="reason || still" :class="!still && reason.length < 19 ? 'st-caret' : ''">{{ reason }}</span>
          <span v-else class="text-gray-400">Typhoon, venue unavailable…</span>
        </p>
      </div>
    </div>

    <div class="ev-fade mt-auto flex shrink-0 items-center gap-2 rounded-b-[28px] border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800" style="--d: 260ms">
      <span class="inline-flex h-11 shrink-0 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
        Close
      </span>
      <span
        :class="[
          'st-filled relative inline-flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-white',
          pressed ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
      >
        Mark it
      </span>
    </div>
  </div>

  <!-- Then the Events home, as everyone opening it sees it. -->
  <div v-else class="flex flex-col gap-3 px-4 pt-6">
    <div class="st-rise relative rounded-[24px] border border-amber-300 bg-amber-50 px-4 pb-3 pt-3.5 text-amber-950 dark:border-amber-500/50 dark:bg-gray-800 dark:text-white">
      <div class="flex items-start gap-3">
        <span class="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light">
          <span class="text-[10px] font-bold uppercase">Oct</span>
          <span class="mt-0.5 text-lg font-bold tabular-nums">17</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[13px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            <CalendarX class="size-4 shrink-0" />
            Change of plan
          </p>
          <p class="mt-1 text-[22px] font-bold leading-tight tracking-tight">Family Day is postponed</p>
          <p class="mt-1 truncate text-sm text-amber-800 dark:text-gray-400">Sat · moved to Oct 31</p>
        </div>
      </div>
      <div class="mt-3 flex gap-1.5 pr-7">
        <span class="st-pop rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 line-through decoration-2 opacity-70 dark:bg-amber-500/15 dark:text-amber-300" style="--d: 500ms">
          Oct 17
        </span>
        <span class="st-pop rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-300" style="--d: 700ms">
          Now Oct 31
        </span>
      </div>
      <ChevronRight class="absolute bottom-4 right-4 size-5 text-gray-300 dark:text-gray-600" />
    </div>

    <div class="st-rise st-filled rounded-[24px] border border-black/15 bg-primary px-4 pb-4 pt-3.5 text-white dark:border-black/40" style="--d: 250ms">
      <p class="inline-flex rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">Good morning, Joy</p>
      <p class="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight">Sunday Service</p>
      <p class="mt-1 truncate text-sm text-white/75">Today · 9:00 AM · Sanctuary</p>
    </div>
  </div>
</template>

<style scoped>
/* The foot sits on the screen's own bottom edge, so it fades in where it is
   rather than rising from below, which would carry it past the edge. */
.ev-fade {
  animation: ev-fade 0.5s ease-out var(--d, 0ms) both;
}
@keyframes ev-fade {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ev-fade {
    animation: none;
  }
}
</style>

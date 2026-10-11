<script setup>
import { ref } from 'vue'
import { CalendarPlus, CheckCircle, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: an event added in seconds. The Add event sheet is filled the way
// someone fills it on a phone — the name typed, the day and time picked, who
// it is for tapped from the church's tags (the expected count comes from
// them, so nobody types a head count), the place typed — and Add is pressed.

const title = ref('')
const date = ref('')
const time = ref('')
const place = ref('')
const tags = ref([])
const pressed = ref(false)
const added = ref(false)
const { at, type, still } = useSceneTimeline()

const typed = type(title, 'Youth Camp', 450, 60)
at(typed + 250, () => (date.value = 'Oct 23, 2026'))
at(typed + 500, () => (time.value = '6:00 AM'))
at(typed + 850, () => (tags.value = ['Youth']))
at(typed + 1100, () => (tags.value = ['Youth', 'Couples']))
const placed = type(place, 'Tanay, Rizal', typed + 1350, 50)
at(placed + 350, () => (pressed.value = true))
at(placed + 700, () => (added.value = true))

// Two of the church's tags, each with how many on the roll carry it: as
// many as share one line with Everyone at this width.
const TAGS = [
  { tag: 'Youth', count: 34 },
  { tag: 'Couples', count: 27 },
]
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="st-rise flex shrink-0 items-center justify-between gap-3 rounded-t-[28px] border-b border-gray-200 bg-white bg-linear-to-r from-primary/10 to-transparent px-4 pb-3.5 pt-5 dark:border-gray-700 dark:bg-gray-800 dark:from-primary-light/10">
      <div class="flex min-w-0 items-center gap-3">
        <span class="st-filled shrink-0 rounded-xl bg-primary p-2.5">
          <CalendarPlus class="size-5 text-white" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-base font-bold">Add event</span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">Title and date are required</span>
        </span>
      </div>
      <X class="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
    </div>

    <div class="flex flex-col gap-3 p-4">
      <div class="st-rise" style="--d: 100ms">
        <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Title <span class="text-red-500">*</span></p>
        <p class="h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
          <span :class="!still && title.length < 10 ? 'st-caret' : ''">{{ title }}</span>
        </p>
      </div>

      <div class="st-rise grid grid-cols-2 gap-3" style="--d: 160ms">
        <div>
          <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Date <span class="text-red-500">*</span></p>
          <p class="h-[38px] truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
            <span v-if="date" class="st-pop inline-block" style="--d: 0ms">{{ date }}</span>
          </p>
        </div>
        <div>
          <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Time</p>
          <p class="h-[38px] truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
            <span v-if="time" class="st-pop inline-block" style="--d: 0ms">{{ time }}</span>
          </p>
        </div>
      </div>

      <div class="st-rise" style="--d: 220ms">
        <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Who's expected</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            :class="[
              'rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors',
              tags.length ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : 'st-filled bg-primary text-white',
            ]"
          >
            Everyone <span class="opacity-70">214</span>
          </span>
          <span
            v-for="t in TAGS"
            :key="t.tag"
            :class="[
              'relative whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors',
              tags.includes(t.tag) ? 'st-filled st-tap bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
            ]"
          >
            {{ t.tag }} <span class="opacity-70">{{ t.count }}</span>
          </span>
        </div>
      </div>

      <div class="st-rise" style="--d: 280ms">
        <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Location</p>
        <p class="h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
          <span :class="!still && title.length === 10 && place.length < 12 ? 'st-caret' : ''">{{ place }}</span>
        </p>
      </div>
    </div>

    <div class="ev-fade mt-auto flex shrink-0 items-center gap-2 rounded-b-[28px] border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800" style="--d: 340ms">
      <span class="inline-flex h-11 shrink-0 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
        Cancel
      </span>
      <span
        v-if="!added"
        :class="[
          'st-filled relative inline-flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-white',
          pressed ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
      >
        Add event
      </span>
      <span v-else class="st-pop inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" style="--d: 0ms">
        <CheckCircle class="size-5" />
        On the calendar
      </span>
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

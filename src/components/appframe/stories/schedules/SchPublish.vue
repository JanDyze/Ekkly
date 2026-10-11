<script setup>
import { ref } from 'vue'
import { ChevronRight, Eye, EyeOff } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import DateTile from './DateTile.vue'

// Scene: a month published. November is planned but still a draft, in
// amber, which only the planners can see; Publish is pressed, the row turns
// green and says what that means — everyone can now see who is on — and the
// Sundays under it are the ones they will see. The row's words may take two
// lines here: the story's screen is narrower than most phones.

const SUNDAYS = [
  { day: 1, theme: 'Pasasalamat', line: 'Mica leading · 9 serving' },
  { day: 8, theme: 'Pag-asa', line: 'Grace leading · 8 serving' },
  { day: 15, theme: 'Pananampalataya', line: 'Mica leading · 9 serving' },
]

const pressed = ref(false)
const published = ref(false)
const { at } = useSceneTimeline()
at(2000, () => (pressed.value = true))
at(2300, () => (published.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Calendar</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">November 2026 · {{ published ? 'published' : 'draft' }}</p>
    </div>

    <div class="st-rise mt-4 flex min-h-14 items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70" style="--d: 120ms">
      <span
        :class="[
          'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          published ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
        ]"
      >
        <Eye v-if="published" class="st-pop size-5" style="--d: 0ms" />
        <EyeOff v-else class="size-5" />
      </span>
      <span class="min-w-0 flex-1">
        <span :class="['block text-[15px] font-medium leading-snug', published ? 'text-gray-900 dark:text-white' : 'text-amber-700 dark:text-amber-400']">
          November is {{ published ? 'published' : 'a draft' }}
        </span>
        <span class="mt-0.5 block text-sm leading-snug text-gray-500 dark:text-gray-400">
          {{ published ? 'Everyone can see who is on.' : 'Only planners can see it.' }}
        </span>
      </span>
      <span
        :class="[
          'relative inline-flex h-9 shrink-0 items-center rounded-xl px-3 text-sm font-semibold',
          published ? 'text-gray-600 dark:text-gray-300' : 'st-filled bg-primary text-white',
          pressed && !published ? 'st-tap' : '',
        ]"
      >
        {{ published ? 'Unpublish' : 'Publish' }}
      </span>
    </div>

    <p class="st-rise mb-1.5 mt-5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 300ms">
      November 2026 <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">5</span>
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li v-for="(s, i) in SUNDAYS" :key="s.day" class="st-rise flex items-center gap-3 px-4 py-2" :style="{ '--d': `${400 + i * 150}ms` }">
        <DateTile month="Nov" :day="s.day" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ s.theme }}</span>
          <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ s.line }}</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </li>
    </ul>
  </div>
</template>

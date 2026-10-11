<script setup>
import { ref } from 'vue'
import { CheckCircle, ChevronRight } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: no blank screen in the middle of a song. The Lyrics section lists
// every song still to be sung, and the one with no words saved comes first,
// in amber, before Sunday rather than during it. It is opened, its words go
// in, and it joins the ready ones: every song has its words.

const opened = ref(false)
const fixed = ref(false)
const { at } = useSceneTimeline()
at(2200, () => (opened.value = true))
at(3000, () => (fixed.value = true))

const MISSING = { title: 'It Is Well with My Soul', dates: 'Oct 18' }
const READY = [
  { title: 'Amazing Grace', dates: 'Oct 18' },
  { title: 'Blessed Assurance', dates: 'Oct 18' },
  { title: 'How Great Thou Art', dates: 'Oct 18, Oct 25' },
  { title: 'Great Is Thy Faithfulness', dates: 'Oct 25' },
]
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">Lyrics</p>
      <p class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <template v-if="fixed">
          <CheckCircle class="size-3.5 text-emerald-600 dark:text-emerald-400" />
          Every song has its words
        </template>
        <template v-else>1 still without words</template>
      </p>
    </div>

    <template v-if="!fixed">
      <p class="st-rise mt-4 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 120ms">Still to add · 1</p>
      <div class="st-rise mt-1.5 rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 180ms">
        <div :class="['relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5', opened ? 'st-tap text-amber-600 dark:text-amber-400' : '']">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ MISSING.title }}</span>
            <span class="block text-xs font-medium text-amber-700 dark:text-amber-400">No words yet · {{ MISSING.dates }}</span>
          </span>
          <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
      </div>
      <p class="st-rise mt-1.5 px-1 text-[11px] text-gray-400" style="--d: 240ms">Open one and paste its words in.</p>
    </template>

    <p class="st-rise mt-4 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 320ms">Ready · {{ fixed ? 5 : 4 }}</p>
    <div class="st-rise mt-1.5 divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700" style="--d: 380ms">
      <div v-if="fixed" class="st-rise flex items-center gap-3 rounded-t-2xl bg-emerald-50 px-3.5 py-2 dark:bg-emerald-500/10">
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">{{ MISSING.title }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ MISSING.dates }}</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </div>
      <div v-for="(song, i) in READY" :key="song.title" class="st-rise flex items-center gap-3 px-3.5 py-2" :style="{ '--d': `${440 + i * 80}ms` }">
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">{{ song.title }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ song.dates }}</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </div>
    </div>
  </div>
</template>

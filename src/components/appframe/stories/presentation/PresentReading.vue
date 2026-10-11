<script setup>
import { ref } from 'vue'
import { BookOpen, Menu, Music2 } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: a reading, found rather than typed. Scripture is tapped among the
// things that can be added, a reference is typed, and the verse comes up out
// of the Bible to check before it goes on: Add, and it is on the run sheet,
// with nothing retyped or mistranscribed. The King James is in the public
// domain; a church reads whichever translation it has chosen.

const REFERENCE = 'John 3:16'
const VERSE = 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'

const adding = ref(false)
const typed = ref('')
const looking = ref(false)
const found = ref(false)
const pressed = ref(false)
const added = ref(false)
const { at, type, still } = useSceneTimeline()

at(700, () => (adding.value = true))
const done = type(typed, REFERENCE, 1000, 90)
at(done + 150, () => (looking.value = true))
at(done + 650, () => {
  looking.value = false
  found.value = true
})
at(done + 1650, () => (pressed.value = true))
at(done + 1900, () => {
  added.value = true
  adding.value = false
})

const SHEET = ['Amazing Grace', 'Blessed Assurance', 'How Great Thou Art']
const KINDS = ['Song', 'Scripture', 'Custom text', 'Announcement', 'Video', 'Slides / PowerPoint']
</script>

<template>
  <div class="px-3.5 pt-6">
    <div class="st-rise flex items-center justify-between px-1">
      <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Run sheet</p>
      <span class="text-[11px] font-medium text-gray-400">{{ added ? 'Saved' : 'From schedule' }}</span>
    </div>

    <div class="mt-2 flex flex-col gap-1">
      <div
        v-for="(title, i) in SHEET"
        :key="title"
        class="st-rise flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-bold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
        :style="{ '--d': `${60 + i * 60}ms` }"
      >
        <Menu class="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
        <Music2 class="size-3.5 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ title }}</span>
      </div>
      <div
        v-if="added"
        class="st-rise flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary ring-1 ring-primary/30 dark:bg-primary-light/15 dark:text-primary-light dark:ring-primary-light/30"
      >
        <Menu class="size-3.5 shrink-0 opacity-50" />
        <BookOpen class="size-3.5 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ REFERENCE }}</span>
      </div>
    </div>

    <div class="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
      <!-- What can be added that is not a song from the schedule. -->
      <div v-if="!adding" class="flex flex-wrap gap-1">
        <span
          v-for="(kind, i) in KINDS"
          :key="kind"
          :class="[
            'st-rise relative rounded-full border border-dashed px-2 py-1 text-[11px] font-bold',
            kind === 'Scripture' && !added ? 'st-tap border-primary text-primary dark:border-primary-light dark:text-primary-light' : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400',
          ]"
          :style="{ '--d': `${240 + i * 40}ms`, '--t': '450ms' }"
        >
          + {{ kind }}
        </span>
      </div>

      <div v-else class="st-rise rounded-xl border-2 border-primary/30 bg-primary/5 p-2.5 dark:border-primary-light/30 dark:bg-primary-light/10">
        <p class="text-[11px] font-bold uppercase tracking-wide text-primary dark:text-primary-light">Scripture</p>
        <div class="mt-1.5 flex h-8 items-center rounded-lg bg-white px-2 text-xs ring-1 ring-gray-300 dark:bg-gray-900 dark:ring-gray-600">
          <span :class="[typed ? '' : 'text-gray-400', typed && !found && !still ? 'st-caret' : '']">{{ typed || 'John 3:16-18' }}</span>
        </div>
        <p v-if="looking" class="mt-1.5 text-[11px] font-semibold text-gray-400">Looking it up…</p>
        <div v-if="found" class="st-rise mt-1.5 rounded-lg bg-white p-2 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-[11px] font-bold text-primary dark:text-primary-light">{{ REFERENCE }}</p>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">KJV · 1 verse</p>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">{{ VERSE }}</p>
        </div>
        <div v-if="found" class="st-rise mt-2 flex gap-1.5" style="--d: 200ms">
          <span :class="['st-filled relative rounded-lg px-3 py-1.5 text-xs font-bold text-white', pressed ? 'st-tap bg-primary-hover' : 'bg-primary']">Add</span>
          <span class="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">Cancel</span>
        </div>
      </div>
    </div>
  </div>
</template>

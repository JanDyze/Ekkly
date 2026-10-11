<script setup>
import { BookOpen, Microphone } from '../../../../icons'

// Scene: the sermon and the lessons together. Sunday by Sunday, the message
// and each class's lesson sit side by side, with the passage they share, so
// the children hear on Sunday what the church hears.

const WEEKS = [
  {
    date: 'Oct 19',
    message: 'The man in the tree',
    passage: 'Luke 19',
    lessons: [
      { cls: 'Little Lambs', title: 'Zacchaeus climbs a tree' },
      { cls: 'Youth', title: 'Seen by Jesus' },
    ],
  },
  {
    date: 'Oct 26',
    message: 'A lamp for the road',
    passage: 'Psalm 119',
    lessons: [
      { cls: 'Little Lambs', title: 'A lamp for my feet' },
      { cls: 'Youth', title: 'Reading the Bible alone' },
    ],
  },
]
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">What’s taught</p>

    <section
      v-for="(week, w) in WEEKS"
      :key="week.date"
      class="st-rise mt-3 rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      :style="{ '--d': `${150 + w * 700}ms` }"
    >
      <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700/60">
        <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sunday, {{ week.date }}</span>
        <span
          class="st-pop rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
          :style="{ '--d': `${600 + w * 700}ms` }"
        >
          {{ week.passage }}
        </span>
      </div>
      <div class="flex items-center gap-2.5 px-3 py-2">
        <span class="st-filled flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Microphone class="size-4" />
        </span>
        <span class="min-w-0 truncate text-sm font-semibold">{{ week.message }}</span>
      </div>
      <div
        v-for="(lesson, i) in week.lessons"
        :key="lesson.cls"
        class="st-rise flex items-center gap-2.5 px-3 py-2"
        :style="{ '--d': `${350 + w * 700 + i * 120}ms` }"
      >
        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
          <BookOpen class="size-4" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm">{{ lesson.title }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ lesson.cls }}</span>
        </span>
      </div>
    </section>
  </div>
</template>

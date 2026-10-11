<script setup>
import { ChevronLeft, ChevronRight } from '../../../../icons'

// A chapter as the Bible page sets it: its name and translation over the
// verses, each with its small raised number, and the way to the chapters
// either side at the foot. A verse arrived at from a reference is lit, as the
// page lights the one it was sent to.

const props = defineProps({
  book: { type: String, required: true },
  chapter: { type: Number, required: true },
  version: { type: String, default: 'KJV' },
  verses: { type: Array, required: true },
  mark: { type: Number, default: null },
  previous: { type: String, default: '' },
  next: { type: String, default: '' },
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <article class="min-h-0 flex-1 px-3 pt-3">
      <h1 class="st-rise mb-2 text-lg font-bold">
        {{ props.book }} {{ props.chapter }}
        <span class="ml-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">{{ props.version }}</span>
      </h1>
      <p
        v-for="([n, text], i) in props.verses"
        :key="n"
        :class="[
          'st-rise -mx-1 rounded px-1 py-0.5 text-[13px] leading-[1.6] text-gray-800 transition-colors duration-700 dark:text-gray-200',
          props.mark === n ? 'bg-yellow-100 dark:bg-yellow-500/20' : '',
        ]"
        :style="{ '--d': `${80 + i * 70}ms` }"
      >
        <span class="mr-1 align-super text-[10px] font-bold text-gray-400 dark:text-gray-500">{{ n }}</span>
        {{ text }}
      </p>
    </article>

    <div class="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-3 pb-4 pt-2 dark:border-gray-700">
      <span class="flex min-w-0 items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        <ChevronLeft class="size-4 shrink-0" />
        <span class="truncate">{{ props.previous }}</span>
      </span>
      <span class="flex min-w-0 items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        <span class="truncate">{{ props.next }}</span>
        <ChevronRight class="size-4 shrink-0" />
      </span>
    </div>
  </div>
</template>

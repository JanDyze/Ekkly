<script setup>
import { BookOpen, ChevronDown, MagnifyingGlass, X } from '../../../../icons'

// The Bible page's one header, as views/Bible.vue draws it on a phone: the
// book and chapter (which opens the picker), the translation's short code and
// the search. With the search open it takes the whole row, as it does there.

const props = defineProps({
  book: { type: String, required: true },
  chapter: { type: Number, required: true },
  version: { type: String, default: 'KJV' },
  // A finger landing on the book's name or the translation, for the moment
  // the scene taps it.
  tapBook: { type: Boolean, default: false },
  tapVersion: { type: Boolean, default: false },
  // null while the search is folded away; text (even empty) once it is open.
  query: { type: String, default: null },
  caret: { type: Boolean, default: false },
})
</script>

<template>
  <div class="flex h-[64px] shrink-0 items-end gap-2 border-b border-gray-200 px-3 pb-2 dark:border-gray-700">
    <template v-if="props.query === null">
      <span
        :class="[
          'relative flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5',
          props.tapBook ? 'st-tap bg-gray-100 dark:bg-gray-800' : '',
        ]"
      >
        <BookOpen class="size-4 shrink-0 text-primary dark:text-primary-light" />
        <span class="truncate text-base font-bold">{{ props.book }} {{ props.chapter }}</span>
        <ChevronDown class="size-4 shrink-0 text-gray-400" />
      </span>
      <span class="flex h-10 flex-1 items-center justify-end gap-2">
        <span
          :class="[
            'relative shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold tracking-wide',
            props.tapVersion
              ? 'st-tap border-primary text-primary dark:border-primary-light dark:text-primary-light'
              : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400',
          ]"
        >
          {{ props.version }}
        </span>
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          <MagnifyingGlass class="size-5" />
        </span>
      </span>
    </template>

    <span
      v-else
      class="relative flex h-10 min-w-0 flex-1 items-center rounded-lg border border-transparent bg-white pl-10 pr-9 text-sm ring-2 ring-primary dark:bg-gray-800 dark:ring-primary-light"
    >
      <MagnifyingGlass class="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
      <span :class="['truncate', props.query ? '' : 'text-gray-400', props.caret ? 'st-caret' : '']">{{ props.query || 'Juan 3:16, or a phrase to find' }}</span>
      <X class="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
    </span>
  </div>
</template>

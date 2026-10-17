<script setup>
import { computed, inject } from 'vue'
// A group of rows inside an app's screens: a small heading, then the rows in
// one white block, the way a phone's settings read.
//
// The screens of an app had each grown their own way of laying things out —
// cards inside cards, a column of uppercase labels with names wrapping beside
// it, a pill on every other line. This is the one way now. A heading says what
// the rows are (with a count, and one action at most); each row is one strong
// line and at most one quiet one (ListRow). Nothing is boxed twice.

const props = defineProps({
  title: { type: String, default: '' },
  // A number after the heading — how many are in it.
  count: { type: [Number, String], default: null },
  // One quiet line under the block, for what the rows do not say.
  note: { type: String, default: '' },
  // Kept one block down the page even on a desktop's screen: a form's
  // fields, or rows that read as one sentence top to bottom.
  flat: { type: Boolean, default: false },
})

// On a desktop's screen (AppScreen's `desk`) the rows are cards side by side,
// as many across as the width holds, rather than one block the width of the
// screen with a name at one end and its date at the other.
const desk = inject('appScreenDesk', computed(() => false))
const grid = computed(() => desk.value && !props.flat)
</script>

<template>
  <section>
    <div v-if="title || $slots.action" class="mb-1.5 flex items-end justify-between gap-3 px-1">
      <h2 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {{ title }}
        <span v-if="count !== null && count !== ''" class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ count }}</span>
      </h2>
      <slot name="action" />
    </div>
    <div
      :class="[
        'divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70',
        grid
          ? 'lg:grid lg:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] lg:gap-3 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:bg-transparent lg:ring-0 lg:*:rounded-2xl lg:*:bg-white lg:*:ring-1 lg:*:ring-gray-200/70 dark:lg:bg-transparent dark:lg:*:bg-gray-800 dark:lg:*:ring-gray-700/70'
          : '',
      ]"
    >
      <slot />
    </div>
    <p v-if="note" class="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-400">{{ note }}</p>
  </section>
</template>

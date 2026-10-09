<script setup>
import { computed } from 'vue'

// The foot of a deck card about a handful of things (DeckCard): each one as a
// small chip — the Sundays still to enter, the gatherings still to count, the
// entries with no line — so the card shows which ones as well as how many.
// A few at most, and the rest as "+N": the section behind the card has them
// all.
//
// One line only, so the card's height never depends on how many there are:
// the chips share the line, each giving up width as it fills, and the words
// of one that is squeezed end in an ellipsis. None is ever cut off.
//
// `items`: `{ key, label, strike }`. `strike` crosses a chip out, for a date
// something no longer happens on.

const props = defineProps({
  items: { type: Array, default: () => [] },
  max: { type: Number, default: 4 },
  tone: { type: String, default: 'plain' },
})

const shown = computed(() => props.items.slice(0, props.max))
const more = computed(() => props.items.length - shown.value.length)

const CHIPS = {
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
  plain: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
}
</script>

<template>
  <ul class="flex min-w-0 gap-1.5">
    <li
      v-for="item in shown"
      :key="item.key"
      :class="[
        'min-w-0 max-w-40 shrink truncate rounded-full px-2.5 py-1 text-xs font-medium tabular-nums',
        CHIPS[tone] || CHIPS.plain,
        item.strike ? 'line-through decoration-2 opacity-70' : '',
      ]"
    >
      {{ item.label }}
    </li>
    <li v-if="more > 0" :class="['shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', CHIPS[tone] || CHIPS.plain]">
      +{{ more }}
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'
import { parseIso } from '../../utils/lineupUtils'

// A date as a small square at the start of a row: the month above, the day
// large. Rows of Sundays read down this column, so the date is found before
// anything else is read. `past` greys it; `highlight` fills it, for the one
// row that is you.

const props = defineProps({
  date: { type: String, required: true },
  past: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
})

const parts = computed(() => {
  const d = parseIso(props.date)
  return d
    ? { month: d.toLocaleDateString('en-US', { month: 'short' }), day: d.getDate() }
    : { month: '', day: '' }
})
</script>

<template>
  <span
    :class="[
      'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none',
      highlight
        ? 'date-tile-on bg-primary text-white'
        : past
          ? 'bg-gray-100 text-gray-400 dark:bg-gray-700/60 dark:text-gray-500'
          : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
    ]"
  >
    <span class="text-[10px] font-bold uppercase">{{ parts.month }}</span>
    <span class="mt-0.5 text-lg font-bold tabular-nums">{{ parts.day }}</span>
  </span>
</template>

<style scoped>
/* White on the dark page's lighter accent all but disappears, so the filled
   tile goes deeper there instead, as the app's hero card does. */
.dark .date-tile-on {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

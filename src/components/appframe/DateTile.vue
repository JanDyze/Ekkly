<script setup>
import { computed } from 'vue'
import { parseIso } from '../../utils/lineupUtils'

// A date as a small square at the start of a row: the month above, the day
// large. Rows of Sundays read down this column, so the date is found before
// anything else is read. `past` greys it; `highlight` fills it, for the one
// row that is you.
//
// `weekday` puts the day's name above the date instead of the month, and
// "Today" on today: in a list that spans a week or two, which day of the week
// is what someone is looking for, and the month is the same on every row.

const props = defineProps({
  date: { type: String, required: true },
  past: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
  weekday: { type: Boolean, default: false },
})

const parts = computed(() => {
  const d = parseIso(props.date)
  if (!d) return { month: '', day: '' }
  if (!props.weekday) return { month: d.toLocaleDateString('en-US', { month: 'short' }), day: d.getDate() }
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  return { month: isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }), day: d.getDate() }
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

<script setup>
// The foot of a deck card about the days ahead (DeckCard): the coming seven,
// each with its letter and date and a dot for each thing on it, today ringed.
// `mark` fills one day in, for a card about that day — a holiday, the next
// thing on — so where it falls in the week is seen rather than read.
//
// `days`: `{ date, letter, day, count, isToday }`, as useEventsOverview's
// `week` gives them.

defineProps({
  days: { type: Array, required: true },
  mark: { type: String, default: '' },
  tone: { type: String, default: 'plain' },
})
</script>

<template>
  <div class="grid grid-cols-7 gap-1" aria-hidden="true">
    <span
      v-for="day in days"
      :key="day.date"
      :class="[
        'flex flex-col items-center gap-1 rounded-xl py-1.5',
        tone === 'accent'
          ? day.date === mark
            ? 'bg-white text-primary'
            : day.isToday
              ? 'bg-white/20 ring-1 ring-white/50'
              : ''
          : day.date === mark
            ? 'deck-week-on bg-primary text-white'
            : day.isToday
              ? 'bg-primary/10 ring-1 ring-primary/30 dark:bg-primary-light/15 dark:ring-primary-light/40'
              : '',
      ]"
    >
      <span
        :class="[
          'text-[10px] font-semibold uppercase',
          day.date === mark ? 'opacity-80' : tone === 'accent' ? 'text-white/70' : 'text-gray-400 dark:text-gray-500',
        ]"
      >
        {{ day.letter }}
      </span>
      <span class="text-sm font-bold tabular-nums">{{ day.day }}</span>
      <span class="flex h-1.5 gap-0.5">
        <span
          v-for="n in Math.min(day.count, 3)"
          :key="n"
          :class="[
            'size-1.5 rounded-full',
            tone === 'accent' ? (day.date === mark ? 'bg-primary' : 'bg-white') : day.date === mark ? 'bg-white' : 'bg-primary dark:bg-primary-light',
          ]"
        />
      </span>
    </span>
  </div>
</template>

<style scoped>
/* White on the dark page's lighter accent all but disappears, so the marked
   day goes deeper there instead, as DateTile's does. */
:global(.dark) .deck-week-on {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

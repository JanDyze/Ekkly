<script setup>
// A date as a small square at the start of a row, the way the app's DateTile
// draws it: the month above, the day large; `highlight` fills it, for the one
// row that is you.

defineProps({
  month: { type: String, required: true },
  day: { type: [String, Number], required: true },
  highlight: { type: Boolean, default: false },
})
</script>

<template>
  <span
    :class="[
      'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none',
      highlight ? 'st-filled bg-primary text-white' : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
    ]"
  >
    <span class="text-[10px] font-bold uppercase">{{ month }}</span>
    <span class="mt-0.5 text-lg font-bold tabular-nums">{{ day }}</span>
  </span>
</template>

<script setup>
// Turnout as a ring: how full a gathering was, at a glance, in a fixed small
// space. It replaced a wash of colour across the whole row, which made every
// row a bar chart and pushed the words about.
//
// The circle's circumference is exactly 100 (r = 100 / 2π), so the share can
// be handed to stroke-dasharray as it is.
defineProps({
  /** 0-100. */
  share: { type: Number, required: true },
  /** Tailwind classes sizing the square it occupies. */
  size: { type: String, default: 'h-10 w-10' },
  /** Tailwind classes for the percentage inside. */
  textClass: { type: String, default: 'text-[10px]' },
})
</script>

<template>
  <div :class="['relative shrink-0', size]" role="img" :aria-label="`${share}% of those expected came`">
    <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90" aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke-width="3.5"
        class="stroke-gray-200 dark:stroke-gray-600"
      />
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke-width="3.5"
        stroke-linecap="round"
        class="stroke-primary transition-[stroke-dasharray] duration-500 dark:stroke-primary-light"
        :stroke-dasharray="`${share} 100`"
      />
    </svg>
    <span
      :class="[
        'absolute inset-0 flex items-center justify-center font-bold tabular-nums text-gray-900 dark:text-white',
        textClass,
      ]"
    >
      {{ share }}%
    </span>
  </div>
</template>

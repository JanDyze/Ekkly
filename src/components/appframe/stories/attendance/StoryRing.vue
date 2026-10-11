<script setup>
// Turnout as a ring, drawn the way the app's TurnoutRing is (components/
// attendance/TurnoutRing.vue): a circle whose circumference is exactly 100,
// so the share can be handed to stroke-dasharray as it is. Its own copy here
// so the fill can take its time, the way a story wants it seen, without
// changing the app's ring.

defineProps({
  share: { type: Number, required: true },
  size: { type: String, default: 'size-10' },
  textClass: { type: String, default: 'text-[10px]' },
})
</script>

<template>
  <div :class="['relative shrink-0', size]" aria-hidden="true">
    <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke-width="3.5" class="stroke-gray-200 dark:stroke-gray-600" />
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke-width="3.5"
        stroke-linecap="round"
        class="ring-fill stroke-primary dark:stroke-primary-light"
        :stroke-dasharray="`${share} 100`"
      />
    </svg>
    <span :class="['absolute inset-0 flex items-center justify-center font-bold tabular-nums text-gray-900 dark:text-white', textClass]">
      {{ share }}%
    </span>
  </div>
</template>

<style scoped>
.ring-fill {
  transition: stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .ring-fill {
    transition: none;
  }
}
</style>

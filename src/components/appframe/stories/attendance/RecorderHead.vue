<script setup>
import { computed } from 'vue'
import { ArrowLeft } from '../../../../icons'
import StoryRing from './StoryRing.vue'

// The recorder's header, as AttendanceChecker draws it: the way back, the
// gathering and how far along, the ring, and behind it all a wash of the
// church's colour that fills across as the room does.

const props = defineProps({
  title: { type: String, required: true },
  date: { type: String, required: true },
  present: { type: Number, required: true },
  expected: { type: Number, required: true },
})

const share = computed(() => Math.round((props.present / props.expected) * 100))
</script>

<template>
  <div class="relative shrink-0 rounded-t-[28px] border-b border-gray-200 bg-white px-4 pb-2 pt-5 dark:border-gray-700 dark:bg-gray-800">
    <div
      class="head-fill pointer-events-none absolute inset-y-0 left-0 rounded-tl-[28px] bg-linear-to-r from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10"
      :style="{ width: `${share}%` }"
    />
    <div class="relative flex items-start gap-2">
      <ArrowLeft class="mt-1 size-5 shrink-0 text-gray-500 dark:text-gray-400" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-base font-bold leading-snug">{{ title }}</p>
        <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
          {{ date }} · <span class="tabular-nums">{{ present }}</span> of {{ expected }}
        </p>
      </div>
      <StoryRing :share="share" size="size-11" text-class="text-[11px]" class="mt-0.5" />
    </div>
  </div>
</template>

<style scoped>
.head-fill {
  transition: width 0.5s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .head-fill {
    transition: none;
  }
}
</style>

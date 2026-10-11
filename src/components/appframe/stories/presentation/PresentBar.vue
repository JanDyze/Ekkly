<script setup>
import { ArrowLeft, Play, X } from '../../../../icons'

// The top of the booth's page (views/Present.vue): which Sunday, how many
// slides and whether it is live, then Blank and Present. Drawn once for the
// scenes that show it, with a thumb able to land on either button.

defineProps({
  slides: { type: Number, default: 0 },
  live: { type: Boolean, default: false },
  blanked: { type: Boolean, default: false },
  tapBlank: { type: Boolean, default: false },
  tapPresent: { type: Boolean, default: false },
})
</script>

<template>
  <div class="st-rise flex items-center gap-2 rounded-t-[28px] border-b border-gray-200 bg-white px-3.5 pb-2.5 pt-5 dark:border-gray-700 dark:bg-gray-800">
    <ArrowLeft class="size-4 shrink-0 text-gray-400" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-bold">Sunday, Oct 18</p>
      <p class="truncate text-[11px] font-medium text-gray-400">
        {{ slides }} slides<span v-if="live" class="text-emerald-600 dark:text-emerald-400"> · live</span>
      </p>
    </div>
    <span
      :class="[
        'relative shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-bold',
        blanked ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        tapBlank ? 'st-tap' : '',
      ]"
    >
      {{ blanked ? 'Unblank' : 'Blank' }}
    </span>
    <span
      :class="[
        'relative flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white',
        live ? 'bg-red-500' : 'st-filled bg-primary',
        tapPresent ? 'st-tap' : '',
      ]"
    >
      <component :is="live ? X : Play" class="size-3" />
      {{ live ? 'Stop' : 'Present' }}
    </span>
  </div>
</template>

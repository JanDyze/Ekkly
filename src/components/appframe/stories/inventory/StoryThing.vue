<script setup>
import { TONES } from './cast'

// A made-up thing's picture in Inventory's story: the thing whole on a soft
// square, the way the app shows an item cut out of its photo.

defineProps({
  thing: { type: Object, required: true },
  size: { type: String, default: 'size-10 rounded-xl' },
  icon: { type: String, default: 'size-6' },
})
</script>

<template>
  <span :class="['flex shrink-0 items-center justify-center bg-gray-100 dark:bg-gray-700', size]" aria-hidden="true">
    <component :is="thing.icon" :class="[icon, TONES[thing.tone] || TONES.sky]" />
  </span>
</template>

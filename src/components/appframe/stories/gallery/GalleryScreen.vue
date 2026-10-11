<script setup>
import { ChevronLeft } from '../../../../icons'
import AppArt from '../../../common/AppArt.vue'

// A screen of the Gallery app as AppScreen draws it: the way back, the
// section's drawing, its name and a line under it, then what the scene puts
// under that.

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  art: { type: String, default: 'gallery-albums' },
})
</script>

<template>
  <div class="relative h-full">
    <div class="st-rise flex h-16 items-center gap-2 border-b border-gray-200/70 px-4 pt-2 dark:border-gray-800/70">
      <span class="-ml-2 flex size-10 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400"><ChevronLeft class="size-5" /></span>
      <AppArt :app-key="props.art" class="size-8 shrink-0" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xl font-bold leading-tight tracking-tight">{{ props.title }}</span>
        <span v-if="props.subtitle" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ props.subtitle }}</span>
      </span>
      <slot name="action" />
    </div>
    <div class="px-3 pt-4">
      <slot />
    </div>
    <slot name="over" />
  </div>
</template>

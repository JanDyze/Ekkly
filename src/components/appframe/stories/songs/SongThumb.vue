<script setup>
import { Play } from '../../../../icons'

// A song's picture at the start of a row, as the app's SongThumb draws its
// recording's thumbnail: a small landscape picture with a play mark over it.

defineProps({
  src: { type: String, required: true },
  play: { type: Boolean, default: true },
})
</script>

<template>
  <span class="relative flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
    <img :src="src" alt="" class="h-full w-full rounded-lg object-cover" />
    <span v-if="play" class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/10">
      <span class="flex size-5 items-center justify-center rounded-full bg-black/50">
        <Play class="size-2.5 text-white" />
      </span>
    </span>
  </span>
</template>

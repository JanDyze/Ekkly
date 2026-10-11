<script setup>
import { computed, ref, watch } from 'vue'
import { Play, Youtube } from '../../icons'
import { getYoutubeThumbnail } from '../../utils/songUtils'

// A song's picture at the start of a row: its recording's thumbnail, the way
// the song list has always shown it. Thumbnails come from YouTube and are the
// first thing to fail offline, so a failure falls back to a drawn icon rather
// than a broken image.

const props = defineProps({
  url: { type: String, default: '' },
  // The play mark over the picture, for a row whose tap plays the song.
  play: { type: Boolean, default: false },
})

const failed = ref(false)
const src = computed(() => getYoutubeThumbnail(props.url))
watch(src, () => {
  failed.value = false
})
</script>

<template>
  <span class="relative flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
    <template v-if="src && !failed">
      <img :src="src" alt="" loading="lazy" class="h-full w-full object-cover" @error="failed = true" />
      <span v-if="play" class="absolute inset-0 flex items-center justify-center bg-black/10">
        <span class="flex size-5 items-center justify-center rounded-full bg-black/50">
          <Play class="size-2.5 text-white" />
        </span>
      </span>
    </template>
    <Youtube v-else class="size-5 text-red-500" />
  </span>
</template>

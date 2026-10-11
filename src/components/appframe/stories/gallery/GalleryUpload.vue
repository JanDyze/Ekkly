<script setup>
import { computed, ref } from 'vue'
import { ImagePlus, Loader2 } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import GalleryScreen from './GalleryScreen.vue'
import PhotoGrid from './PhotoGrid.vue'
import { ALBUMS, SUNDAY } from './photos'

// Scene: a whole Sunday put up at once. The service's album is empty; Add
// photos is pressed, nine are picked, and they land one after another into
// the grid while the count above it climbs, so the first can be looked at
// while the rest are still going up.

const album = ALBUMS[0]
const pressed = ref(false)
const total = ref(0)
const done = ref(0)
const finished = ref(false)
const { at } = useSceneTimeline()

at(900, () => (pressed.value = true))
at(1200, () => (total.value = SUNDAY.length))
SUNDAY.forEach((_, i) => at(1450 + i * 260, () => (done.value = i + 1)))
at(1450 + SUNDAY.length * 260 + 250, () => (finished.value = true))

const subtitle = computed(() =>
  [album.long, album.place, done.value ? `${done.value} ${done.value === 1 ? 'photo' : 'photos'}` : ''].filter(Boolean).join(' · ')
)
</script>

<template>
  <GalleryScreen :title="album.title" :subtitle="subtitle" art="gallery-albums">
    <div
      v-if="total && !finished"
      class="mb-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70"
    >
      <div class="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
        <span>Adding photos…</span>
        <span class="tabular-nums">{{ done }} of {{ total }}</span>
      </div>
      <div class="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-gray-700">
        <div class="h-full rounded-full bg-primary transition-all duration-300 dark:bg-primary-light" :style="{ width: `${(done / total) * 100}%` }" />
      </div>
    </div>

    <PhotoGrid v-if="done" :photos="SUNDAY.slice(0, done)" :places="SUNDAY.length" :step="0" />

    <div v-else class="st-rise px-6 py-12 text-center" style="--d: 100ms">
      <ImagePlus class="mx-auto mb-3 size-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Nothing in this album yet</p>
      <p class="mx-auto mt-1 text-xs text-gray-400 dark:text-gray-500">Put up the photos taken there, and everyone can see them.</p>
    </div>

    <template #over>
      <!-- Inside an album the button does the one thing there is to do. -->
      <span
        :class="[
          'st-pop st-filled absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-full text-white',
          pressed && !finished ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
        style="--d: 500ms"
      >
        <Loader2 v-if="total && !finished" class="size-6 animate-spin" />
        <ImagePlus v-else class="size-6" />
      </span>
    </template>
  </GalleryScreen>
</template>

<script setup>
import { ChevronRight } from '../../../../icons'
import GalleryScreen from './GalleryScreen.vue'
import PhotoGrid from './PhotoGrid.vue'
import { ALBUMS, PHOTOS, SUNDAY } from './photos'

// Scene: Sunday's photos without hunting for them. Recent photos gathers the
// newest from every album, album by album, and counts the ones put up since
// this person last looked, which is what most people open a gallery for.
// Each album shows its newest row; the album itself has the rest, and a
// longer list would run off the foot of the screen.

const GROUPS = [
  { album: ALBUMS[0], photos: SUNDAY.slice(0, 3), fresh: 3 },
  { album: ALBUMS[1], photos: [PHOTOS.baptism, PHOTOS.fellowshipMeal, PHOTOS.smallGroup], fresh: 0 },
]
</script>

<template>
  <GalleryScreen title="Recent photos" subtitle="6 photos this week" art="gallery-recent">
    <div class="flex flex-col gap-4">
      <section v-for="(group, g) in GROUPS" :key="group.album.id">
        <div class="st-rise mb-1.5 flex items-center gap-2 px-1 py-0.5" :style="{ '--d': `${100 + g * 700}ms` }">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">{{ group.album.title }}</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ group.album.date }} · {{ group.album.place }}</span>
          </span>
          <span
            v-if="group.fresh"
            class="st-pop shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary dark:bg-primary-light/15 dark:text-primary-light"
            style="--d: 1100ms"
          >
            {{ group.fresh }} new
          </span>
          <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
        <PhotoGrid :photos="group.photos" :delay="200 + g * 700" :step="90" />
      </section>
    </div>
  </GalleryScreen>
</template>

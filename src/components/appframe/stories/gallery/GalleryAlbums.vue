<script setup>
import { ref } from 'vue'
import { MagnifyingGlass } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import GalleryScreen from './GalleryScreen.vue'
import { ALBUMS } from './photos'

// Scene: every gathering, in pictures. The month's albums come in as their
// covers, two across, each named and dated over its picture the way
// AlbumCard draws it, and a thumb goes to the youth camp's.

const tapped = ref(null)
const { at } = useSceneTimeline()
at(2900, () => (tapped.value = 'youth'))
</script>

<template>
  <GalleryScreen title="Albums" subtitle="24 albums" art="gallery-albums">
    <h2 class="st-rise mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 80ms">
      October 2026
      <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ ALBUMS.length }}</span>
    </h2>

    <div class="grid grid-cols-2 gap-2">
      <span
        v-for="(album, i) in ALBUMS"
        :key="album.id"
        :class="[
          'st-pop relative block aspect-4/3 w-full rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900',
          tapped === album.id ? 'st-tap text-white' : '',
        ]"
        :style="{ '--d': `${200 + i * 160}ms` }"
      >
        <img :src="album.cover" alt="" class="absolute inset-0 size-full rounded-xl object-cover" />
        <span class="absolute inset-x-0 bottom-0 rounded-b-xl bg-linear-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2 pt-6">
          <span class="block text-[13px] font-semibold leading-snug text-white">{{ album.title }}</span>
          <span class="mt-0.5 block text-[11px] font-medium text-white/75">{{ album.date }}</span>
        </span>
      </span>
    </div>

    <template #over>
      <!-- Search, from the floating button rather than a bar over the covers. -->
      <span class="st-pop st-filled absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-full bg-primary text-white" style="--d: 900ms">
        <MagnifyingGlass class="size-6" />
      </span>
    </template>
  </GalleryScreen>
</template>

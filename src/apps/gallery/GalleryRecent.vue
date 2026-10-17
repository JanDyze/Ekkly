<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import { useGalleryOverview, markAllSeen, RECENT_PHOTOS } from '../../composables/useGalleryOverview'
import { useListScrollMemory } from '../../composables/useListScrollMemory'
import { formatShortDate } from '../../../lib/occurrences'
import { ChevronRight, Images } from '../../icons'

// The newest photos, whatever album they went into, album by album in the
// order they went up. It is what most people open a gallery for — the
// pictures from Sunday — without having to know which album to look in.
//
// The ones added since this person last looked are marked new while they are
// here; leaving the screen counts as having seen them, so the home's card
// about them goes. Leaving, not arriving: marked on arrival, nothing here
// could say which ones were new.

const router = useRouter()
const { recentByAlbum, recent, newPhotos, photosLoading, loading } = useGalleryOverview()

const newIds = computed(() => new Set(newPhotos.value.map((photo) => photo.id)))

const subtitle = computed(() => {
  if (photosLoading.value || loading.value) return ''
  const n = newPhotos.value.length
  if (n) return `${n.toLocaleString()} new since you last looked`
  return recent.value.length ? `The newest ${recent.value.length.toLocaleString()}` : ''
})

const screen = ref(null)
const listScroller = computed(() => screen.value?.scroller || null)
useListScrollMemory(listScroller)

// Closing the app does not unmount the screen, so going to the background
// counts as leaving too.
const onHide = () => {
  if (document.visibilityState === 'hidden') markAllSeen()
}
onMounted(() => document.addEventListener('visibilitychange', onHide))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onHide)
  markAllSeen()
})

const openPhoto = (album, photo) => {
  router.push({ name: 'GalleryPhoto', params: { id: album.id, photoId: photo.id } })
}
</script>

<template>
  <AppScreen ref="screen" title="Recent photos" :subtitle="subtitle" :back="{ name: 'GalleryHome' }" root="/gallery" desk>
    <div v-if="photosLoading || loading" class="flex flex-col gap-5">
      <section v-for="i in 2" :key="i">
        <div class="mb-2 h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
        <div class="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl">
          <div v-for="j in 6" :key="j" class="aspect-square animate-pulse bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </section>
    </div>

    <div v-else-if="!recentByAlbum.length" class="px-6 py-16 text-center">
      <Images class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-600 dark:text-gray-300">No photos yet</p>
      <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
        Photos from services and events show up here as soon as they are put up.
      </p>
    </div>

    <div v-else class="flex flex-col gap-5">
      <section v-for="group in recentByAlbum" :key="group.album.id">
        <!-- The album's name leads to the whole album: these are only its
             newest few. -->
        <RouterLink
          :to="{ name: 'GalleryAlbum', params: { id: group.album.id } }"
          class="group mb-1.5 flex items-center gap-2 rounded-lg px-1 py-0.5"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">
              {{ group.album.title || 'Untitled album' }}
            </span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
              {{ [group.album.date ? formatShortDate(group.album.date) : '', group.album.location].filter(Boolean).join(' · ') }}
            </span>
          </span>
          <span
            v-if="group.photos.some((photo) => newIds.has(photo.id))"
            class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary dark:bg-primary-light/15 dark:text-primary-light"
          >
            {{ group.photos.filter((photo) => newIds.has(photo.id)).length }} new
          </span>
          <ChevronRight class="size-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-gray-600" />
        </RouterLink>

        <div class="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl sm:grid-cols-4">
          <button
            v-for="photo in group.photos"
            :key="photo.id"
            type="button"
            @click="openPhoto(group.album, photo)"
            class="relative aspect-square overflow-hidden bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset dark:bg-gray-800"
            :aria-label="`Open photo from ${group.album.title}`"
          >
            <img :src="photo.url" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover" />
          </button>
        </div>
      </section>

      <!-- Only so many are read at once; the albums have the rest. -->
      <p v-if="recent.length >= RECENT_PHOTOS - 5" class="px-1 text-center text-xs text-gray-500 dark:text-gray-400">
        Older photos are in their
        <RouterLink :to="{ name: 'Gallery' }" class="font-medium text-primary dark:text-primary-light">albums</RouterLink>.
      </p>
    </div>
  </AppScreen>
</template>

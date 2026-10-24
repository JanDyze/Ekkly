<script setup>
import { usePageSearch } from '../../composables/usePageSearch'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import GalleryToolbar from '../../components/gallery/GalleryToolbar.vue'
import GalleryFab from '../../components/gallery/GalleryFab.vue'
import AlbumRow from '../../components/gallery/AlbumRow.vue'
import { useGalleryOverview } from '../../composables/useGalleryOverview'
import { useGalleryUpload } from '../../composables/useGalleryUpload'
import { matchesAlbumQuery } from '../../composables/useGalleryAlbums'
import { formatMonth } from '../../../lib/occurrences'
import { CheckCircle, SearchX } from '../../icons'

// Everything in the gallery with no photos in it, for whoever puts them up:
// the albums somebody made that are still empty (nearly always an upload
// that failed after the album was written), then every gathering of the last
// eight weeks nobody has put photos of, newest first.
//
// These used to sit as rows among the covers on the albums list. They are a
// chore rather than something to look at, so they have a screen of their own,
// and the albums list is pictures alone. A tap on a gathering goes straight to
// the photo picker: adding photos is the only thing an empty album is for.
//
// Older gatherings are left off unless searched for — a season of weekly
// services nobody photographed would bury this week's — and a search reaches
// all of them.

const router = useRouter()
const { albums, waiting, emptyAlbums, loading } = useGalleryOverview({ photos: false })
const { isUploadingTo, pickPhotosFor } = useGalleryUpload()

/* ------------------------------------------------------------------ search */
const searchQuery = ref('')
// Search is a mode, opened from the floating button. Closing it clears the
// query: a bar you cannot see must not still be filtering the list.
const searchOpen = ref(false)
const openSearch = () => { searchOpen.value = true }
// Ctrl+G opens it too (usePageSearch).
usePageSearch(openSearch)
const closeSearch = () => {
  searchOpen.value = false
  searchQuery.value = ''
}
const searching = computed(() => Boolean(searchQuery.value.trim()))

const everyEmpty = computed(() => albums.value.filter((album) => !album.hasPhotos))

const made = computed(() =>
  searching.value ? emptyAlbums.value.filter((album) => matchesAlbumQuery(album, searchQuery.value)) : emptyAlbums.value
)

const gatherings = computed(() =>
  searching.value
    ? everyEmpty.value.filter((album) => !album.existsInGallery && matchesAlbumQuery(album, searchQuery.value))
    : waiting.value
)

// Month by month, newest first, the way the albums read.
const months = computed(() => {
  const groups = new Map()
  for (const album of gatherings.value) {
    const key = String(album.date || '').slice(0, 7) || 'undated'
    if (!groups.has(key)) groups.set(key, { key, label: album.date ? formatMonth(album.date) : 'No date', albums: [] })
    groups.get(key).albums.push(album)
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
})

const shown = computed(() => made.value.length + gatherings.value.length)

const subtitle = computed(() => {
  if (loading.value || searching.value) return ''
  const n = shown.value
  return n ? `${n.toLocaleString()} without photos` : ''
})

// A made album may be one the person wants to delete rather than fill, so it
// opens, where both are a tap away.
const openAlbum = (album) => router.push({ name: 'GalleryAlbum', params: { id: album.id } })
</script>

<template>
  <div class="relative h-full">
    <AppScreen title="Needs photos" :subtitle="subtitle" :back="{ name: 'GalleryHome' }" root="/gallery" desk>
      <GalleryToolbar
        :search-query="searchQuery"
        :open="searchOpen"
        :result-count="shown"
        :total-count="everyEmpty.length"
        placeholder="Gathering, month or place"
        @update:search-query="searchQuery = $event"
        @close="closeSearch"
      />

      <div
        v-if="loading"
        class="rows-round divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
      >
        <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-3 py-2 sm:px-4">
          <div class="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-600"></div>
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
            <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
          </div>
        </div>
      </div>

      <div v-else-if="!shown" class="px-6 py-16 text-center">
        <component
          :is="searching ? SearchX : CheckCircle"
          class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
        />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ searching ? 'Nothing matches that.' : 'Every gathering has its photos' }}
        </p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
          {{ searching
            ? 'Try the month, the gathering, or where it was.'
            : 'Each one that happens waits here until somebody puts its photos up.' }}
        </p>
      </div>

      <div v-else class="flex flex-col gap-5">
        <ListGroup v-if="made.length" title="Made, but empty" :count="made.length" note="Put photos in, or delete the album.">
          <!-- Drawn as AlbumRow draws an album that opens rather than offers
               the picker (its coverBroken), ending in a chevron. -->
          <AlbumRow
            v-for="album in made"
            :key="album.id"
            :album="{ ...album, coverBroken: true }"
            @add="openAlbum"
          />
        </ListGroup>

        <ListGroup v-for="month in months" :key="month.key" :title="month.label" :count="month.albums.length">
          <AlbumRow
            v-for="album in month.albums"
            :key="album.id"
            :album="album"
            :uploading="isUploadingTo(album)"
            @add="pickPhotosFor"
          />
        </ListGroup>

        <p v-if="!searching" class="px-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Older gatherings without photos turn up when you search for them.
        </p>
      </div>
    </AppScreen>

    <!-- Search only: a new album is made from Albums, where it will be seen. -->
    <GalleryFab :can-manage="false" @search="openSearch" />
  </div>
</template>

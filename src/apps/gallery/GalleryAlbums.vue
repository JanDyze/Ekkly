<script setup>
import { usePageSearch } from '../../composables/usePageSearch'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import GalleryToolbar from '../../components/gallery/GalleryToolbar.vue'
import GalleryFab from '../../components/gallery/GalleryFab.vue'
import AlbumCard from '../../components/gallery/AlbumCard.vue'
import AlbumRow from '../../components/gallery/AlbumRow.vue'
import NewAlbumSheet from '../../components/gallery/NewAlbumSheet.vue'
import { useGalleryAlbums, matchesAlbumQuery } from '../../composables/useGalleryAlbums'
import { useGalleryUpload } from '../../composables/useGalleryUpload'
import { useListScrollMemory } from '../../composables/useListScrollMemory'
import { formatMonth } from '../../../lib/occurrences'
import { Image as ImageIcon, SearchX } from '../../icons'

// Every album with photos in it, month by month, newest first: what the
// Gallery page was before Gallery was an app, and its first section now. The
// same screen shows one kind's albums (/gallery/kinds/:kind), told which by
// its route, the way Tasks' one list screen is told which tasks.
//
// The gatherings still waiting for photos used to sit among the covers here as
// rows, for whoever puts photos up. They have a section of their own now
// (Needs photos), so this is the albums to look at, for everyone alike.

const route = useRoute()
const router = useRouter()
const { albums, loading } = useGalleryAlbums()
const { canEdit, uploading, createAlbum } = useGalleryUpload()

/** The kind this screen is narrowed to, or '' for every album. */
const kind = computed(() => String(route.params.kind || ''))

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

/* -------------------------------------------------------------------- list */
// Covers whose file failed to load. Kept by id so the album drops to a row for
// the rest of the visit instead of retrying a broken image on every render.
const brokenCovers = ref(new Set())
const markBroken = (album) => {
  const next = new Set(brokenCovers.value)
  next.add(album.id)
  brokenCovers.value = next
}

const listed = computed(() =>
  albums.value
    .filter((album) => album.hasPhotos && (!kind.value || (album.category || 'General') === kind.value))
    .map((album) => (brokenCovers.value.has(album.id) ? { ...album, coverBroken: true } : album))
)

const visibleAlbums = computed(() =>
  searching.value ? listed.value.filter((album) => matchesAlbumQuery(album, searchQuery.value)) : listed.value
)

// Month by month, newest first. Within a month the covers lead and an album
// whose cover would not load follows as a row — mixing the two by date would
// break the grid into single cards between rows.
const albumGroups = computed(() => {
  const groups = new Map()
  for (const album of visibleAlbums.value) {
    const key = album.date ? String(album.date).slice(0, 7) : 'undated'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: album.date ? formatMonth(album.date) : 'No date',
        covers: [],
        rows: [],
      })
    }
    groups.get(key)[album.coverBroken ? 'rows' : 'covers'].push(album)
  }
  return [...groups.values()].sort((a, b) =>
    a.key === 'undated' ? 1 : b.key === 'undated' ? -1 : b.key.localeCompare(a.key)
  )
})

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = listed.value.length
  return `${n.toLocaleString()} ${n === 1 ? 'album' : 'albums'}`
})

// Opening an album leaves this screen, so the list remembers where it was and
// is there again on the way back.
const screen = ref(null)
const listScroller = computed(() => screen.value?.scroller || null)
useListScrollMemory(listScroller)

const openAlbum = (album) => {
  router.push({ name: 'GalleryAlbum', params: { id: album.id } })
}

/* -------------------------------------------------------------- new album */
const showNewAlbum = ref(false)

const onCreate = (details) => {
  showNewAlbum.value = false
  createAlbum(details)
}
</script>

<template>
  <div class="relative h-full">
    <AppScreen
      ref="screen"
      :title="kind || 'Albums'"
      :subtitle="subtitle"
      :back="kind ? { name: 'GalleryKinds' } : { name: 'GalleryHome' }"
      root="/gallery" desk
    >
      <!-- Opened from the floating button rather than always sitting there. -->
      <GalleryToolbar
        :search-query="searchQuery"
        :open="searchOpen"
        :result-count="visibleAlbums.length"
        :total-count="listed.length"
        @update:search-query="searchQuery = $event"
        @close="closeSearch"
      />

      <div v-if="loading" class="flex flex-col gap-5">
        <section v-for="i in 2" :key="i">
          <div class="mb-2 h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div
              v-for="j in 4"
              :key="j"
              class="aspect-4/3 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            ></div>
          </div>
        </section>
      </div>

      <div v-else-if="visibleAlbums.length === 0" class="px-6 py-16 text-center">
        <component
          :is="searching ? SearchX : ImageIcon"
          class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
        />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ searching ? 'No album matches that.' : 'No photos yet' }}
        </p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
          {{ searching
            ? 'Try the month, the gathering, or where it was.'
            : canEdit
              ? 'Every gathering waits in Needs photos until somebody puts its photos up.'
              : 'Photos from services and events will show up here.' }}
        </p>
        <button
          v-if="!searching && canEdit"
          type="button"
          @click="router.push({ name: 'GalleryWaiting' })"
          class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          See what needs photos
        </button>
      </div>

      <div v-else class="flex flex-col gap-5">
        <section v-for="group in albumGroups" :key="group.key">
          <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {{ group.label }}
            <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">
              {{ group.covers.length + group.rows.length }}
            </span>
          </h2>

          <div v-if="group.covers.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <AlbumCard
              v-for="album in group.covers"
              :key="album.id"
              :album="album"
              @open="openAlbum"
              @broken="markBroken"
            />
          </div>

          <div
            v-if="group.rows.length"
            :class="[
              'divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70',
              group.covers.length ? 'mt-2' : '',
            ]"
          >
            <AlbumRow v-for="album in group.rows" :key="album.id" :album="album" @add="openAlbum" />
          </div>
        </section>
      </div>
    </AppScreen>

    <!-- Floating actions: search, and a new album for whoever may make one. -->
    <GalleryFab
      v-if="!showNewAlbum"
      :can-manage="canEdit"
      :uploading="uploading"
      @search="openSearch"
      @add="showNewAlbum = true"
    />

    <NewAlbumSheet :show="showNewAlbum" @close="showNewAlbum = false" @create="onCreate" />
  </div>
</template>

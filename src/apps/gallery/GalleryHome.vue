<script setup>
import { computed } from 'vue'
import { Camera, ClockCounterClockwise, ImagePlus, Images } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useGalleryOverview } from '../../composables/useGalleryOverview'
import { useGalleryUpload } from '../../composables/useGalleryUpload'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { formatShortDate } from '../../../lib/occurrences'

// The Gallery app's home, built the way People's and Minutes' are. One
// screen, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useGalleryOverview explains: this week's gatherings still without
//      photos, the photos added since you last looked, albums made and left
//      empty, and an album from this week a year ago. Under them, the card
//      that is always there: how many albums the church has, their covers
//      along its foot.
//
//      A gallery is pictures, so its cards show them: the new photos
//      themselves along the foot, a year-ago album's cover where another
//      app's card has a date. An album with no picture shows none — never a
//      stand-in photo, which would look like the church's own.
//   2. The doors: the albums, the newest photos, the albums by kind, and for
//      whoever puts photos up, what still needs them.
//
// It used to be one page, the albums month by month with the empty gatherings
// among them. The albums are a section now (GalleryAlbums), and the empty
// gatherings a chore of their own (GalleryWaiting).

const {
  loading,
  photosLoading,
  canEdit,
  withPhotos,
  newPhotos,
  newByAlbum,
  waitingThisWeek,
  emptyAlbums,
  yearAgo,
} = useGalleryOverview()
const { pickPhotosFor, isUploadingTo } = useGalleryUpload()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

const albumLink = (album) => ({ name: 'GalleryAlbum', params: { id: album.id } })
const whereAndWhen = (album) =>
  [album.date ? formatShortDate(album.date) : '', album.location].filter(Boolean).join(' · ')

/** How many photos a foot shows before "+N": the rest are a tap away. */
const STRIP = 5

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // This week's gatherings with no photos yet, for whoever puts them up. One
  // is a tap to the picker; several lead to the list, the newest first.
  if (canEdit.value && waitingThisWeek.value.length) {
    const first = waitingThisWeek.value[0]
    const one = waitingThisWeek.value.length === 1
    list.push({
      kind: 'waiting',
      key: `waiting:${waitingThisWeek.value.map((album) => album.id).join(',')}`,
      tone: 'plain',
      dismissible: true,
      kicker: 'Needs photos',
      title: one
        ? `${first.title || 'This gathering'} has no photos yet`
        : `${plural(waitingThisWeek.value.length, 'gathering', 'gatherings')} this week have no photos`,
      detail: one ? 'Put up the photos taken there, and everyone can see them.' : 'The newest first.',
      album: one ? first : null,
      date: first.date,
      chips: one ? [] : waitingThisWeek.value.map((album) => ({ key: album.id, label: album.title || 'Gathering' })),
    })
  }

  // The photos added since you last looked. All in one album, the card opens
  // it; across several, it opens the newest photos. Keyed by the newest, so a
  // photo added after it was put away brings it back.
  if (!photosLoading.value && newPhotos.value.length) {
    const groups = newByAlbum.value
    const one = groups.length === 1
    list.push({
      kind: 'new',
      key: `new:${newPhotos.value[0].id}`,
      tone: 'plain',
      dismissible: true,
      kicker: 'New photos',
      title: one
        ? `${plural(newPhotos.value.length, 'new photo', 'new photos')} from ${groups[0].album.title || 'an album'}`
        : `${plural(newPhotos.value.length, 'new photo', 'new photos')} in ${groups.length} albums`,
      detail: one ? whereAndWhen(groups[0].album) : 'Since you last looked.',
      to: one ? albumLink(groups[0].album) : { name: 'GalleryRecent' },
      photos: newPhotos.value,
    })
  }

  // Albums made and left empty: a standing chore, so put away it stays away
  // until there are more (AppHeroDeck's `remember`), and passed in even when
  // there are none, so the mark can follow the pile down.
  if (canEdit.value) {
    list.push({
      kind: 'empty',
      key: 'empty',
      tone: 'plain',
      icon: ImagePlus,
      dismissible: true,
      remember: true,
      level: emptyAlbums.value.length,
      kicker: 'Still to fill',
      title: plural(emptyAlbums.value.length, 'album has nothing in it', 'albums have nothing in them'),
      detail: emptyAlbums.value.length === 1 ? 'Put the photos in, or delete it.' : 'Put the photos in, or delete them.',
      to: { name: 'GalleryWaiting' },
      chips: emptyAlbums.value.map((album) => ({ key: album.id, label: album.title || 'Untitled album' })),
    })
  }

  // A year ago this week, from the church's own albums.
  if (yearAgo.value) {
    list.push({
      kind: 'year',
      key: `year:${yearAgo.value.id}`,
      tone: 'plain',
      dismissible: true,
      kicker: 'A year ago this week',
      title: yearAgo.value.title || 'An album from last year',
      detail: whereAndWhen(yearAgo.value),
      to: albumLink(yearAgo.value),
      cover: yearAgo.value.coverUrl,
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: the albums, their covers along its foot. */
const alwaysCard = computed(() => {
  const total = withPhotos.value.length
  const newest = withPhotos.value[0]
  return {
    kind: 'albums',
    key: 'albums',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Gallery' : total ? plural(total, 'album', 'albums') : 'No photos yet',
    detail: loading.value
      ? ''
      : newest
        ? `Newest: ${newest.title || 'Untitled album'}`
        : canEdit.value
          ? 'Put up the photos from a gathering, and everyone can see them.'
          : 'Photos from services and events show here.',
    // An empty gallery's card says to put photos up, so for whoever can it
    // leads to what needs them.
    to: total ? { name: 'Gallery' } : canEdit.value ? { name: 'GalleryWaiting' } : null,
    total,
    covers: withPhotos.value.slice(0, STRIP),
    ready: !loading.value && total > 0,
  }
})

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what is waiting on
// you: the photos you have not seen, and for whoever puts photos up, this
// week's gatherings and the albums left empty. The eight weeks of gatherings
// Needs photos lists are not counted — a church that photographs one service
// in four would carry a badge of a dozen for good.
const doors = computed(() => {
  const ready = !loading.value
  return [
    { key: 'albums', title: 'Albums', art: 'gallery-albums', to: { name: 'Gallery' } },
    {
      key: 'recent',
      title: 'Recent photos',
      art: 'gallery-recent',
      to: { name: 'GalleryRecent' },
      badge: ready && !photosLoading.value ? newPhotos.value.length : 0,
    },
    { key: 'kinds', title: 'By kind', art: 'gallery-kinds', to: { name: 'GalleryKinds' } },
    ...(canEdit.value
      ? [
          {
            key: 'waiting',
            title: 'Needs photos',
            art: 'gallery-waiting',
            to: { name: 'GalleryWaiting' },
            badge: ready ? waitingThisWeek.value.length + emptyAlbums.value.length : 0,
          },
        ]
      : []),
  ]
})
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What matters this week, most important on top -->
      <AppHeroDeck :cards="cards" scope="gallery" label="Gallery this week" class="animate-rise">
        <template #card="{ card }">
          <!-- A gathering with no photos: its date, the way a calendar shows
               it. One is a tap straight to the photo picker, so a button. -->
          <DeckCard
            v-if="card.kind === 'waiting'"
            tone="plain"
            :icon="Camera"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.album ? null : { name: 'GalleryWaiting' }"
            :action="Boolean(card.album)"
            inset
            :aria-busy="(card.album && isUploadingTo(card.album)) || undefined"
            @click="card.album && pickPhotosFor(card.album)"
          >
            <template #leading>
              <DateTile :date="card.date" highlight />
            </template>
            <DeckChips v-if="card.chips.length" :items="card.chips" :max="3" />
          </DeckCard>

          <!-- New photos: the photos themselves, along the foot. -->
          <DeckCard
            v-else-if="card.kind === 'new'"
            tone="plain"
            :icon="Images"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <div class="flex items-center gap-1.5">
              <span
                v-for="photo in card.photos.slice(0, STRIP)"
                :key="photo.id"
                class="size-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700"
              >
                <img :src="photo.url" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover" />
              </span>
              <span
                v-if="card.photos.length > STRIP"
                class="ml-1 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400"
              >
                +{{ (card.photos.length - STRIP).toLocaleString() }}
              </span>
            </div>
          </DeckCard>

          <!-- A year ago: the album's cover, where another card has a date. -->
          <DeckCard
            v-else-if="card.kind === 'year'"
            tone="plain"
            :icon="ClockCounterClockwise"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <template #leading>
              <span class="size-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-700 dark:ring-gray-700">
                <img :src="card.cover" alt="" decoding="async" class="h-full w-full object-cover" />
              </span>
            </template>
          </DeckCard>

          <!-- Albums left empty: which ones, by name. -->
          <DeckCard
            v-else-if="card.tone !== 'accent'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <DeckChips v-if="card.chips?.length" :items="card.chips" :max="3" />
          </DeckCard>

          <!-- The albums: how many, large, and their covers along the foot. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <CardPanes />
            </template>
            <template v-if="card.ready" #title>
              <span class="text-5xl font-bold tabular-nums tracking-tight">{{ card.total.toLocaleString() }}</span>
              <span class="ml-2 text-lg font-semibold text-white/80">{{ card.total === 1 ? 'album' : 'albums' }}</span>
            </template>
            <!-- The Gallery artwork, on white because its orange and blue are
                 Ekkly's and need a white ground on a coloured card (BRAND.md). -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                <AppArt app-key="gallery" :play="1" class="size-10" />
              </span>
            </template>
            <!-- The newest covers, overlapping the way People's faces do. -->
            <template v-if="card.ready" #default>
              <div class="flex items-center">
                <div class="flex -space-x-2.5">
                  <span
                    v-for="album in card.covers"
                    :key="album.id"
                    class="size-10 overflow-hidden rounded-xl bg-white/15 ring-2 ring-white/70"
                  >
                    <img :src="album.coverUrl" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover" />
                  </span>
                </div>
                <span
                  v-if="card.total > STRIP"
                  class="ml-2 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
                >
                  +{{ (card.total - STRIP).toLocaleString() }}
                </span>
              </div>
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Gallery" />
    </div>
  </AppScreen>
</template>

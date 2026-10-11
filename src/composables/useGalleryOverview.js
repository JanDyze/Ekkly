import { computed, onMounted, onUnmounted, ref } from 'vue'
import { subscribeToRecentPhotos } from '../api/galleryService'
import { useGalleryAlbums, RECENT_EMPTY_DAYS } from './useGalleryAlbums'
import { isUploadingTo } from './useGalleryUpload'
import { usePermissions } from './usePermissions'
import { addDays } from '../../lib/occurrences'

/**
 * What the Gallery app's home says about the church's photos, in one place,
 * so its deck and its tiles cannot disagree (the way useMinutesOverview and
 * usePeopleOverview serve their homes).
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on, or come to look at, this week:
 *
 *   - the photos added since you last looked, because new pictures from
 *     Sunday are the reason most people open a gallery at all, and a gallery
 *     that opens on the same grid as last week hides them among the old;
 *   - this week's gatherings that still have no photos, for whoever puts them
 *     up, because photos go up in the days after or not at all. Earned from
 *     the church's own habit, not a rule: a one-off event always asks (it
 *     happens once), but a weekly service asks only once the church has put
 *     up photos of that service before. A church that never photographs its
 *     prayer meeting is not asked about it every Thursday for ever;
 *   - albums somebody made that have nothing in them — nearly always an
 *     upload that failed after the album was written — for whoever manages
 *     the gallery, as a standing chore remembered until there are more;
 *   - an album from this week a year ago, because a church likes to look back
 *     (and to post "a year ago today"), and it is the one card dated by the
 *     church's own calendar rather than by anything anyone must do.
 *
 * Left out on purpose: how many photos the gallery holds (counting them means
 * reading every photo, and the number asks nothing of anyone); albums without
 * a cover (the first photo becomes the cover on its own, so an album without
 * one is simply empty, which is already a card); older gatherings without
 * photos (past a week the moment has gone — they wait in Needs photos, and a
 * search reaches the rest); and the photos shown on the church's public page,
 * which is Settings' to decide, not something to nudge about from here.
 */

/** How many of the newest photos the app reads at once. */
export const RECENT_PHOTOS = 60

/** "This week": today and the six days before it. */
const WEEK_DAYS = 6

/**
 * How far back a first visit counts photos as new. With no mark yet, every
 * photo ever taken would be new, which would make the card mean nothing.
 */
const FIRST_LOOK_DAYS = 7

/* ------------------------------------------------- the newest photos, shared */

// One listener for every screen that wants the newest photos — the home and
// Recent photos — ref-counted the way useTasks is.
const recentPhotos = ref([])
const photosLoading = ref(true)
let unsubscribe = null
let subscribers = 0

/* ------------------------------------------------------ when you last looked */

// Per device, in localStorage: it is this person's own looking, and a church
// is its own address, so two churches on one phone never share it. `all` is
// when Recent photos was last opened; `albums` when each album was, since
// the card about one album's new photos opens that album rather than the list.
const SEEN_STORE = 'ekkly:gallery-seen'

const readSeen = () => {
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_STORE) || 'null')
    return value && typeof value === 'object' ? { all: Number(value.all) || 0, albums: value.albums || {} } : { all: 0, albums: {} }
  } catch {
    return { all: 0, albums: {} }
  }
}

const seen = ref(readSeen())

const writeSeen = (next) => {
  seen.value = next
  try {
    localStorage.setItem(SEEN_STORE, JSON.stringify(next))
  } catch {
    // Not remembered past this page; the card still goes for now.
  }
}

/** Everything up to now has been seen: Recent photos was opened. */
export const markAllSeen = () => writeSeen({ all: Date.now(), albums: {} })

/** One album's photos have been seen: the album was opened. */
export const markAlbumSeen = (albumId) => {
  if (!albumId) return
  // Marks older than the last look at everything say nothing any more.
  const all = seen.value.all
  const albums = Object.fromEntries(Object.entries(seen.value.albums).filter(([, at]) => at > all))
  writeSeen({ all, albums: { ...albums, [albumId]: Date.now() } })
}

const isNew = (photo) => {
  const { all, albums } = seen.value
  const since = Math.max(all || Date.now() - FIRST_LOOK_DAYS * 86400000, albums[photo.albumId] || 0)
  return photo.uploadedAt.getTime() > since
}

/** A weekly service's name, compared loosely: "Sunday Service" twice is one. */
const sameName = (title) => String(title || '').trim().toLowerCase()

/**
 * `photos: false` for a screen that only needs the albums (By kind, Needs
 * photos), so it does not read the newest photos for nothing.
 */
export function useGalleryOverview({ photos = true } = {}) {
  const { albums, loading: albumsLoading, today, findAlbum } = useGalleryAlbums()
  const { canManage } = usePermissions()
  const canEdit = computed(() => canManage('gallery'))

  if (photos) {
    onMounted(() => {
      subscribers += 1
      if (unsubscribe) return
      unsubscribe = subscribeToRecentPhotos(RECENT_PHOTOS, (data) => {
        recentPhotos.value = data
        photosLoading.value = false
      })
    })

    onUnmounted(() => {
      subscribers -= 1
      if (subscribers <= 0 && unsubscribe) {
        unsubscribe()
        unsubscribe = null
        subscribers = 0
      }
    })
  }

  const loading = computed(() => albumsLoading.value)

  /** Every album with something in it, newest first. */
  const withPhotos = computed(() => albums.value.filter((album) => album.hasPhotos))

  const albumById = computed(() => new Map(withPhotos.value.map((album) => [album.id, album])))

  /**
   * The newest photos, each with its album, grouped album by album in the
   * order they went up. A photo whose album is not on the list (deleted, or
   * still being written) is left out rather than shown with no name.
   */
  const recentByAlbum = computed(() => {
    const groups = new Map()
    for (const photo of recentPhotos.value) {
      const album = albumById.value.get(photo.albumId)
      if (!album) continue
      if (!groups.has(album.id)) groups.set(album.id, { album, photos: [] })
      groups.get(album.id).photos.push(photo)
    }
    return [...groups.values()]
  })

  const recent = computed(() => recentByAlbum.value.flatMap((group) => group.photos))

  /** The photos added since this person last looked, in the same groups. */
  const newByAlbum = computed(() =>
    recentByAlbum.value
      .map((group) => ({ ...group, photos: group.photos.filter(isNew) }))
      .filter((group) => group.photos.length)
  )
  const newPhotos = computed(() => newByAlbum.value.flatMap((group) => group.photos))

  /* --------------------------------------------------- waiting for photos */

  // The weekly services the church has photographed before, by name.
  const photographed = computed(
    () => new Set(withPhotos.value.filter((album) => album.isCalendarEvent).map((album) => sameName(album.title)))
  )

  /**
   * The gatherings of the last eight weeks with nothing in them, newest first
   * (RECENT_EMPTY_DAYS) — the list Needs photos opens on.
   */
  const waiting = computed(() => {
    const from = addDays(today.value, -RECENT_EMPTY_DAYS)
    return albums.value.filter(
      (album) => !album.existsInGallery && String(album.date) >= from && !isUploadingTo(album)
    )
  })

  /** This week's, the ones the church would photograph (see above). */
  const waitingThisWeek = computed(() => {
    const from = addDays(today.value, -WEEK_DAYS)
    return waiting.value.filter(
      (album) => String(album.date) >= from && (!album.recurring || photographed.value.has(sameName(album.title)))
    )
  })

  /** Albums somebody made that hold nothing, the newest first. */
  const emptyAlbums = computed(() =>
    albums.value.filter((album) => album.existsInGallery && !album.hasPhotos && !isUploadingTo(album))
  )

  /* ---------------------------------------------------------- looking back */

  /** An album from this week a year ago — the newest, if there are several. */
  const yearAgo = computed(() => {
    const from = addDays(today.value, -365 - 3)
    const to = addDays(today.value, -365 + 3)
    return withPhotos.value.find((album) => String(album.date) >= from && String(album.date) <= to) || null
  })

  /* ------------------------------------------------------------- the kinds */

  /**
   * The albums by the kind of gathering they were taken at — Worship,
   * Fellowship, Outreach — the most photographed first. The kind is the
   * calendar's type for a gathering's album and whatever a hand-made one was
   * filed under.
   */
  const kinds = computed(() => {
    const groups = new Map()
    for (const album of withPhotos.value) {
      const kind = album.category || 'General'
      if (!groups.has(kind)) groups.set(kind, { kind, albums: [] })
      groups.get(kind).albums.push(album)
    }
    return [...groups.values()].sort((a, b) => b.albums.length - a.albums.length || a.kind.localeCompare(b.kind))
  })

  return {
    albums,
    loading,
    photosLoading,
    today,
    canEdit,
    findAlbum,
    withPhotos,
    recent,
    recentByAlbum,
    newPhotos,
    newByAlbum,
    waiting,
    waitingThisWeek,
    emptyAlbums,
    yearAgo,
    kinds,
  }
}

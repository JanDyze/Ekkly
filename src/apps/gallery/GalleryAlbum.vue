<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import GalleryFab from '../../components/gallery/GalleryFab.vue'
import PhotoLightbox from '../../components/gallery/PhotoLightbox.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import { useGalleryAlbums } from '../../composables/useGalleryAlbums'
import { useGalleryUpload } from '../../composables/useGalleryUpload'
import { markAlbumSeen } from '../../composables/useGalleryOverview'
import { useToast } from '../../composables/useToast'
import { deleteAlbum, deletePhoto, setAlbumCover, subscribeToAlbumPhotos } from '../../api/galleryService'
import { formatLongDate } from '../../../lib/occurrences'
import { ImagePlus, SearchX, Trash2 } from '../../icons'

// One album: its photos as a grid, and one of them over it, the whole screen,
// at /gallery/:id/v/:photoId. The album and the photo are one screen so that
// going from one to the other keeps the grid and its photos where they are.
//
// An album can be reached by a gathering's id before its first photo makes it
// a document (useGalleryAlbums), so whatever opened it — a row in Needs
// photos, a card on the home — can go straight to it and start putting
// photos in.

const props = defineProps({
  id: { type: String, required: true },
  photoId: { type: String, default: '' },
})

const router = useRouter()
const toast = useToast()
const { loading, findAlbum } = useGalleryAlbums()
const { canEdit, uploading, progress, isUploadingTo, pickPhotosFor } = useGalleryUpload()

const album = computed(() => findAlbum(props.id))

// A gathering's album has a computed id until its first photo is saved and a
// document id after. The address follows, so a link copied from here opens
// the album itself rather than the gathering it started as.
watch(album, (current) => {
  if (!current || current.id === props.id) return
  router.replace({
    name: props.photoId ? 'GalleryPhoto' : 'GalleryAlbum',
    params: props.photoId ? { id: current.id, photoId: props.photoId } : { id: current.id },
  })
})

/* ------------------------------------------------------------------ photos */
const photos = ref([])
const photosLoading = ref(false)
let unsubscribePhotos = null

// Only a stored album has photos to read. A gathering's album is empty by
// definition until the first upload makes it a document.
const photoSourceId = computed(() => (album.value?.existsInGallery ? album.value.id : ''))

watch(
  photoSourceId,
  (albumId) => {
    unsubscribePhotos?.()
    unsubscribePhotos = null
    photos.value = []
    photosLoading.value = Boolean(albumId)
    if (!albumId) return
    unsubscribePhotos = subscribeToAlbumPhotos(albumId, (data) => {
      photos.value = data
      photosLoading.value = false
    })
  },
  { immediate: true }
)

onUnmounted(() => unsubscribePhotos?.())

// Whatever is in the album has been seen once it is open, including the
// photos arriving while it is — so the home's card about new photos is not
// about the ones this person just put up.
watch(
  () => [photoSourceId.value, photos.value.length],
  ([albumId]) => markAlbumSeen(albumId),
  { immediate: true }
)

const subtitle = computed(() => {
  const current = album.value
  if (!current) return ''
  const count = photos.value.length
  return [
    current.date ? formatLongDate(current.date) : '',
    current.location,
    count ? `${count} ${count === 1 ? 'photo' : 'photos'}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
})

const busy = computed(() => loading.value || photosLoading.value || (uploading.value && !album.value))
const arriving = computed(() => isUploadingTo(album.value) || (uploading.value && !album.value))

/* --------------------------------------------------------- the open photo */
const photoIndex = computed(() =>
  props.photoId ? photos.value.findIndex((photo) => photo.id === props.photoId) : -1
)
const lightboxOpen = computed(() => photoIndex.value !== -1)

const openPhoto = (photo) => {
  router.push({ name: 'GalleryPhoto', params: { id: album.value.id, photoId: photo.id } })
}

// Replaced rather than pushed: a swipe through forty photos should not leave
// forty entries for the back button to walk through.
const goToPhoto = (index) => {
  const photo = photos.value[index]
  if (!photo) return
  router.replace({ name: 'GalleryPhoto', params: { id: album.value.id, photoId: photo.id } })
}

// Back where the photo was opened from — this album's grid, or Recent photos
// — the way the phone's own back button would go. A link straight to a photo
// has nothing of the gallery behind it, so that one goes to its album.
const closePhoto = () => {
  const back = String(window.history.state?.back || '')
  if (back.startsWith('/gallery')) router.back()
  else router.replace({ name: 'GalleryAlbum', params: { id: album.value?.id || props.id } })
}

const sharePhoto = async (photo) => {
  const current = album.value
  const url = `${window.location.origin}/gallery/${current.id}/v/${photo.id}`
  if (navigator.share) {
    try {
      await navigator.share({ title: current.title, text: current.title, url })
    } catch (error) {
      // Dismissing the share sheet rejects too, and is not a failure.
      if (error?.name !== 'AbortError') console.error('Share failed:', error)
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  } catch {
    toast.error('Could not copy the link.')
  }
}

// Fetched and saved as a file. The old way drew the photo onto a canvas first,
// which a browser refuses to export for an image served from another origin —
// and every photo lives in Blob storage now, so it failed for all of them.
const downloadPhoto = async (photo) => {
  try {
    const response = await fetch(photo.url)
    const blob = await response.blob()
    const extension = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `photo-${photo.id}.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  } catch (error) {
    console.error('Download failed:', error)
    window.open(photo.url, '_blank', 'noopener')
  }
}

const useAsCover = async (photo) => {
  try {
    await setAlbumCover(album.value.id, photo.url)
    toast.success('Cover updated')
  } catch (error) {
    console.error('Error setting cover:', error)
    toast.error('Could not change the cover. Please try again.')
  }
}

/* ---------------------------------------------------------------- deleting */
const showConfirmation = ref(false)
const confirmationConfig = ref({
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmButtonClass: 'bg-red-600 text-white hover:bg-red-700',
  onConfirm: null,
})

const showConfirmModal = (config) => {
  confirmationConfig.value = { ...confirmationConfig.value, ...config }
  showConfirmation.value = true
}

const handleConfirmation = () => confirmationConfig.value.onConfirm?.()

const confirmDeletePhoto = (photo) => {
  showConfirmModal({
    title: 'Delete photo',
    message: 'This photo will be removed from the album for good.',
    confirmText: 'Delete',
    onConfirm: async () => {
      const albumId = album.value?.id
      try {
        await deletePhoto(photo.id)
        router.replace({ name: 'GalleryAlbum', params: { id: albumId } })
        toast.success('Photo deleted')
      } catch (error) {
        console.error('Error deleting photo:', error)
        toast.error('Could not delete that photo. Please try again.')
      }
    },
  })
}

const confirmDeleteAlbum = () => {
  const current = album.value
  if (!current?.existsInGallery) return
  const count = photos.value.length
  showConfirmModal({
    title: 'Delete album',
    message: count
      ? `Delete "${current.title}" and its ${count} ${count === 1 ? 'photo' : 'photos'}? This cannot be undone.`
      : `Delete "${current.title}"? This cannot be undone.`,
    confirmText: 'Delete',
    onConfirm: async () => {
      try {
        await deleteAlbum(current.id)
        router.replace({ name: 'Gallery' })
        toast.success('Album deleted')
      } catch (error) {
        console.error('Error deleting album:', error)
        toast.error('Could not delete that album. Please try again.')
      }
    },
  })
}
</script>

<template>
  <div class="relative h-full">
    <AppScreen
      :title="album?.title || (loading ? '' : 'Album')"
      :subtitle="subtitle"
      :back="{ name: 'Gallery' }"
      root="/gallery"
      desk
    >
      <template v-if="canEdit && album?.existsInGallery" #action>
        <button
          type="button"
          @click="confirmDeleteAlbum"
          aria-label="Delete album"
          title="Delete album"
          class="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <Trash2 class="size-5" />
        </button>
      </template>

      <!-- Progress, above the photos rather than over them, so the ones that
           have landed can be looked at while the rest go up. -->
      <div
        v-if="arriving"
        class="mb-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70"
      >
        <div class="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
          <span>Adding photos…</span>
          <span class="tabular-nums">{{ progress.done }} of {{ progress.total }}</span>
        </div>
        <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            class="h-full rounded-full bg-primary transition-all duration-300"
            :style="{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }"
          ></div>
        </div>
      </div>

      <div v-if="busy" class="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl sm:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] lg:gap-1.5">
        <div v-for="i in 12" :key="i" class="aspect-square animate-pulse bg-gray-200 dark:bg-gray-700"></div>
      </div>

      <div v-else-if="!album" class="px-6 py-16 text-center">
        <SearchX class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          This album is not here any more.
        </p>
        <button
          type="button"
          @click="router.replace({ name: 'Gallery' })"
          class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          All albums
        </button>
      </div>

      <!-- Edge to edge in a rounded block, the way a phone's own albums sit. -->
      <div
        v-else-if="photos.length"
        class="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl sm:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] lg:gap-1.5"
      >
        <button
          v-for="photo in photos"
          :key="photo.id"
          type="button"
          @click="openPhoto(photo)"
          class="relative aspect-square overflow-hidden bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset dark:bg-gray-800"
          :aria-label="`Open photo from ${album.title}`"
        >
          <img
            :src="photo.url"
            alt=""
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover"
          />
        </button>
      </div>

      <!-- Reached by a link, from Needs photos, or by a manager who backed out
           of the picker. -->
      <div v-else-if="!arriving" class="px-6 py-16 text-center">
        <ImagePlus class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          Nothing in this album yet
        </p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
          {{ canEdit ? 'Put up the photos taken there, and everyone can see them.' : 'Photos will show here once someone puts them up.' }}
        </p>
        <button
          v-if="canEdit"
          type="button"
          @click="pickPhotosFor(album)"
          class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Add photos
        </button>
      </div>
    </AppScreen>

    <!-- Inside an album there is one thing to do — put photos in it — so the
         button does that directly. -->
    <GalleryFab
      v-if="canEdit && album"
      :can-manage="canEdit"
      in-album
      :uploading="uploading"
      @upload="pickPhotosFor(album)"
    />

    <PhotoLightbox
      v-if="lightboxOpen && album"
      :photos="photos"
      :index="photoIndex"
      :album="album"
      :can-manage="canEdit"
      :paused="showConfirmation"
      @close="closePhoto"
      @go="goToPhoto"
      @share="sharePhoto"
      @download="downloadPhoto"
      @cover="useAsCover"
      @delete="confirmDeletePhoto"
    />

    <ConfirmationModal
      :show="showConfirmation"
      :title="confirmationConfig.title"
      :message="confirmationConfig.message"
      :confirm-text="confirmationConfig.confirmText"
      :cancel-text="confirmationConfig.cancelText"
      :confirm-button-class="confirmationConfig.confirmButtonClass"
      @update:show="showConfirmation = $event"
      @confirm="handleConfirmation"
      @cancel="showConfirmation = false"
    />
  </div>
</template>

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addAlbum, uploadPhoto } from '../api/galleryService'
import { compressImageToBase64 } from '../utils/imageUtils'
import { usePermissions } from './usePermissions'
import { useToast } from './useToast'

/**
 * Putting photos into an album, from any screen of the Gallery app.
 *
 * It used to live inside the one Gallery page, which was the list and the
 * album both, so an upload never outlived the screen it started on. The app
 * has several screens now, and an upload starts on one (a row in Needs
 * photos, a card on the home) and is watched arriving on another (the album),
 * so its state is kept here, once, for the whole app: whichever screen is
 * showing reads the same progress.
 */

// The album being uploaded into, by every id it may be known by during the
// upload — it starts as a gathering and becomes a document part-way through.
const uploadingIds = ref([])
const progress = ref({ done: 0, total: 0 })
const uploading = computed(() => uploadingIds.value.length > 0)

const isUploadingTo = (album) =>
  Boolean(album) &&
  uploadingIds.value.some((id) => id === album.id || id === album.derivedId)

// One file input for the whole app, kept on the page rather than made for
// each tap: a picker that is cancelled never says so, and an input left
// detached is one some phones will not open at all.
let input = null
let onChosen = null

const fileInput = () => {
  if (input) return input
  input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.hidden = true
  input.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    const done = onChosen
    onChosen = null
    if (files.length) done?.(files)
  })
  document.body.appendChild(input)
  return input
}

export function useGalleryUpload() {
  const router = useRouter()
  const toast = useToast()
  const { canManage } = usePermissions()
  const canEdit = computed(() => canManage('gallery'))

  const openAlbum = (id, replace = false) =>
    router[replace ? 'replace' : 'push']({ name: 'GalleryAlbum', params: { id } })

  /**
   * Puts photos into an album, creating the album first if it is still only a
   * gathering. The screen moves into the album as soon as the upload starts,
   * so the photos are seen arriving where they are going.
   */
  const uploadInto = async (album, files) => {
    uploadingIds.value = [album.id, album.derivedId].filter(Boolean)
    progress.value = { done: 0, total: files.length }

    const here = router.currentRoute.value
    if (album.id && here.params.id !== album.id) openAlbum(album.id)

    let albumId = album.existsInGallery ? album.id : ''
    try {
      if (!albumId) {
        albumId = await addAlbum({
          title: album.title,
          date: album.date,
          category: album.category || 'General',
          location: album.location || '',
          description: album.description || '',
          calendarEventId: album.calendarEventId || null,
        })
        uploadingIds.value = [...uploadingIds.value, albumId]
        // A new album had nowhere to open until now.
        if (!album.id) openAlbum(albumId)
      }
    } catch (error) {
      console.error('Error creating album:', error)
      toast.error('Could not create the album. Please try again.')
      uploadingIds.value = []
      return
    }

    // One at a time, and a bad file does not stop the rest: twenty photos from
    // a service should not all be lost to the one that was a screenshot of a PDF.
    let failed = 0
    for (const file of files) {
      try {
        const base64 = await compressImageToBase64(file)
        await uploadPhoto(albumId, base64, '')
      } catch (error) {
        failed += 1
        console.error('Error uploading photo:', error)
      }
      progress.value = { ...progress.value, done: progress.value.done + 1 }
    }

    const added = files.length - failed
    if (failed) {
      toast.error(
        added
          ? `${added} added, ${failed} could not be uploaded.`
          : 'Those photos could not be uploaded. Please try again.'
      )
    } else {
      toast.success(`${added} ${added === 1 ? 'photo' : 'photos'} added`)
    }
    uploadingIds.value = []
  }

  /**
   * Opens the photo picker for an album. Straight from the tap, not after an
   * await: a browser only opens the file picker inside the gesture that asked
   * for it.
   */
  const pickPhotosFor = (album) => {
    if (!album || !canEdit.value) return
    // A second batch while the first is going would race it for the cover and
    // share one progress bar between two albums.
    if (uploading.value) {
      toast.info('Wait for the photos already going up to finish.')
      return
    }
    onChosen = (files) => uploadInto(album, files)
    fileInput().click()
  }

  /** An album for photos not taken at a gathering, made with its first photos. */
  const createAlbum = ({ title, date, location, files }) =>
    uploadInto(
      {
        id: '',
        title,
        date,
        location,
        category: 'General',
        description: '',
        calendarEventId: null,
        existsInGallery: false,
      },
      files
    )

  return {
    canEdit,
    uploading,
    progress,
    isUploadingTo,
    pickPhotosFor,
    uploadInto,
    createAlbum,
  }
}

export { isUploadingTo }

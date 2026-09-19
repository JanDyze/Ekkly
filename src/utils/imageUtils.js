// Firestore documents cap at 1 MiB, and this app stores images as base64 inside
// them rather than in Cloud Storage. Everything uploaded is therefore squeezed
// under a byte budget first: scale down to maxDim, then walk webp quality down
// until the encoded string fits.
const MAX_SIZE = 900 * 1024
const MAX_DIM = 2000

// Cover photos ride along inside the group document, which the small-groups
// list subscribes to in full — every group's cover is downloaded just to render
// the index. They get a much tighter budget than a session photo, which is only
// ever fetched one session at a time.
export const COVER_PHOTO_OPTIONS = { maxSize: 200 * 1024, maxDim: 1200 }

// The church logo sits in appSettings/church, which every screen subscribes to,
// so it is downloaded once per session on every device. It also renders no
// larger than ~60px tall, so a tight budget costs nothing visually. Aspect is
// left alone — logos are rarely square, and every place that shows one sizes by
// height with `w-auto`.
export const LOGO_OPTIONS = { maxSize: 80 * 1024, maxDim: 320 }

// The public page's hero photograph. It rides in appSettings/church like the
// logo, so it gets a budget closer to one than to a gallery photo. It draws as
// an arch about 300px wide, so 900px on the long edge is already twice what
// any screen uses. Shared by Settings > Public page and the setup guide, which
// upload the same picture to the same place.
export const HERO_OPTIONS = { maxSize: 100 * 1024, maxDim: 900 }

// Covers are cropped to a fixed 16:9 on upload, so the frame the uploader
// previews is the frame every card and header renders.
export const COVER_ASPECT = 16 / 9
export const COVER_OUTPUT_WIDTH = 1280

/** Reads a File into a decoded <img>, ready to measure or draw. */
export const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

/**
 * Draws a decoded image onto a canvas, scaled to fit `maxDim`.
 *
 * Exported so a caller can work on the pixels before they are encoded — the
 * logo pickers cut the background out and read the church's colour off it (see
 * logoUtils), and both need the scaled bitmap rather than a data URL.
 */
export const imageToCanvas = (img, maxDim = MAX_DIM) => {
  let width = img.width
  let height = img.height
  if (width > maxDim || height > maxDim) {
    if (width > height) { height *= maxDim / width; width = maxDim }
    else { width *= maxDim / height; height = maxDim }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

/**
 * Encodes a canvas as webp, dropping quality until it fits the byte budget.
 *
 * webp throughout, so a logo that has had its background cut away keeps the
 * alpha channel — a JPEG would hand back the white box we just removed.
 */
export const encodeCanvas = (canvas, maxSize) => {
  let quality = 0.9
  let base64 = ''
  do {
    base64 = canvas.toDataURL('image/webp', quality)
    quality -= 0.1
  } while (base64.length > maxSize && quality > 0.1)
  return base64
}

/**
 * Reads a File and resolves a compressed base64 webp data URL.
 */
export const compressImageToBase64 = async (file, options = {}) => {
  const img = await readImageFile(file)
  return encodeCanvas(imageToCanvas(img, options.maxDim || MAX_DIM), options.maxSize || MAX_SIZE)
}

/**
 * Cuts `rect` (in source-image pixels) out of a decoded image and encodes it at
 * a fixed output size — what the crop UI hands over once the user is happy with
 * the framing.
 */
export const cropImageToBase64 = (img, rect, options = {}) => {
  const width = options.width || COVER_OUTPUT_WIDTH
  const height = options.height || Math.round(width / COVER_ASPECT)
  const maxSize = options.maxSize || COVER_PHOTO_OPTIONS.maxSize
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height)
  return encodeCanvas(canvas, maxSize)
}

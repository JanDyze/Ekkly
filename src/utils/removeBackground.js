import { imageToCanvas, encodeCanvas, readImageFile } from './imageUtils'
import { MODEL_SIZE, boundsOf, looksRight, toModelInput } from './cutoutMask'

// Cutting an item out of its photograph, on the device that took it, for the
// Inventory app: the page's side of removeBackgroundWorker.js, which runs the
// model. The photo never leaves the phone to be cut out; only the finished
// picture is uploaded.
//
// The steps, each of which can be shown on the screen as it happens:
//   1. preparePhoto  — the file the camera handed over, turned the right way
//                      up and shrunk to the size it will be kept at;
//   2. cutOut        — the model's guess at the thing, applied as transparency
//                      and trimmed to it. Can fail (an old phone, no signal
//                      the first time, a photo of nothing in particular), and
//                      the caller keeps the photo as taken when it does;
//   3. encodePhoto   — the picture kept, and a small copy for lists.

/** The long edge an item's photo is kept at. Twice what the record shows. */
export const PHOTO_DIM = 1200
const PHOTO_BYTES = 350 * 1024

// The copy every list row and deck card draws, so a list of a hundred chairs
// and speakers is a hundred small files rather than a hundred large ones.
export const THUMB_DIM = 256
const THUMB_BYTES = 40 * 1024

// Long enough for the model's first download on a slow connection; past it the
// photo is kept as taken rather than leaving someone watching a bar.
const FIRST_RUN_TIMEOUT = 90_000
const RUN_TIMEOUT = 30_000

/** Whether this browser can run the model at all. */
export const canRemoveBackground = () =>
  typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'

/* -------------------------------------------------------------- the worker */

let worker = null
let ready = false
let nextId = 0
const waiting = new Map()
let progressListener = null
// Where the model last ran ('webgpu' or 'wasm'), for anyone curious why a
// photo was quick or slow.
let lastDevice = ''
export const removalDevice = () => lastDevice

const stopWorker = () => {
  worker?.terminate()
  worker = null
  ready = false
  waiting.forEach((job) => job.reject(new Error('stopped')))
  waiting.clear()
}

const startWorker = () => {
  if (worker) return
  worker = new Worker(new URL('./removeBackgroundWorker.js', import.meta.url), { type: 'module' })
  const files = new Map()
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') {
      files.set(data.file, data)
      const all = [...files.values()]
      const total = all.reduce((sum, f) => sum + f.total, 0)
      progressListener?.(total ? all.reduce((sum, f) => sum + f.loaded, 0) / total : 0)
    } else if (data.type === 'ready') {
      ready = true
      lastDevice = data.device || ''
      progressListener?.(1)
    } else if (data.type === 'result' || data.type === 'error') {
      const job = waiting.get(data.id)
      waiting.delete(data.id)
      if (data.type === 'error') job?.reject(new Error(data.message))
      else job?.resolve(data)
    }
  }
  // A worker that cannot even start (a browser refusing module workers) is
  // reported once, and the next photo tries again from scratch.
  worker.onerror = (event) => {
    event.preventDefault?.()
    stopWorker()
  }
}

const ask = (input, timeout) =>
  new Promise((resolve, reject) => {
    startWorker()
    const id = ++nextId
    const timer = setTimeout(() => {
      // A model that has not answered in time is stopped outright, so a
      // half-loaded download does not keep a phone busy in the background.
      waiting.delete(id)
      stopWorker()
      reject(new Error('timeout'))
    }, timeout)
    waiting.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
    worker.postMessage({ id, input }, input ? [input] : [])
  })

/* ------------------------------------------------------------------ steps */

/**
 * The camera's file as a canvas, at most PHOTO_DIM on its long edge. The
 * browser turns a phone photo the right way up as it decodes it, so a
 * picture taken holding the phone sideways is not stored sideways.
 */
export const preparePhoto = async (file) => imageToCanvas(await readImageFile(file), PHOTO_DIM)

/**
 * The thing in the photo, on a transparent ground, trimmed to it.
 *
 * Resolves `{ canvas, coverage, good }`: `good` is false when the model found
 * a speck or found nothing to take away, and the screen then offers the photo
 * as taken first. Rejects when the model cannot run here or now (an old
 * browser, offline before it was ever downloaded, a timeout), and the caller
 * keeps the photo as taken and says so.
 *
 * `onProgress` hears how far the model's download has got, 0 to 1, the first
 * time on a device; after that it is already there.
 */
export const cutOut = async (photo, { onProgress } = {}) => {
  if (!canRemoveBackground()) throw new Error('unsupported')

  // The square the model looks at: the whole photo, squeezed, as rembg does.
  // The answer is stretched back over the photo the same way.
  const small = document.createElement('canvas')
  small.width = MODEL_SIZE
  small.height = MODEL_SIZE
  const smallCtx = small.getContext('2d', { willReadFrequently: true })
  smallCtx.imageSmoothingQuality = 'high'
  smallCtx.drawImage(photo, 0, 0, MODEL_SIZE, MODEL_SIZE)
  const input = toModelInput(smallCtx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data)

  progressListener = onProgress || null
  let answer
  try {
    answer = await ask(input.buffer, ready ? RUN_TIMEOUT : FIRST_RUN_TIMEOUT)
  } finally {
    progressListener = null
  }
  const alpha = new Float32Array(answer.alpha)

  // The answer as a small picture whose only content is its transparency, so
  // the canvas can stretch it over the photo smoothly and cut with it.
  const mask = document.createElement('canvas')
  mask.width = MODEL_SIZE
  mask.height = MODEL_SIZE
  const maskCtx = mask.getContext('2d')
  const pixels = maskCtx.createImageData(MODEL_SIZE, MODEL_SIZE)
  for (let i = 0; i < alpha.length; i++) pixels.data[i * 4 + 3] = Math.round(alpha[i] * 255)
  maskCtx.putImageData(pixels, 0, 0)

  const cut = document.createElement('canvas')
  cut.width = photo.width
  cut.height = photo.height
  const cutCtx = cut.getContext('2d')
  cutCtx.drawImage(photo, 0, 0)
  cutCtx.globalCompositeOperation = 'destination-in'
  cutCtx.imageSmoothingEnabled = true
  cutCtx.imageSmoothingQuality = 'high'
  cutCtx.drawImage(mask, 0, 0, photo.width, photo.height)

  // Trimmed to the thing, with a little room round it.
  const box = boundsOf(alpha)
  const x = Math.round(box.x * photo.width)
  const y = Math.round(box.y * photo.height)
  const width = Math.max(1, Math.round(box.width * photo.width))
  const height = Math.max(1, Math.round(box.height * photo.height))
  const trimmed = document.createElement('canvas')
  trimmed.width = width
  trimmed.height = height
  trimmed.getContext('2d').drawImage(cut, x, y, width, height, 0, 0, width, height)

  return { canvas: trimmed, coverage: answer.coverage, good: looksRight(answer.coverage) }
}

/**
 * The picture to keep and its small copy, as webp data URLs (alpha kept, so a
 * cut-out stays cut out), ready for blobService.uploadImage.
 */
export const encodePhoto = (canvas) => {
  const thumb = imageToCanvas(canvas, THUMB_DIM)
  return {
    photo: encodeCanvas(imageToCanvas(canvas, PHOTO_DIM), PHOTO_BYTES),
    thumb: encodeCanvas(thumb, THUMB_BYTES),
  }
}

/** A canvas as something an <img> can show while nothing is uploaded yet. */
export const previewOf = (canvas) => canvas.toDataURL('image/webp', 0.85)

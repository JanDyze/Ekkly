// Making a church's uploaded logo usable, without asking them to open an image
// editor first.
//
// Two jobs, both done the moment a file is picked:
//
//   1. Cut a flat background away, so a logo exported as a JPEG on white does
//      not sit in a white box on the dark masthead.
//   2. Read the colour the logo is actually drawn in, and turn it into the
//      church's accent.
//
// Deliberately not a machine-learning cutout. A church logo is nearly always
// flat art on a solid background, and a border flood fill handles that exactly
// — in a few milliseconds, with no model to download and no service to call.
// What it cannot do, it declines to do: a photograph, a gradient backdrop or a
// logo already drawn on a coloured disc is left alone rather than mangled, and
// the caller is told nothing happened. Every one of these decisions is
// reversible from the screen that called it.
//
// The pixel work takes an ImageData rather than a canvas so it can be reasoned
// about — and tested — without a browser. The canvas wrappers at the bottom
// are what components actually call.

import { contrastRatio } from '../../lib/platformDefaults.js'
// Spelled with the extension, unlike most imports under src/, so this module
// resolves under plain Node as well as under Vite — the pixel work below is
// worth being able to run and check outside a browser.
import { encodeCanvas, imageToCanvas, readImageFile, LOGO_OPTIONS } from './imageUtils.js'

/* ------------------------------------------------------------- colour maths */

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

const toHex = (r, g, b) =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`

export const hexToRgb = (hex) => {
  const clean = String(hex).trim().replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

export const rgbToHsl = (r, g, b) => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === red) h = ((green - blue) / d + (green < blue ? 6 : 0)) / 6
  else if (max === green) h = ((blue - red) / d + 2) / 6
  else h = ((red - green) / d + 4) / 6
  return { h, s, l }
}

export const hslToHex = ({ h, s, l }) => {
  if (s === 0) {
    const grey = l * 255
    return toHex(grey, grey, grey)
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t) => {
    let value = t
    if (value < 0) value += 1
    if (value > 1) value -= 1
    if (value < 1 / 6) return p + (q - p) * 6 * value
    if (value < 1 / 2) return q
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
    return p
  }
  return toHex(channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255)
}

/* --------------------------------------------------- cutting the background */

// How far a pixel may sit from the background colour and still count as
// background. Squared euclidean distance in RGB, so 48 is a shade either way
// rather than a different colour — enough for the JPEG noise that makes a
// "white" background anything from #fff to #f7f6f4, and not enough to eat into
// the artwork.
const TOLERANCE = 48

// Pixels this much further out are the anti-aliased rim around the artwork.
// They keep their colour and lose part of their alpha, in proportion, which is
// what stops a cut-out logo wearing a pale halo on a dark masthead.
const FEATHER = 110

// A border that is not mostly one colour is not a flat background — a
// photograph, or artwork that runs to the edge. Nothing is removed.
const BORDER_AGREEMENT = 0.7

// Removing nearly everything means the guess was wrong: pale artwork on a pale
// background, most likely. Better to hand back the original than a blank.
const MAX_COVERAGE = 0.92

// Below this there was no background worth removing, and saying so lets the
// caller keep quiet rather than announce work it did not do.
const MIN_COVERAGE = 0.02

const distanceSq = (data, index, colour) => {
  const dr = data[index] - colour.r
  const dg = data[index + 1] - colour.g
  const db = data[index + 2] - colour.b
  return dr * dr + dg * dg + db * db
}

/** True when the image already carries transparency of its own. */
const hasAlpha = (data) => {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true
  }
  return false
}

/** The colour most of the border is, and how much of the border agrees. */
const borderColour = ({ data, width, height }) => {
  const counts = new Map()
  const note = (x, y) => {
    const i = (y * width + x) * 4
    // Quantised to 5 bits a channel, so a gradient-free background photographed
    // or JPEG-compressed still lands in one bucket.
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)
    const seen = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 }
    seen.n += 1
    seen.r += data[i]
    seen.g += data[i + 1]
    seen.b += data[i + 2]
    counts.set(key, seen)
  }

  for (let x = 0; x < width; x += 1) {
    note(x, 0)
    note(x, height - 1)
  }
  for (let y = 1; y < height - 1; y += 1) {
    note(0, y)
    note(width - 1, y)
  }

  let best = null
  let total = 0
  for (const seen of counts.values()) {
    total += seen.n
    if (!best || seen.n > best.n) best = seen
  }
  if (!best || !total) return null
  return {
    colour: { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n },
    agreement: best.n / total,
  }
}

/**
 * Clears the flat background around a logo, in place.
 *
 * A flood fill from the edges, so only background that the border can actually
 * reach is removed — the white inside the counter of an O is enclosed by the
 * letter and survives, which a plain "delete every white pixel" pass would not
 * manage.
 *
 * Returns what it did: `{ removed, coverage, reason }`. `removed: false` always
 * means the ImageData is untouched.
 */
export const removeFlatBackgroundData = (imageData, { tolerance = TOLERANCE } = {}) => {
  const { data, width, height } = imageData
  if (!width || !height) return { removed: false, coverage: 0, reason: 'empty' }

  // Already cut out by whoever made it. Nothing to do, and a flood fill would
  // only risk eating into artwork that reaches the edge.
  if (hasAlpha(data)) return { removed: false, coverage: 0, reason: 'already-transparent' }

  const border = borderColour(imageData)
  if (!border) return { removed: false, coverage: 0, reason: 'empty' }
  if (border.agreement < BORDER_AGREEMENT) {
    return { removed: false, coverage: 0, reason: 'not-flat' }
  }

  const { colour } = border
  const near = tolerance * tolerance
  const far = FEATHER * FEATHER

  // Flood fill with an explicit stack: a logo is only a few hundred pixels a
  // side, but recursion over a 320×320 background is tens of thousands of
  // frames deep.
  const pixels = width * height
  const clear = new Uint8Array(pixels)
  const stack = []

  const consider = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (clear[p]) return
    if (distanceSq(data, p * 4, colour) > near) return
    clear[p] = 1
    stack.push(p)
  }

  for (let x = 0; x < width; x += 1) {
    consider(x, 0)
    consider(x, height - 1)
  }
  for (let y = 0; y < height; y += 1) {
    consider(0, y)
    consider(width - 1, y)
  }

  while (stack.length) {
    const p = stack.pop()
    const x = p % width
    const y = (p - x) / width
    consider(x + 1, y)
    consider(x - 1, y)
    consider(x, y + 1)
    consider(x, y - 1)
  }

  let cleared = 0
  for (let p = 0; p < pixels; p += 1) if (clear[p]) cleared += 1
  const coverage = cleared / pixels

  if (coverage > MAX_COVERAGE) return { removed: false, coverage, reason: 'too-much' }
  if (coverage < MIN_COVERAGE) return { removed: false, coverage, reason: 'nothing-to-remove' }

  // The rim: a kept pixel touching a cleared one, close enough to the
  // background to be part of the blend the encoder made rather than artwork.
  // Its alpha falls off with how close it is, so the edge stays soft.
  const alphaOf = []
  for (let p = 0; p < pixels; p += 1) {
    if (clear[p]) continue
    const x = p % width
    const y = (p - x) / width
    const touchesCleared =
      (x > 0 && clear[p - 1]) ||
      (x < width - 1 && clear[p + 1]) ||
      (y > 0 && clear[p - width]) ||
      (y < height - 1 && clear[p + width])
    if (!touchesCleared) continue
    const d = distanceSq(data, p * 4, colour)
    if (d >= far) continue
    alphaOf.push([p, Math.round(255 * clamp((d - near) / (far - near), 0, 1))])
  }

  for (let p = 0; p < pixels; p += 1) {
    if (clear[p]) data[p * 4 + 3] = 0
  }
  for (const [p, alpha] of alphaOf) data[p * 4 + 3] = alpha

  return { removed: true, coverage, reason: 'removed' }
}

/* ----------------------------------------------------- reading its colour */

// What counts as "a colour" rather than ink, paper or shadow. A logo is mostly
// black outline and white paper; neither says anything about the church.
const MIN_SATURATION = 0.18
const MIN_LIGHTNESS = 0.12
const MAX_LIGHTNESS = 0.92

// Hue buckets. 24 puts 15° in each, which keeps a red and an orange apart
// without splitting one logo's blue across two.
const HUE_BUCKETS = 24

// A logo that is 1% colour and 99% black line art has no accent worth taking.
const MIN_COLOURED = 0.01

// A candidate has to be worth offering. A bucket holding a twentieth of what
// the strongest one holds is a stray rim of blend pixels, not a second colour
// the church would say it uses.
const MIN_SHARE_OF_BEST = 0.05

// Two candidates this close in RGB are the same colour twice — a logo's blue
// straddling the line between two hue buckets, or a shade of it. The stronger
// one stands and the other is dropped, so the row of swatches is a row of
// genuinely different choices.
const SAME_COLOUR = 60

const rgbDistance = (a, b) => {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b)
}

/**
 * The colours a logo is actually drawn in, strongest first — at most `max`, and
 * empty for artwork that has none: a black-and-white wordmark, or a greyscale
 * crest.
 *
 * Offered rather than applied. Which of a church's colours is *the* colour is
 * not something pixel counts can settle — a crest that is four fifths navy with
 * a gold border may well be the gold church — so this hands back the shortlist
 * and lets somebody who knows the answer point at it.
 *
 * Transparent pixels are skipped, so calling this after the background has been
 * cut means the paper is already out of the reckoning.
 */
export const brandColoursFromData = ({ data }, { max = 6 } = {}) => {
  const buckets = new Array(HUE_BUCKETS).fill(null).map(() => ({ weight: 0, r: 0, g: 0, b: 0 }))
  let opaque = 0
  let coloured = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    opaque += 1
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue
    coloured += 1
    // Weighted by how colourful the pixel is and how far it is from the ends of
    // the scale, so a solid mid-tone mark outvotes a rim of pale blend pixels.
    const weight = s * (1 - Math.abs(l - 0.5))
    const bucket = buckets[Math.min(HUE_BUCKETS - 1, Math.floor(h * HUE_BUCKETS))]
    bucket.weight += weight
    bucket.r += data[i] * weight
    bucket.g += data[i + 1] * weight
    bucket.b += data[i + 2] * weight
  }

  if (!opaque || coloured / opaque < MIN_COLOURED) return []

  const ranked = buckets
    .filter((bucket) => bucket.weight > 0)
    .sort((a, b) => b.weight - a.weight)
  if (!ranked.length) return []

  const floor = ranked[0].weight * MIN_SHARE_OF_BEST
  const out = []
  for (const bucket of ranked) {
    if (bucket.weight < floor) break
    const hex = toHex(bucket.r / bucket.weight, bucket.g / bucket.weight, bucket.b / bucket.weight)
    if (out.some((taken) => rgbDistance(taken, hex) < SAME_COLOUR)) continue
    out.push(hex)
    if (out.length === max) break
  }
  return out
}

/* ------------------------------------------------- turning it into a theme */

// What the built-in colours measure, and so what a generated pair has to hold
// its own against: `primary` under white text on a light page, `primaryDark`
// against the dark page's gray-900. See DEFAULT_THEME in lib/platformDefaults.
const ON_LIGHT = '#ffffff'
const ON_DARK = '#111827'
const LIGHT_TARGET = 5.4
const DARK_TARGET = 6.5

// A logo colour can be paler than an accent should be — a soft gold, a dusty
// rose — and a button in it would read as disabled. Nudged up, never down: a
// vivid logo keeps exactly the colour it has.
const MIN_ACCENT_SATURATION = 0.32

/**
 * Picks the lightness that meets a contrast target while staying as close to
 * the logo's own colour as it can.
 *
 * Walked in small steps rather than solved, because contrast against a fixed
 * background is monotonic in lightness and 100 steps is both exact enough to
 * see and far too fast to notice.
 */
const lightnessFor = (hsl, background, target, direction) => {
  let best = null
  for (let step = 0; step <= 100; step += 1) {
    const l = direction === 'down' ? 1 - step / 100 : step / 100
    const hex = hslToHex({ ...hsl, l })
    if (contrastRatio(hex, background) >= target) {
      best = hex
      break
    }
  }
  // Nothing met it — a hue with no lightness that works, which happens only at
  // absurd targets. The end of the scale is the closest there is.
  return best || hslToHex({ ...hsl, l: direction === 'down' ? 0 : 1 })
}

/**
 * The church's accent pair, taken from its logo.
 *
 * Hue and saturation come from the logo and are kept; only lightness moves, and
 * only as far as it has to. That is what makes the result recognisably the
 * church's colour rather than a colour the app chose — while still being legible
 * under white text on a light page and against the dark one.
 */
export const themeFromBrandColour = (hex) => {
  const { r, g, b } = hexToRgb(hex)
  const base = rgbToHsl(r, g, b)
  const hsl = { ...base, s: clamp(Math.max(base.s, MIN_ACCENT_SATURATION), 0, 1) }
  return {
    // Darkest-first from white downwards: the first lightness that carries white
    // text is the most vivid one that does.
    primary: lightnessFor(hsl, ON_LIGHT, LIGHT_TARGET, 'down'),
    // And upwards from black for the dark page, for the same reason.
    primaryDark: lightnessFor(hsl, ON_DARK, DARK_TARGET, 'up'),
  }
}

/* ----------------------------------------------------------- canvas wrappers */

/** removeFlatBackgroundData, on a canvas. Returns what it did. */
export const removeFlatBackground = (canvas) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = removeFlatBackgroundData(imageData)
  if (result.removed) ctx.putImageData(imageData, 0, 0)
  return result
}

/** brandColoursFromData, on a canvas. */
export const brandColoursFrom = (canvas, options) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  return brandColoursFromData(ctx.getImageData(0, 0, canvas.width, canvas.height), options)
}

const cloneCanvas = (canvas) => {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  copy.getContext('2d', { willReadFrequently: true }).drawImage(canvas, 0, 0)
  return copy
}

/**
 * A picked logo file, ready to store.
 *
 * One place, so the setup guide and Settings treat the same file the same way:
 *
 *   dataUrl   what to upload — cut out if there was a flat background to cut
 *   original  the same logo with its background left on, for the undo
 *   removed   whether anything was actually cut, so the screen only mentions it
 *             when it happened
 *   colours   the colours the artwork is drawn in, strongest first, for the
 *             caller to offer. Empty for black-and-white artwork.
 *
 * The cut runs before the colours are read, so the background is not among the
 * candidates: a logo on a red rectangle is a logo, not a red church.
 */
export const prepareLogo = async (file, options = LOGO_OPTIONS) => {
  const canvas = imageToCanvas(await readImageFile(file), options.maxDim)
  const original = encodeCanvas(canvas, options.maxSize)

  // Cut on a copy, so the original is still there to go back to without
  // decoding the file a second time.
  const cut = cloneCanvas(canvas)
  const result = removeFlatBackground(cut)

  return {
    dataUrl: result.removed ? encodeCanvas(cut, options.maxSize) : original,
    original,
    removed: result.removed,
    reason: result.reason,
    colours: brandColoursFrom(result.removed ? cut : canvas),
  }
}

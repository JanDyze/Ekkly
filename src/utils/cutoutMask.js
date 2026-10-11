// The arithmetic of cutting a thing out of its photograph, kept apart from the
// model that guesses where the thing is (removeBackgroundWorker.js) and from
// the canvas that applies the result (removeBackground.js), so it can be read,
// and tested, on its own. Pure: no DOM, no Vue, no model.
//
// The model looks at a small square copy of the photo and answers, for every
// pixel of it, how sure it is that the pixel belongs to the main subject. Its
// answer is good at "where" and rough at the edges: a faint haze over the
// floor, a door in the wall behind the thing kept as a second subject. What
// follows turns that answer into an alpha mask a church would be happy to see
// on an item's card.

/** The square the model is shown, in pixels a side (U²-Netp's own size). */
export const MODEL_SIZE = 320

// ImageNet's mean and spread, which the model was trained to expect.
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

/**
 * RGBA pixels, already squeezed to MODEL_SIZE square, as the model's input:
 * three planes of floats, scaled by the brightest value the way rembg feeds
 * it (so a dim photo is not also read as a dark one) and then normalised.
 */
export const toModelInput = (rgba, size = MODEL_SIZE) => {
  const count = size * size
  let max = 1
  for (let i = 0; i < count * 4; i++) {
    if ((i & 3) !== 3 && rgba[i] > max) max = rgba[i]
  }
  const input = new Float32Array(3 * count)
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) {
      input[c * count + i] = (rgba[i * 4 + c] / max - MEAN[c]) / STD[c]
    }
  }
  return input
}

/**
 * The model's raw answer as alpha from 0 to 1, cleaned up:
 *
 *  1. Stretched to fill 0..1, as rembg does, because the model rarely says
 *     "certain" outright and its scale drifts from photo to photo.
 *  2. Bent through a gentle S, so the faint haze it leaves over a floor or a
 *     wall drops to nothing and the body of the thing becomes solid, while the
 *     edge between them stays soft rather than jagged.
 *  3. Kept to the main subject: the biggest solid region, and any other region
 *     at least a fifth its size (a guitar and its stand, two speakers side by
 *     side). Smaller islands — a door frame, a reflection, a shoe at the edge
 *     of the photo — are dropped. The kept regions are grown by a few pixels
 *     first, so their soft edges survive the cut.
 *
 * Returns the cleaned alpha and how much of the frame the subject fills, which
 * the caller uses to tell a photo the model understood from one it did not.
 */
export const cleanMask = (raw, size = MODEL_SIZE) => {
  const count = size * size
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < count; i++) {
    if (raw[i] < lo) lo = raw[i]
    if (raw[i] > hi) hi = raw[i]
  }
  const span = hi - lo || 1

  const alpha = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const v = (raw[i] - lo) / span
    // Below 0.12 is haze, above 0.82 is the thing; smoothstep between.
    const t = Math.min(1, Math.max(0, (v - 0.12) / 0.7))
    alpha[i] = t * t * (3 - 2 * t)
  }

  // Solid regions, by flood fill over the pixels at least half sure.
  const label = new Int32Array(count).fill(-1)
  const sizes = []
  const stack = new Int32Array(count)
  for (let start = 0; start < count; start++) {
    if (label[start] !== -1 || alpha[start] < 0.5) continue
    const id = sizes.length
    let top = 0
    let area = 0
    stack[top++] = start
    label[start] = id
    while (top) {
      const at = stack[--top]
      area++
      const x = at % size
      const neighbours = [x > 0 ? at - 1 : -1, x < size - 1 ? at + 1 : -1, at - size, at + size]
      for (const next of neighbours) {
        if (next < 0 || next >= count || label[next] !== -1 || alpha[next] < 0.5) continue
        label[next] = id
        stack[top++] = next
      }
    }
    sizes.push(area)
  }

  const biggest = sizes.length ? Math.max(...sizes) : 0
  if (!biggest) return { alpha, coverage: 0 }

  const keepRegion = sizes.map((area) => area >= biggest * 0.2)
  const keep = new Uint8Array(count)
  for (let i = 0; i < count; i++) if (label[i] !== -1 && keepRegion[label[i]]) keep[i] = 1

  // Grown by GROW pixels (a square reach, which at this size is as good as a
  // round one), so the soft rim around a kept region is kept with it.
  const GROW = 3
  const grown = new Uint8Array(count)
  const rows = new Uint8Array(count)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let on = 0
      for (let dx = -GROW; dx <= GROW && !on; dx++) {
        const nx = x + dx
        if (nx >= 0 && nx < size && keep[y * size + nx]) on = 1
      }
      rows[y * size + x] = on
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let on = 0
      for (let dy = -GROW; dy <= GROW && !on; dy++) {
        const ny = y + dy
        if (ny >= 0 && ny < size && rows[ny * size + x]) on = 1
      }
      grown[y * size + x] = on
    }
  }

  let kept = 0
  for (let i = 0; i < count; i++) {
    if (!grown[i]) alpha[i] = 0
    if (keep[i]) kept++
  }
  return { alpha, coverage: kept / count }
}

/**
 * Whether a cut-out is worth offering as the better picture. A subject that
 * fills almost nothing is the model finding a speck; one that fills almost
 * everything is the model finding nothing to remove (a close-up of a
 * tablecloth). Either way the photo as taken is the better record, so the
 * screen offers it first and says why.
 */
export const looksRight = (coverage) => coverage >= 0.02 && coverage <= 0.92

/**
 * The box round everything at least faintly kept, in the mask's own pixels,
 * with a margin, so the cut-out is stored trimmed to the thing rather than
 * floating in a large empty square.
 */
export const boundsOf = (alpha, size = MODEL_SIZE, margin = 0.04) => {
  let minX = size
  let minY = size
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (alpha[y * size + x] > 0.04) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width: 1, height: 1 }
  const pad = Math.round(size * margin)
  const x = Math.max(0, minX - pad)
  const y = Math.max(0, minY - pad)
  return {
    x: x / size,
    y: y / size,
    width: (Math.min(size, maxX + pad + 1) - x) / size,
    height: (Math.min(size, maxY + pad + 1) - y) / size,
  }
}

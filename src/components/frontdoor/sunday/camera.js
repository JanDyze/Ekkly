import { lerp, phase } from './timeline'

// The camera over the front door's Sunday. A camera is a point of the picture
// (cx, cy), the place on the screen it appears (ax, ay), and how many pixels a
// unit of the picture takes (s). Each SVG is then given the viewBox that
// camera sees, so the drawing is redrawn sharp at every zoom rather than a
// picture being stretched.

/** The camera that fits a region of the picture inside the free part of the screen. */
export const cameraFor = ([cx, cy, w, h], free) => ({
  cx,
  cy,
  s: Math.min(free.w / w, free.h / h),
  ax: free.x + free.w / 2,
  ay: free.y + free.h / 2,
})

/**
 * Part of the way from one camera to another. The zoom is even in feel
 * (it moves through the scale's logarithm), and the point moves in step with
 * the zoom rather than the clock, so whatever is being flown toward — the
 * door, the screen — holds its place on the screen instead of sliding off it
 * half way.
 */
export const blend = (a, b, x) => {
  if (x <= 0) return a
  if (x >= 1) return b
  const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), x))
  const k = Math.abs(a.s - b.s) < 1e-9 ? x : (1 / a.s - 1 / s) / (1 / a.s - 1 / b.s)
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s, ax: lerp(a.ax, b.ax, x), ay: lerp(a.ay, b.ay, x) }
}

/** Where a point of the picture is on the screen. */
export const toScreen = (camera, x, y) => ({
  x: (x - camera.cx) * camera.s + camera.ax,
  y: (y - camera.cy) * camera.s + camera.ay,
})

/** The viewBox a camera sees on a screen of the given size. */
export const viewBoxOf = (camera, width, height) => {
  const left = camera.cx - camera.ax / camera.s
  const top = camera.cy - camera.ay / camera.s
  return [left, top, width / camera.s, height / camera.s].map((n) => n.toFixed(2)).join(' ')
}

/** A keyframe's region, for a phone or not. */
export const regionOf = (key, phone) => (phone && key.phone) || key.at

/**
 * The camera at `t` along a list of keyframes, each held until the next.
 * Between two, it moves with the eased phase of that stretch.
 */
export const alongKeys = (keys, t, free, phone) => {
  if (t <= keys[0].t) return cameraFor(regionOf(keys[0], phone), free)
  for (let i = 0; i < keys.length - 1; i++) {
    const from = keys[i]
    const to = keys[i + 1]
    if (t < to.t) {
      return blend(cameraFor(regionOf(from, phone), free), cameraFor(regionOf(to, phone), free), phase(t, from.t, to.t))
    }
  }
  return cameraFor(regionOf(keys[keys.length - 1], phone), free)
}

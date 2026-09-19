#!/usr/bin/env node
/**
 * The front door's hero picture, framed upright for a phone.
 *
 * The wide ones (src/assets/hero-bg-*.webp) are 2:1 — a lit room with Ekkly's
 * arched window in the right-hand third and the light fanning down-left. A
 * phone's hero layer is a portrait box, and `background-size: cover` on a 2:1
 * picture in a portrait box keeps the middle and throws both ends away: the
 * window goes with them and all that is left is empty wall. That is not a
 * tuning problem, it is the wrong crop.
 *
 * So: take the right-hand third, and stand it on a taller canvas of exactly
 * the wall's own colour — white on the light one, the page's near-black on the
 * dark one, both sampled rather than assumed. The window keeps its place near
 * the top and the light has room to fall down the page.
 *
 * Re-run whenever the wide pictures change:
 *
 *   node brand/ekkly/make-hero-portraits.mjs
 */
import { statSync } from 'node:fs'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')

// The right-hand third of the 1780x884 originals: the window, and as much of
// the light fan as fits beside it.
const REGION = { left: 820, top: 0, width: 959, height: 884 }

// 3:4. Taller than the region, so there is wall underneath for the light to
// fade into rather than the picture ending in a hard edge.
const CANVAS = { width: 959, height: 1279 }

// The window sits this far down, clear of the fade the mask opens with.
const OFFSET_TOP = 128

const JOBS = [
  { src: 'src/assets/hero-bg-light.webp', out: 'src/assets/hero-bg-light-portrait.webp' },
  { src: 'src/assets/hero-bg-dark.webp', out: 'src/assets/hero-bg-dark-portrait.webp' },
]

/** The wall's colour, read off the picture's own corner. */
const wallOf = async (src) => {
  const data = await sharp(src).ensureAlpha().extract({ left: 2, top: 2, width: 4, height: 4 }).raw().toBuffer()
  return { r: data[0], g: data[1], b: data[2], alpha: 1 }
}

for (const job of JOBS) {
  const piece = await sharp(job.src).extract(REGION).toBuffer()
  await sharp({ create: { ...CANVAS, channels: 4, background: await wallOf(job.src) } })
    .composite([{ input: piece, left: 0, top: OFFSET_TOP }])
    .webp({ quality: 88 })
    .toFile(job.out)
  console.log(`${job.out}  ${CANVAS.width}x${CANVAS.height}  ${Math.round(statSync(job.out).size / 1024)}KB`)
}

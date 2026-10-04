// What a video needs loaded before its first frame can be drawn: the
// typeface, the church's logo and any photographs. A canvas measures text with
// whatever face is ready at that moment, so laying out a card before its font
// has arrived would wrap it for the wrong letters.

import { BRAND_FONTS, brandFont, fontsUrl } from '../../../lib/platformDefaults.js'
import { currentTheme } from '../../composables/useBrandTheme'

export const FONT_OPTIONS = [
  { key: 'church', label: 'The church’s own', hint: 'Whatever the app is set in' },
  ...BRAND_FONTS.filter((f) => f.key !== 'system').map((f) => ({ key: f.key, label: f.label, hint: f.note })),
]

/** The accent a video is drawn in: its own, or the church's as it is today. */
export const accentFor = (style) => style?.accent || currentTheme().primary

const rootStack = () =>
  getComputedStyle(document.documentElement).fontFamily || 'system-ui, Helvetica, Arial, sans-serif'

/** The CSS font stack for a choice, as a canvas `font` string wants it. */
export const stackFor = (key) => (key && key !== 'church' ? brandFont(key).stack : rootStack())

const requested = new Set()

const firstFamily = (stack) => String(stack).split(',')[0].trim().replace(/^['"]|['"]$/g, '')

/**
 * Fetches the face, if it is one that has to be fetched, and waits for the
 * weights the cards use. Gives up after a few seconds: a video in the system
 * face is better than no video.
 */
export const ensureFont = async (key) => {
  const stack = stackFor(key)
  if (key && key !== 'church' && !requested.has(key)) {
    requested.add(key)
    const href = fontsUrl([key])
    if (href) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }
  }
  const family = firstFamily(stack)
  if (!document.fonts?.load || /^system-ui$/i.test(family)) return stack
  const loads = [400, 500, 700, 800].map((w) => document.fonts.load(`${w} 40px "${family}"`).catch(() => null))
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 4000))])
  return stack
}

const images = new Map()

/**
 * An image ready to draw, or null if it would not load. Asked for with CORS,
 * because one image from a server that refuses it would taint the canvas and
 * the recording would be refused outright.
 */
export const loadImage = (url) => {
  if (!url) return Promise.resolve(null)
  if (!images.has(url)) {
    images.set(
      url,
      new Promise((resolve) => {
        const img = new Image()
        if (!url.startsWith('data:') && !url.startsWith('/')) img.crossOrigin = 'anonymous'
        img.decoding = 'async'
        // A picture that never answers must not hold the whole video back.
        const timer = setTimeout(() => {
          images.delete(url)
          resolve(null)
        }, 10000)
        img.onload = () => {
          clearTimeout(timer)
          resolve(img)
        }
        img.onerror = () => {
          clearTimeout(timer)
          images.delete(url)
          resolve(null)
        }
        img.src = url
      })
    )
  }
  return images.get(url)
}

/** The church's own address, for the closing card; nothing on a test machine. */
export const churchLink = () => {
  const host = window.location.host
  return /^(localhost|127\.|\[::1\])/.test(host) ? '' : host
}

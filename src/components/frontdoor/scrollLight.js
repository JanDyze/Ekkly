// How far the reader has scrolled past something, as a number from 0 to 1, for
// the front door's scroll-linked motion. It replaces a fade-and-rise that
// played once per section: here the page follows the scroll both ways, so
// light crosses a heading as it is read and goes back if the reader does.
//
//   v-scroll-light="{ start: 0.9, end: 0.5, onProgress }"
//
// Progress is 0 while the element's top is below `start` (a fraction of the
// window's height from the top) and 1 once its bottom has risen past `end`.
// The element gets it as `--p`, a class of `is-lit` at 1, and `onProgress` is
// called whenever it changes. Styles should read `var(--p, 1)`, so a page
// without this still shows everything finished.
//
// Anyone who has asked their device for less motion gets 1 straight away.

const items = new Map()
const near = new Set()
let frame = 0
let observer = null

const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const progressOf = (item, box, height) => {
  const from = item.start * height
  const distance = from - item.end * height + box.height
  if (distance <= 0) return box.top <= from ? 1 : 0
  return Math.min(1, Math.max(0, (from - box.top) / distance))
}

const apply = (el, item, p) => {
  // Three decimals is finer than a pixel of scrolling, and skips the writes
  // that would not change anything.
  const rounded = Math.round(p * 1000) / 1000
  if (rounded === item.p) return
  item.p = rounded
  el.style.setProperty('--p', rounded)
  el.classList.toggle('is-lit', rounded >= 1)
  item.onProgress?.(rounded)
}

// Every box is read before any style is written, so one frame costs one layout.
const measure = (els) => {
  const height = window.innerHeight
  const boxes = els.map((el) => el.getBoundingClientRect())
  els.forEach((el, i) => {
    const item = items.get(el)
    if (item) apply(el, item, progressOf(item, boxes[i], height))
  })
}

const onScroll = () => {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    measure([...near])
  })
}

// Only what is on or near the screen is measured as the page scrolls. Leaving
// it gets one last measure, so a fast fling still settles at 0 or 1.
const watchNear = () => {
  if (observer) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) near.add(entry.target)
        else near.delete(entry.target)
      }
      measure(entries.map((entry) => entry.target))
    },
    { rootMargin: '25% 0px' }
  )
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
}

const unwatchNear = () => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(frame)
  frame = 0
}

export const vScrollLight = {
  mounted(el, binding) {
    const { start = 0.9, end = 0.5, onProgress } = binding.value || {}
    const item = { start, end, onProgress, p: -1 }
    if (typeof IntersectionObserver === 'undefined' || still()) {
      apply(el, item, 1)
      return
    }
    items.set(el, item)
    watchNear()
    observer.observe(el)
    // Measured now, before the first paint, so nothing flashes lit and then dims.
    measure([el])
  },
  updated(el, binding) {
    const item = items.get(el)
    if (item) item.onProgress = binding.value?.onProgress
  },
  unmounted(el) {
    observer?.unobserve(el)
    items.delete(el)
    near.delete(el)
    if (!items.size) unwatchNear()
  },
}

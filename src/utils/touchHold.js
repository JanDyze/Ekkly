// Holding a finger on an image in Android's Chrome opens the browser's own
// menu (download, share, open in new tab), and CSS cannot switch that off:
// -webkit-touch-callout is honoured only by Safari. The menu is the default
// action of the contextmenu event, so it is refused here instead - but only
// for a press that came from a finger. A right-click with a mouse keeps the
// browser's menu, and anything a long-press is meant to open (the People
// list's menu, for one) handles the event itself before it reaches this.

// Places where a hold still means "select this": fields you type in, and any
// passage opted back in with `select-text` (see style.css).
const SELECTABLE = 'input, textarea, [contenteditable]:not([contenteditable="false"]), .select-text'

// What counts as something you press. Rows that are plain divs with a click
// handler (the People list) run their own hold effect off useLongPress.
const PRESSABLE = 'button, a[href], [role="button"], [role="menuitem"], [role="tab"], summary, .pressable'

// Long enough that a finger landing to scroll has already moved, short
// enough that a deliberate touch still feels immediate.
const SETTLE_MS = 70
// How long a quick tap keeps the pressed look, so it is seen at all.
const TAP_FLASH_MS = 140
const MOVE_TOLERANCE = 8

/**
 * The phone's hover. style.css hangs every `hover:` style off `.is-pressed`
 * as well as off a mouse hover, and this decides when that class is on.
 *
 * It is not :active, which is what it used to be. The browser switches
 * :active on the instant a finger lands and off once it has decided the touch
 * is a scroll, so flicking a list lit up whatever was under the thumb for a
 * beat and then dropped it - a flash on every scroll. Here the press waits a
 * moment to see whether the finger is staying, lets go the moment it moves or
 * the page scrolls, and still gives a quick tap a brief flash of its own.
 */
const trackPresses = () => {
  let candidate = null
  let pressed = null
  let settleTimer = null
  let startX = 0
  let startY = 0

  const release = () => {
    clearTimeout(settleTimer)
    settleTimer = null
    candidate = null
    pressed?.classList.remove('is-pressed')
    pressed = null
  }

  const press = (el) => {
    pressed = el
    el.classList.add('is-pressed')
  }

  document.addEventListener(
    'touchstart',
    (event) => {
      release()
      if (event.touches.length > 1) return
      const el = event.target instanceof Element ? event.target.closest(PRESSABLE) : null
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return
      const touch = event.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      candidate = el
      settleTimer = setTimeout(() => {
        settleTimer = null
        if (candidate) press(candidate)
      }, SETTLE_MS)
    },
    { capture: true, passive: true }
  )

  document.addEventListener(
    'touchmove',
    (event) => {
      if (!candidate && !pressed) return
      const touch = event.touches[0]
      if (
        Math.abs(touch.clientX - startX) > MOVE_TOLERANCE ||
        Math.abs(touch.clientY - startY) > MOVE_TOLERANCE
      ) {
        release()
      }
    },
    { capture: true, passive: true }
  )

  const onEnd = () => {
    // Lifted before the press had settled: a quick tap. Show it briefly
    // rather than not at all.
    if (settleTimer && candidate) {
      const el = candidate
      release()
      press(el)
      setTimeout(() => {
        if (pressed === el) release()
      }, TAP_FLASH_MS)
      return
    }
    release()
  }

  document.addEventListener('touchend', onEnd, { capture: true, passive: true })
  document.addEventListener('touchcancel', release, { capture: true, passive: true })
  // Any scroller moving means the touch was never a press.
  document.addEventListener('scroll', release, { capture: true, passive: true })
}

export const suppressTouchHoldMenu = () => {
  let lastPointerWasTouch = false

  // Captured on the way down so it is known before any contextmenu fires,
  // whatever a component does with the press afterwards.
  document.addEventListener(
    'pointerdown',
    (event) => {
      lastPointerWasTouch = event.pointerType === 'touch'
    },
    { capture: true, passive: true }
  )

  document.addEventListener('contextmenu', (event) => {
    if (!lastPointerWasTouch) return
    if (event.target instanceof Element && event.target.closest(SELECTABLE)) return
    event.preventDefault()
  })

  trackPresses()

  // Dragging an image out of the page is the other half of the same menu on
  // some Android builds, and it is never something the app wants.
  document.addEventListener('dragstart', (event) => {
    if (lastPointerWasTouch && event.target instanceof HTMLImageElement) event.preventDefault()
  })
}

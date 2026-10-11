import { onBeforeUnmount, ref } from 'vue'

/**
 * Press and hold, for something that shows only while the finger stays down
 * and goes the moment it lifts: a peek, not a menu.
 *
 * useLongPress opens a menu that stays open after the finger lifts, so it
 * stops watching at the hold. This one watches the whole press through,
 * wherever the finger wanders, and ends on release — or on anything that
 * takes the press away (the browser cancelling it, the window losing focus).
 *
 * `held` is `{ item, el }` while the hold is on — whatever was passed to
 * `start`, and the element pressed — and null otherwise.
 *
 * Once the hold is on, `drag` follows the finger: `{ dx, dy }` from where it
 * was when the hold began, so what is shown can answer a slide (AppPeek's
 * slide up to keep it open). `keep()` stops the release from ending it, so it
 * stays after the finger lifts, and `release()` ends it from anywhere.
 *
 * Three handlers go on the element pressed:
 *   - `start` on pointerdown, with what it is a press on;
 *   - `holdStill` on touchmove. Once the hold is on, a finger that drifts
 *     would otherwise start the page scrolling under the peek, and the
 *     browser would cancel the press. Bound on the element itself rather than
 *     the window, because the browser only lets a touch be held still where a
 *     listener that may refuse it was already in place when the finger landed;
 *   - `swallowClick` on click, in the capture phase. Letting go after a hold
 *     can still land as a tap, which would open whatever was held.
 */
export function usePressAndHold({ delay = 400, moveTolerance = 10 } = {}) {
  const held = ref(null)
  const drag = ref({ dx: 0, dy: 0 })
  let timer = null
  let startX = 0
  let startY = 0
  let lastX = 0
  let lastY = 0
  // Where the finger was when the hold came on, which a slide is measured from.
  let holdX = 0
  let holdY = 0
  let releasedAt = 0

  const stopListening = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('blur', end)
  }

  function end() {
    clearTimeout(timer)
    timer = null
    stopListening()
    drag.value = { dx: 0, dy: 0 }
    if (held.value) {
      held.value = null
      releasedAt = performance.now()
    }
  }

  // A finger that moves before the hold is on is scrolling, not holding.
  // After it is on, the move is a slide, measured from where the hold began.
  function onMove(event) {
    lastX = event.clientX
    lastY = event.clientY
    if (held.value) {
      drag.value = { dx: lastX - holdX, dy: lastY - holdY }
      return
    }
    if (!timer) return
    if (Math.abs(event.clientX - startX) > moveTolerance || Math.abs(event.clientY - startY) > moveTolerance) end()
  }

  const start = (event, item) => {
    if (!event.isPrimary || event.button !== 0) return
    end()
    startX = lastX = event.clientX
    startY = lastY = event.clientY
    const el = event.currentTarget
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', end)
    timer = setTimeout(() => {
      timer = null
      // A short buzz, so the hold registers as deliberate.
      navigator.vibrate?.(10)
      holdX = lastX
      holdY = lastY
      held.value = { item, el }
    }, delay)
  }

  // Stays after the finger lifts: nothing listens for the release any more.
  const keep = () => {
    if (!held.value) return
    stopListening()
    drag.value = { dx: 0, dy: 0 }
    navigator.vibrate?.(10)
  }

  const holdStill = (event) => {
    if (held.value && event.cancelable) event.preventDefault()
  }

  const swallowClick = (event) => {
    if (!held.value && performance.now() - releasedAt > 500) return
    event.preventDefault()
    event.stopPropagation()
  }

  onBeforeUnmount(end)

  return { held, drag, start, holdStill, swallowClick, keep, release: end }
}

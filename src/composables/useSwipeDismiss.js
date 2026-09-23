import { onBeforeUnmount, ref } from 'vue'

/**
 * Swipe a panel away — down for a sheet that came up from the bottom, right
 * for a drawer that came in from the edge.
 *
 * The whole panel is the target, body included. That is the point: a gesture
 * you can only start from a 40px header is one most people never find. What
 * makes it safe to listen on the body is that the swipe defers to scrolling:
 *
 *   - it will not start unless the scroller under the finger is already at its
 *     start, so a list you are halfway down scrolls as it always did;
 *   - it will not start until the finger has committed to the dismiss axis, so
 *     a mostly-vertical drag in a right-hand drawer is a scroll, not a close;
 *   - a drag the wrong way does nothing at all.
 *
 * Nothing is prevented until the swipe has actually taken over, which is why
 * the move listener has to be non-passive rather than simply blocking touch
 * with `touch-action: none`. Blocking outright is what made the earlier
 * version header-only.
 *
 * A finger is read through touch events rather than pointer events, even though
 * it arrives as both. The browser cancels the pointer stream the moment it
 * decides a touch is a pan — which is the very gesture being read here — and a
 * cancelled pointer takes the drag with it. That never showed while the only
 * two callers were drawers coming in from the right, because a sideways drag
 * inside a vertically scrolling panel is not a pan the browser wants; a sheet
 * dragged downwards is, and it was claimed before it had moved a pixel. Touch
 * events keep arriving through all of that, so the drag survives long enough to
 * call preventDefault and take the gesture over.
 */
const AXIS_SLOP = 8

export function useSwipeDismiss(options = {}) {
  const { direction = 'down', threshold = 110, onDismiss, enabled } = options

  const offset = ref(0)
  const dragging = ref(false)
  let start = null

  /**
   * The nearest scrolling ancestor of whatever was touched, and whether it is
   * still at the top (or left) of its content. A sheet must not slide away
   * under a finger that was trying to scroll back up a long list.
   */
  const scrollerAtStart = (target) => {
    let el = target
    while (el && el !== document.body) {
      const style = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
      if (!style) break
      const scrolls =
        direction === 'down'
          ? /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight
          : /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth
      if (scrolls) return direction === 'down' ? el.scrollTop <= 0 : el.scrollLeft <= 0
      el = el.parentElement
    }
    return true
  }

  const detach = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('touchmove', onTouchmove)
    window.removeEventListener('touchend', onUp)
    window.removeEventListener('touchcancel', onUp)
  }

  const release = () => {
    detach()
    start = null
    dragging.value = false
    offset.value = 0
  }

  /**
   * One move, whichever kind of event carried it. `claim` is how the gesture is
   * taken over once it is ours, and it has to be called from the listener
   * itself — which is why this takes it rather than the event.
   */
  const advance = (x, y, claim) => {
    if (!start) return

    const dx = x - start.x
    const dy = y - start.y
    const along = direction === 'down' ? dy : dx
    const across = direction === 'down' ? Math.abs(dx) : Math.abs(dy)

    if (!dragging.value) {
      // Undecided: wait for the finger to say which way it is going.
      if (Math.abs(along) < AXIS_SLOP && across < AXIS_SLOP) return
      // Wrong way, or mostly across — leave it to the scroller.
      if (along <= 0 || across > Math.abs(along)) return release()
      if (!scrollerAtStart(start.target)) return release()
      dragging.value = true
    }

    offset.value = Math.max(0, along)
    // Only now, once the swipe owns the gesture.
    claim()
  }

  function onMove(event) {
    advance(event.clientX, event.clientY, () => event.preventDefault())
  }

  function onTouchmove(event) {
    // A second finger is a pinch, not a dismiss.
    if (event.touches.length !== 1) return release()
    const touch = event.touches[0]
    advance(touch.clientX, touch.clientY, () => event.preventDefault())
  }

  function onUp() {
    const passed = dragging.value && offset.value > threshold
    detach()
    start = null
    dragging.value = false
    offset.value = 0
    if (passed) onDismiss?.()
  }

  const onPointerdown = (event) => {
    // A finger is read below instead, for the reason at the top of this file.
    if (event.pointerType === 'touch') return
    if (event.button !== undefined && event.button !== 0) return
    if (enabled && !enabled(event)) return
    start = { x: event.clientX, y: event.clientY, target: event.target }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const onTouchstart = (event) => {
    if (event.touches.length !== 1) return
    if (enabled && !enabled(event)) return
    const touch = event.touches[0]
    start = { x: touch.clientX, y: touch.clientY, target: event.target }
    window.addEventListener('touchmove', onTouchmove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
  }

  onBeforeUnmount(release)

  /** Spread onto the panel. */
  const swipeTarget = {
    onPointerdown,
    onTouchstart,
  }

  /** The panel's inline style while a swipe is in flight. */
  const swipeStyle = () => ({
    transform: offset.value
      ? direction === 'down'
        ? `translateY(${offset.value}px)`
        : `translateX(${offset.value}px)`
      : '',
    transition: dragging.value ? 'none' : '',
  })

  return { offset, dragging, swipeTarget, swipeStyle }
}

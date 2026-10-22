import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * A panel of the desktop home opened to every row it has (its "N more"),
 * laid over the whole of its column. Opened inside the panel itself, the rows
 * had only the panel's own height, which on a crowded column is a header and
 * a row: the rows it was opened for had nowhere to go, and the room under
 * them ("That's all that's waiting") still took its share. Over the column
 * they have the height of the screen, and the panels under it are only
 * covered, not moved, so nothing on the board shifts while it is open.
 *
 * It grows out of the panel: drawn at the column's size from the start but
 * cut to the panel's own shape, the cut opening up and down to the column's
 * top and foot, and closing back into the panel as it goes. Its header is
 * where the panel's is, so it reads as the panel itself growing. A cut
 * (clip-path) rather than a change of size, so nothing is laid out again
 * while it moves.
 *
 * `sheet` is the opened panel, positioned absolutely inside the panel's place
 * on the board (HomeBoard's [data-panel], which is relative); `open` says
 * whether it is wanted, and `shown` whether it is on the screen, which stays
 * true while it closes. It is closed by Escape or a press anywhere outside it
 * but `opener` (the "N more" that toggles it), and the focus goes to the
 * sheet as it opens and back to the opener as it closes.
 */
const OPEN_MS = 280
const CLOSE_MS = 220
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useOverColumn(sheet, open, opener = ref(null)) {
  const style = ref(null)
  const shown = ref(false)

  // The column's box, and the panel's place inside it, as measured now.
  const measure = () => {
    const holder = sheet.value?.offsetParent
    const column = holder?.closest('[data-column]')
    if (!holder || !column) return null
    return { c: column.getBoundingClientRect(), h: holder.getBoundingClientRect() }
  }
  const place = () => {
    const at = open.value && measure()
    style.value = at ? { top: `${at.c.top - at.h.top}px`, height: `${at.c.height}px` } : null
  }
  // The cut that leaves only the panel's own place showing.
  const panelCut = () => {
    const at = measure()
    if (!at) return 'inset(0 round 24px)'
    return `inset(${Math.max(0, at.h.top - at.c.top)}px 0 ${Math.max(0, at.c.bottom - at.h.bottom)}px round 24px)`
  }

  const close = () => {
    open.value = false
  }
  const onKey = (event) => {
    if (event.key === 'Escape') close()
  }
  const onPress = (event) => {
    if (sheet.value?.contains(event.target) || opener.value?.contains(event.target)) return
    close()
  }

  let sizes = null
  let motion = null
  const stop = () => {
    sizes?.disconnect()
    sizes = null
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPress, true)
    window.removeEventListener('resize', place)
  }

  watch(open, async (now) => {
    stop()
    motion?.cancel()
    motion = null

    if (!now) {
      const el = sheet.value
      if (el && !reduced()) {
        motion = el.animate([{ clipPath: 'inset(0 round 24px)' }, { clipPath: panelCut() }], { duration: CLOSE_MS, easing: EASE, fill: 'forwards' })
        try {
          await motion.finished
        } catch {
          // Opened again before it had closed: that opening carries on.
          return
        }
      }
      if (open.value) return
      shown.value = false
      style.value = null
      opener.value?.focus?.()
      return
    }

    shown.value = true
    await nextTick()
    place()
    await nextTick()
    const el = sheet.value
    if (!el) return
    if (!reduced()) motion = el.animate([{ clipPath: panelCut() }, { clipPath: 'inset(0 round 24px)' }], { duration: OPEN_MS, easing: EASE })
    // The column changes size with the window and the people rail.
    const column = el.offsetParent?.closest('[data-column]')
    if (column && typeof ResizeObserver !== 'undefined') {
      sizes = new ResizeObserver(place)
      sizes.observe(column)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPress, true)
    window.addEventListener('resize', place)
    el.focus?.({ preventScroll: true })
  })
  onBeforeUnmount(() => {
    stop()
    motion?.cancel()
  })

  return { style, shown, close }
}

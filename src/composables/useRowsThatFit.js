import { nextTick, onBeforeUnmount, onUpdated, ref, watch } from 'vue'

/**
 * Only the rows of a list that are wholly in view, for the panels of the
 * desktop home, which keeps to one screen. A panel there is the height its
 * column gives it, and a list longer than that used to scroll inside it (a
 * scroll inside a card nobody thought to try) or be cut off part way through
 * a row. Now the rows that fit show whole, the rest are hidden, and the panel
 * says how many more (`shown` against what it has).
 *
 * `box` is the element that clips (its overflow hidden): every row whose foot
 * is below its foot is hidden, and every row after it, so a short row never
 * shows after a hidden tall one. The rows are the children of `list(box)`,
 * the box itself unless said otherwise. Hidden rather than taken out, so they
 * are measured again as the panel grows and come back.
 *
 * `heading(el)` marks a row that only heads the rows under it (This week's
 * day): it is not counted, and one left last with nothing of its own under it
 * is hidden too.
 *
 * `off` (a ref) shows every row and counts them all, for a panel opened to
 * show everything, scrolling inside it because someone asked it to.
 */
export function useRowsThatFit(box, { list = (el) => el, heading = () => false, off = ref(false) } = {}) {
  const shown = ref(0)

  const measure = () => {
    const el = box.value
    const rows = el ? [...(list(el)?.children || [])] : []
    let last = rows.length - 1
    if (el && !off.value) {
      const foot = el.getBoundingClientRect().bottom + 0.5
      const over = rows.findIndex((row) => row.getBoundingClientRect().bottom > foot)
      if (over >= 0) last = over - 1
      while (last >= 0 && heading(rows[last])) last -= 1
    }
    rows.forEach((row, i) => {
      row.style.visibility = i <= last ? '' : 'hidden'
    })
    shown.value = rows.slice(0, last + 1).filter((row) => !heading(row)).length
  }

  // Measured again whenever the box changes size (the column sharing out its
  // height anew, the window, a panel moved) or its rows change.
  let sizes = null
  let changes = null
  const follow = (el) => {
    sizes?.disconnect()
    changes?.disconnect()
    if (!el || typeof ResizeObserver === 'undefined') return
    sizes = new ResizeObserver(measure)
    sizes.observe(el)
    changes = new MutationObserver(measure)
    changes.observe(list(el) || el, { childList: true })
  }
  watch(box, (el) => {
    follow(el)
    measure()
  }, { flush: 'post', immediate: true })
  watch(off, () => nextTick(measure))
  onUpdated(() => nextTick(measure))
  onBeforeUnmount(() => {
    sizes?.disconnect()
    changes?.disconnect()
  })

  return { shown, measure }
}

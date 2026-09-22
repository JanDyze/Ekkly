import { onActivated, onDeactivated, onUnmounted, ref, watchEffect } from 'vue'

// One number the top bar prints beside the page title - "People 142" - for
// pages whose size is worth knowing at a glance. A single shared value
// rather than a prop, because the top bar belongs to the layout and the page
// that knows the number sits several components below it.
const titleCount = ref(null)

/** For the top bar: the number to show, or null for none. */
export const useTitleCountValue = () => titleCount

/**
 * For a page: keep the top bar's number in step with `source`, a getter that
 * returns a number or null (null while the page is still loading, so the bar
 * never prints a zero that is really "not known yet"). Cleared when the page
 * goes, so the next page does not inherit it.
 *
 * A page kept alive (AdminLayout's KEPT_ALIVE) is hidden rather than
 * unmounted, and its effects keep running while hidden - so the number is
 * only written while the page is the one on screen.
 */
export function useTitleCount(source) {
  let onScreen = true
  const read = () => {
    const value = source()
    return Number.isFinite(value) ? value : null
  }

  watchEffect(() => {
    const value = read()
    if (onScreen) titleCount.value = value
  })

  onActivated(() => {
    onScreen = true
    titleCount.value = read()
  })
  onDeactivated(() => {
    onScreen = false
    titleCount.value = null
  })
  onUnmounted(() => {
    titleCount.value = null
  })
}

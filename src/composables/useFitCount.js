import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// How many of a list's items fit in the height the list is given, counting
// from the top, for a page that keeps everything on one screen (the desktop
// home). The list is laid out whole, clipped to its height, and the items
// that would run past its foot are hidden by the caller (`invisible`, so the
// ones above never move) and counted into a "N more" instead: nothing is cut
// off half-shown, and nothing scrolls inside itself.
//
// `listRef` is the list element, which must be `relative` (offsetTop is
// measured from it); its children are the items, in order. It is measured
// again whenever it or any item changes size (a window resized, a row's
// records opened), and when `source` changes.
export function useFitCount(listRef, source) {
  const fit = ref(Infinity)
  let observer = null

  const measure = () => {
    const list = listRef.value
    if (!list) return
    const room = list.clientHeight + 0.5
    let count = 0
    for (const item of list.children) {
      observer?.observe(item)
      if (item.offsetTop + item.offsetHeight > room) break
      count++
    }
    fit.value = count
  }

  onMounted(() => {
    observer = new ResizeObserver(() => measure())
    if (listRef.value) observer.observe(listRef.value)
    measure()
  })
  watch(source, measure, { flush: 'post', deep: true })
  watch(listRef, (list) => {
    if (list && observer) observer.observe(list)
    measure()
  }, { flush: 'post' })
  onBeforeUnmount(() => observer?.disconnect())

  return fit
}

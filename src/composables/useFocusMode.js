import { onActivated, onDeactivated, onUnmounted, ref, watchEffect } from 'vue'

// A page asking for the screen to itself: no top bar, no bottom bar, no
// people rail - the same thing `meta.focus` does for a whole route
// (AdminLayout), but switchable while the page is open.
//
// For the pages where a record is a state rather than a route of its own:
// Settings on a phone opens a section at ?section=..., and that section is a
// detail view like any other, so the chrome should get out of its way. A page
// that asks for this must carry its own way back.
const active = ref(false)

/** For the layout: whether the page on screen has asked for the chrome to go. */
export const useFocusModeValue = () => active

/**
 * For a page: `source` is a getter that says whether the chrome should be
 * hidden right now. It is switched off when the page goes, and while the page
 * is only hidden (kept alive), so nothing else inherits it.
 */
export function useFocusMode(source) {
  let onScreen = true

  watchEffect(() => {
    const wanted = Boolean(source())
    if (onScreen) active.value = wanted
  })

  onActivated(() => {
    onScreen = true
    active.value = Boolean(source())
  })
  onDeactivated(() => {
    onScreen = false
    active.value = false
  })
  onUnmounted(() => {
    active.value = false
  })
}

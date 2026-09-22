// Where a hold or right-click menu goes.
//
// Opened from a long press, the held item is lifted above a dimmed screen
// (HoldFocus.vue), and the menu belongs with it: under the item, lined up with
// the finger, or above it when there is no room below - never over the item
// it is about. Opened from a right-click there is no item to keep clear of,
// and the menu simply sits at the cursor.
//
// Either way it is kept inside the screen, with a small margin.

const MARGIN = 10
// The lifted item grows a little (scale 1.03), so the menu leaves room for it.
const GAP = 12

export function placeMenu({ x, y, width, height, anchor = null }) {
  const maxLeft = window.innerWidth - width - MARGIN
  const left = Math.max(MARGIN, Math.min(x, maxLeft))

  if (!anchor) {
    const maxTop = window.innerHeight - height - MARGIN
    return { left, top: Math.max(MARGIN, Math.min(y, maxTop)) }
  }

  const rect = anchor.getBoundingClientRect()
  const below = rect.bottom + GAP
  if (below + height <= window.innerHeight - MARGIN) return { left, top: below }

  const above = rect.top - GAP - height
  if (above >= MARGIN) return { left, top: above }

  // A tall item on a short screen: over its lower edge, but on screen.
  return { left, top: Math.max(MARGIN, window.innerHeight - height - MARGIN) }
}

import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'

// Ctrl+G (⌘G): the search of the screen you are on, where Ctrl+F searches
// everything (Topbar). A screen's own search is one of three things, and this
// finds whichever it has:
//
//   1. A field already showing: the roll's search on a desktop, Tasks', the
//      search in a sheet that is open over the page. Any visible
//      `input[type="search"]` or `[data-page-search]` field; the last one in
//      the page is the one on top, because sheets are added at its end.
//   2. A search folded away behind a button (Events, the Gallery, Minutes, a
//      phone's roll): the screen hands its opener to `usePageSearch`, and the
//      field it opens is then focused.
//   3. Neither: the caller says so, rather than a key doing nothing.
//
// The search over everything (SearchPanel) is marked `data-global-search` and
// left out, so Ctrl+G never lands back in it.

const FIELDS = 'input[type="search"], [data-page-search]'

// The screens' openers, the latest on top. A kept-alive screen steps off the
// stack while it is hidden, so a screen behind the one showing never answers.
const openers = []

const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'

const findField = () => {
  const fields = [...document.querySelectorAll(FIELDS)].filter(
    (el) => !el.closest('[data-global-search]') && !el.disabled && visible(el)
  )
  return fields[fields.length - 1] || null
}

const focusField = (field) => {
  field.focus()
  field.select?.()
}

/** Puts the caret in this screen's own search. False when it has none. */
export async function openPageSearch() {
  const showing = findField()
  if (showing) {
    focusField(showing)
    return true
  }
  const open = openers[openers.length - 1]
  if (!open) return false
  await open()
  // Most folded searches focus themselves as they open; this catches the
  // ones that are only drawn, a frame later.
  await nextTick()
  requestAnimationFrame(() => {
    const field = findField()
    if (field && document.activeElement !== field) focusField(field)
  })
  return true
}

/** For a screen whose search is folded behind a button: how to open it. */
export function usePageSearch(open) {
  const add = () => {
    if (!openers.includes(open)) openers.push(open)
  }
  const remove = () => {
    const at = openers.indexOf(open)
    if (at !== -1) openers.splice(at, 1)
  }
  onMounted(add)
  onActivated(add)
  onDeactivated(remove)
  onUnmounted(remove)
}

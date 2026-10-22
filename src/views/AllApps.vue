<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, ArrowsLeftRight, DotsSixVertical, MagnifyingGlass, Plus, StarFill, X } from '../icons'
import AppArt from '../components/common/AppArt.vue'
import { useToast } from '../composables/useToast'
import { useAppOrder, HOME_SLOTS } from '../composables/useAppOrder'
import { useDragReorder } from '../composables/useDragReorder'
import { usePermissions } from '../composables/usePermissions'
import { isAppEnabled } from '../composables/useChurchApps'
import { allowedGroups } from '../data/navigation'
import { APPS } from '../../lib/apps'
import { APP_DETAILS } from '../components/frontdoor/appDetails'
import { prefetchRoute } from '../router/prefetch'
import AppPeek from '../components/appframe/AppPeek.vue'
import { usePressAndHold } from '../composables/usePressAndHold'
import { useMediaQuery } from '../composables/useMediaQuery'
import { useFocusMode } from '../composables/useFocusMode'
import { useFocusTrap } from '../composables/useFocusTrap'
import AppDetailsPanel from '../components/apps/AppDetailsPanel.vue'

// Every app, at /apps: behind More apps on the home of all apps
// (src/views/Apps.vue) and the round mark on the bottom bar, laid out the way
// an app store lays out what it has: each app shown, and shown off.
//
// It was a drawer over whatever page opened it. A page of its own can be
// linked to, comes back on a reload, and is somewhere Back returns to from an
// app opened out of it, which a drawer that closed on the way out never was.
//
// Before that it was a grid of small icons with their names — the drawer the
// bottom bar used to open — which said "here is a list" and nothing about why
// anyone would open one. Ekkly already says why, on its front door: every app
// has a line about what changes for the church and three practical wins
// (frontdoor/appDetails.js). Those used to be on every row, under a large
// spotlight of one app, which made a page for finding an app a long read and a
// long scroll. So the words wait until an app is picked:
//
//   1. Their home: the five they keep there, in one row, held and dragged to
//      reorder.
//   2. The catalogue, one grid in the order the navigation keeps, every app a
//      small tile — its artwork, its name, a star if it is on the home — so the whole
//      of it is seen at once. A tile shows the app close up (AppDetailsPanel):
//      what it is for, its wins, Open, and putting it on the home.
//   3. For an administrator, the apps the church has not switched on, as
//      tiles too, whose panel adds one (Settings → Apps & plan). These are the
//      apps being sold, and only someone who can buy them is shown them.
//
// A search at the top finds an app by what it is for as well as its name.
//
// The order is the person's own and follows their account (useAppOrder).
//
// On a desktop it is three columns: the search and the shelf down the left,
// the store's grid in the middle, and the app picked beside it (see the
// template).

const router = useRouter()
const wide = useMediaQuery('(min-width: 1024px)')

// A phone gives the page the whole screen, with its own back arrow: chrome
// round the catalogue made it look like a menu over something else. A
// desktop keeps Ekkly's top bar over it, which names the page and whose mark
// leads home, so the page has no header of its own there.
useFocusMode(() => !wide.value)
const toast = useToast()

const { can, isAdmin } = usePermissions()

// The catalogue, in the groups a church buys apps in, and every app this
// person may open, in the navigation's order.
const groups = computed(() => allowedGroups(can, isAdmin.value).filter((group) => group.items.length))
const apps = computed(() => groups.value.flatMap((group) => group.items))
const { ordered, setOrder, resetOrder } = useAppOrder(apps)

// Back to wherever this was opened from, the way the drawer used to close
// over it; to the home for whoever came in by the address alone, so the arrow
// never leads out of Ekkly.
const close = () => {
  if (window.history.state?.back) router.back()
  else router.replace('/home')
}

// The square an app's artwork sits on: flat, a white tile with a hairline
// ring, never raised on a shadow. The artwork's own gloss is the only depth.
const PLATED = 'grid shrink-0 place-items-center rounded-[14px] bg-white ring-1 ring-gray-200 dark:bg-gray-700 dark:ring-gray-600'

// A tile in the desktop's grid: a white card, its picture over its name and
// tagline, ringed in the church's colour while it is the one shown in the
// panel. Large enough that the grid fills the page rather than gathering in a
// strip across its top: small tiles left a store of a dozen and a half apps
// two rows high over a screen of grey.
const TILE = 'store-tile flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-2 py-2 text-center ring-1 transition-colors dark:bg-gray-800'
const TILE_ON = 'ring-2 ring-primary dark:ring-primary-light'
const TILE_OFF = 'ring-gray-200/70 hover:ring-gray-300 dark:ring-gray-700/70 dark:hover:ring-gray-600'


/** What an app is for, in the words Ekkly sells it with. */
const detailOf = (item) => APP_DETAILS[item.art] || null
const lineOf = (item) => detailOf(item)?.headline || APPS.find((a) => a.key === item.art)?.description || item.description

const open = (item) => router.push(item.path)

// Each app's drawing plays once as the page opens, and again whenever a mouse
// arrives on its row, as the tiles on the home and in each app do. Not for a
// finger: on a phone that would fire on every tap, just as it opens the app.
const plays = reactive({})
const playOf = (key) => plays[key] || 1
const replay = (event, key) => {
  if (event.pointerType === 'mouse') plays[key] = playOf(key) + 1
}

/* --------------------------------------------------------- your home */

const onHome = computed(() => ordered.value.slice(0, HOME_SLOTS))
const homePaths = computed(() => new Set(onHome.value.map((item) => item.path)))

// The shelf is rearranged by holding an app and dragging it, among the five
// only: the catalogue under it scrolls freely, and its stars say what joins.
const shelf = ref([])
const writeShelf = (next) => {
  shelf.value = next
}
const { draggingIndex: heldDragging, dragItem } = useDragReorder(() => shelf.value, writeShelf, { holdDelay: 350 })

// A desktop drags by a grip instead, at once. A mouse has no habit of pressing
// and holding, and pressing on an app's picture starts the browser's own image
// drag, which cancelled the hold — so held and dragged, nothing moved.
const { draggingIndex: gripDragging, dragTarget, dragHandle } = useDragReorder(() => shelf.value, writeShelf)
const draggingIndex = computed(() => (wide.value ? gripDragging.value : heldDragging.value))

watch(
  onHome,
  (rows) => {
    if (draggingIndex.value === null) shelf.value = [...rows]
  },
  { immediate: true, flush: 'post' }
)

// Written once, on release — not on every swap under the finger. A drag that
// ends over the app it started on would otherwise land as a tap and open it.
const justDragged = ref(false)
watch(draggingIndex, (now, before) => {
  if (before === null || now !== null) return
  setOrder([...shelf.value, ...ordered.value.slice(HOME_SLOTS)])
  justDragged.value = true
  setTimeout(() => (justDragged.value = false), 0)
})

/**
 * Putting an app on the home means taking one off: the home holds five. It
 * used to bump whichever was fifth without a word, and nobody could tell
 * which app had gone. So pinning asks: the shelf turns into a choice — "tap
 * the one to swap out" — every app on it marked, and nothing moves until one
 * is tapped. The two trade places, the new one where the old one stood, and
 * a line says which went. There is no unpinning on its own, for the same
 * reason: an app leaves the home only when you choose what takes its place.
 */
const swapping = ref(null)
const shelfRef = ref(null)

const startPin = (item) => {
  if (homePaths.value.has(item.path)) return
  // The choice is made on the home row, which a search hides on a phone. On
  // a desktop the row stays beside the results, so the search can stay too.
  if (!wide.value) query.value = ''
  swapping.value = item
  shelfRef.value?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
}

const cancelPin = () => {
  swapping.value = null
}

const swapOut = (leaving) => {
  const arriving = swapping.value
  if (!arriving) return
  setOrder(
    ordered.value.map((item) =>
      item.path === leaving.path ? arriving : item.path === arriving.path ? leaving : item
    )
  )
  swapping.value = null
  toast.success(`${arriving.name} is on your home in place of ${leaving.name}`)
}

// A tap on the shelf opens the app — or, while choosing, picks the one to go.
const tapShelf = (item) => {
  if (swapping.value) return swapOut(item)
  if (!justDragged.value) open(item)
}

/* -------------------------------------------------- one app, close up */

// The grid is names and pictures; what an app is for is shown when one is
// picked, in a panel beside the grid on a desktop and a sheet on a phone
// (AppDetailsPanel), with the way to open it there. Opening straight from
// the grid skipped the one moment someone browsing every app wants: what is
// this, before I go in?
//
// Until something is picked, a desktop's panel shows one app not on the home,
// a different one each day ("Today's pick"), which took the place of the
// spotlight that stood over the store and pushed every app down a screen.
const selected = ref(null)

const featured = computed(() => {
  const candidates = ordered.value.slice(HOME_SLOTS).filter((item) => detailOf(item))
  if (!candidates.length) return ordered.value[0] || null
  const day = Math.floor(Date.now() / 86400000)
  return candidates[day % candidates.length]
})

/** An app, or an app not on the plan, in the shape the panel reads. */
const detailsOf = (choice) => {
  if (choice.kind === 'sale') {
    const app = choice.app
    return {
      key: `sale:${app.key}`,
      name: app.name,
      art: app.key,
      tagline: '',
      headline: APP_DETAILS[app.key]?.headline || '',
      wins: APP_DETAILS[app.key]?.wins || [],
      description: app.description,
      group: app.group || '',
      forSale: true,
    }
  }
  const item = choice.item
  return {
    key: item.path,
    item,
    path: item.path,
    name: item.name,
    art: item.art,
    tagline: item.tagline || '',
    headline: detailOf(item)?.headline || '',
    wins: detailOf(item)?.wins || [],
    description: item.description || '',
    // Which group of the catalogue it is in, said once on its page now that
    // the grid has no headings.
    group: groups.value.find((group) => group.items.some((each) => each.path === item.path))?.label || '',
    forSale: false,
  }
}

const picked = computed(() => (selected.value ? detailsOf(selected.value) : null))
// What a desktop's panel shows: the pick, or today's.
const shownDetails = computed(() => picked.value || (featured.value ? detailsOf({ kind: 'app', item: featured.value }) : null))
const isShown = (key) => (wide.value ? shownDetails.value?.key === key : picked.value?.key === key)

const pick = (item) => {
  selected.value = { kind: 'app', item }
}
const pickSale = (app) => {
  selected.value = { kind: 'sale', app }
}
const closeDetails = () => {
  selected.value = null
}

// The panel's buttons. Putting an app on the home is chosen on the shelf, so
// on a phone the sheet steps aside for it.
const openPicked = (details) => details.item && open(details.item)
const pinPicked = (details) => {
  if (!details.item) return
  if (!wide.value) closeDetails()
  startPin(details.item)
}

const sheetRef = ref(null)
useFocusTrap(sheetRef, () => !wide.value && Boolean(selected.value), closeDetails)

/* ------------------------------------------------------------ searching */

// Search finds an app by what it is for, not only by its name: "birthday"
// finds People, "offering" Finances, "slides" Presentation. Each app is read
// as its name, its line, its wins and its group, and every word typed has to
// be in there somewhere. While a search is on, the home row steps aside on a
// phone and the catalogue narrows to what matches.
const query = ref('')
const words = computed(() => query.value.trim().toLowerCase().split(/\s+/).filter(Boolean))
const searching = computed(() => words.value.length > 0)

const haystack = (name, key, extra = '') =>
  [name, extra, APP_DETAILS[key]?.headline, ...(APP_DETAILS[key]?.wins || []).map((win) => win.text), APPS.find((a) => a.key === key)?.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const matches = (text) => words.value.every((word) => text.includes(word))

/** The catalogue, narrowed to what a search matches; whole when there is none. */
const shownGroups = computed(() =>
  searching.value
    ? groups.value
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matches(haystack(item.name, item.art, `${item.description || ''} ${group.label || ''}`))),
        }))
        .filter((group) => group.items.length)
    : groups.value
)

/** Apps the church has not switched on: for an administrator, who can. */
const forSale = computed(() =>
  isAdmin.value ? APPS.filter((app) => !app.core && !isAppEnabled(app.key)) : []
)

const shownForSale = computed(() =>
  searching.value ? forSale.value.filter((app) => matches(haystack(app.name, app.key))) : forSale.value
)

const nothingFound = computed(() => searching.value && !shownGroups.value.length && !shownForSale.value.length)

const addApp = () => router.push({ path: '/settings', query: { section: 'plan' } })

/* ------------------------------------------------------------- holding */

// Holding an app's row shows what it does, full screen (AppPeek) — its
// commercial, where it has one — exactly as holding a tile on the home does,
// and sliding up keeps it open. An app not on the plan yet is held the same
// way, which is the best way to see what adding it would bring; kept open,
// its button adds it rather than opens it. The five on the home are not held
// for this: holding is how they are dragged into order.
const { held, drag, start: startHold, holdStill, swallowClick, keep, release } = usePressAndHold()

const holdRow = (event, item) => {
  prefetchRoute(router, item.path)
  startHold(event, item)
}
const holdForSale = (event, app) =>
  startHold(event, { path: '', name: app.name, art: app.key, description: app.description, forSale: true })

const openHeld = () => {
  const item = held.value?.item
  release()
  if (!item) return
  if (item.forSale) addApp()
  else open(item)
}

// Escape puts down the app picked first (a phone's sheet closes itself, by
// its focus trap), then clears a search, and only then leaves, the way it
// closed the drawer. A held app's screen kept open takes Escape for itself
// (AppPeek).
const onKey = (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented || held.value) return
  if (selected.value) closeDetails()
  else if (query.value) query.value = ''
  else if (swapping.value) cancelPin()
  else close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ------------------------------------------------------------ the store */

// The whole store as one grid, narrowed only by a search, in this person's
// own order of their apps (useAppOrder): the five on their home first, as
// the shelf has them, then the rest as they arranged them (Arrange, below),
// or as the navigation keeps them until they do. It had a list of its
// categories down the left, and then a heading over each group in the grid;
// with only two to five apps a group, every heading left a half-empty row
// under it, and a page meant to show every app at once was mostly gaps. What
// the church has not switched on stays apart, after them: those are added,
// not opened.
const shownApps = computed(() => {
  const found = new Set(shownGroups.value.flatMap((group) => group.items.map((item) => item.path)))
  return ordered.value.filter((item) => found.has(item.path))
})

const foundCount = computed(() => shownApps.value.length + shownForSale.value.length)

/* ------------------------------------------------- moving the apps about */

// A tile is picked up and put down where it is wanted, straight from the
// grid, the way the home's panels are (HomeBoard): pressed and moved a
// little, a copy of it lifts off under the pointer, its place stays as an
// outline, and the grid is laid out as it would be with it let go there, the
// other tiles sliding out of the way; let go, the copy glides down into the
// outline. A press that does not move is a click, and shows the app.
//
// It used to need an Arrange button first, and moved the tiles under the
// pointer the moment it crossed one, so the grid jumped from one order to the
// next rather than making way. Here the place is found from where the tiles
// are laid out, not where they are seen mid-slide, so a tile sliding under the
// pointer never moves the aim, and nothing flicks back and forth.
//
// It is the one order of this person's apps (useAppOrder), the same the shelf
// is the first five of, so a tile put among the first five is on the home and
// the fifth steps out of it — the stars say so as it happens — and it is
// written once, when let go. Not while searching: the order is of every app,
// not of a search's few. Not the apps not on the plan, which have no place in
// it.
const preview = ref(null)
const carried = ref(null)
const gridList = ref(null)
const tileEls = new Map()
const setTileEl = (key) => (el) => {
  if (el) tileEls.set(key, el)
  else tileEls.delete(key)
}

const DRAG_THRESHOLD = 6
let press = null
let ghost = null
let landTimer = null

/** The apps in the order the grid shows them: being arranged, or as kept. */
const orderShown = computed(() => preview.value || shownApps.value)

const lift = () => {
  const el = tileEls.get(press.key)
  if (!el) return
  const box = el.getBoundingClientRect()
  ghost = el.cloneNode(true)
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('inert', '')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    zIndex: '9999',
    pointerEvents: 'none',
    cursor: 'grabbing',
    transition: 'none',
  })
  document.body.appendChild(ghost)
  document.body.style.cursor = 'grabbing'
  carried.value = press.key
  preview.value = [...shownApps.value]
}

// Where the pointer is, as a place in the order: the tile under it, from
// where the tiles are laid out (offsets in the list, which a slide does not
// change), or, over the gap between two, no change.
const aimAt = (x, y) => {
  const list = gridList.value
  if (!list || !preview.value) return
  const origin = list.getBoundingClientRect()
  const px = x - origin.left
  const py = y - origin.top
  const under = preview.value.find((item) => {
    const el = tileEls.get(item.path)
    return el && px >= el.offsetLeft && px <= el.offsetLeft + el.offsetWidth && py >= el.offsetTop && py <= el.offsetTop + el.offsetHeight
  })
  if (!under || under.path === carried.value) return
  const next = preview.value.filter((item) => item.path !== carried.value)
  const at = preview.value.findIndex((item) => item.path === under.path)
  next.splice(at, 0, preview.value.find((item) => item.path === carried.value))
  preview.value = next
}

// Each tile slides from where it was to where it is now, as the order shown
// changes (measured before the grid is drawn again, slid after).
const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
watch(
  () => orderShown.value.map((item) => item.path).join(),
  () => {
    if (reducedMotion) return
    const before = new Map([...tileEls].map(([key, el]) => [key, el.getBoundingClientRect()]))
    nextTick(() => {
      tileEls.forEach((el, key) => {
        const was = before.get(key)
        if (!was) return
        el.getAnimations().forEach((running) => running.cancel())
        const now = el.getBoundingClientRect()
        const dx = was.left - now.left
        const dy = was.top - now.top
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: 220,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        })
      })
    })
  },
  { flush: 'pre' }
)

const unlisten = () => {
  window.removeEventListener('pointermove', onTileMove)
  window.removeEventListener('pointerup', onTileUp)
  window.removeEventListener('pointercancel', cancelDrag)
  window.removeEventListener('keydown', onDragKey, true)
  window.removeEventListener('blur', cancelDrag)
}
const settleDrag = () => {
  clearTimeout(landTimer)
  landTimer = null
  ghost?.remove()
  ghost = null
  document.body.style.cursor = ''
  carried.value = null
  press = null
  unlisten()
}
const cancelDrag = () => {
  preview.value = null
  settleDrag()
}
const onDragKey = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelDrag()
  }
}

// The click a drag ends on would show the app under the pointer.
const swallowNextClick = () => {
  const stop = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener('click', stop, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
}

function onTileMove(event) {
  if (!press) return
  if (!carried.value) {
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD) return
    lift()
    if (!carried.value) return
  }
  event.preventDefault()
  if (ghost) ghost.style.translate = `${event.clientX - press.x}px ${event.clientY - press.y}px`
  aimAt(event.clientX, event.clientY)
}

function onTileUp() {
  if (!carried.value) return settleDrag()
  unlisten()
  swallowNextClick()
  const order = preview.value
  // Kept until the saved order has come back, so nothing jumps between.
  if (order) setOrder([...order])
  // The copy glides down into the outline, and only then is the tile there.
  const key = carried.value
  nextTick(() => {
    const at = tileEls.get(key)?.getBoundingClientRect()
    if (!ghost || !at || reducedMotion) return settleDrag()
    const left = parseFloat(ghost.style.left)
    const top = parseFloat(ghost.style.top)
    Object.assign(ghost.style, {
      transition: 'translate 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      translate: `${at.left - left}px ${at.top - top}px`,
    })
    landTimer = setTimeout(settleDrag, 190)
  })
}

const onTileDown = (event, item) => {
  if (searching.value || event.button !== 0 || event.pointerType === 'touch') return
  if (event.target.closest('[data-go]')) return
  if (ghost || landTimer) settleDrag()
  press = { key: item.path, x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', onTileMove, { passive: false })
  window.addEventListener('pointerup', onTileUp)
  window.addEventListener('pointercancel', cancelDrag)
  window.addEventListener('keydown', onDragKey, true)
  window.addEventListener('blur', cancelDrag)
}

// The saved order has caught up: the preview has done its work.
watch(ordered, () => {
  if (!carried.value) preview.value = null
})
onBeforeUnmount(cancelDrag)

/* ------------------------------------------------- the grid, to the page */

// Every tile on a desktop: the apps, in the order shown, then the ones the
// church could add.
const storeTiles = computed(() => [
  ...orderShown.value.map((item) => ({ kind: 'app', key: item.path, item })),
  ...shownForSale.value.map((app) => ({ kind: 'sale', key: `sale:${app.key}`, app })),
])
// Whether an app is among the home's five: in the order being arranged while a
// tile is carried, so the stars move with it, and otherwise as kept.
const onHomeShown = (path) =>
  preview.value ? preview.value.findIndex((item) => item.path === path) < HOME_SLOTS : homePaths.value.has(path)

// The grid fits the room it has, so the page never scrolls: measured, and
// laid out in whichever number of columns makes the tiles largest with every
// row still on the screen. Not wider than TILE_MAX, so a search that leaves
// two apps does not draw two giant ones; and as a row grows short, each tile
// draws its picture smaller and lets its tagline go (the store-tile rules).
const gridBox = ref(null)
const gridSize = ref({ w: 0, h: 0 })
let gridObserver = null
watch(gridBox, (el) => {
  gridObserver?.disconnect()
  if (!el || typeof ResizeObserver === 'undefined') return
  gridObserver = new ResizeObserver(([entry]) => {
    gridSize.value = { w: entry.contentRect.width, h: entry.contentRect.height }
  })
  gridObserver.observe(el)
})
onBeforeUnmount(() => gridObserver?.disconnect())

const GRID_GAP = 10
const TILE_MIN = 104
const TILE_MAX = 200
const gridFit = computed(() => {
  const n = storeTiles.value.length
  const { w, h } = gridSize.value
  if (!n || !w || !h) return { cols: 5, w: 160, h: 140 }
  let best = null
  for (let cols = 1; cols <= n; cols += 1) {
    const rows = Math.ceil(n / cols)
    const tw = (w - (cols - 1) * GRID_GAP) / cols
    const th = (h - (rows - 1) * GRID_GAP) / rows
    if (tw < TILE_MIN) break
    // Tiles a little wider than tall read best; a cell may be no larger
    // than TILE_MAX either way.
    const size = Math.min(tw, th * 1.15, TILE_MAX)
    if (!best || size > best.size + 0.5) best = { cols, size, w: Math.min(tw, TILE_MAX), h: Math.min(th, TILE_MAX / 1.15) }
  }
  return best || { cols: 1, w: Math.min(w, TILE_MAX), h: 120 }
})
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridFit.value.cols}, ${Math.floor(gridFit.value.w)}px)`,
  gridAutoRows: `${Math.floor(gridFit.value.h)}px`,
  gap: `${GRID_GAP}px`,
}))
</script>

<template>
  <!-- The whole screen on a phone, with neither bar round it (every app is
       a place to go, and chrome round the catalogue made it look like a menu
       over something else); under Ekkly's top bar on a desktop. The list scrolls inside
       a screen of fixed height, so it never shrinks with every letter typed
       into the search. A phone and a desktop each have a layout of their
       own, below. -->
  <div class="flex h-full w-full flex-col overflow-hidden bg-gray-50 pt-[env(safe-area-inset-top)] dark:bg-gray-900">
    <!-- A desktop: the search with the five on the home under it, always in
         view, down the left; the store's grid in the middle, every app a
         tile; and the app
         picked (or today's pick) close up on the right. It is its own layout
         rather than the phone's stretched, since a phone's single column
         only looked lost on a wide screen. Ekkly's top bar is over it here,
         naming the page and leading home, so the page has no header of its
         own. -->
    <template v-if="wide">
      <h1 class="sr-only">All apps</h1>
      <div class="min-h-0 flex-1 overflow-hidden px-5 pb-4">
        <div class="grid h-full w-full grid-cols-[12rem_minmax(0,1fr)_25rem] gap-5 xl:grid-cols-[13rem_minmax(0,1fr)_29rem] 2xl:grid-cols-[13rem_minmax(0,1fr)_33rem]">
          <!-- The left column: the search, and what is on the home. -->
          <!-- A pixel or two of room inside its edges (and taken back outside
               them), so the search's ring and the shelf's are not cut off by
               the column scrolling. -->
          <aside class="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1 pt-4 [scrollbar-width:none]">
            <div class="relative">
              <MagnifyingGlass class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="query"
                type="search"
                autocomplete="off"
                aria-label="Search apps"
                :placeholder="`Search ${apps.length} apps`"
                class="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white [&::-webkit-search-cancel-button]:hidden"
              />
              <button
                v-if="query"
                type="button"
                aria-label="Clear search"
                class="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="query = ''"
              >
                <X class="size-4" />
              </button>
            </div>

            <!-- The five on the home, dragged into order, in view beside the
                 store, so an app found anywhere can be put on the home
                 without losing your place. -->
            <section ref="shelfRef">
              <div class="mb-1.5 px-3">
                <template v-if="swapping">
                  <p class="text-sm font-bold text-primary dark:text-primary-light">Choose one to swap out</p>
                  <p class="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                    {{ swapping.name }} takes its place on your home.
                    <button type="button" class="font-semibold text-gray-700 underline-offset-2 hover:underline dark:text-gray-200" @click="cancelPin">Cancel</button>
                  </p>
                </template>
                <div v-else class="flex items-center justify-between gap-2">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">On your home</p>
                  <button
                    type="button"
                    class="-mr-2 rounded-md px-2 py-0.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    title="Put the apps back in their usual order"
                    @click="resetOrder"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div
                :class="[
                  'flex flex-col gap-0.5 rounded-2xl bg-white p-1.5 ring-1 transition-colors dark:bg-gray-800',
                  swapping ? 'ring-2 ring-primary dark:ring-primary-light' : 'ring-gray-200/70 dark:ring-gray-700/70',
                ]"
              >
                <div
                  v-for="(item, index) in shelf"
                  :key="item.path"
                  v-bind="swapping ? {} : dragTarget(index)"
                  @pointerenter="replay($event, item.path)"
                  :class="['group/row flex items-center rounded-xl', draggingIndex === index ? 'bg-white opacity-90 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600' : '']"
                >
                  <button
                    type="button"
                    :aria-label="swapping ? `Swap ${item.name} out for ${swapping.name}` : `Open ${item.name}`"
                    :class="[
                      'flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors',
                      swapping ? 'apps-wobble hover:bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40',
                    ]"
                    :style="swapping ? { animationDelay: `${index * -90}ms` } : null"
                    @pointerdown="swapping || prefetchRoute(router, item.path)"
                    @click="tapShelf(item)"
                  >
                    <span :class="[PLATED, 'relative size-9 rounded-[10px]']">
                      <AppArt :app-key="item.art" :play="playOf(item.path)" class="size-6.5" />
                      <span
                        v-if="swapping"
                        class="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white dark:bg-primary-light dark:ring-gray-800"
                        aria-hidden="true"
                      >
                        <ArrowsLeftRight class="size-2.5" />
                      </span>
                    </span>
                    <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.name }}</span>
                  </button>
                  <!-- The grip: grabbed, the row comes with it. -->
                  <span
                    v-if="!swapping"
                    v-bind="dragHandle(index)"
                    :aria-label="`Drag ${item.name} to reorder`"
                    title="Drag to reorder"
                    class="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors group-hover/row:text-gray-500 hover:bg-gray-100 dark:text-gray-600 dark:group-hover/row:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <DotsSixVertical class="size-4.5" />
                  </span>
                </div>
              </div>
            </section>
          </aside>

          <!-- The store: every app as a tile, in one grid sized to the room
               it has (gridFit), so the whole of it is on the screen at once,
               never scrolled through; what one is for is in the panel beside
               it. The apps the church could add are tiles in it too, after
               the rest, marked so. -->
          <div class="flex min-h-0 min-w-0 flex-col pt-4">
            <p v-if="nothingFound" class="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              No app for “{{ query.trim() }}”.
            </p>
            <p v-else-if="searching" class="mb-2 shrink-0 px-1 text-sm text-gray-500 dark:text-gray-400">
              {{ foundCount }} {{ foundCount === 1 ? 'app' : 'apps' }} for “{{ query.trim() }}”
            </p>

            <!-- How many, the way to move them, and the way back. -->
            <div v-if="!searching" class="mb-2 flex shrink-0 items-center justify-between gap-3 px-1">
              <p class="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">
                {{ apps.length }} apps <span aria-hidden="true">·</span> drag one to move it; the first {{ HOME_SLOTS }} are your home
              </p>
              <button
                type="button"
                class="h-8 shrink-0 rounded-full px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Put the apps back in their usual order"
                @click="resetOrder"
              >
                Reset
              </button>
            </div>

            <!-- A tile shows the app close up in the panel, and is dragged to
                 move it; the arrow in its corner goes straight in. -->
            <!-- Room round the tiles inside its edge, so the ring of the one
                 picked is not cut off there; gridFit measures inside it. -->
            <div ref="gridBox" class="-m-1 min-h-0 flex-1 overflow-hidden p-1">
              <ul v-if="storeTiles.length" ref="gridList" class="relative grid content-start" :style="gridStyle">
                <li
                  v-for="tile in storeTiles"
                  :key="tile.key"
                  :ref="(el) => tile.kind === 'app' && setTileEl(tile.key)(el)"
                  :class="[
                    'group/tile relative min-h-0',
                    carried === tile.key ? 'rounded-2xl outline-2 -outline-offset-2 outline-dashed outline-gray-300 *:invisible dark:outline-gray-600' : '',
                  ]"
                  @pointerdown="tile.kind === 'app' && onTileDown($event, tile.item)"
                >
                  <button
                    v-if="tile.kind === 'app'"
                    type="button"
                    :aria-pressed="isShown(tile.key)"
                    :class="[TILE, isShown(tile.key) ? TILE_ON : TILE_OFF]"
                    @pointerenter="replay($event, tile.key)"
                    @pointerdown="prefetchRoute(router, tile.item.path)"
                    @click="pick(tile.item)"
                  >
                    <span :class="[PLATED, 'store-plate relative']">
                      <AppArt :app-key="tile.item.art" :play="playOf(tile.key)" class="store-art" />
                      <span
                        v-if="onHomeShown(tile.item.path)"
                        class="absolute -right-1.5 -top-1.5 flex size-5.5 items-center justify-center rounded-full bg-white text-primary ring-1 ring-gray-200 dark:bg-gray-800 dark:text-primary-light dark:ring-gray-600"
                        title="On your home"
                      >
                        <StarFill class="size-3" />
                      </span>
                    </span>
                    <span class="store-name w-full truncate text-sm font-semibold text-gray-900 dark:text-white">{{ tile.item.name }}</span>
                    <span class="store-tag -mt-1 w-full truncate text-xs text-gray-500 dark:text-gray-400">{{ tile.item.tagline }}</span>
                  </button>
                  <button
                    v-else
                    type="button"
                    :aria-pressed="isShown(tile.key)"
                    :class="[TILE, isShown(tile.key) ? TILE_ON : TILE_OFF]"
                    @pointerenter="replay($event, tile.key)"
                    @click="pickSale(tile.app)"
                  >
                    <span :class="[PLATED, 'store-plate relative opacity-80']">
                      <AppArt :app-key="tile.app.key" :play="playOf(tile.key)" class="store-art" />
                    </span>
                    <span class="store-name w-full truncate text-sm font-semibold text-gray-900 dark:text-white">{{ tile.app.name }}</span>
                    <span class="store-tag -mt-1 w-full truncate text-xs font-medium text-primary dark:text-primary-light">Add to plan</span>
                  </button>
                  <!-- Straight in, without the panel first: the tile shows the
                       app, this opens it (or, not on the plan, adds it). Beside
                       the tile rather than in it, as a button cannot hold one.
                       It comes up with the pointer on the tile, so a grid at
                       rest is pictures and names; it stays on the tile shown in
                       the panel, and for the keyboard it is there when reached. -->
                  <button
                    data-go
                    type="button"
                    :aria-label="tile.kind === 'app' ? `Open ${tile.item.name}` : `Add ${tile.app.name} to your plan`"
                    :title="tile.kind === 'app' ? 'Open' : 'Add to your plan'"
                    :class="[
                      'absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-[opacity,background-color,color] duration-150 hover:bg-primary hover:text-white focus-visible:bg-primary focus-visible:text-white focus-visible:opacity-100 group-hover/tile:opacity-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-light dark:hover:text-gray-900',
                      isShown(tile.key) ? 'opacity-100' : 'opacity-0',
                    ]"
                    @pointerdown="tile.kind === 'app' && prefetchRoute(router, tile.item.path)"
                    @click="tile.kind === 'app' ? open(tile.item) : addApp()"
                  >
                    <ArrowRight v-if="tile.kind === 'app'" class="size-4" />
                    <Plus v-else class="size-4" />
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <!-- The app picked (or today's pick), its page, the height of the
               screen. -->
          <aside class="flex min-h-0 flex-col pt-4">
            <div v-if="shownDetails" class="flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-4 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
              <AppDetailsPanel
                :key="shownDetails.key"
                fill
                :app="shownDetails"
                :kicker="picked ? '' : 'Today’s pick'"
                :on-home="Boolean(shownDetails.path && homePaths.has(shownDetails.path))"
                :pinning="Boolean(shownDetails.path && swapping?.path === shownDetails.path)"
                @open="openPicked(shownDetails)"
                @pin="pinPicked(shownDetails)"
                @add="addApp"
              />
            </div>
          </aside>
        </div>
      </div>
    </template>

    <!-- A phone. -->
    <template v-else>
      <!-- The back arrow and the search share one row. A title and a count
           above them took a band of the screen to say what the search field
           already says, so the title is kept for screen readers only. The
           search sits outside the scrolling list so it is always in reach, and
           is never focused on its own: on a phone that would raise the
           keyboard every time the page opened. -->
      <h1 class="sr-only">Apps</h1>
      <div class="mx-auto flex w-full max-w-2xl shrink-0 items-center gap-1 pb-2 pl-2 pr-4 pt-3">
        <button
          type="button"
          aria-label="Back"
          class="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
          @click="close"
        >
          <ArrowLeft class="size-5" />
        </button>
        <div class="relative min-w-0 flex-1">
          <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
          <input
            v-model="query"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            aria-label="Search apps"
            :placeholder="`Search ${apps.length} apps — try “birthdays”`"
            class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            v-if="query"
            type="button"
            aria-label="Clear search"
            class="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="query = ''"
          >
            <X class="size-4" />
          </button>
        </div>
      </div>

      <!-- overscroll-contain: a flick down at the top of this list would
           otherwise be handed to the browser, and Chrome on Android turns
           that into pull-to-refresh. -->
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] [&>*]:mx-auto [&>*]:max-w-2xl">
        <!-- 2. Their home: the five, held and dragged to reorder. -->
        <section v-show="!searching" ref="shelfRef" class="mt-2 scroll-mt-4">
          <div class="mb-2 flex items-end justify-between gap-2 px-1">
            <template v-if="swapping">
              <h3 class="min-w-0 text-sm font-bold text-primary dark:text-primary-light">
                Tap the app to swap out for {{ swapping.name }}
              </h3>
              <button
                type="button"
                class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
                @click="cancelPin"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <h3 class="text-base font-bold text-gray-900 dark:text-white">On your home</h3>
              <span class="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                Hold and drag to reorder
                <button
                  type="button"
                  class="-mr-1 rounded-md px-1.5 py-0.5 font-semibold text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  title="Put the apps back in their usual order"
                  @click="resetOrder"
                >
                  Reset
                </button>
              </span>
            </template>
          </div>
          <div
            :class="[
              'grid grid-cols-5 gap-1 rounded-2xl bg-white p-2 ring-1 transition-colors dark:bg-gray-800',
              swapping ? 'ring-2 ring-primary dark:ring-primary-light' : 'ring-gray-200/70 dark:ring-gray-700/70',
            ]"
          >
            <div
              v-for="(item, index) in shelf"
              :key="item.path"
              v-bind="swapping ? {} : dragItem(index)"
              :class="draggingIndex === index ? 'opacity-90' : ''"
            >
              <button
                type="button"
                :aria-label="swapping ? `Swap ${item.name} out for ${swapping.name}` : `Open ${item.name}`"
                :class="[
                  'flex w-full flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 transition-colors',
                  swapping ? 'apps-wobble hover:bg-primary/5' : 'active:bg-gray-100 dark:active:bg-gray-700/60',
                ]"
                :style="swapping ? { animationDelay: `${index * -90}ms` } : null"
                @pointerdown="swapping || prefetchRoute(router, item.path)"
                @click="tapShelf(item)"
              >
                <span :class="[PLATED, 'relative size-12']">
                  <AppArt :app-key="item.art" :play="playOf(item.path)" class="size-9" />
                  <span
                    v-if="swapping"
                    class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white dark:bg-primary-light dark:ring-gray-800"
                    aria-hidden="true"
                  >
                    <ArrowsLeftRight class="size-3" />
                  </span>
                </span>
                <span class="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-800 dark:text-gray-200">{{ item.name }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 3. The catalogue: every app as a tile, four across, in one grid.
             A tap shows the app close up (the sheet, below); holding plays
             what it does. -->
        <p v-if="nothingFound" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No app for “{{ query.trim() }}”.
        </p>

        <section v-if="shownApps.length" :class="searching ? 'mt-2' : 'mt-3'">
          <ul class="grid grid-cols-4 gap-0.5 rounded-2xl bg-white p-1 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
            <li v-for="item in shownApps" :key="item.path" @click.capture="swallowClick">
              <button
                type="button"
                class="flex w-full flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors active:bg-gray-100 dark:active:bg-gray-700/60"
                @pointerdown="holdRow($event, item)"
                @touchmove="holdStill"
                @contextmenu.prevent
                @click="pick(item)"
              >
                <span data-art-plate :class="[PLATED, 'relative size-12']">
                  <AppArt :app-key="item.art" :play="playOf(item.path)" class="size-9" />
                  <span
                    v-if="homePaths.has(item.path)"
                    class="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-white text-primary ring-1 ring-gray-200 dark:bg-gray-800 dark:text-primary-light dark:ring-gray-600"
                    aria-label="On your home"
                  >
                    <StarFill class="size-2.5" />
                  </span>
                </span>
                <span class="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-800 dark:text-gray-200">{{ item.name }}</span>
              </button>
            </li>
          </ul>
        </section>

        <!-- 4. What the church could add: for whoever can add it. -->
        <section v-if="shownForSale.length" class="mt-3">
          <h3 class="mb-1 px-1 text-sm font-bold text-gray-900 dark:text-white">Not on your plan</h3>
          <ul class="grid grid-cols-4 gap-0.5 rounded-2xl bg-white p-1 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
            <li v-for="app in shownForSale" :key="app.key" @click.capture="swallowClick">
              <button
                type="button"
                class="flex w-full flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors active:bg-gray-100 dark:active:bg-gray-700/60"
                @pointerdown="holdForSale($event, app)"
                @touchmove="holdStill"
                @contextmenu.prevent
                @click="pickSale(app)"
              >
                <span data-art-plate :class="[PLATED, 'size-12 opacity-80']">
                  <AppArt :app-key="app.key" :play="playOf(app.key)" class="size-9" />
                </span>
                <span class="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-800 dark:text-gray-200">{{ app.name }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <!-- The app tapped, close up, in a sheet from the foot. -->
      <Teleport to="body">
        <Transition name="apps-sheet">
          <div v-if="picked" class="fixed inset-0 z-90 flex flex-col justify-end">
            <div class="absolute inset-0 bg-black/50" @click="closeDetails" />
            <div
              ref="sheetRef"
              role="dialog"
              aria-modal="true"
              :aria-label="picked.name"
              tabindex="-1"
              class="apps-sheet-panel relative max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 dark:bg-gray-800"
            >
              <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-600" aria-hidden="true" />
              <button
                type="button"
                aria-label="Close"
                class="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="closeDetails"
              >
                <X class="size-5" />
              </button>
              <AppDetailsPanel
                :app="picked"
                :on-home="Boolean(picked.path && homePaths.has(picked.path))"
                :pinning="Boolean(picked.path && swapping?.path === picked.path)"
                @open="openPicked(picked)"
                @pin="pinPicked(picked)"
                @add="addApp"
              />
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>

    <AppPeek
      :app="held?.item"
      :from="held?.el"
      :line="held?.item ? lineOf(held.item) : ''"
      :drag="drag"
      :open-label="held?.item?.forSale ? `Add ${held.item.name} to your plan` : ''"
      @keep="keep"
      @close="release"
      @open="openHeld"
    />
  </div>
</template>

<style scoped>
/* The apps on the shelf, while one is being chosen to swap out: a small
   wobble, the way a phone's home screen says its icons can be moved. */
.apps-wobble {
  animation: apps-wobble 0.32s ease-in-out infinite alternate;
}

@keyframes apps-wobble {
  from {
    rotate: -1.6deg;
  }
  to {
    rotate: 1.6deg;
  }
}

/* On a desktop the shelf is a column of wide rows, and the same turn would
   swing their far ends a long way, so they wobble less. */
@media (min-width: 1024px) {
  .apps-wobble {
    animation-name: apps-wobble-row;
  }
}

@keyframes apps-wobble-row {
  from {
    rotate: -0.6deg;
  }
  to {
    rotate: 0.6deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .apps-wobble {
    animation: none;
  }
}

/* A tile in the desktop's grid sizes what is in it to the cell it is given
   (gridFit): its picture a share of the cell's height up to its full size,
   and on a short row its tagline gone, then its name a size smaller. */
.store-tile {
  container-type: size;
}
.store-plate {
  width: min(4rem, 46cqh);
  height: min(4rem, 46cqh);
  border-radius: 28%;
}
.store-art {
  width: 72%;
  height: 72%;
}
@container (max-height: 8rem) {
  .store-tag {
    display: none;
  }
}
@container (max-height: 5rem) {
  .store-name {
    font-size: 11px;
  }
}

/* The sheet an app is shown close up in, on a phone: it rises from the foot
   over the page dimming behind it. */
.apps-sheet-enter-active,
.apps-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.apps-sheet-enter-active .apps-sheet-panel,
.apps-sheet-leave-active .apps-sheet-panel {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.apps-sheet-enter-from,
.apps-sheet-leave-to {
  opacity: 0;
}
.apps-sheet-enter-from .apps-sheet-panel,
.apps-sheet-leave-to .apps-sheet-panel {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .apps-sheet-enter-active,
  .apps-sheet-leave-active,
  .apps-sheet-enter-active .apps-sheet-panel,
  .apps-sheet-leave-active .apps-sheet-panel {
    transition: none;
  }
}
</style>

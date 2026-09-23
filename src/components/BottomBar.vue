<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePermissions } from '../composables/usePermissions'
import { useRoute, useRouter } from 'vue-router'
import { useFocusTrap } from '../composables/useFocusTrap'
import { X } from '../icons'
import { NAV_ITEMS, navItemAllowed } from '../data/navigation'
import { useAppOrder, BAR_SLOTS } from '../composables/useAppOrder'
import { useDragReorder } from '../composables/useDragReorder'
import AppTile from './nav/AppTile.vue'
import AppArt from './common/AppArt.vue'

const route = useRoute()
const router = useRouter()
const { can, isAdmin } = usePermissions()
// The drawer is open when the address says so: ?apps on whatever page it was
// opened over (/members?apps). So it is a place you can link to or reload
// into, and the phone's Back button closes it instead of leaving the page. A
// query rather than a route of its own because the drawer is not a page - it
// sits over the one you are on, which stays mounted underneath.
const showMoreMenu = computed(() => route.query.apps !== undefined)

// Whether this tab put the drawer's entry into history, which decides how it
// closes (see closeMoreMenu).
let openedHere = false

// The sidebar, the home catalogue and this bar all read from data/navigation,
// so a page added in one place cannot go missing from another - which is
// exactly how Presentation ended up reachable from a desktop and nowhere on a
// phone.
const allowed = (item) => navItemAllowed(item, can, isAdmin.value)

const allowedApps = computed(() => NAV_ITEMS.filter(allowed))

// Which four ride on the bar is no longer a decision made here: it is whatever
// the person dragged to the front of the drawer, alphabetical until they do.
const { ordered, primary: primaryNav, setOrder, resetOrder } = useAppOrder(allowedApps)

// The drawer is the whole catalogue, one flat grid - including the four
// already on the bar. A home screen shows the apps in its dock too; leaving
// them out would make the drawer a list of leftovers rather than a map.
//
// No search. The grid is the whole catalogue in the person's own order, and
// at a couple of dozen apps it is quicker to look than to type; the field was
// a row of the card spent on something nobody reached for.
const visibleApps = computed(() => ordered.value)

// Tapping an app chooses it rather than going there. A drawer this full is
// easy to mis-tap from, and a wrong tap used to throw you onto a page you did
// not want; now it only moves the choice, and the panel under the grid says
// what the chosen app is before the button takes you there. Tapping the
// chosen app a second time goes too, for anyone who knows what they want.
const selectedPath = ref(null)
const selectedApp = computed(
  () => allowedApps.value.find((item) => item.path === selectedPath.value) || null
)

// Replays the chosen app's artwork, on its tile and in the panel, each time
// the choice changes.
const pickTick = ref(0)

// The list the grid renders. It follows the saved order except mid-drag, when
// it is the thing being rearranged.
//
// dragItem rather than a separate grip: there is no room for one on a 56px
// tile, and the whole tile being the handle is what a phone home screen does.
// A press that does not move still lands as a click, so tapping to open an app
// is unaffected. It does mean a tile cannot be scrolled from - acceptable
// because seventeen apps at four across fit a full-height drawer without
// scrolling, and the gaps between tiles still scroll.
const dragList = ref([])
/**
 * A drop that touches the dock swaps the two apps rather than shifting the
 * list. Dragging the tenth app onto the second slot with an insert would push
 * the app that was second into third, third into fourth, and knock the fourth
 * off the bar entirely - three changes nobody asked for. A swap moves exactly
 * the two apps involved and leaves the rest of the bar where it was.
 *
 * Past the dock the ordinary lift-and-drop still applies: down there the order
 * is just an order, and shifting neighbours is what you would expect.
 */
const swapWithinDock = (list, from, to) => {
  if (from >= BAR_SLOTS && to >= BAR_SLOTS) {
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }
  const next = [...list]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

const { draggingIndex, dragItem } = useDragReorder(
  () => dragList.value,
  (next) => {
    dragList.value = next
  },
  { reorder: swapWithinDock, holdDelay: 350 }
)

// A drag that finishes over the tile it started on would otherwise land as a
// click and navigate away. One tick is enough: the click follows the pointerup
// immediately or not at all.
const justDragged = ref(false)
watch(draggingIndex, (now, before) => {
  if (before === null || now !== null) return
  justDragged.value = true
  setTimeout(() => (justDragged.value = false), 0)
})

const selectApp = (item) => {
  if (justDragged.value) return
  if (selectedPath.value === item.path) {
    navigate(item.path)
    return
  }
  selectedPath.value = item.path
  pickTick.value += 1
  prefetchRoute(item.path)
}

const openSelected = () => {
  if (selectedApp.value) navigate(selectedApp.value.path)
}

watch(
  visibleApps,
  (rows) => {
    if (draggingIndex.value === null) dragList.value = [...rows]
  },
  { immediate: true }
)

// Written once, on release - not on every swap under the finger.
watch(draggingIndex, (now, before) => {
  if (before !== null && now === null) setOrder(dragList.value)
})

// The centre button sits between the halves rather than at one end, so the
// split has to survive a shorter nav: with three tabs the spare one goes left,
// with one it is the only thing on that side.
const splitAt = computed(() => Math.ceil(primaryNav.value.length / 2))
const leftNav = computed(() => primaryNav.value.slice(0, splitAt.value))
const rightNav = computed(() => primaryNav.value.slice(splitAt.value))

// The same kick the sidebar uses: AppArt replays whenever this changes, so the
// icon of the page being opened animates and the rest sit still. It starts at
// 0, which AppArt reads as "show finished" - opening the app should not set
// the whole bar off, only moving between pages should.
const playTick = ref(0)
// A tab played its artwork the moment it was tapped (tapTab), so when the
// route catches up it must not play it a second time from the start.
let playedFor = null
watch(
  () => route.path,
  (path) => {
    if (playedFor && path.startsWith(playedFor)) {
      playedFor = null
      return
    }
    playTick.value += 1
  }
)

/*
 * A tap answers at once. Pages are loaded on demand, so a navigation can wait
 * on its page's code arriving, and the bar used to wait with it: the tab lit
 * and the pill moved only once the router had finished, which on a slow
 * connection was long enough to wonder whether the tap had landed. Now the
 * tapped tab is the current one straight away - lit, playing, with the pill
 * on its way - and the page follows as soon as it can. If the navigation
 * fails or is turned away, the bar goes back to wherever the route really is.
 */
const pendingPath = ref(null)

const stopAfter = router.afterEach(() => {
  pendingPath.value = null
})
const stopError = router.onError(() => {
  pendingPath.value = null
  playedFor = null
})
onBeforeUnmount(() => {
  stopAfter()
  stopError()
})

/*
 * And the page is usually there before the tap. Loading a route's code is
 * the slow part of moving to it, so it is fetched ahead: the four pages on the
 * bar once the app has settled, any tab as a finger comes down on it (a tap is
 * a good hundred milliseconds from press to release), and an app in the drawer
 * as soon as it is chosen, while its Open button is still being reached for.
 * The router's own load then finds the module already fetched.
 */
const prefetched = new Set()
const prefetchRoute = (path) => {
  if (!path || prefetched.has(path)) return
  prefetched.add(path)
  router.resolve(path).matched.forEach((record) => {
    const load = record.components?.default
    // A route not yet visited holds a loader function; a visited one holds
    // the component itself, and there is nothing to fetch.
    if (typeof load !== 'function') return
    Promise.resolve(load()).catch(() => prefetched.delete(path))
  })
}

// The bar's tabs can arrive after the first warm-up - capabilities land after
// the first render, and a person can reorder the bar - so any tab that joins
// it later is fetched too.
let warmed = false
watch(primaryNav, (items) => {
  if (warmed) items.forEach((item) => prefetchRoute(item.path))
})

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// With the labels gone, the selected tab is marked by one pill that slides
// between the icons rather than a background per tab switching on and off: the
// travel is what tells you which way you just moved. Its position has to be
// measured rather than calculated, because the two tab groups sit either side
// of the centre button and so are not a uniform grid.
const islandRef = ref(null)
const tabEls = new Map()
const setTabRef = (path, el) => {
  if (el) {
    tabEls.set(path, el)
  } else {
    tabEls.delete(path)
  }
}

const indicatorX = ref(0)
// Measured too, not fixed: the tabs are elastic now.
const indicatorW = ref(44)
const indicatorShown = ref(false)
// The very first placement snaps: a pill sliding in from the left edge on
// every cold start would read as something still loading.
const indicatorAnimates = ref(false)

// Whether a tab is the current one: the tab just tapped, while its page is on
// the way, and otherwise whichever the route says.
const isTabActive = (path) => (pendingPath.value ? pendingPath.value === path : isActive(path))

const tapTab = (path) => {
  if (isActive(path) && !pendingPath.value) return navigate(path)
  pendingPath.value = path
  playedFor = path
  playTick.value += 1
  navigate(path)
}

const activeTabPath = computed(() => primaryNav.value.find((item) => isTabActive(item.path))?.path)

const placeIndicator = () => {
  const el = activeTabPath.value ? tabEls.get(activeTabPath.value) : null
  if (!el || !islandRef.value) {
    // Nothing on the strip is current - the page came out of the drawer - so
    // the pill fades out where it stands rather than sliding off to nowhere.
    indicatorShown.value = false
    return
  }
  // offsetLeft is measured against the island, which is the nearest
  // positioned ancestor.
  indicatorX.value = el.offsetLeft + el.offsetWidth / 2
  indicatorW.value = el.offsetWidth
  indicatorShown.value = true
}

/*
 * The bar's outline: a pill with a smooth dip in the top edge that the mark
 * sits in. Drawn as a path because the dip has shoulders - the top edge
 * rounds down into it rather than being cut off square - and no CSS shape
 * does that. It depends on the bar's width, so it is rebuilt when that
 * changes.
 *
 * The dip is an arc of the notch circle, 40px in radius round the mark's
 * centre (12px below the top edge, 34px mark plus a 6px gap). Each shoulder is
 * a small circle, 3px in radius, resting on the top edge and touching the
 * notch circle from outside - just enough to take the point off the corner.
 * Kept that small so the dip follows the mark at the same distance all the
 * way up to the edge; a wider shoulder flared the edge away from the circle
 * near the top and made the gap there look bigger than the gap below.
 *
 * With shoulders this small the dip's ends sit above the mark's centre, so the
 * arc round the bottom is more than half a circle, and SVG has to be told so
 * (the large-arc flag) or it draws the short way round instead.
 */
const BAR_H = 64
const NOTCH_R = 40
const NOTCH_Y = 12
const SHOULDER_R = 3

const islandW = ref(0)

const barPath = computed(() => {
  const w = islandW.value
  if (!w) return ''
  const r = BAR_H / 2
  const cx = w / 2
  const reach = NOTCH_R + SHOULDER_R
  // How far either side of centre each shoulder's circle sits.
  const dx = Math.sqrt(reach * reach - (SHOULDER_R - NOTCH_Y) ** 2)
  // Where each shoulder meets the dip: on the line between the two centres,
  // one notch radius out from the mark.
  const px = (dx * NOTCH_R) / reach
  const py = NOTCH_Y + ((SHOULDER_R - NOTCH_Y) * NOTCH_R) / reach
  const n = (v) => Math.round(v * 100) / 100
  return [
    `M ${r} 0`,
    `L ${n(cx - dx)} 0`,
    `A ${SHOULDER_R} ${SHOULDER_R} 0 0 1 ${n(cx - px)} ${n(py)}`,
    `A ${NOTCH_R} ${NOTCH_R} 0 ${py < NOTCH_Y ? 1 : 0} 0 ${n(cx + px)} ${n(py)}`,
    `A ${SHOULDER_R} ${SHOULDER_R} 0 0 1 ${n(cx + dx)} 0`,
    `L ${n(w - r)} 0`,
    `A ${r} ${r} 0 0 1 ${n(w - r)} ${BAR_H}`,
    `L ${r} ${BAR_H}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ')
})

const measureIsland = () => {
  islandW.value = islandRef.value?.offsetWidth || 0
}

// The strip is display:none until the viewport is narrow enough, and a hidden
// element measures as zero, so the width it reports when it appears is the
// first honest one.
let resizeObserver = null

onMounted(() => {
  measureIsland()
  placeIndicator()
  // The bar's pages, fetched once the app has drawn and the network is quiet,
  // so the first tap on each is as quick as the second.
  const warm = () => {
    warmed = true
    primaryNav.value.forEach((item) => prefetchRoute(item.path))
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warm, { timeout: 3000 })
  else setTimeout(warm, 1500)
  requestAnimationFrame(() => {
    indicatorAnimates.value = true
  })
  if (typeof ResizeObserver !== 'undefined' && islandRef.value) {
    resizeObserver = new ResizeObserver(() => {
      measureIsland()
      placeIndicator()
    })
    resizeObserver.observe(islandRef.value)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())

// primaryNav is watched alongside the route because capabilities arrive after
// the first render: a tab appearing shifts every tab to its right.
watch([activeTabPath, primaryNav], () => nextTick(placeIndicator))

// Leaving for an app from the drawer replaces the drawer's history entry
// rather than adding one after it, so Back from the app lands on the page the
// drawer was opened over - with the drawer shut - not on the drawer again.
const navigate = (path) => {
  if (showMoreMenu.value) {
    openedHere = false
    router.replace(path)
  } else {
    router.push(path)
  }
}

// Opens at once, as a history entry of its own (see showMoreMenu).
const openMoreMenu = () => {
  if (showMoreMenu.value) return
  openedHere = true
  router.push({ query: { ...route.query, apps: null } })
}

const toggleMoreMenu = () => {
  if (showMoreMenu.value) closeMoreMenu()
  else openMoreMenu()
}

// Opening the app closes the drawer, so a tile never gets to play as its page
// opens the way the bar's icons do. It plays as the drawer opens instead: the
// page you are on greets you from the grid. Each opening starts with nothing
// chosen, so the panel never offers a choice made the last time.
const drawerTick = ref(0)
watch(showMoreMenu, (open) => {
  if (!open) return
  drawerTick.value += 1
  selectedPath.value = null
})

// What a tile plays: the chosen one replays as it is chosen; otherwise the
// page you are on plays as the drawer opens.
const tilePlay = (item) =>
  selectedPath.value === item.path ? pickTick.value : isActive(item.path) ? drawerTick.value : 0

// The button says where it goes, and says so differently for the page you
// are already on, where it only closes the drawer.
const openLabel = computed(() => {
  const app = selectedApp.value
  if (!app) return 'Open'
  return isActive(app.path) ? `Back to ${app.name}` : `Open ${app.name}`
})

// Closing undoes the opening. If this tab opened the drawer, its entry is the
// last one, so stepping back removes it and Back afterwards behaves as though
// the drawer was never there. If the drawer arrived with the page - a link or
// a refresh with ?apps - there is nothing of ours to step back over, so the
// query is simply taken off in place.
const closeMoreMenu = () => {
  if (!showMoreMenu.value) return
  if (openedHere) {
    openedHere = false
    router.back()
    return
  }
  const { apps, ...rest } = route.query
  router.replace({ query: rest })
}

// However it closed - the button, the backdrop, or the phone's own Back - the
// next opening starts fresh.
watch(showMoreMenu, (open) => {
  if (!open) openedHere = false
})

const moreMenuRef = ref(null)
useFocusTrap(moreMenuRef, showMoreMenu, closeMoreMenu)

// The dock and everything under it are one list as far as dragging is
// concerned - the indexes run straight through - but two blocks on screen, so
// the dock can sit on a single background instead of four separate ones.
const dockApps = computed(() => dragList.value.slice(0, BAR_SLOTS))
const restApps = computed(() => dragList.value.slice(BAR_SLOTS))
</script>

<template>
  <!-- The app drawer behind the centre button. The full height of the screen,
       less the same 0.75rem gutter on every side (and the safe areas top and
       bottom), so it is one card floating over the app with the page just
       visible round its edges. It covers the bar it was opened from, so the
       tab strip never competes with the grid it just opened.

       Inside, the grid takes whatever the header and the panel under it
       leave (grow), may shrink (min-h-0) and scrolls when it has to, and
       everything else is shrink-0, so the header and the Open button never
       collapse.

       The card opens out of the centre button: a circle widening from where
       the mark sits until it has covered the screen, with the card rising the
       last few pixels into place behind it. The mark empties as it opens, so
       what the circle grows out of is the window the apps came from.

       It used to be the mark's four tiles flying to the card's four corners
       and thinning into its edge. That was a nice thing to describe and a poor
       thing to watch: four coloured squares crossing a card that was itself
       still moving read as debris rather than as a drawer, the merge into a
       2px border was a payoff nobody could see, and the whole thing ran half a
       second on a button people press twenty times a day. The card is shaped
       like the bar - the same gutters, the same corners - and sits over it.
       Closing runs it backwards.

       Its foot stands 0.75rem off the screen's edge, the same as its sides,
       where the bar sits right on the edge. A card this tall pressed that close to
       the bottom looked jammed against it; the bar gets away with it because
       it is short. -->
  <Transition name="more-sheet" :duration="{ enter: 360, leave: 260 }">
    <div
      v-if="showMoreMenu"
      class="lg:hidden fixed inset-0 z-110 flex flex-col no-print px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px]" @click="closeMoreMenu" />

      <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
      <div
        ref="moreMenuRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-menu-title"
        tabindex="-1"
        class="more-sheet-panel relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.75rem] shadow-2xl"
      >

        <!-- No grab handle: the drawer no longer swipes away, and a handle
             promises a pull that would do nothing. It closes with the cross,
             the backdrop, or the phone's own Back (see showMoreMenu). -->
        <div class="shrink-0">
          <div class="flex items-center justify-between px-4 pt-3 pb-1">
            <h3 id="more-menu-title" class="text-base font-semibold text-gray-900 dark:text-white">
              Apps
            </h3>
            <button
              @click="closeMoreMenu"
              class="-mr-2 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close menu"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- One flat grid, no headings. The order is the person's own, so a
             category would only argue with it. -->
        <!-- overscroll-contain: without it a flick down at the top of this list
             is handed to the browser, and Chrome on Android turns that into a
             pull-to-refresh - the sheet vanishes and the page reloads. -->
        <nav class="min-h-0 grow overflow-y-auto overscroll-contain px-3 pt-3 pb-3">
          <p
            v-if="!dragList.length"
            class="px-1 py-8 text-center text-[11px] text-gray-400 dark:text-slate-500"
          >
            No apps are switched on for you yet.
          </p>
          <!-- The dock is one block on one background, not four tiles each
               wearing their own. Four separate grounds read as four selected
               things rather than one shelf, and the shelf is the idea: these
               are the apps on the bar. The background is decoration only -
               dragging happens on the tiles inside it, never on the panel. -->
          <template v-else>
            <div
              v-if="dockApps.length"
              class="mb-2 rounded-2xl bg-primary/[0.07] p-2 ring-1 ring-inset ring-primary/15 dark:bg-primary-light/[0.07] dark:ring-primary-light/15"
            >
              <div class="mb-1.5 flex items-center gap-2 px-1">
                <span class="text-[10px] font-black uppercase tracking-widest text-primary dark:text-primary-light">
                  On the bar
                </span>
                <span class="h-px flex-1 bg-primary/20 dark:bg-primary-light/20" />
                <span class="text-[10px] text-gray-400 dark:text-slate-500">drag to change</span>
              </div>

              <div class="grid grid-cols-4 gap-x-0.5">
                <div
                  v-for="(item, index) in dockApps"
                  :key="item.path"
                  v-bind="dragItem(index)"
                  :class="draggingIndex === index ? 'opacity-90' : ''"
                >
                  <AppTile
                    :item="item"
                    :active="isActive(item.path)"
                    :selected="selectedPath === item.path"
                    :play="tilePlay(item)"
                    @click="selectApp(item)"
                  />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-x-0.5 gap-y-0.5">
              <div
                v-for="(item, i) in restApps"
                :key="item.path"
                v-bind="dragItem(i + BAR_SLOTS)"
                :class="draggingIndex === i + BAR_SLOTS ? 'opacity-90' : ''"
              >
                <AppTile
                  :item="item"
                  :active="isActive(item.path)"
                  :selected="selectedPath === item.path"
                  :play="tilePlay(item)"
                  @click="selectApp(item)"
                />
              </div>
            </div>
          </template>
        </nav>

        <!-- The chosen app, and the way into it. It says what the app is -
             its picture, name and one line from the catalogue - so the button
             under it is a decision rather than a guess. Before anything is
             chosen it says how this works, and the button waits. Sits under
             the grid rather than over it, so it never hides a tile; its
             bottom padding keeps the button clear of the card's corners. -->
        <div class="shrink-0 px-3 pb-3">
          <Transition name="pick" mode="out-in">
            <div
              v-if="selectedApp"
              :key="selectedApp.path"
              class="flex items-center gap-3 rounded-2xl bg-gray-50 p-2.5 dark:bg-gray-900/60"
            >
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 dark:bg-primary-light/10">
                <AppArt v-if="selectedApp.art" :app-key="selectedApp.art" :play="pickTick" class="h-8 w-8" />
                <component
                  v-else
                  :is="selectedApp.icon"
                  class="h-6 w-6 text-primary dark:text-primary-light"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {{ selectedApp.name }}
                </p>
                <p class="line-clamp-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
                  {{ selectedApp.description }}
                </p>
              </div>
            </div>
            <p
              v-else
              key="hint"
              class="px-2 py-4 text-center text-xs text-gray-400 dark:text-gray-500"
            >
              Choose an app to see what it does.
            </p>
          </Transition>
          <button
            type="button"
            :disabled="!selectedApp"
            class="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
            @click="openSelected"
          >
            {{ openLabel }}
          </button>
        </div>
      </div>

      </div>
    </div>
  </Transition>

  <!-- A floating island rather than a full-width strip: the page scrolls
       visibly past its frosted edges, which is what tells you there is more
       page down there. The outer band takes no pointer events, so the gap
       either side of the island still belongs to the content behind it. -->
  <nav
    class="lg:hidden fixed inset-x-0 bottom-0 z-50 no-print pointer-events-none px-1.5 pb-[env(safe-area-inset-bottom)]"
  >
    <div
      ref="islandRef"
      class="pointer-events-auto relative mx-auto flex h-16 w-full items-center px-1"
    >
      <!-- The bar's surface, a layer of its own rather than the island's
           background, so it can be cut to shape without cutting the centre
           button out too: the button is a child of the island, and a clip on
           the island would take it with the dip. The shape is barPath - a
           pill whose top edge rounds down into a dip a few pixels wider than
           the mark, so the mark sits in a cradle with a ring of the page
           showing all the way round it. Clipped rather than drawn, so the
           frosted blur behind it follows the shape too; the hairline round it
           is the same path drawn over the top. The shadow is a separate strip
           along the foot, because a clip takes a shadow with everything
           else. -->
      <span class="nav-shadow" aria-hidden="true" />
      <span
        class="absolute inset-0 rounded-full bg-white/80 backdrop-blur-xl dark:bg-gray-800/80"
        :style="barPath ? { clipPath: `path('${barPath}')` } : undefined"
        aria-hidden="true"
      />
      <svg
        v-if="barPath"
        class="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-gray-200/70 dark:text-white/10"
        :viewBox="`0 0 ${islandW} 64`"
        aria-hidden="true"
      >
        <path :d="barPath" fill="none" stroke="currentColor" stroke-width="1" />
      </svg>
      <!-- The travelling pill. One element for the whole strip, moved by
           transform so the slide runs on the compositor. -->
      <span
        class="nav-indicator"
        :class="{
          'nav-indicator-on': indicatorShown,
          'nav-indicator-instant': !indicatorAnimates,
        }"
        :style="{
          transform: `translate3d(${indicatorX}px, -50%, 0)`,
          width: `${indicatorW}px`,
          marginLeft: `-${indicatorW / 2}px`,
        }"
        aria-hidden="true"
      />

      <div class="flex flex-1 justify-around">
        <button
          v-for="item in leftNav"
          :key="item.name"
          :ref="(el) => setTabRef(item.path, el)"
          @pointerdown="prefetchRoute(item.path)"
          @click="tapTab(item.path)"
          :title="item.name"
          :aria-label="item.name"
          :aria-current="isTabActive(item.path) ? 'page' : undefined"
          class="relative z-10 flex h-full min-w-0 flex-1 items-center justify-center px-0.5 transition-transform duration-150 active:scale-90"
        >
          <AppArt
            v-if="item.art"
            :app-key="item.art"
            :play="isTabActive(item.path) ? playTick : 0"
            class="nav-art"
            :class="isTabActive(item.path) ? 'nav-art-active' : 'nav-art-idle'"
          />
          <component
            v-else
            :is="item.icon"
            class="nav-glyph"
            :class="isTabActive(item.path) ? 'nav-glyph-active' : 'nav-glyph-idle'"
          />
        </button>
      </div>

      <!-- Holds the middle of the strip open; the button itself is positioned
           over this gap so it can break the top edge of the bar. No words on
           the bar any more - the icons carry it, each tab keeps its name as
           its accessible label and tooltip, and the top bar names the page
           you are on, including one opened from the drawer. -->
      <div class="pointer-events-none h-full w-24 shrink-0" aria-hidden="true" />

      <div class="flex flex-1 justify-around">
        <button
          v-for="item in rightNav"
          :key="item.name"
          :ref="(el) => setTabRef(item.path, el)"
          @pointerdown="prefetchRoute(item.path)"
          @click="tapTab(item.path)"
          :title="item.name"
          :aria-label="item.name"
          :aria-current="isTabActive(item.path) ? 'page' : undefined"
          class="relative z-10 flex h-full min-w-0 flex-1 items-center justify-center px-0.5 transition-transform duration-150 active:scale-90"
        >
          <AppArt
            v-if="item.art"
            :app-key="item.art"
            :play="isTabActive(item.path) ? playTick : 0"
            class="nav-art"
            :class="isTabActive(item.path) ? 'nav-art-active' : 'nav-art-idle'"
          />
          <component
            v-else
            :is="item.icon"
            class="nav-glyph"
            :class="isTabActive(item.path) ? 'nav-glyph-active' : 'nav-glyph-idle'"
          />
        </button>
      </div>

      <!-- Every other page in the app lives behind this one. It is the mark
           itself - no plate, no padding, no ground - raised out of the bar so
           it is plainly not a tab: it opens a chooser rather than going
           anywhere.

           Ekkly's mark rather than the church's logo. The button opens the
           catalogue of apps, which is the platform's, not the church's. And a
           church logo is whatever shape and colours they uploaded, where the
           mark is drawn for this size and is the same in every church, so the
           button looks like the same button wherever someone meets it.

           The round window rather than the arch (public/ekkly-mark-round.svg):
           a circle reads as a button to press, where the arch reads as
           artwork resting on the bar. Same panes, colours and cross - only
           the outline differs, and the arch stays the mark everywhere else.

           The geometry, which the bar's outline (barPath) and the drawer's
           opening both depend on: the mark is 68px across and its centre
           sits 12px below the bar's top edge, so it rises 22px clear of the
           strip and sits well down in the bar, with little of the bar left
           empty under it. The dip is 40px in radius - a 6px gap round the
           mark's 34 - and its foot lands 52px down. With its shoulders the
           dip opens about 84px wide at the top and 80px across its middle, so
           the spacer is 96px and no tab ever sits in it.

           Ringed in the church's own colour (the primary token, so it follows
           a church's re-colour like every other accent): the one touch of the
           church on a mark that is otherwise Ekkly's. A ring rather than a
           border, so it is drawn outside the circle - the artwork keeps its
           full size - and it sits in the 6px gap, leaving 4px clear to the
           bar. It is backed in the bar's own surface, white or gray-800, because
           the page runs under the bar: the mark's cross is gaps in the
           artwork, and without a ground behind them whatever was scrolling
           past showed through it.

           The button is a 76px square on the mark's centre - the tap target,
           a little larger than the artwork. -->
      <button
        @click="toggleMoreMenu"
        class="more-button absolute -top-[26px] left-1/2 z-10 flex h-19 w-19 -translate-x-1/2 items-center justify-center transition-transform duration-150 active:scale-95"
        aria-label="Apps"
        aria-haspopup="dialog"
        :aria-expanded="showMoreMenu"
      >
        <!-- The window and what is in it, as two things.

             The four tiles that fly to the card's corners are meant to be this
             mark's own panes leaving it. They were not: they appeared over a
             mark that still had all four of its panes, so nothing left and
             something new arrived on top of it. Now the panes go as the tiles
             lift off, and the window is left empty and slightly recessed until
             they come back — which is also the only thing on the bar that says
             the drawer is open, the way the FAB's plus turns while its menu is.

             The ring and the ground belong to the window rather than to the
             artwork, so emptying it leaves a socket rather than a hole. -->
        <span
          :class="[
            'more-socket grid h-17 w-17 place-items-center rounded-full bg-white ring-2 ring-primary dark:bg-gray-800 dark:ring-primary-light',
            showMoreMenu ? 'more-socket-open' : '',
          ]"
        >
          <img
            src="/ekkly-mark-round.svg"
            alt=""
            :class="['more-mark h-17 w-17 object-contain', showMoreMenu ? 'more-mark-away' : '']"
          />
        </span>
      </button>

    </div>
  </nav>
</template>

<style scoped>
/* The card. Its edge is the mark's four colours, going round the card in the
   order the panes sit in the window - yellow top left, orange top right, teal
   bottom right, blue bottom left - blending where they meet. A gradient cannot
   be a border colour, so the edge is a second background: the card's own
   colour on the padding box, the colours on the border box, and a transparent
   border letting the second show through. These are the mark's colours and
   stay fixed whatever a church's accent is (BRAND.md). */
.more-sheet-panel {
  --sheet-ground: var(--color-white);
  border: 2px solid transparent;
  background:
    linear-gradient(var(--sheet-ground), var(--sheet-ground)) padding-box,
    conic-gradient(from -45deg, #fdc24b, #f19140 90deg, #09a4c6 180deg, #0270dc 270deg, #fdc24b 360deg)
      border-box;
}

.dark .more-sheet-panel {
  --sheet-ground: var(--color-gray-800);
}

/* Where the mark sits, measured from the card, since it is the point the
   drawer opens out of: 12px below the top of a 64px strip, so 52px above the
   bar's foot; the bar sits on the screen's edge and the card's foot is 0.75rem
   off it, so from the card's foot the mark is 40px up — 2.5rem, halfway
   across. That is the centre of the iris below. */
/* The panel under the grid, changing with the choice: the old app slips out
   quickly and the new one rises into its place, so a change of mind reads as
   the panel following the finger rather than text being swapped. */
.pick-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.pick-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}

.pick-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.pick-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .pick-enter-active,
  .pick-leave-active {
    transition: opacity 0.1s ease;
  }

  .pick-enter-from,
  .pick-leave-to {
    transform: none;
  }
}

/* The card opening out of the button.

   A circle grown from the mark — halfway across the card, 2.5rem up from its
   foot, which is where the mark sits once the card covers the bar — out past
   the far corners. One property, composited, and it is the only thing that
   ever said where this drawer came from; four flying tiles never quite did.

   The clip stays applied at rest rather than being set back to none: a circle
   that large clips nothing, and swapping the property off at the end is a
   repaint that can show on the card's rounded corners.

   The card also rises 10px into place. Not a slide from off-screen any more —
   the iris does that work — just enough that the card arrives rather than
   appears. */
.more-sheet-panel {
  clip-path: circle(150% at 50% calc(100% - 2.5rem));
}

.more-sheet-enter-active .more-sheet-panel {
  transition:
    clip-path 0.36s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.36s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.16s ease;
}

.more-sheet-leave-active .more-sheet-panel {
  transition:
    clip-path 0.26s cubic-bezier(0.55, 0, 0.75, 0.2),
    transform 0.26s cubic-bezier(0.55, 0, 0.75, 0.2),
    opacity 0.2s ease 0.06s;
}

.more-sheet-enter-from .more-sheet-panel,
.more-sheet-leave-to .more-sheet-panel {
  clip-path: circle(2.25rem at 50% calc(100% - 2.5rem));
  transform: translateY(10px);
  opacity: 0;
}

/* The backdrop is the fixed wrapper's first child. Only it fades: fading the
   wrapper would fade the tiles with it. The Transition carries explicit
   durations for the same reason - the wrapper itself has nothing to time. */
.more-sheet-enter-from > :first-child,
.more-sheet-leave-to > :first-child {
  opacity: 0;
}

.more-sheet-enter-active > :first-child,
.more-sheet-leave-active > :first-child {
  transition: opacity 0.3s ease;
}

/* The tiles: 32px, rounded on their outer corner the way the card is and
   softly on the other three, as the mark's own panes are.

   Each tile is drawn as its two outer edges, not as a fill: a border on the
   two sides that face the card's edge, --w thick. At 32px the two edges
   cover the whole box and the tile is solid; thinned to 2px they are an L
   lying exactly on the card's own edge at that corner, in that corner's
   colour. So the tile can merge into the border by thinning - it hollows out
   from the inside towards the edge it landed on, and what is left was always
   the shape of the border there. --w is registered (@property) so it can be
   animated like any length.

   At rest a tile is that 2px L, and invisible, so there is nothing to hide
   once the card is open. */
@property --w {
  syntax: '<length>';
  inherits: false;
  initial-value: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .more-sheet-enter-active .more-sheet-panel,
  .more-sheet-leave-active .more-sheet-panel {
    transition: opacity 0.15s ease;
  }

  /* No iris either: a circle sweeping the screen is exactly the kind of motion
     this setting is asking us not to make. The card simply fades. */
  .more-sheet-enter-from .more-sheet-panel,
  .more-sheet-leave-to .more-sheet-panel {
    opacity: 0;
    transform: none;
    clip-path: circle(150% at 50% calc(100% - 2.5rem));
  }
}

/* The mark leaving its window, and coming back to it.

   Going is immediate, so the window is already empty as the iris widens out
   of it. Coming back waits for the card to be most of the way shut — the close
   runs 0.26s — so the panes are not back in the window while the drawer is
   still standing over it.

   Scaled as it fades rather than only faded, so it reads as the mark being
   emptied rather than switched off. */
.more-mark {
  transition:
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1) 0.16s,
    opacity 0.2s ease 0.16s;
}

.more-mark-away {
  transform: scale(0.55);
  opacity: 0;
  transition-delay: 0s;
  transition-duration: 0.16s;
}

/* An empty window is a recess, not a blank disc. */
.more-socket {
  transition: box-shadow 0.2s ease;
}

.more-socket-open {
  box-shadow: inset 0 1px 6px rgba(15, 23, 42, 0.14);
}

.dark .more-socket-open {
  box-shadow: inset 0 1px 6px rgba(0, 0, 0, 0.45);
}

/* Nothing flies for anyone who asked their system to stop animating things, so
   there is nothing for the window to be emptied in aid of. */
@media (prefers-reduced-motion: reduce) {
  .more-mark-away {
    transform: none;
    opacity: 1;
  }

  .more-socket-open {
    box-shadow: none;
  }
}

/* The bar's shadow, on a strip that covers only the lower half so the dip
   has nothing above it to shade. A shadow is not drawn under its own box, so
   the strip leaves no shading inside the translucent surface either. Its
   corners are the pill's own, half the bar's height. */
.nav-shadow {
  position: absolute;
  inset: 50% 0 0;
  border-radius: 0 0 2rem 2rem;
  box-shadow: 0 12px 28px -12px rgba(15, 23, 42, 0.45);
  pointer-events: none;
}

/* With the labels gone, the selected tab carries the whole answer to "where am
   I", so it gets a tinted pill in the theme colour - legible at a glance
   without a word under it. Fully rounded, the same shape as the bar it sits
   in, so it reads as a smaller bar inside the bar rather than a second shape
   with corners of its own. No glow under it: a coloured shadow on a pill
   this small read as a smudge, not a lift.

   The pill is a single element that slides, not one per tab: the eye
   follows the movement to the new tab, which is the part that tells you the
   nav went somewhere. Overshooting slightly on the way (the easing below) is
   what keeps it from feeling like a box being dragged. */
.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  /* The bar's full height less the same 4px it is inset at the sides (the
     island's px-1), so the pill sits in the bar with an even margin all round
     and is the bar's own shape in miniature: at the two outer tabs its round
     ends sit inside the bar's round ends. */
  height: calc(100% - 0.5rem);
  border-radius: 9999px;
  background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.42s cubic-bezier(0.22, 1.1, 0.36, 1),
    opacity 0.25s ease;
}

.nav-indicator-on {
  opacity: 1;
}

/* First paint, and any re-measure while the strip was hidden: land on the
   active tab rather than sliding to it from wherever the last layout left it. */
.nav-indicator-instant {
  transition: none;
}

/* Artwork on the bar. It cannot take a colour the way a glyph can, so the
   selected tab is told apart by the sliding pill behind it; idle is simply
   dimmed. One size in both states: a chosen icon that grew nudged its label
   down a pixel every time the page changed. The pop below still marks it. */
.nav-art {
  height: 1.75rem;
  width: 1.75rem;
  object-fit: contain;
  transition:
    opacity 0.3s ease,
    height 0.3s ease,
    width 0.3s ease;
}

.nav-art-idle {
  opacity: 0.55;
}

.nav-art-active {
  opacity: 1;
}

/* The icon lifts once as its page becomes the current one, the same kick the
   sidebar's tile gets (app-tile-pop there): it rises into place and settles
   rather than springing past. The growth itself is the size transition; this
   only starts it. */
@keyframes nav-pop {
  from {
    transform: scale(0.82);
  }
  to {
    transform: scale(1);
  }
}

.nav-art-active,
.nav-glyph-active {
  animation: nav-pop 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-glyph {
  height: 1.75rem;
  width: 1.75rem;
  transition:
    color 0.3s ease,
    height 0.3s ease,
    width 0.3s ease;
}

.nav-glyph-idle {
  color: rgb(156 163 175); /* gray-400 */
}

.dark .nav-glyph-idle {
  color: rgb(107 114 128); /* gray-500 */
}

.nav-glyph-active {
  color: var(--color-primary);
}

/* No shadow: there is no plate to cast one, and a drop shadow on transparent
   artwork outlines it rather than lifting it. */

@media (prefers-reduced-motion: reduce) {
  .nav-indicator,
  .nav-glyph,
  .nav-art,
  .more-button {
    transition: none;
  }

  .nav-art-active,
  .nav-glyph-active {
    animation: none;
  }
}
</style>

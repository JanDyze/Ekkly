<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppArt from './common/AppArt.vue'
import AppsDrawer from './appframe/AppsDrawer.vue'
import { allowedGroups } from '../data/navigation'
import { usePermissions } from '../composables/usePermissions'
import { useAppOrder } from '../composables/useAppOrder'

// The bottom bar, back from v0.31 for whoever turns it on in Preferences
// (useBottomBar): a floating island along the foot of every screen on a
// phone, with four of the person's apps either side of Ekkly's round mark,
// which opens every app.
//
// It is the bar that was taken out when the home became the way between apps,
// with its drawer swapped for the one the home already uses (AppsDrawer), so
// there is one drawer of every app rather than two. Its four are the first
// four the person keeps on their home (useAppOrder), so rearranging the home
// rearranges the bar too.
//
// What came back as it was: the island, its dip and the mark sitting in it,
// and the pill that slides between icons to say where you are. What did not:
// the press that shrank a tab and the pop of the icon arriving. Buttons do
// not scale here.

const BAR_SLOTS = 4

const route = useRoute()
const router = useRouter()
const { can, isAdmin } = usePermissions()

const allApps = computed(() => allowedGroups(can, isAdmin.value).flatMap((group) => group.items))
const { ordered } = useAppOrder(allApps)
const primaryNav = computed(() => ordered.value.slice(0, BAR_SLOTS))

const showDrawer = ref(false)

// The centre button sits between the halves rather than at one end, so the
// split has to survive a shorter nav: with three tabs the spare one goes left,
// with one it is the only thing on that side.
const splitAt = computed(() => Math.ceil(primaryNav.value.length / 2))
const leftNav = computed(() => primaryNav.value.slice(0, splitAt.value))
const rightNav = computed(() => primaryNav.value.slice(splitAt.value))

// AppArt replays whenever this changes, so the icon of the page being opened
// animates and the rest sit still. It starts at 0, which AppArt reads as
// "show finished": opening the app should not set the whole bar off, only
// moving between pages should.
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
 * on its page's code arriving; the tapped tab is the current one straight away
 * - lit, playing, with the pill on its way - and the page follows as soon as
 * it can. If the navigation fails or is turned away, the bar goes back to
 * wherever the route really is.
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
 * And the page is usually there before the tap: the four pages on the bar
 * are fetched once the app has settled, and any tab as a finger comes down on
 * it, so the router's own load finds the module already fetched.
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
// the first render, and a person can reorder their apps - so any tab that
// joins it later is fetched too.
let warmed = false
watch(primaryNav, (items) => {
  if (warmed) items.forEach((item) => prefetchRoute(item.path))
})

const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)

// The selected tab is marked by one pill that slides between the icons rather
// than a background per tab switching on and off: the travel is what tells
// you which way you just moved. Its position is measured rather than
// calculated, because the two tab groups sit either side of the centre button
// and so are not a uniform grid.
const islandRef = ref(null)
const tabEls = new Map()
const setTabRef = (path, el) => {
  if (el) tabEls.set(path, el)
  else tabEls.delete(path)
}

const indicatorX = ref(0)
const indicatorW = ref(44)
const indicatorShown = ref(false)
// The very first placement snaps: a pill sliding in from the left edge on
// every cold start would read as something still loading.
const indicatorAnimates = ref(false)

// The tab just tapped while its page is on the way, otherwise the route's.
const isTabActive = (path) => (pendingPath.value ? pendingPath.value === path : isActive(path))

const tapTab = (path) => {
  if (isActive(path) && !pendingPath.value) return router.push(path)
  pendingPath.value = path
  playedFor = path
  playTick.value += 1
  router.push(path)
}

const activeTabPath = computed(() => primaryNav.value.find((item) => isTabActive(item.path))?.path)

const placeIndicator = () => {
  const el = activeTabPath.value ? tabEls.get(activeTabPath.value) : null
  if (!el || !islandRef.value) {
    // Nothing on the strip is current - the page came out of the drawer, or
    // is the home - so the pill fades out where it stands.
    indicatorShown.value = false
    return
  }
  indicatorX.value = el.offsetLeft + el.offsetWidth / 2
  indicatorW.value = el.offsetWidth
  indicatorShown.value = true
}

/*
 * The bar's outline: a pill with a smooth dip in the top edge that the mark
 * sits in. Drawn as a path because the dip has shoulders - the top edge rounds
 * down into it rather than being cut off square - and no CSS shape does that.
 *
 * The dip is an arc of the notch circle, 40px in radius round the mark's
 * centre (12px below the top edge: the 34px mark plus a 6px gap). Each
 * shoulder is a small circle, 3px in radius, resting on the top edge and
 * touching the notch circle from outside. With shoulders that small the dip's
 * ends sit above the mark's centre, so the arc round the bottom is more than
 * half a circle, and SVG has to be told so (the large-arc flag).
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
  const dx = Math.sqrt(reach * reach - (SHOULDER_R - NOTCH_Y) ** 2)
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
  // The strip is display:none until the screen is narrow enough, and a hidden
  // element measures as zero, so the width it reports when it appears is the
  // first honest one.
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
</script>

<template>
  <!-- A floating island rather than a strip along the foot: lifted a clear
       gap above the phone's home indicator and held in from both sides, so it
       reads as something resting over the page rather than the page's floor.
       Flat, like every card here - it is told apart from the page by its own
       surface and a hairline, not a shadow. The outer band takes no pointer
       events, so the gap round the island still belongs to the content behind
       it. The gap, the island and the mark rising out of it add up to
       --bottom-bar-space (style.css), which is what the page leaves free. -->
  <nav
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:hidden no-print"
    aria-label="Quick apps"
  >
    <div ref="islandRef" class="pointer-events-auto relative mx-auto flex h-16 w-full max-w-md items-center px-1">
      <!-- The bar's surface, a layer of its own so it can be cut to shape
           (barPath) without cutting the centre button out with it. Clipped
           rather than drawn, so the frosted blur behind it follows the shape
           too; the hairline round it is the same path drawn over the top. -->
      <span
        class="absolute inset-0 rounded-full bg-white/90 backdrop-blur-xl dark:bg-gray-800/90"
        :style="barPath ? { clipPath: `path('${barPath}')` } : undefined"
        aria-hidden="true"
      />
      <svg
        v-if="barPath"
        class="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-gray-200 dark:text-white/15"
        :viewBox="`0 0 ${islandW} 64`"
        aria-hidden="true"
      >
        <path :d="barPath" fill="none" stroke="currentColor" stroke-width="1" />
      </svg>
      <!-- The travelling pill: one element for the whole strip, moved by
           transform so the slide runs on the compositor. -->
      <span
        class="nav-indicator"
        :class="{ 'nav-indicator-on': indicatorShown, 'nav-indicator-instant': !indicatorAnimates }"
        :style="{ transform: `translate3d(${indicatorX}px, -50%, 0)`, width: `${indicatorW}px`, marginLeft: `-${indicatorW / 2}px` }"
        aria-hidden="true"
      />

      <div class="flex flex-1 justify-around">
        <button
          v-for="item in leftNav"
          :key="item.path"
          :ref="(el) => setTabRef(item.path, el)"
          type="button"
          :title="item.name"
          :aria-label="item.name"
          :aria-current="isTabActive(item.path) ? 'page' : undefined"
          class="relative z-10 flex h-full min-w-0 flex-1 items-center justify-center px-0.5"
          @pointerdown="prefetchRoute(item.path)"
          @click="tapTab(item.path)"
        >
          <AppArt
            :app-key="item.art"
            :play="isTabActive(item.path) ? playTick : 0"
            class="nav-art"
            :class="isTabActive(item.path) ? 'nav-art-active' : 'nav-art-idle'"
          />
        </button>
      </div>

      <!-- Holds the middle of the strip open; the mark is placed over this
           gap so it can break the top edge of the bar. -->
      <div class="pointer-events-none h-full w-24 shrink-0" aria-hidden="true" />

      <div class="flex flex-1 justify-around">
        <button
          v-for="item in rightNav"
          :key="item.path"
          :ref="(el) => setTabRef(item.path, el)"
          type="button"
          :title="item.name"
          :aria-label="item.name"
          :aria-current="isTabActive(item.path) ? 'page' : undefined"
          class="relative z-10 flex h-full min-w-0 flex-1 items-center justify-center px-0.5"
          @pointerdown="prefetchRoute(item.path)"
          @click="tapTab(item.path)"
        >
          <AppArt
            :app-key="item.art"
            :play="isTabActive(item.path) ? playTick : 0"
            class="nav-art"
            :class="isTabActive(item.path) ? 'nav-art-active' : 'nav-art-idle'"
          />
        </button>
      </div>

      <!-- Every other app is behind this one. Ekkly's round mark - the round
           window rather than the arch, because a circle reads as a button to
           press - raised out of the bar so it is plainly not a tab: it opens
           the drawer of every app rather than going anywhere. Ringed in the
           church's colour, the one touch of the church on a mark that is
           otherwise Ekkly's, and backed in the bar's own surface so the page
           scrolling under it does not show through the gaps of its cross.
           68px across, its centre 12px below the bar's top edge, in the dip
           barPath leaves for it. -->
      <button
        type="button"
        class="absolute -top-6.5 left-1/2 z-10 flex size-19 -translate-x-1/2 items-center justify-center"
        aria-label="All apps"
        aria-haspopup="dialog"
        :aria-expanded="showDrawer"
        @click="showDrawer = true"
      >
        <span class="grid size-17 place-items-center rounded-full bg-white ring-2 ring-primary dark:bg-gray-800 dark:ring-primary-light">
          <img src="/ekkly-mark-round.svg" alt="" class="size-17 object-contain" />
        </span>
      </button>
    </div>
  </nav>

  <AppsDrawer :show="showDrawer" :apps="allApps" @close="showDrawer = false" />
</template>

<style scoped>
/* The selected tab carries the whole answer to "where am I", so it gets a
   tinted pill in the church's colour, the bar's own shape in miniature. One
   element that slides rather than one per tab: the eye follows the movement
   to the new tab, which is the part that tells you the bar went somewhere. */
.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
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
   active tab rather than sliding to it. */
.nav-indicator-instant {
  transition: none;
}

/* Artwork on the bar. It cannot take a colour, so the selected tab is told
   apart by the pill behind it, and the rest are simply dimmed. */
.nav-art {
  height: 1.75rem;
  width: 1.75rem;
  object-fit: contain;
  transition: opacity 0.3s ease;
}
.nav-art-idle {
  opacity: 0.55;
}
.nav-art-active {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .nav-indicator,
  .nav-art {
    transition: none;
  }
}
</style>

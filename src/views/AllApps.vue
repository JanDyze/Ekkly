<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowsLeftRight, DotsSixVertical, MagnifyingGlass, Star, StarFill, X } from '../icons'
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
import { useSounds } from '../composables/useSounds'
import AppPeek from '../components/appframe/AppPeek.vue'
import { usePressAndHold } from '../composables/usePressAndHold'
import { useMediaQuery } from '../composables/useMediaQuery'
import { useFocusMode } from '../composables/useFocusMode'

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
// (frontdoor/appDetails.js). So the page uses them:
//
//   1. A spotlight: one app this person does not keep on their home, a
//      different one each day, shown large in the church's colour with its
//      headline, its wins and the way in.
//   2. Their home: the five they keep there, in one row, held and dragged to
//      reorder.
//   3. The catalogue, in the groups a church buys apps in, each app a store
//      row — its artwork on its plate, its name, its line — that opens it,
//      and a star to put it on the home.
//   4. For an administrator, the apps the church has not switched on, each
//      with Add, which goes to Settings → Apps & plan. These are the apps
//      being sold, and only someone who can buy them is shown them.
//
// A search at the top finds an app by what it is for as well as its name.
//
// The order is the person's own and follows their account (useAppOrder).
//
// On a desktop it is laid out as an app store on a computer is: categories
// down the left with the shelf under them, and the store beside them
// (see the template).

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

/* --------------------------------------------------------- the spotlight */

// One app not on the home, a different one each day, so the page shows off
// something new whenever it is opened on a new day.
//
// It can be put away. It changes every day, so it is put away for the day:
// tomorrow brings a different app, and a spotlight dismissed for good would
// stop showing anyone anything. Remembered on this device, so opening the
// page again the same day does not bring it back.
const SPOTLIGHT_STORE = 'ekkly:spotlight-away'
const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const readAway = () => {
  try {
    return localStorage.getItem(SPOTLIGHT_STORE) || ''
  } catch {
    return ''
  }
}
const awayOn = ref(readAway())
const { lift } = useSounds()

const dismissSpotlight = () => {
  awayOn.value = todayKey()
  lift()
  try {
    localStorage.setItem(SPOTLIGHT_STORE, awayOn.value)
  } catch {
    // Not remembered past this opening; it is still gone from it.
  }
}

const spotlight = computed(() => {
  if (awayOn.value === todayKey()) return null
  const candidates = ordered.value.slice(HOME_SLOTS).filter((item) => detailOf(item))
  if (!candidates.length) return null
  const day = Math.floor(Date.now() / 86400000)
  return candidates[day % candidates.length]
})

/* ------------------------------------------------------------ searching */

// Search finds an app by what it is for, not only by its name: "birthday"
// finds People, "offering" Finances, "slides" Presentation. Each app is read
// as its name, its line, its wins and its group, and every word typed has to
// be in there somewhere. While a search is on, the spotlight and the home row
// step aside and the catalogue narrows to what matches.
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

// Escape clears a search first, and only then leaves, the way it closed the
// drawer. A held app's screen kept open takes Escape for itself (AppPeek).
const onKey = (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented || held.value) return
  if (query.value) query.value = ''
  else if (swapping.value) cancelPin()
  else close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ------------------------------------------------------------ a desktop */

// What each group is for, said once beside its heading on a desktop, so the
// store explains itself the way an app store's categories do.
const GROUP_LINES = {
  overview: 'What is on you this week',
  people: 'Who is in the church, and who came',
  gatherings: 'Sundays, services, meetings and prayer',
  media: 'Photos, videos and the links you hand out',
  extras: 'Help with the work',
  admin: 'Money, and what the church owns',
}

// The page of the store being looked at: every app, one group, or the apps
// not on the plan yet. A search looks across all of them.
const category = ref('all')

const categories = computed(() => [
  { key: 'all', label: 'All apps', count: apps.value.length },
  ...groups.value.map((group) => ({ key: group.key, label: group.label || 'Everyday', count: group.items.length })),
  ...(forSale.value.length ? [{ key: 'sale', label: 'Not on your plan', count: forSale.value.length }] : []),
])

const browse = (key) => {
  query.value = ''
  category.value = key
}

const deskGroups = computed(() => {
  if (searching.value || category.value === 'all') return shownGroups.value
  return shownGroups.value.filter((group) => group.key === category.value)
})

const deskForSale = computed(() =>
  searching.value || category.value === 'all' || category.value === 'sale' ? shownForSale.value : []
)

const foundCount = computed(
  () => shownGroups.value.reduce((sum, group) => sum + group.items.length, 0) + shownForSale.value.length
)
</script>

<template>
  <!-- The whole screen on a phone, with neither bar round it (every app is
       a place to go, and chrome round the catalogue made it look like a menu
       over something else); under Ekkly's top bar on a desktop. The list scrolls inside
       a screen of fixed height, so it never shrinks with every letter typed
       into the search. A phone and a desktop each have a layout of their
       own, below. -->
  <div class="flex h-full w-full flex-col overflow-hidden bg-gray-50 pt-[env(safe-area-inset-top)] dark:bg-gray-900">
    <!-- A desktop: laid out the way an app store on a computer is. The
         categories down the left, with the five on the home under them, both
         always in view; the store itself beside them — a featured app, then
         each group as a heading that says what it is for and its apps as
         rows, each saying in words what it does and whether it is on the
         home. It is its own layout rather than the phone's stretched, since a
         phone's single column only looked lost on a wide screen. Ekkly's top
         bar is over it here, naming the page and leading home, so the page
         has no header of its own; the search heads the left column, as it
         does in an app store. -->
    <template v-if="wide">
      <h1 class="sr-only">All apps</h1>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-12">
        <div class="mx-auto grid w-full max-w-[88rem] grid-cols-[15rem_minmax(0,1fr)] items-start gap-10">
          <!-- The left column: the search, where to look, and what is on the
               home. -->
          <aside class="sticky top-0 flex flex-col gap-6 pt-6">
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

            <nav aria-label="Categories">
              <p class="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Browse</p>
              <ul class="flex flex-col gap-0.5">
                <li v-for="entry in categories" :key="entry.key">
                  <button
                    type="button"
                    :aria-current="category === entry.key && !searching ? 'page' : undefined"
                    :class="[
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      category === entry.key && !searching
                        ? 'bg-primary/10 font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light'
                        : 'font-medium text-gray-700 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-gray-800',
                    ]"
                    @click="browse(entry.key)"
                  >
                    <span class="min-w-0 flex-1 truncate">{{ entry.label }}</span>
                    <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ entry.count }}</span>
                  </button>
                </li>
              </ul>
            </nav>

            <!-- The five on the home, dragged into order. Kept in view on
                 every page of the store, so an app found anywhere can be
                 put on the home without losing your place. -->
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
                      <AppArt :app-key="item.art" :play="playOf(item.path)" :data-morph-icon="item.path" class="size-6.5" />
                      <span
                        v-if="swapping"
                        class="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white dark:bg-primary-light dark:ring-gray-800"
                        aria-hidden="true"
                      >
                        <ArrowsLeftRight class="size-2.5" />
                      </span>
                    </span>
                    <span :data-morph-label="item.path" class="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.name }}</span>
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

          <!-- The store. -->
          <div class="min-w-0 pt-6">
            <!-- Featured: one app not on the home, a different one each day. -->
            <section
              v-if="spotlight && !searching && category === 'all'"
              class="apps-spotlight relative isolate mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-10 overflow-hidden rounded-3xl border border-b-4 border-black/15 px-9 py-8 text-white dark:border-black/40"
              @pointerenter="replay($event, 'spotlight')"
            >
              <button
                type="button"
                aria-label="Put the spotlight away for today"
                title="Not today"
                class="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                @click="dismissSpotlight"
              >
                <X class="size-4" />
              </button>
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-wide text-white/75">Spotlight</p>
                <h2 class="mt-2 text-3xl font-bold leading-tight">{{ spotlight.name }}</h2>
                <p class="mt-1.5 text-lg leading-snug text-white/90">{{ detailOf(spotlight).headline }}</p>
                <ul class="mt-4 flex flex-wrap gap-2">
                  <li
                    v-for="win in detailOf(spotlight).wins"
                    :key="win.text"
                    class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
                  >
                    <component :is="win.icon" class="size-4 shrink-0 text-white/80" />
                    {{ win.text }}
                  </li>
                </ul>
                <div class="mt-6 flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-primary transition-colors duration-200 hover:bg-white/90"
                    @pointerdown="prefetchRoute(router, spotlight.path)"
                    @click="open(spotlight)"
                  >
                    Open {{ spotlight.name }}
                  </button>
                  <button
                    type="button"
                    :aria-label="`Put ${spotlight.name} on your home`"
                    title="Put on your home"
                    class="flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                    @click="startPin(spotlight)"
                  >
                    <Star class="size-4.5" />
                  </button>
                </div>
              </div>
              <span :class="[PLATED, 'mr-6 size-40 rounded-[40px]']">
                <AppArt :app-key="spotlight.art" :play="playOf('spotlight')" class="size-28" />
              </span>
            </section>

            <p v-if="nothingFound" class="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              No app for “{{ query.trim() }}”.
            </p>
            <p v-else-if="searching" class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {{ foundCount }} {{ foundCount === 1 ? 'app' : 'apps' }} for “{{ query.trim() }}”
            </p>

            <!-- Each group: what it is for, then its apps. -->
            <section v-for="group in deskGroups" :key="group.key" class="mb-10 last:mb-0">
              <div class="mb-1 flex items-baseline gap-3">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ group.label || 'Everyday' }}</h2>
                <p class="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">{{ GROUP_LINES[group.key] }}</p>
              </div>
              <!-- The whole row opens the app, so it needs no Open button;
                   the star beside it is the one other thing it does. -->
              <ul class="-mx-3 mt-2 grid grid-cols-[repeat(auto-fill,minmax(21rem,1fr))] gap-x-4 gap-y-1">
                <li
                  v-for="item in group.items"
                  :key="item.path"
                  class="flex items-center gap-1 rounded-2xl pr-2 transition-colors hover:bg-gray-200/50 dark:hover:bg-gray-800"
                  @pointerenter="replay($event, item.path)"
                >
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-start gap-4 py-3 pl-3 text-left"
                    @pointerdown="prefetchRoute(router, item.path)"
                    @click="open(item)"
                  >
                    <span :class="[PLATED, 'size-16 rounded-[18px]']">
                      <AppArt :app-key="item.art" :play="playOf(item.path)" :data-morph-icon="item.path" class="size-11" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span :data-morph-label="item.path" class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ item.name }}</span>
                      <span class="mt-0.5 block truncate text-[13px] text-gray-500 dark:text-gray-400">{{ item.tagline }}</span>
                      <span class="mt-1.5 line-clamp-2 text-[13px] leading-snug text-gray-600 dark:text-gray-300">{{ item.description }}</span>
                    </span>
                  </button>
                  <!-- The star says it without words: filled, the app is on
                       the home; outlined, a press puts it there. Filled is a
                       marker, not a button: an app leaves the home only by
                       choosing what replaces it. -->
                  <span
                    v-if="homePaths.has(item.path)"
                    class="flex size-9 shrink-0 items-center justify-center text-primary dark:text-primary-light"
                    title="On your home"
                    aria-label="On your home"
                  >
                    <StarFill class="size-5" />
                  </span>
                  <button
                    v-else
                    type="button"
                    :aria-label="`Put ${item.name} on your home`"
                    title="Put on your home"
                    :class="[
                      'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
                      swapping?.path === item.path
                        ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                        : 'text-gray-300 hover:bg-white hover:text-primary dark:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-primary-light',
                    ]"
                    @click="startPin(item)"
                  >
                    <Star class="size-5" />
                  </button>
                </li>
              </ul>
            </section>

            <!-- What the church could add, for whoever can add it. -->
            <section v-if="deskForSale.length" class="mb-0 mt-10 first:mt-0">
              <div class="mb-1 flex items-baseline gap-3">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Not on your plan</h2>
                <p class="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">Apps your church can add</p>
              </div>
              <ul class="-mx-3 mt-2 grid grid-cols-[repeat(auto-fill,minmax(21rem,1fr))] gap-x-4 gap-y-1">
                <li
                  v-for="app in deskForSale"
                  :key="app.key"
                  class="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-gray-200/50 dark:hover:bg-gray-800"
                  @pointerenter="replay($event, app.key)"
                >
                  <span :class="[PLATED, 'size-16 rounded-[18px]']">
                    <AppArt :app-key="app.key" :play="playOf(app.key)" class="size-11" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ app.name }}</p>
                    <p class="mt-0.5 truncate text-[13px] text-gray-500 dark:text-gray-400">{{ APP_DETAILS[app.key]?.headline || 'Not on your plan yet' }}</p>
                    <p class="mt-1.5 line-clamp-2 text-[13px] leading-snug text-gray-600 dark:text-gray-300">{{ app.description }}</p>
                  </div>
                  <button
                    type="button"
                    class="inline-flex h-8 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                    :aria-label="`Add ${app.name} to your plan`"
                    @click="addApp"
                  >
                    Add
                  </button>
                </li>
              </ul>
            </section>
          </div>
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
        <!-- 1. The spotlight: one app, shown off. -->
        <section
          v-if="spotlight && !searching"
          class="apps-spotlight relative isolate mt-2 overflow-hidden rounded-3xl border border-b-4 border-black/15 p-5 text-white dark:border-black/40"
        >
          <button
            type="button"
            aria-label="Put the spotlight away for today"
            title="Not today"
            class="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            @click="dismissSpotlight"
          >
            <X class="size-4" />
          </button>
          <p class="text-xs font-semibold uppercase tracking-wide text-white/75">Spotlight</p>
          <div class="mt-3 flex items-center gap-4">
            <span :class="[PLATED, 'size-20 rounded-[22px]']">
              <AppArt :app-key="spotlight.art" :play="playOf('spotlight')" class="size-14" />
            </span>
            <div class="min-w-0">
              <p class="text-2xl font-bold leading-tight">{{ spotlight.name }}</p>
              <p class="mt-1 text-sm leading-snug text-white/85">{{ detailOf(spotlight).headline }}</p>
            </div>
          </div>
          <ul class="mt-4 flex flex-col gap-1.5">
            <li v-for="win in detailOf(spotlight).wins" :key="win.text" class="flex items-center gap-2 text-sm text-white/90">
              <component :is="win.icon" class="size-4 shrink-0 text-white/75" />
              {{ win.text }}
            </li>
          </ul>
          <button
            type="button"
            class="mt-5 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-primary transition-colors duration-200 hover:bg-white/90"
            @pointerdown="prefetchRoute(router, spotlight.path)"
            @click="open(spotlight)"
          >
            Open {{ spotlight.name }}
          </button>
        </section>

        <!-- 2. Their home: the five, held and dragged to reorder. -->
        <section v-show="!searching" ref="shelfRef" class="mt-5 scroll-mt-4">
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
                  <AppArt :app-key="item.art" :play="playOf(item.path)" :data-morph-icon="item.path" class="size-9" />
                  <span
                    v-if="swapping"
                    class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white dark:bg-primary-light dark:ring-gray-800"
                    aria-hidden="true"
                  >
                    <ArrowsLeftRight class="size-3" />
                  </span>
                </span>
                <span :data-morph-label="item.path" class="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-800 dark:text-gray-200">{{ item.name }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 3. The catalogue, a store row to each app. -->
        <p v-if="nothingFound" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No app for “{{ query.trim() }}”.
        </p>

        <section v-for="(group, g) in shownGroups" :key="group.key" :class="searching && g === 0 ? 'mt-2' : 'mt-6'">
          <h3 class="mb-2 px-1 text-base font-bold text-gray-900 dark:text-white">{{ group.label || 'Everyday' }}</h3>
          <ul class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
            <li v-for="item in group.items" :key="item.path" class="flex items-center gap-1 pr-2" @click.capture="swallowClick">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left active:bg-gray-50 dark:active:bg-gray-700/40"
                @pointerdown="holdRow($event, item)"
                @touchmove="holdStill"
                @contextmenu.prevent
                @click="open(item)"
              >
                <span data-art-plate :class="[PLATED, 'size-14']">
                  <AppArt :app-key="item.art" :play="playOf(item.path)" :data-morph-icon="item.path" class="size-10" />
                </span>
                <span class="min-w-0">
                  <span :data-morph-label="item.path" class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ item.name }}</span>
                  <span class="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500 dark:text-gray-400">{{ lineOf(item) }}</span>
                </span>
              </button>
              <!-- The row opens the app, so it needs no Open button. The
                   star is on the home: filled, a marker, not a button — an
                   app leaves the home only by choosing what replaces it;
                   outlined, a press puts it there. -->
              <span
                v-if="homePaths.has(item.path)"
                class="flex size-9 shrink-0 items-center justify-center text-primary dark:text-primary-light"
                title="On your home"
                aria-label="On your home"
              >
                <StarFill class="size-5" />
              </span>
              <button
                v-else
                type="button"
                :aria-label="`Put ${item.name} on your home`"
                title="Put on your home"
                :class="[
                  'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
                  swapping?.path === item.path
                    ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                    : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 dark:hover:bg-gray-700',
                ]"
                @click="startPin(item)"
              >
                <Star class="size-5" />
              </button>
            </li>
          </ul>
        </section>

        <!-- 4. What the church could add: for whoever can add it. -->
        <section v-if="shownForSale.length" class="mt-6">
          <div class="mb-2 px-1">
            <h3 class="text-base font-bold text-gray-900 dark:text-white">More for your church</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Not on your plan yet</p>
          </div>
          <ul class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
            <li
              v-for="app in shownForSale"
              :key="app.key"
              class="flex items-center gap-3 px-3 py-3"
              @pointerdown="holdForSale($event, app)"
              @touchmove="holdStill"
              @contextmenu.prevent
              @click.capture="swallowClick"
            >
              <span data-art-plate :class="[PLATED, 'size-14']">
                <AppArt :app-key="app.key" :play="playOf(app.key)" class="size-10" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ app.name }}</span>
                <span class="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500 dark:text-gray-400">{{ APP_DETAILS[app.key]?.headline || app.description }}</span>
              </span>
              <button
                type="button"
                class="inline-flex h-8 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                @click="addApp"
              >
                Add
              </button>
            </li>
          </ul>
        </section>
      </div>
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

/* The spotlight: the church's colour, flat, with the same deeper edge as the
   cards at the top of each app's home. Deeper on a dark page, where the
   accent token is its lighter shade. */
.apps-spotlight {
  background-color: var(--color-primary);
}

.dark .apps-spotlight {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

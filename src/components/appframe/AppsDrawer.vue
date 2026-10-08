<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowsLeftRight, MagnifyingGlass, PushPinSimple, PushPinSimpleFill, X } from '../../icons'
import AppArt from '../common/AppArt.vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useToast } from '../../composables/useToast'
import { useAppOrder, HOME_SLOTS } from '../../composables/useAppOrder'
import { useDragReorder } from '../../composables/useDragReorder'
import { usePermissions } from '../../composables/usePermissions'
import { isAppEnabled } from '../../composables/useChurchApps'
import { allowedGroups } from '../../data/navigation'
import { APPS } from '../../../lib/apps'
import { APP_DETAILS } from '../frontdoor/appDetails'
import { prefetchRoute } from '../../router/prefetch'
import { useSounds } from '../../composables/useSounds'

// Every app, behind More apps on the home of all apps (src/views/Apps.vue),
// laid out the way an app store lays out what it has: each app shown, and
// shown off.
//
// It was a grid of small icons with their names — the drawer the bottom bar
// used to open — which said "here is a list" and nothing about why anyone
// would open one. Ekkly already says why, on its front door: every app has a
// line about what changes for the church and three practical wins
// (frontdoor/appDetails.js). So the drawer uses them:
//
//   1. A spotlight: one app this person does not keep on their home, a
//      different one each day, shown large in the church's colour with its
//      headline, its wins and the way in.
//   2. Their home: the five they keep there, in one row, held and dragged to
//      reorder.
//   3. The catalogue, in the groups a church buys apps in, each app a store
//      row — its artwork on its plate, its name, its line — with a pin to put
//      it on the home and Open.
//   4. For an administrator, the apps the church has not switched on, each
//      with Add, which goes to Settings → Apps & plan. These are the apps
//      being sold, and only someone who can buy them is shown them.
//
// A search at the top finds an app by what it is for as well as its name.
//
// The order is the person's own and follows their account (useAppOrder).

const props = defineProps({
  show: { type: Boolean, default: false },
  // Every app this person may open, in the navigation's order.
  apps: { type: Array, required: true },
})

const emit = defineEmits(['close'])

const router = useRouter()
const toast = useToast()
const panel = ref(null)
useFocusTrap(panel, () => props.show, () => emit('close'))

const { can, isAdmin } = usePermissions()
const { ordered, setOrder, resetOrder } = useAppOrder(computed(() => props.apps))

const PLATED = 'grid shrink-0 place-items-center rounded-[14px] bg-linear-to-b from-white to-gray-50 shadow-md shadow-gray-900/10 ring-1 ring-gray-200/90 dark:from-gray-600 dark:to-gray-700 dark:shadow-black/30 dark:ring-gray-500/40'

/** What an app is for, in the words Ekkly sells it with. */
const detailOf = (item) => APP_DETAILS[item.art] || null
const lineOf = (item) => detailOf(item)?.headline || APPS.find((a) => a.key === item.art)?.description || item.description

const open = (item) => {
  emit('close')
  router.push(item.path)
}

/* --------------------------------------------------------- your home */

const onHome = computed(() => ordered.value.slice(0, HOME_SLOTS))
const homePaths = computed(() => new Set(onHome.value.map((item) => item.path)))

// The shelf is rearranged by holding an app and dragging it, among the five
// only: the catalogue under it scrolls freely, and its pins say what joins.
const shelf = ref([])
const { draggingIndex, dragItem } = useDragReorder(
  () => shelf.value,
  (next) => {
    shelf.value = next
  },
  { holdDelay: 350 }
)

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
  // The choice is made on the home row, which a search hides.
  query.value = ''
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

// Closing the drawer mid-choice drops the choice.
watch(
  () => props.show,
  (open) => {
    if (!open) swapping.value = null
  }
)

/* --------------------------------------------------------- the spotlight */

// One app not on the home, a different one each day, so the drawer shows off
// something new whenever it is opened on a new day.
//
// It can be put away. It changes every day, so it is put away for the day:
// tomorrow brings a different app, and a spotlight dismissed for good would
// stop showing anyone anything. Remembered on this device, so opening the
// drawer again the same day does not bring it back.
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

/* --------------------------------------------------------- the catalogue */

const groups = computed(() => allowedGroups(can, isAdmin.value).filter((group) => group.items.length))

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

// A search is for this opening of the drawer, not the next one.
watch(
  () => props.show,
  (open) => {
    if (!open) query.value = ''
  }
)

const addApp = () => {
  emit('close')
  router.push({ path: '/settings', query: { section: 'plan' } })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="show"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apps-drawer-title"
          tabindex="-1"
          class="drawer-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl sm:max-w-xl sm:rounded-3xl dark:bg-gray-900"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
            <div class="min-w-0">
              <h2 id="apps-drawer-title" class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Apps</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ apps.length }} for your church</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="-mr-2 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
              @click="emit('close')"
            >
              <X class="size-5" />
            </button>
          </div>

          <!-- overscroll-contain: a flick down at the top of this list would
               otherwise be handed to the browser, and Chrome on Android turns
               that into pull-to-refresh. -->
          <!-- The search, outside the scrolling list so it is always in reach.
               Never focused on its own: on a phone that would raise the
               keyboard every time the drawer opened. -->
          <div class="shrink-0 px-4 pb-2">
            <div class="relative">
              <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
              <input
                v-model="query"
                type="search"
                enterkeyhint="search"
                autocomplete="off"
                aria-label="Search apps"
                placeholder="Search apps — try “birthdays” or “offering”"
                class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white [&::-webkit-search-cancel-button]:hidden"
                @keyup.escape="query = ''"
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

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <!-- 1. The spotlight: one app, shown off. -->
            <section
              v-if="spotlight && !searching"
              class="drawer-spotlight relative isolate mt-2 overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-primary/25"
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
                  <AppArt :app-key="spotlight.art" :play="1" class="size-14" />
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
                class="mt-5 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-primary transition-transform duration-200 pressed:scale-[0.97]"
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
                  <span class="text-[11px] text-gray-500 dark:text-gray-400">Hold and drag to reorder</span>
                </template>
              </div>
              <div
                :class="[
                  'grid grid-cols-5 gap-1 rounded-2xl bg-white p-2 ring-1 transition-shadow dark:bg-gray-800',
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
                      swapping ? 'drawer-wobble hover:bg-primary/5' : 'active:bg-gray-100 dark:active:bg-gray-700/60',
                    ]"
                    :style="swapping ? { animationDelay: `${index * -90}ms` } : null"
                    @pointerdown="swapping || prefetchRoute(router, item.path)"
                    @click="tapShelf(item)"
                  >
                    <span :class="[PLATED, 'relative size-12']">
                      <AppArt :app-key="item.art" class="size-9" />
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

            <!-- 3. The catalogue, a store row to each app. -->
            <p v-if="nothingFound" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No app for “{{ query.trim() }}”.
            </p>

            <section v-for="(group, g) in shownGroups" :key="group.key" :class="searching && g === 0 ? 'mt-2' : 'mt-6'">
              <h3 class="mb-2 px-1 text-base font-bold text-gray-900 dark:text-white">{{ group.label || 'Everyday' }}</h3>
              <ul class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
                <li v-for="item in group.items" :key="item.path" class="flex items-center gap-3 px-3 py-3">
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-3 text-left"
                    @pointerdown="prefetchRoute(router, item.path)"
                    @click="open(item)"
                  >
                    <span :class="[PLATED, 'size-14']">
                      <AppArt :app-key="item.art" class="size-10" />
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ item.name }}</span>
                      <span class="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500 dark:text-gray-400">{{ lineOf(item) }}</span>
                    </span>
                  </button>
                  <!-- On the home: a marker, not a button. An app leaves the home
                       only by choosing what replaces it. -->
                  <span
                    v-if="homePaths.has(item.path)"
                    class="flex size-8 shrink-0 items-center justify-center text-primary dark:text-primary-light"
                    title="On your home"
                    aria-label="On your home"
                  >
                    <PushPinSimpleFill class="size-4" />
                  </span>
                  <button
                    v-else
                    type="button"
                    :aria-label="`Put ${item.name} on your home`"
                    title="Put on your home"
                    :class="[
                      'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
                      swapping?.path === item.path
                        ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                        : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 dark:hover:bg-gray-700',
                    ]"
                    @click="startPin(item)"
                  >
                    <PushPinSimple class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-8 shrink-0 items-center rounded-full bg-primary/10 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:bg-primary-light/15 dark:text-primary-light"
                    @pointerdown="prefetchRoute(router, item.path)"
                    @click="open(item)"
                  >
                    Open
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
                <li v-for="app in shownForSale" :key="app.key" class="flex items-center gap-3 px-3 py-3">
                  <span :class="[PLATED, 'size-14']">
                    <AppArt :app-key="app.key" class="size-10" />
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

            <button
              v-if="!searching"
              type="button"
              class="mx-auto mt-6 block rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              @click="resetOrder"
            >
              Put the apps back in their usual order
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* The apps on the shelf, while one is being chosen to swap out: a small
   wobble, the way a phone's home screen says its icons can be moved. */
.drawer-wobble {
  animation: drawer-wobble 0.32s ease-in-out infinite alternate;
}

@keyframes drawer-wobble {
  from {
    rotate: -1.6deg;
  }
  to {
    rotate: 1.6deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-wobble {
    animation: none;
  }
}

/* The spotlight: the church's colour with light falling across it, the same
   ground as the cards at the top of each app's home. Deeper on a dark page,
   where the accent token is its lighter shade. */
.drawer-spotlight {
  background-color: var(--color-primary);
  background-image:
    radial-gradient(110% 130% at 100% 0%, color-mix(in oklab, white 24%, transparent), transparent 55%),
    radial-gradient(90% 110% at 0% 100%, color-mix(in oklab, black 22%, transparent), transparent 60%);
}

:global(.dark) .drawer-spotlight {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-leave-active .drawer-panel {
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .drawer-enter-from .drawer-panel,
  .drawer-leave-to .drawer-panel {
    transform: translateY(0.5rem) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active .drawer-panel,
  .drawer-leave-active .drawer-panel {
    transition: none;
  }
}
</style>

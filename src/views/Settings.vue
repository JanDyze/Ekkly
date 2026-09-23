<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Globe,
  HandHeart,
  KeyRound,
  ListChecks,
  Mail,
  Palette,
  Receipt,
  Repeat,
  ShieldCheck,
  Sparkles,
  Tag,
} from '../icons'
import ConnectorAdmin from '../components/settings/ConnectorAdmin.vue'
import RecurringEventsAdmin from '../components/settings/RecurringEventsAdmin.vue'
import MemberLinkAdmin from '../components/settings/MemberLinkAdmin.vue'
import RolePermissionsAdmin from '../components/settings/RolePermissionsAdmin.vue'
import MinistriesAdmin from '../components/settings/MinistriesAdmin.vue'
import MemberTagsAdmin from '../components/settings/MemberTagsAdmin.vue'
import ChurchSettings from '../components/settings/ChurchSettings.vue'
import ChurchListsAdmin from '../components/settings/ChurchListsAdmin.vue'
import EmailDigestAdmin from '../components/settings/EmailDigestAdmin.vue'
import LandingPageAdmin from '../components/settings/LandingPageAdmin.vue'
import ChurchColoursAdmin from '../components/settings/ChurchColoursAdmin.vue'
import PlanAdmin from '../components/settings/PlanAdmin.vue'
import { useAppSettings } from '../composables/useAppSettings'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import { useVersionCheck } from '../composables/useVersionCheck'
import { useMediaQuery } from '../composables/useMediaQuery'
import { useFocusMode } from '../composables/useFocusMode'
import { useRecurringSchedules } from '../composables/useRecurringSchedules'
import { useMinistries } from '../composables/useMinistries'
import { useMemberClaims } from '../composables/useMemberClaims'
import { useLabelMarks } from '../composables/useLabelMarks'
import { useMembers } from '../composables/useMembers'

// Settings is a list of places, not a strip of tabs.
//
// Eight tabs in a row was a strip that scrolled sideways on a phone, so half of
// what Settings could do sat off the edge of the screen with nothing to say it
// was there, and the tab it opened on was the fourth one. Now a phone opens on
// every section at once, grouped by what it is about, each row saying where it
// stands — "3 on the calendar", "2 requests waiting" — so the one that needs
// attention is visible before anything is opened. A wide screen keeps the list
// down the side and the open section beside it.
//
// The section lives in the URL (?section=), so a refresh, the back button and
// a link someone sends all land in the same place. The old ?tab= links still
// work.

const route = useRoute()
const router = useRouter()
const isDesktop = useMediaQuery('(min-width: 1024px)')

const { church, categories, theme: churchTheme } = useAppSettings()
const { branding } = usePlatformConfig()
const { schedules } = useRecurringSchedules()
const { ministries } = useMinistries()
const { pendingClaims } = useMemberClaims()
const { tagRecords } = useLabelMarks()
const { members } = useMembers()

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// The four category lists, counted for the row that holds them: "4 lists" on
// its own says nothing a church could act on, and the entries are the thing
// that gets long.
const LIST_KEYS = ['gallery', 'links', 'songs', 'eventTypes']
const listEntryCount = computed(() =>
  LIST_KEYS.reduce((total, key) => total + (categories.value[key] || []).length, 0)
)

const tagCount = computed(() => {
  const names = new Set(tagRecords.value.map((t) => String(t.name || '').toLowerCase()))
  members.value.forEach((m) => (m.tags || []).forEach((t) => names.add(String(t).toLowerCase())))
  names.delete('')
  return names.size
})

const GROUPS = computed(() => [
  {
    label: 'Church',
    items: [
      {
        key: 'church',
        label: 'Church details',
        icon: Building2,
        // Not the church's name: the sidebar above this is already showing it.
        // What is worth saying here is whether the church has said what it is
        // for, because that is what a visitor reads on the public page.
        status:
          church.value?.mission || church.value?.vision
            ? 'Names, mission and how to find you'
            : 'Mission not set',
        attention: !(church.value?.mission || church.value?.vision),
        component: ChurchSettings,
      },
      {
        // Next to Church details, which is where these lists used to live.
        key: 'lists',
        label: 'Lists',
        icon: ListChecks,
        status: `${LIST_KEYS.length} lists · ${plural(listEntryCount.value, 'entry', 'entries')}`,
        component: ChurchListsAdmin,
      },
      {
        key: 'landing',
        label: 'Public page',
        icon: Globe,
        status: 'What visitors see before signing in',
        component: LandingPageAdmin,
      },
      {
        key: 'colours',
        label: 'Colours and type',
        icon: Palette,
        status: Object.keys(churchTheme.value || {}).length ? 'Your church’s own' : `${branding.value.name}’s look`,
        component: ChurchColoursAdmin,
      },
    ],
  },
  {
    label: 'Plan',
    items: [
      {
        key: 'plan',
        label: 'Apps & plan',
        icon: Receipt,
        status: 'What the church pays for, and requests',
        component: PlanAdmin,
      },
    ],
  },
  {
    label: 'Calendar',
    items: [
      {
        key: 'schedule',
        label: 'Recurring events',
        icon: Repeat,
        status: `${schedules.value.filter((s) => s.enabled).length} on the calendar`,
        component: RecurringEventsAdmin,
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        key: 'ministries',
        label: 'Ministries',
        icon: HandHeart,
        status: plural(ministries.value.length, 'ministry', 'ministries'),
        component: MinistriesAdmin,
      },
      {
        key: 'tags',
        label: 'Tags',
        icon: Tag,
        status: plural(tagCount.value, 'tag'),
        component: MemberTagsAdmin,
      },
      {
        key: 'accounts',
        label: 'Account links & admins',
        icon: KeyRound,
        status: pendingClaims.value.length
          ? plural(pendingClaims.value.length, 'request waiting', 'requests waiting')
          : 'Who each sign-in belongs to',
        attention: pendingClaims.value.length > 0,
        component: MemberLinkAdmin,
      },
    ],
  },
  {
    label: 'Access',
    items: [
      {
        key: 'roles',
        label: 'Roles',
        icon: ShieldCheck,
        status: 'What each ministry can see and change',
        component: RolePermissionsAdmin,
      },
    ],
  },
  {
    label: 'Notifications',
    items: [
      {
        key: 'email',
        label: 'Email digest',
        icon: Mail,
        status: 'Summaries sent by email',
        component: EmailDigestAdmin,
      },
    ],
  },
  {
    label: 'Connections',
    items: [
      {
        key: 'connector',
        label: 'Claude connector',
        icon: Sparkles,
        status: 'Ask Claude about the church’s records',
        component: ConnectorAdmin,
      },
    ],
  },
])

const ITEMS = computed(() => GROUPS.value.flatMap((g) => g.items))

const requested = computed(() => {
  const key = route.query.section || route.query.tab
  return ITEMS.value.some((item) => item.key === key) ? key : ''
})

// A phone with nothing chosen shows the list; a desktop always shows a section
// beside it, so it falls back to the first rather than an empty pane.
const activeKey = computed(() => requested.value || (isDesktop.value ? 'church' : ''))
const active = computed(() => ITEMS.value.find((item) => item.key === activeKey.value) || null)

// ?tab= is how the old tabs linked; rewrite it to ?section= once, quietly.
watch(
  () => route.query.tab,
  (tab) => {
    if (!tab) return
    const { tab: _drop, ...rest } = route.query
    router.replace({ query: { ...rest, section: tab } })
  },
  { immediate: true }
)

/* --------------------------------------------------- opening a section

   The row you tapped becomes the bar at the top of the section: its icon and
   its name travel up into the header rather than one screen simply replacing
   another, so what you are now inside of is the thing you just pressed.

   A FLIP, measured rather than choreographed. The row's icon and label are
   measured on the way out, the same two things in the header are measured once
   they exist, and the difference between them is applied as a transform that is
   then animated away. Nothing is cloned and nothing is positioned by hand, so a
   longer name, a wider phone or a bigger system font needs no second set of
   numbers.

   Only on a phone, where the section really is another screen, and only for a
   tap: arriving by link or refresh has no row to have come from, and the header
   is simply there. */

const MOVE_MS = 260

// A plain Map, not a ref: it holds DOM nodes that change on every render, and
// nothing renders from it.
const rowEls = new Map()
const setRowEl = (key, part, el) => {
  const row = rowEls.get(key) || {}
  if (el) row[part] = el
  else delete row[part]
  rowEls.set(key, row)
}

const barIcon = ref(null)
const barTitle = ref(null)

// Where the tapped row was, held only until the header has been drawn in its
// place. Not a ref, for the same reason as above.
let cameFrom = null

const heldStill = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Moves one element from where its counterpart was to where it now is. */
const glide = (el, start) => {
  if (!el || !start?.height) return
  const end = el.getBoundingClientRect()
  if (!end.height) return
  // Corner to corner: with the origin at the top left, scaling leaves that
  // corner where it is, so the offset measured from it stays true.
  const shift = `translate(${start.left - end.left}px, ${start.top - end.top}px)`
  el.style.transformOrigin = 'top left'
  el.style.transition = 'none'
  el.style.transform = `${shift} scale(${start.height / end.height})`
  requestAnimationFrame(() => {
    el.style.transition = `transform ${MOVE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
    el.style.transform = ''
    const settle = () => {
      el.style.transition = ''
      el.style.transformOrigin = ''
      el.removeEventListener('transitionend', settle)
    }
    el.addEventListener('transitionend', settle)
  })
}

// Opening a section pushes rather than replaces, so a phone's back gesture
// returns to the list — which is where "back" means on a phone.
const openSection = (key) => {
  if (key === activeKey.value) return
  const row = rowEls.get(key)
  cameFrom =
    !isDesktop.value && row?.icon && !heldStill()
      ? { icon: row.icon.getBoundingClientRect(), label: row.label?.getBoundingClientRect() }
      : null
  router.push({ query: { ...route.query, section: key } })
}

// The header does not exist until the section has rendered, so the measuring
// waits for it. Anything that changes `active` without a tap — a status line
// counting up, a link opened cold — leaves cameFrom empty and animates nothing.
watch(active, async (section) => {
  const start = cameFrom
  cameFrom = null
  if (!section || !start) return
  await nextTick()
  glide(barIcon.value, start.icon)
  glide(barTitle.value, start.label)
})

// An open section on a phone is a detail view: it takes the screen, chrome
// and all, the way a person's profile does. The way back is the link at its
// top, which is why the chrome can go. A desktop keeps everything - the
// section is a column beside the list there, not a page.
useFocusMode(() => !isDesktop.value && Boolean(active.value))

const backToList = () => {
  const { section: _drop, ...rest } = route.query
  router.push({ query: rest })
}

// Stamped in from package.json by vite's define. Shown at the foot of
// settings because the app is installed as a PWA: when someone reports a bug
// from their phone, the first thing to establish is which build they are
// actually running, and a cached service worker can be well behind.
const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
const { open: openWhatsNew } = useVersionCheck()
</script>

<template>
  <div class="relative h-full lg:flex lg:gap-4">
    <!-- The list. The whole page on a phone until a section is opened; a
         column of its own on a desktop. -->
    <nav
      v-if="isDesktop || !active"
      aria-label="Settings sections"
      class="h-full overflow-y-auto pt-3 pb-bar! sm:pt-0 lg:w-72 lg:shrink-0"
    >
      <div v-for="group in GROUPS" :key="group.label" class="mb-4">
        <h2
          class="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 sm:px-1"
        >
          {{ group.label }}
        </h2>
        <!-- Edge to edge on a phone, like every other list in the app: a card
             with rounded corners and a border needs room around it, and a
             phone has none to spare. From sm up it is a card again. -->
        <ul
          class="divide-y divide-gray-100 border-y border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800 sm:overflow-hidden sm:rounded-xl sm:border"
        >
          <li v-for="item in group.items" :key="item.key">
            <button
              type="button"
              @click="openSection(item.key)"
              :aria-current="activeKey === item.key ? 'page' : undefined"
              :class="[
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-3',
                activeKey === item.key && isDesktop
                  ? 'bg-primary/5 dark:bg-primary-light/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
              ]"
            >
              <span
                :ref="(el) => setRowEl(item.key, 'icon', el)"
                :class="[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  activeKey === item.key && isDesktop
                    ? 'bg-primary text-white dark:bg-primary-light'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
                ]"
              >
                <component :is="item.icon" class="h-4.5 w-4.5" />
              </span>
              <span class="min-w-0 flex-1">
                <span
                  :ref="(el) => setRowEl(item.key, 'label', el)"
                  class="block truncate text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ item.label }}
                </span>
                <span
                  :class="[
                    'block truncate text-xs',
                    item.attention
                      ? 'font-semibold text-amber-600 dark:text-amber-400'
                      : 'text-gray-500 dark:text-gray-400',
                  ]"
                >
                  {{ item.status }}
                </span>
              </span>
              <ChevronRight class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
            </button>
          </li>
        </ul>
      </div>

      <!-- Which build this is. Under the list rather than inside a section,
           because a bug report can come from any of them and the version is
           the first question asked. -->
      <p class="px-4 pb-4 text-center text-xs text-gray-400 dark:text-gray-500">
        {{ branding.name }} v{{ appVersion }} &middot;
        <button
          @click="openWhatsNew"
          class="underline underline-offset-2 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          What's new
        </button>
      </p>
    </nav>

    <!-- The open section. A plain block scroller, deliberately not a flex
         column: a flex item shrinks to fit, and the sections are
         overflow-hidden for their rounded corners, so a tall one was clipped
         with nothing to scroll. -->
    <Transition name="section">
      <main
        v-if="active"
        class="settings-detail h-full min-w-0 flex-1 overflow-y-auto bg-white px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-0 lg:pb-4 dark:bg-gray-900"
      >
        <!-- The way back, on a phone only. The section's own card carries its
             name, so this says where back goes rather than repeating it. -->
        <div
          v-if="!isDesktop"
          class="sticky top-0 z-20 -mx-3 mb-2 flex items-center gap-2 border-b border-gray-200 bg-white/90 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur dark:border-gray-700 dark:bg-gray-900/90"
        >
          <button
            type="button"
            @click="backToList"
            aria-label="Back to settings"
            class="-ml-1.5 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <span
            ref="barIcon"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light"
          >
            <component :is="active.icon" class="h-4.5 w-4.5" />
          </span>
          <h1 ref="barTitle" class="min-w-0 truncate text-base font-bold text-gray-900 dark:text-white">
            {{ active.label }}
          </h1>
        </div>

        <KeepAlive>
          <component :is="active.component" :key="active.key" />
        </KeepAlive>
      </main>
    </Transition>
  </div>
</template>

<style scoped>
/* Opening a section is a move, not a redraw.
   On a phone the section is the whole screen — chrome and all, see
   useFocusMode above — so it arrives over the list from the right and leaves
   back the way it came, which is what says where the back arrow goes. It is
   positioned absolutely only while it moves, so the list underneath keeps its
   place instead of being shoved about by the animation.
   Nothing on a desktop: there the section is a column beside the list, and
   nothing has travelled. */
@media (width < 64rem) {
  .section-enter-active,
  .section-leave-active {
    position: absolute;
    inset: 0;
    z-index: 30;
  }

  /* Quicker than the move above it: the header has to be there to be arrived
     at. */
  .section-enter-active {
    transition: opacity 0.16s ease-out;
  }

  .section-leave-active {
    transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease;
  }

  .section-enter-from {
    opacity: 0;
  }

  .section-leave-to {
    transform: translateX(8%);
    opacity: 0;
  }
}

/* Anyone who has asked their system to stop animating things gets the swap
   plain, the same bargain the sheets and PullToRefresh strike. */
@media (prefers-reduced-motion: reduce) {
  .section-enter-active,
  .section-leave-active {
    transition: opacity 0.14s ease;
  }

  .section-enter-from,
  .section-leave-to {
    transform: none;
  }
}
</style>

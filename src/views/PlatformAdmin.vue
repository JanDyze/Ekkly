<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Buildings,
  ChartLine,
  ChatCircleDots,
  ChatsCircle,
  ChevronRight,
  ClockCounterClockwise,
  LogOut,
  Palette,
  PuzzlePiece,
  Robot,
  ShieldAlert,
  SlidersHorizontal,
  Storefront,
  Tray,
  UsersThree,
} from '../icons'
import { initAuth, useAuth } from '../composables/useAuth'
import { useMediaQuery } from '../composables/useMediaQuery'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import { callPlatform, isPlatformAdmin, subscribeToChurchRequests } from '../api/platformService'
import PlatformLogo from '../components/common/PlatformLogo.vue'
import SectionCardSkeleton from '../components/common/SectionCardSkeleton.vue'
import ChurchRequestsAdmin from '../components/platform/ChurchRequestsAdmin.vue'
import ChurchesAdmin from '../components/platform/ChurchesAdmin.vue'
import AppCatalogAdmin from '../components/platform/AppCatalogAdmin.vue'
import FrontDoorAdmin from '../components/platform/FrontDoorAdmin.vue'
import SupportRequestsAdmin from '../components/platform/SupportRequestsAdmin.vue'
import ChatAdmin from '../components/platform/ChatAdmin.vue'
import NewChurchDefaultsAdmin from '../components/platform/NewChurchDefaultsAdmin.vue'
import BrandingAdmin from '../components/platform/BrandingAdmin.vue'
import PlatformColoursAdmin from '../components/platform/PlatformColoursAdmin.vue'
import AiAdmin from '../components/platform/AiAdmin.vue'
import PlatformAdminsAdmin from '../components/platform/PlatformAdminsAdmin.vue'
import PlatformActivity from '../components/platform/PlatformActivity.vue'

// The platform's console: everything the people who run Ekkly do, from saying
// yes to a new church to choosing which AI model writes up minutes.
//
// Laid out the way church Settings is — a list of places, each saying where it
// stands, with the open one beside it on a wide screen — so a platform
// administrator who also runs a church finds the same furniture in both.
// The section lives in the URL (?section=), so back, refresh and a shared link
// all land in the same place.

const route = useRoute()
const router = useRouter()
const isDesktop = useMediaQuery('(min-width: 1024px)')
const { user, email, logout } = useAuth()
const { branding } = usePlatformConfig()

const checking = ref(true)
const allowed = ref(false)
const pendingRequests = ref(0)
const unreadChats = ref(0)
let unsubscribe = null
let chatTimer = 0

// Only the count of unanswered chat messages, for the list's status line, and
// only every so often; the section itself checks far more often while open.
const countUnreadChats = async () => {
  if (document.visibilityState !== 'visible') return
  try {
    const chats = await callPlatform('chats')
    unreadChats.value = chats.reduce((n, chat) => n + (chat.unread || 0), 0)
  } catch {
    // The status line keeps its last count.
  }
}

watch(
  () => user.value?.uid,
  async (uid) => {
    await initAuth()
    unsubscribe?.()
    unsubscribe = null
    checking.value = true
    allowed.value = await isPlatformAdmin(uid)
    checking.value = false
    // Only the count, for the list's status line; the section keeps its own.
    if (allowed.value) {
      unsubscribe = subscribeToChurchRequests((list) => {
        pendingRequests.value = list.filter((r) => r.status === 'pending').length
      })
      clearInterval(chatTimer)
      countUnreadChats()
      chatTimer = setInterval(countUnreadChats, 30 * 1000)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  unsubscribe?.()
  clearInterval(chatTimer)
})

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const GROUPS = computed(() => [
  {
    label: 'Churches',
    items: [
      {
        key: 'requests',
        label: 'Church requests',
        icon: Tray,
        status: pendingRequests.value ? plural(pendingRequests.value, 'request waiting', 'requests waiting') : 'Nothing waiting',
        attention: pendingRequests.value > 0,
        component: ChurchRequestsAdmin,
      },
      {
        key: 'churches',
        label: 'Churches',
        icon: Buildings,
        status: 'Every church, what it pays and how much it uses',
        component: ChurchesAdmin,
      },
    ],
  },
  {
    label: 'Selling',
    items: [
      {
        key: 'apps',
        label: 'Apps & prices',
        icon: Storefront,
        status: 'What each app costs a month',
        component: AppCatalogAdmin,
      },
      {
        key: 'chat',
        label: 'Live chat',
        icon: ChatsCircle,
        status: unreadChats.value ? plural(unreadChats.value, 'unread message') : 'Visitors who messaged from the front door',
        attention: unreadChats.value > 0,
        component: ChatAdmin,
      },
      {
        key: 'frontdoor',
        label: 'Front door',
        icon: ChartLine,
        status: 'Who is looking, and which churches typed their name',
        component: FrontDoorAdmin,
      },
      {
        key: 'support',
        label: 'Support requests',
        icon: ChatCircleDots,
        status: 'New apps, changes and feedback from churches',
        component: SupportRequestsAdmin,
      },
      {
        key: 'defaults',
        label: 'New church defaults',
        icon: PuzzlePiece,
        status: 'What an approved church starts with',
        component: NewChurchDefaultsAdmin,
      },
    ],
  },
  {
    label: 'Look',
    items: [
      {
        key: 'branding',
        label: 'Name & front door',
        icon: SlidersHorizontal,
        status: branding.value.name,
        component: BrandingAdmin,
      },
      {
        key: 'colours',
        label: 'Colours',
        icon: Palette,
        status: 'The accent every church starts with',
        component: PlatformColoursAdmin,
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        key: 'ai',
        label: 'AI',
        icon: Robot,
        status: 'Which model each feature runs on',
        component: AiAdmin,
      },
      {
        key: 'admins',
        label: 'Platform admins',
        icon: UsersThree,
        status: 'Who can run the platform',
        component: PlatformAdminsAdmin,
      },
      {
        key: 'activity',
        label: 'Activity',
        icon: ClockCounterClockwise,
        status: 'Everything done from this console',
        component: PlatformActivity,
      },
    ],
  },
])

const ITEMS = computed(() => GROUPS.value.flatMap((g) => g.items))

const requested = computed(() =>
  ITEMS.value.some((item) => item.key === route.query.section) ? route.query.section : ''
)
const activeKey = computed(() => requested.value || (isDesktop.value ? 'requests' : ''))
const active = computed(() => ITEMS.value.find((item) => item.key === activeKey.value) || null)

// Pushes rather than replaces, so a phone's back gesture returns to the list.
const openSection = (key) => {
  if (key === activeKey.value) return
  router.push({ query: { ...route.query, section: key } })
}

const backToList = () => {
  const { section: _drop, ...rest } = route.query
  router.push({ query: rest })
}
</script>

<template>
  <div class="flex h-dvh flex-col bg-gray-50 dark:bg-gray-900">
    <!-- The platform's own bar. There is no church here, so none of a church's
         chrome: who is signed in, and the way back to the front door. -->
    <header class="shrink-0 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <RouterLink
          to="/"
          class="flex min-w-0 items-center gap-2 text-gray-900 dark:text-white"
          aria-label="Back to the front door"
        >
          <PlatformLogo mark-class="h-7 w-7" text-class="text-xl" />
          <span class="hidden text-sm text-gray-400 sm:inline">Console</span>
        </RouterLink>
        <span class="ml-auto hidden min-w-0 truncate text-xs text-gray-500 sm:block dark:text-gray-400">{{ email }}</span>
        <button
          v-if="user"
          type="button"
          @click="logout"
          class="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-100 sm:ml-0 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut class="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>

    <!-- Checking who is signed in: the console's own shape in grey, so the
         page does not jump from a spinner to a list. -->
    <div v-if="checking" class="mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 lg:gap-6" aria-busy="true">
      <div class="w-full space-y-4 lg:w-72 lg:shrink-0">
        <div v-for="group in [2, 3, 2]" :key="group" class="space-y-1.5">
          <div class="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
            <div v-for="row in group" :key="row" class="flex items-center gap-3 px-3 py-3">
              <div class="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
              <div class="flex-1 space-y-1.5">
                <div class="h-3.5 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                <div class="h-3 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-700/60"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="hidden min-w-0 flex-1 space-y-4 lg:block">
        <SectionCardSkeleton :rows="4" />
      </div>
    </div>

    <div v-else-if="!allowed" class="flex flex-1 items-center justify-center px-4">
      <div class="max-w-sm rounded-xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
        <ShieldAlert class="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mt-3 text-lg text-gray-700 dark:text-gray-200">Platform administrators only</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <template v-if="user">This account is not one. Another platform administrator can add it under Platform admins.</template>
          <template v-else>Sign in at the front door first, then come back here.</template>
        </p>
        <RouterLink
          to="/"
          class="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <ArrowLeft class="h-4 w-4" />
          Front door
        </RouterLink>
      </div>
    </div>

    <div v-else class="mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 lg:gap-6">
      <nav
        v-if="isDesktop || !active"
        aria-label="Console sections"
        class="h-full w-full overflow-y-auto pb-6 lg:w-72 lg:shrink-0"
      >
        <div v-for="group in GROUPS" :key="group.label" class="mb-4">
          <h2 class="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ group.label }}
          </h2>
          <ul
            class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800"
          >
            <li v-for="item in group.items" :key="item.key">
              <button
                type="button"
                @click="openSection(item.key)"
                :aria-current="activeKey === item.key ? 'page' : undefined"
                :class="[
                  'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                  activeKey === item.key && isDesktop
                    ? 'bg-primary/5 dark:bg-primary-light/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                ]"
              >
                <span
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
                  <span class="block truncate text-sm font-medium text-gray-900 dark:text-white">{{ item.label }}</span>
                  <span
                    :class="[
                      'block truncate text-xs',
                      item.attention ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400',
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
      </nav>

      <main v-if="active" class="h-full min-w-0 flex-1 overflow-y-auto pb-6">
        <button
          v-if="!isDesktop"
          type="button"
          @click="backToList"
          class="-ml-1 mb-2 flex items-center gap-1 rounded-lg px-1 py-2 text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft class="h-5 w-5" />
          Console
        </button>

        <KeepAlive>
          <component :is="active.component" :key="active.key" />
        </KeepAlive>
      </main>
    </div>
  </div>
</template>

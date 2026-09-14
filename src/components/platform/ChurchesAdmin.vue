<script setup>
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Buildings, ChevronRight, Search, SearchX, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { useToast } from '../../composables/useToast'
import { agoFrom, usePlatformConsole } from '../../composables/usePlatformConsole'
import { formatMoney } from '../../utils/moneyUtils'
import { TONE_CLASSES, billingBadge } from '../../utils/planUtils'
import { APP_KEYS } from '../../../lib/apps.js'

// Every church on the platform, one row each: what it is, what it pays, and
// how much it is used. A church opens as its own page, where everything about
// it can be changed.

const router = useRouter()
const toast = useToast()
const { churches, usage, loadingChurches, loadChurches } = usePlatformConsole()

const load = (force = false) =>
  loadChurches({ force }).catch((error) => {
    console.error('Error loading churches:', error)
    toast.error(error.message || 'Could not load the churches. Please try again.')
  })

// Kept alive by the console, so this runs on the first visit and on every
// return. A return refetches: a church page's own changes are already in the
// list, but a church approved meanwhile is not.
let visited = false
onActivated(() => {
  load(visited)
  visited = true
})

const query = ref('')
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return churches.value
  return churches.value.filter((c) =>
    [c.name, c.id, c.primaryDomain, ...(c.domains || []), c.status === 'closed' ? 'closed' : '', billingBadge(c.plan).label]
      .join(' ')
      .toLowerCase()
      .includes(q)
  )
})

const appCount = (church) => (church.plan?.apps ? church.plan.apps.length : APP_KEYS.length)

const openChurch = (church) => router.push(`/platform/churches/${church.id}`)
</script>

<template>
  <SectionCard :icon="Buildings" title="Churches" :subtitle="`${churches.length} on the platform`">
    <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
      <div class="relative">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="query"
          type="text"
          inputmode="search"
          aria-label="Search churches"
          placeholder="Name / address / overdue / closed"
          class="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          v-if="query"
          type="button"
          @click="query = ''"
          aria-label="Clear search"
          class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="loadingChurches && !churches.length" class="space-y-1 p-2">
      <div v-for="i in 4" :key="i" class="flex items-center gap-3 p-3">
        <div class="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-600"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
          <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
        </div>
      </div>
    </div>

    <div
      v-else-if="!visible.length"
      class="flex flex-col items-center justify-center px-8 py-12 text-center text-gray-500 dark:text-gray-400"
    >
      <SearchX v-if="query" class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <Buildings v-else class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">{{ query ? `Nothing matches "${query}"` : 'No churches yet' }}</p>
      <p class="text-sm">{{ query ? 'Try a name, an address, or a word like overdue.' : 'Approve a church request and it appears here.' }}</p>
    </div>

    <ul v-else class="space-y-1 p-2">
      <li v-for="church in visible" :key="church.id">
        <button
          type="button"
          @click="openChurch(church)"
          class="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
            {{ (church.name || church.id).slice(0, 2) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex min-w-0 items-center gap-1.5">
              <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ church.name }}</span>
              <span
                v-if="church.status === 'closed'"
                class="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/20 dark:text-red-300"
              >Closed</span>
            </span>
            <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
              {{ church.primaryDomain || church.id }}
              &middot; {{ appCount(church) }} apps
              <template v-if="usage[church.id]">
                &middot; {{ usage[church.id].members ?? '–' }} people
                &middot; active {{ agoFrom(usage[church.id].lastActiveAt) }}
              </template>
            </span>
          </span>
          <span class="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASSES[billingBadge(church.plan).tone]]">
              {{ billingBadge(church.plan).label }}
            </span>
            <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatMoney(church.plan?.monthly || 0) }}/mo</span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </button>
      </li>
    </ul>
  </SectionCard>
</template>

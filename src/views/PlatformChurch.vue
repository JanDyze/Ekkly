<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ArrowSquareOut, Loader2, SearchX } from '../icons'
import { callPlatform } from '../api/platformService'
import { useToast } from '../composables/useToast'
import { usePlatformConsole } from '../composables/usePlatformConsole'
import { TONE_CLASSES, billingBadge } from '../utils/planUtils'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'
import ChurchOverviewCard from '../components/platform/church/ChurchOverviewCard.vue'
import ChurchUsageCard from '../components/platform/church/ChurchUsageCard.vue'
import ChurchAppsCard from '../components/platform/church/ChurchAppsCard.vue'
import ChurchBillingCard from '../components/platform/church/ChurchBillingCard.vue'
import ChurchDomainsCard from '../components/platform/church/ChurchDomainsCard.vue'
import ChurchStatusCard from '../components/platform/church/ChurchStatusCard.vue'

// One church, as the platform runs it: its name and timezone, what it uses,
// which apps it has, what it owes, which domains reach it, and whether it is
// open at all. A page of its own rather than a drawer: there is a lot here,
// and a link to it is worth being able to send.

const route = useRoute()
const toast = useToast()
const { updateChurchInList } = usePlatformConsole()

const church = ref(null)
const loading = ref(true)
const missing = ref(false)

const load = async (id) => {
  loading.value = true
  missing.value = false
  try {
    church.value = await callPlatform('church', { churchId: id })
  } catch (error) {
    console.error('Error loading church:', error)
    missing.value = true
    toast.error(error.message || 'Could not load that church.')
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, (id) => id && load(id), { immediate: true })

/** Every card hands back the whole church after it saves. */
const onUpdated = (next) => {
  church.value = next
  updateChurchInList(next)
}

// Locally there is no domain, so the church opens on this same address instead.
const openLink = computed(() => {
  if (!church.value) return ''
  if (church.value.address) return church.value.address
  return canSwitchChurchHere() ? devChurchLink(church.value.id) : ''
})

const badge = computed(() => billingBadge(church.value?.plan))
</script>

<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      <RouterLink
        to="/platform?section=churches"
        class="-ml-1 mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-2 text-sm font-medium text-gray-600 dark:text-gray-300"
      >
        <ArrowLeft class="h-5 w-5" />
        Churches
      </RouterLink>

      <div v-if="loading && !church" class="flex justify-center py-16">
        <Loader2 class="h-6 w-6 animate-spin text-gray-400" />
      </div>

      <div
        v-else-if="missing && !church"
        class="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-8 py-16 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
      >
        <SearchX class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">No church here</p>
        <p class="text-sm">It may have a different id. Go back to the list and open it from there.</p>
      </div>

      <template v-else-if="church">
        <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">{{ church.name }}</h1>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span class="font-mono">{{ church.id }}</span>
              <span
                v-if="church.status === 'closed'"
                class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300"
              >Closed</span>
              <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASSES[badge.tone]]">{{ badge.label }}</span>
            </p>
          </div>
          <a
            v-if="openLink"
            :href="openLink"
            target="_blank"
            rel="noopener"
            class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
          >
            Open its app
            <ArrowSquareOut class="h-4 w-4" />
          </a>
        </header>

        <div class="space-y-4">
          <ChurchOverviewCard :church="church" @updated="onUpdated" />
          <ChurchUsageCard :church="church" />
          <ChurchAppsCard :church="church" @updated="onUpdated" />
          <ChurchBillingCard :church="church" @updated="onUpdated" />
          <ChurchDomainsCard :church="church" @updated="onUpdated" />
          <ChurchStatusCard :church="church" @updated="onUpdated" />
        </div>
      </template>
    </div>
  </div>
</template>

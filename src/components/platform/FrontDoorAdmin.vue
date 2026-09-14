<script setup>
import { computed, onActivated, ref } from 'vue'
import { ArrowRight, ChartLine, CursorClick, GlobeSimple, Loader2, UsersFour } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'
import { agoFrom } from '../../composables/usePlatformConsole'

// Who has been looking at the front door, and which churches they are.
//
// Counted only for visitors who agreed to it, so these are floors rather than
// totals: some people looked and were never counted. The names are the useful
// part — each one is a church that got as far as typing its own name into the
// hero, whether or not it went on to ask.

const toast = useToast()
const report = ref({ days: [], tried: [] })
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    report.value = await callPlatform('frontDoor', { days: 30, limit: 100 })
  } catch (error) {
    console.error('Error loading the front door report:', error)
    toast.error(error.message || 'Could not load the front door.')
  } finally {
    loading.value = false
  }
}
onActivated(load)

const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || 'ekkly.church'

/** Oldest to newest, for the chart. */
const days = computed(() => [...report.value.days].reverse())
const busiest = computed(() => Math.max(1, ...days.value.map((d) => d.visits)))

const totals = computed(() =>
  report.value.days.reduce(
    (sum, day) => ({
      visits: sum.visits + day.visits,
      tries: sum.tries + day.tries,
      starts: sum.starts + day.starts,
    }),
    { visits: 0, tries: 0, starts: 0 }
  )
)

const SUMMARY = computed(() => [
  { key: 'visits', icon: UsersFour, label: 'Visits', value: totals.value.visits },
  { key: 'tries', icon: GlobeSimple, label: 'Names tried', value: totals.value.tries },
  { key: 'starts', icon: CursorClick, label: 'Start pressed', value: totals.value.starts },
])

const dayLabel = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
</script>

<template>
  <div class="space-y-4">
    <SectionCard :icon="ChartLine" title="The last 30 days" subtitle="Counted only where a visitor allowed it, so these are the least it has been.">
      <div v-if="loading" class="animate-pulse space-y-3" aria-busy="true">
        <div class="h-16 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
        <div class="h-32 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
      </div>

      <template v-else>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="item in SUMMARY" :key="item.key" class="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <p class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <component :is="item.icon" class="h-4 w-4" />
              {{ item.label }}
            </p>
            <p class="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ item.value }}</p>
          </div>
        </div>

        <div v-if="days.length" class="mt-4 flex h-28 items-end gap-1">
          <div v-for="day in days" :key="day.day" class="group relative flex h-full flex-1 flex-col justify-end">
            <span
              class="w-full rounded-t bg-primary/70 transition-colors hover:bg-primary dark:bg-primary-light/70"
              :style="{ height: `${Math.max(4, (day.visits / busiest) * 100)}%` }"
            ></span>
            <span class="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-white dark:text-gray-900">
              {{ dayLabel(day.day) }} · {{ day.visits }} visits · {{ day.tries }} names
            </span>
          </div>
        </div>
        <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">Nothing counted yet.</p>
      </template>
    </SectionCard>

    <SectionCard :icon="GlobeSimple" title="Churches that tried their name" subtitle="Typed into “Curious? Type your church’s name” on the front door.">
      <div v-if="loading" class="animate-pulse space-y-2" aria-busy="true">
        <div v-for="n in 3" :key="n" class="h-12 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
      </div>

      <ul v-else-if="report.tried.length" class="divide-y divide-gray-100 dark:divide-gray-700">
        <li v-for="item in report.tried" :key="item.id" class="flex items-center gap-3 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
            <p class="truncate font-mono text-xs text-gray-500 dark:text-gray-400">{{ item.slug }}.{{ rootDomain }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ agoFrom(item.lastAt) }}</p>
            <p v-if="item.referrer" class="flex items-center justify-end gap-1 text-xs text-gray-400 dark:text-gray-500">
              <ArrowRight class="h-3 w-3" /> {{ item.referrer }}
            </p>
          </div>
        </li>
      </ul>

      <div v-else class="flex flex-col items-center justify-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
        <GlobeSimple class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">No names tried yet</p>
        <p class="text-sm">They appear here as soon as someone types their church’s name on the front door.</p>
      </div>
    </SectionCard>

    <button
      type="button"
      @click="load"
      :disabled="loading"
      class="flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
      Refresh
    </button>
  </div>
</template>

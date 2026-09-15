<script setup>
import { computed, onActivated, ref } from 'vue'
import { ChartLine, CursorClick, EnvelopeSimple, HandWaving, Loader2, Phone, UsersFour } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'
import { agoFrom } from '../../composables/usePlatformConsole'

// Who has been looking at the front door, and which churches said hello.
//
// The counts are only for visitors who agreed to be counted, so they are floors
// rather than totals. The churches are the useful part: each answered the
// welcome with its name, and often a way to reach whoever typed it.

const toast = useToast()
const report = ref({ days: [], leads: [] })
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

/** Oldest to newest, for the chart. */
const days = computed(() => [...report.value.days].reverse())
const busiest = computed(() => Math.max(1, ...days.value.map((d) => d.visits)))

const totals = computed(() =>
  report.value.days.reduce(
    (sum, day) => ({
      visits: sum.visits + day.visits,
      starts: sum.starts + day.starts,
    }),
    { visits: 0, starts: 0 }
  )
)

const SUMMARY = computed(() => [
  { key: 'visits', icon: UsersFour, label: 'Visits', value: totals.value.visits },
  { key: 'leads', icon: HandWaving, label: 'Said hello', value: report.value.leads?.length || 0 },
  { key: 'starts', icon: CursorClick, label: 'Start pressed', value: totals.value.starts },
])

// A tap to reach them: a mail or a call.
const reachLink = (lead) => (lead.contactKind === 'email' ? `mailto:${lead.contact}` : `tel:${lead.contact.replace(/[^d+]/g, '')}`)

const dayLabel = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
</script>

<template>
  <div class="space-y-4">
    <SectionCard :icon="HandWaving" title="Churches that said hello" subtitle="From the welcome on a first visit. Reach out to the ones who left a way to.">
      <div v-if="loading" class="animate-pulse space-y-2" aria-busy="true">
        <div v-for="n in 2" :key="n" class="h-14 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
      </div>

      <ul v-else-if="report.leads?.length" class="divide-y divide-gray-100 dark:divide-gray-700">
        <li v-for="lead in report.leads" :key="lead.id" class="flex items-center gap-3 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ lead.churchName }}</p>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ lead.name || (lead.contact ? 'No name given' : 'Skipped the contact') }} &middot; {{ agoFrom(lead.updatedAt) }}
            </p>
          </div>
          <a
            v-if="lead.contact"
            :href="reachLink(lead)"
            class="inline-flex h-9 max-w-[45%] shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
          >
            <component :is="lead.contactKind === 'email' ? EnvelopeSimple : Phone" class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ lead.contact }}</span>
          </a>
        </li>
      </ul>

      <div v-else class="flex flex-col items-center justify-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
        <HandWaving class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">No one yet</p>
        <p class="text-sm">When a first-time visitor names their church in the welcome, it appears here.</p>
      </div>
    </SectionCard>

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
              {{ dayLabel(day.day) }} · {{ day.visits }} visits · {{ day.starts }} started
            </span>
          </div>
        </div>
        <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">Nothing counted yet.</p>
      </template>
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

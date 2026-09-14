<script setup>
import { computed } from 'vue'
import { ChartBar } from '../../../icons'
import SectionCard from '../../common/SectionCard.vue'
import { agoFrom } from '../../../composables/usePlatformConsole'
import { AI_FEATURES } from '../../../../lib/aiModels.js'

// How much a church uses the app, as plain facts. "Last active" is the newest
// change anyone made — every change writes an audit entry — so it is when
// somebody last did something, not merely looked.

const props = defineProps({ church: { type: Object, required: true } })

const usage = computed(() => props.church.usage || {})

const monthLabel = computed(() => {
  const [y, m] = String(usage.value.month || '').split('-').map(Number)
  return y ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'this month'
})

const aiTotal = computed(() => AI_FEATURES.reduce((n, f) => n + (usage.value.ai?.[f.key] || 0), 0))

const rows = computed(() => [
  { label: 'People on the roll', value: usage.value.members ?? '–' },
  { label: 'Accounts that can sign in', value: usage.value.accounts ?? '–' },
  { label: 'Waiting to join', value: usage.value.pendingJoins ?? '–' },
  { label: 'Last active', value: agoFrom(usage.value.lastActiveAt) },
])
</script>

<template>
  <SectionCard :icon="ChartBar" title="Usage" :subtitle="`Counted just now; AI calls for ${monthLabel}`">
    <dl class="divide-y divide-gray-100 dark:divide-gray-700">
      <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-3 px-4 py-3">
        <dt class="text-sm text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
        <dd class="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{{ row.value }}</dd>
      </div>
      <div class="px-4 py-3">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-sm text-gray-500 dark:text-gray-400">AI calls</dt>
          <dd class="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{{ aiTotal }}</dd>
        </div>
        <ul v-if="aiTotal" class="mt-2 space-y-1">
          <li v-for="feature in AI_FEATURES" :key="feature.key" class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{{ feature.label }}</span>
            <span class="tabular-nums">{{ usage.ai?.[feature.key] || 0 }}</span>
          </li>
        </ul>
      </div>
    </dl>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useFinanceOverview } from '../../composables/useFinanceOverview'
import { formatMoney } from '../../utils/moneyUtils'

// The months side by side: what came in, what went out, and whether the month
// ended up or down — the year at a glance, for a committee asking "are we
// keeping up?" without opening twelve statements.
//
// Each month's two bars are against the busiest month shown, so the months
// can be read against each other. A month opens its statement.

const { loading, months } = useFinanceOverview()

const largest = computed(() => Math.max(...months.value.flatMap((m) => [m.income, m.expenses]), 1))
const widthOf = (amount) => `${Math.max(amount ? 3 : 0, Math.round((amount / largest.value) * 100))}%`

const subtitle = computed(() => {
  if (loading.value) return ''
  const net = months.value.reduce((total, m) => total + m.net, 0)
  return `${net >= 0 ? 'Up' : 'Down'} ${formatMoney(Math.abs(net))} over ${months.value.length} ${months.value.length === 1 ? 'month' : 'months'}`
})
</script>

<template>
  <AppScreen title="By month" :subtitle="subtitle" :back="{ name: 'FinancesHome' }" root="/finances">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else title="Newest first" note="Transfers between the cash and the bank are neither in nor out.">
      <ListRow
        v-for="month in months"
        :key="month.key"
        :to="{ name: 'FinancesStatement', params: { month: month.key } }"
        :title="month.label"
      >
        <template #subtitle>
          <span class="mt-1.5 flex flex-col gap-1" aria-hidden="true">
            <span class="block h-1.5 rounded-full bg-green-500" :style="{ width: widthOf(month.income) }" />
            <span class="block h-1.5 rounded-full bg-red-400" :style="{ width: widthOf(month.expenses) }" />
          </span>
        </template>
        <template #trailing>
          <span class="shrink-0 text-right">
            <span
              :class="[
                'block text-sm font-semibold tabular-nums',
                month.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              ]"
            >
              {{ month.net >= 0 ? '+' : '−' }}{{ formatMoney(Math.abs(month.net)) }}
            </span>
            <span class="block text-xs tabular-nums text-gray-400 dark:text-gray-500">
              {{ month.count }} {{ month.count === 1 ? 'entry' : 'entries' }}
            </span>
          </span>
        </template>
      </ListRow>
    </ListGroup>
  </AppScreen>
</template>

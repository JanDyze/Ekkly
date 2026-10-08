<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Download } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import StatementView from '../../components/finances/StatementView.vue'
import { useFinanceOverview } from '../../composables/useFinanceOverview'
import { useToast } from '../../composables/useToast'
import { exportStatement } from '../../utils/financeExport'
import { formatMoney } from '../../utils/moneyUtils'
import { currentMonthKey, entriesInMonth, formatMonthLabel, shiftMonth } from '../../utils/ledgerUtils'

// One month's statement: what came in under each line, what went out under
// each, and how the month moved the balances — the page a church committee
// asks for, and the one sent to it as a spreadsheet.
//
// It was the Statement half of a switch on the Finances page. A section of
// its own now, because it is read by different people for a different
// reason: the book is written in every week, the statement is read once a
// month. The home's card for last month's statement opens straight onto it.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { loading, entries, statementForMonth } = useFinanceOverview()

const monthKey = computed(() => String(route.params.month || currentMonthKey()))
const goMonth = (delta) =>
  router.replace({ name: 'FinancesStatement', params: { month: shiftMonth(monthKey.value, delta) } })

const statement = computed(() => statementForMonth(monthKey.value))

const subtitle = computed(() => {
  if (loading.value) return formatMonthLabel(monthKey.value)
  const net = statement.value.net
  return `${net >= 0 ? 'Up' : 'Down'} ${formatMoney(Math.abs(net))} for the month`
})

const handleExport = () => {
  try {
    exportStatement(statement.value, entriesInMonth(entries.value, monthKey.value))
  } catch (error) {
    console.error(error)
    toast.error('Could not build that spreadsheet')
  }
}
</script>

<template>
  <AppScreen title="Statement" :subtitle="subtitle" :back="{ name: 'FinancesHome' }" root="/finances">
    <template #action>
      <button
        type="button"
        class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"
        @click="handleExport"
      >
        <Download class="size-4" />
        Excel
      </button>
    </template>

    <div class="mb-3 flex items-center gap-1">
      <button
        type="button"
        class="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Previous month"
        @click="goMonth(-1)"
      >
        <ChevronLeft class="size-5" />
      </button>
      <p class="min-w-0 flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
        {{ formatMonthLabel(monthKey) }}
      </p>
      <button
        type="button"
        class="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Next month"
        @click="goMonth(1)"
      >
        <ChevronRight class="size-5" />
      </button>
    </div>

    <div v-if="loading" class="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    <div v-else class="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
      <StatementView :statement="statement" />
    </div>
  </AppScreen>
</template>

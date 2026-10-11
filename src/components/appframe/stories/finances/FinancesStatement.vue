<script setup>
import { ref } from 'vue'
import { Check, Download } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { OCTOBER, amount, peso, useClimb } from './money'

// Scene: the statement the committee asks for. October's income settles in
// line by line and its total adds itself up, then the expenses do the same,
// and the month's result lands under them. Excel is pressed, and the
// statement is a spreadsheet, ready to send.

const INCOME = [
  { label: 'Tithes and Offering', total: 48600, lines: [['On Site', 39200], ['Online', 9400]] },
  { label: 'Other Income', total: 9700, lines: [] },
]
const EXPENSES = [
  { label: 'Worship Ministry', total: 4500 },
  { label: 'Care and Concern', total: 3000 },
  { label: 'Administrative Expenses', total: 14440 },
]
const NET = OCTOBER.income - OCTOBER.expenses

const { value: income, start: addIncome } = useClimb(OCTOBER.income)
const { value: expenses, start: addExpenses } = useClimb(OCTOBER.expenses)
const pressed = ref(false)
const saved = ref(false)
const { at } = useSceneTimeline()
at(800, () => addIncome(700))
at(1850, () => addExpenses(700))
at(3200, () => (pressed.value = true))
at(3500, () => (saved.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <p class="text-xl font-bold">Statement</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Up {{ peso(NET) }} for the month</p>
      </div>
      <Transition name="swap" mode="out-in">
        <span
          v-if="!saved"
          key="excel"
          :class="[
            'relative inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-600 dark:text-gray-300',
            pressed ? 'st-tap bg-gray-200/70 dark:bg-gray-800' : '',
          ]"
        >
          <Download class="size-4" />
          Excel
        </span>
        <span v-else key="saved" class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-50 px-3 text-sm font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
          <Check class="size-4" />
          Saved
        </span>
      </Transition>
    </div>

    <div class="st-rise mt-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 100ms">
      <p class="text-center text-[11px] font-bold uppercase tracking-wide">Income and expenses · October 2026</p>

      <p class="mt-3 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:border-gray-600 dark:text-gray-300">Income</p>
      <template v-for="(g, i) in INCOME" :key="g.label">
        <div class="st-rise flex items-baseline gap-2 pt-1 text-xs" :style="{ '--d': `${250 + i * 220}ms` }">
          <span class="min-w-0 flex-1 truncate">{{ g.label }}</span>
          <span class="font-semibold tabular-nums">{{ amount(g.total) }}</span>
        </div>
        <div
          v-for="(line, j) in g.lines"
          :key="line[0]"
          class="st-rise flex items-baseline gap-2 pl-3 text-[11px] text-gray-500 dark:text-gray-400"
          :style="{ '--d': `${330 + i * 220 + j * 80}ms` }"
        >
          <span class="flex-1">{{ line[0] }}</span>
          <span class="tabular-nums">{{ amount(line[1]) }}</span>
        </div>
      </template>
      <div class="mt-1 flex items-baseline border-t border-gray-300 pt-1 text-xs font-bold dark:border-gray-600">
        <span class="flex-1">Total income</span>
        <span class="tabular-nums text-teal-700 dark:text-teal-400">{{ amount(income) }}</span>
      </div>

      <p class="mt-3 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:border-gray-600 dark:text-gray-300">Expenses</p>
      <div
        v-for="(g, i) in EXPENSES"
        :key="g.label"
        class="st-rise flex items-baseline gap-2 pt-1 text-xs"
        :style="{ '--d': `${1300 + i * 160}ms` }"
      >
        <span class="min-w-0 flex-1 truncate">{{ g.label }}</span>
        <span class="font-semibold tabular-nums">{{ amount(g.total) }}</span>
      </div>
      <div class="mt-1 flex items-baseline border-t border-gray-300 pt-1 text-xs font-bold dark:border-gray-600">
        <span class="flex-1">Total expenses</span>
        <span class="tabular-nums text-orange-600 dark:text-orange-400">{{ amount(expenses) }}</span>
      </div>

      <div class="st-pop mt-3 flex items-baseline gap-2 rounded-lg bg-teal-50 px-2.5 py-2 dark:bg-teal-500/10" style="--d: 2700ms">
        <span class="min-w-0 flex-1 text-xs font-bold">Excess of income over expenses</span>
        <span class="text-sm font-bold tabular-nums text-teal-700 dark:text-teal-400">{{ amount(NET) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.2s ease;
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
}
</style>

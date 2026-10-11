<script setup>
import { ChevronRight } from '../../../../icons'
import { peso } from './money'

// Scene: the year at a glance. The months come in newest first, and each
// one's in and out grow side by side against the busiest month, so a
// committee asking "are we keeping up?" sees August dip below the line
// without opening five statements.

const MONTHS = [
  { label: 'October 2026', income: 58300, expenses: 21940, count: 14 },
  { label: 'September 2026', income: 61500, expenses: 43260, count: 31 },
  { label: 'August 2026', income: 49800, expenses: 53920, count: 28 },
  { label: 'July 2026', income: 66200, expenses: 43500, count: 33 },
  { label: 'June 2026', income: 57900, expenses: 42140, count: 29 },
]
const LARGEST = Math.max(...MONTHS.flatMap((m) => [m.income, m.expenses]))
const width = (n) => `${Math.round((n / LARGEST) * 100)}%`
const NET = MONTHS.reduce((sum, m) => sum + m.income - m.expenses, 0)
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">By month</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">Up {{ peso(NET) }} over {{ MONTHS.length }} months</p>
    </div>

    <p class="st-rise mt-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 80ms">Newest first</p>
    <ul class="mt-1.5 divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700">
      <li
        v-for="(m, i) in MONTHS"
        :key="m.label"
        class="st-rise flex items-center gap-3 px-3 py-2.5"
        :style="{ '--d': `${200 + i * 200}ms` }"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{{ m.label }}</span>
          <span class="mt-1.5 flex flex-col gap-1">
            <span class="st-grow block h-1.5 rounded-full bg-teal-500" :style="{ width: width(m.income), '--d': `${400 + i * 200}ms` }" />
            <span class="st-grow block h-1.5 rounded-full bg-orange-400" :style="{ width: width(m.expenses), '--d': `${480 + i * 200}ms` }" />
          </span>
        </span>
        <span class="w-[74px] shrink-0 text-right">
          <span
            :class="[
              'block text-sm font-semibold tabular-nums',
              m.income >= m.expenses ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400',
            ]"
          >
            {{ m.income >= m.expenses ? '+' : '' }}{{ peso(m.income - m.expenses) }}
          </span>
          <span class="block text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ m.count }} entries</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </li>
    </ul>
  </div>
</template>

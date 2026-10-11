<script setup>
import { computed, ref } from 'vue'
import { MagnifyingGlass } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { OCTOBER, amount, peso } from './money'

// Scene: the book. October's entries settle in newest first, each with its
// colour on its edge — money in teal, money out orange, a transfer grey — and
// the balance as at that line under its amount. Then someone looking for the
// light bill types "Meralco" and the book narrows to it.

const query = ref('')
const { type } = useSceneTimeline()
type(query, 'Meralco', 2500, 140)

// Newest first, each with the balance after it. The last balance is the
// balance card's total, and the book reads down to the deposit on the 5th.
const ENTRIES = [
  { id: 1, date: 'Oct 12', title: 'Sunday tithes and offering', line: 'Tithes and Offering · On Hand', dir: 'in', amount: 12850, balance: 184250 },
  { id: 2, date: 'Oct 10', title: 'Electricity bill', line: 'Utilities · Bank · Meralco', dir: 'out', amount: 8640, balance: 171400 },
  { id: 3, date: 'Oct 8', title: 'Love gift, guest speaker', line: 'Love Gifts, Subsidy · On Hand', dir: 'out', amount: 3000, balance: 180040 },
  { id: 4, date: 'Oct 5', title: 'Sunday tithes and offering', line: 'Tithes and Offering · On Hand', dir: 'in', amount: 11920, balance: 183040 },
  { id: 5, date: 'Oct 5', title: 'Deposit to the bank', line: 'On Hand → Bank', dir: 'transfer', amount: 20000, balance: 171120 },
]

const rows = computed(() => {
  const q = query.value.toLowerCase()
  return ENTRIES.filter((e) => !q || `${e.title} ${e.line}`.toLowerCase().includes(q))
})

const SPINE = { in: 'border-l-teal-500', out: 'border-l-orange-500', transfer: 'border-l-gray-300 dark:border-l-gray-600' }
const TONE = { in: 'text-teal-600 dark:text-teal-400', out: 'text-orange-600 dark:text-orange-400', transfer: 'text-gray-500 dark:text-gray-400' }
const SIGN = { in: '+', out: '−', transfer: '' }
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">Book</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        October 2026 ·
        <span class="text-teal-600 dark:text-teal-400">+{{ peso(OCTOBER.income) }}</span>
        ·
        <span class="text-orange-600 dark:text-orange-400">−{{ peso(OCTOBER.expenses) }}</span>
      </p>
    </div>

    <div class="st-rise mt-3 flex h-10 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 80ms">
      <MagnifyingGlass class="size-4 text-gray-400" />
      <span :class="['text-sm', query ? '' : 'text-gray-400']">{{ query || 'Search entries' }}</span>
    </div>

    <TransitionGroup
      tag="ul"
      name="book"
      class="relative mt-3 rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <li
        v-for="(e, i) in rows"
        :key="e.id"
        :class="['st-rise flex items-start gap-2.5 border-b border-l-4 border-b-gray-100 py-2.5 pl-2.5 pr-3 last:border-b-0 dark:border-b-gray-700/60', SPINE[e.dir], i === 0 ? 'rounded-tl-2xl' : '', i === rows.length - 1 ? 'rounded-bl-2xl' : '']"
        :style="{ '--d': `${300 + i * 150}ms` }"
      >
        <span class="w-10 shrink-0 pt-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">{{ e.date }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ e.title }}</span>
          <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ e.line }}</span>
        </span>
        <span class="shrink-0 text-right">
          <span :class="['block text-sm font-semibold tabular-nums', TONE[e.dir]]">{{ SIGN[e.dir] }}{{ amount(e.amount) }}</span>
          <span class="block text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ amount(e.balance) }}</span>
        </span>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.book-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.25s ease;
}
.book-leave-to {
  opacity: 0;
}
.book-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

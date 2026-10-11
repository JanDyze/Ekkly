<script setup>
import { Bank, Coins } from '../../../../icons'
import AppArt from '../../../common/AppArt.vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { OCTOBER, TODAY, TOTAL, peso, useClimb } from './money'

// Scene: what the church has, today. The home's card adds the total up, the
// month so far fills in under it as two bars, and then the two places the
// money is — the tin and the bank — settle in below, as the Accounts section
// lists them.

const { value: total, start: addUp } = useClimb(TOTAL)
const { at } = useSceneTimeline()
at(450, () => addUp(1500))

// The month's bars against the larger of the two, as the home draws them.
const LARGER = Math.max(OCTOBER.income, OCTOBER.expenses)
const bar = (n) => `${Math.round((n / LARGER) * 100)}%`

const PLACES = [
  { icon: Coins, title: 'Cash on hand', detail: 'Last banked Oct 5', value: TODAY.cash },
  { icon: Bank, title: 'Cash in bank', value: TODAY.bank },
]
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise st-filled relative rounded-2xl bg-primary p-4 text-white">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-white/80">Good morning, Liza</p>
          <p class="mt-1 text-[34px] font-bold leading-tight tabular-nums tracking-tight">{{ peso(total) }}</p>
          <p class="mt-2 text-xs text-white/85">{{ peso(TODAY.cash) }} on hand · {{ peso(TODAY.bank) }} in the bank</p>
        </div>
        <!-- The Finances artwork, on white, as the home's card wears it. -->
        <span class="st-pop flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700" style="--d: 200ms">
          <AppArt app-key="finances" :play="1" class="size-9" />
        </span>
      </div>

      <p class="mt-4 mb-1.5 text-xs font-semibold text-white/80">October so far</p>
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <span class="st-grow h-2 rounded-full bg-white" :style="{ width: bar(OCTOBER.income), '--d': '1300ms' }" />
          <span class="shrink-0 text-xs tabular-nums text-white/85">+{{ peso(OCTOBER.income) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="st-grow h-2 rounded-full bg-white/40" :style="{ width: bar(OCTOBER.expenses), '--d': '1450ms' }" />
          <span class="shrink-0 text-xs tabular-nums text-white/85">−{{ peso(OCTOBER.expenses) }}</span>
        </div>
      </div>
    </div>

    <p class="st-rise mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 1900ms">Today</p>
    <div class="mt-1.5 divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700">
      <div
        v-for="(place, i) in PLACES"
        :key="place.title"
        class="st-rise flex items-center gap-3 px-3 py-2.5"
        :style="{ '--d': `${2000 + i * 180}ms` }"
      >
        <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
          <component :is="place.icon" class="size-4.5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{{ place.title }}</span>
          <span v-if="place.detail" class="block text-xs text-gray-500 dark:text-gray-400">{{ place.detail }}</span>
        </span>
        <span class="shrink-0 text-sm font-semibold tabular-nums">{{ peso(place.value) }}</span>
      </div>
      <div class="st-rise flex items-center px-3 py-2.5" style="--d: 2400ms">
        <span class="flex-1 text-sm font-semibold">In all</span>
        <span class="text-base font-bold tabular-nums">{{ peso(TOTAL) }}</span>
      </div>
    </div>
  </div>
</template>

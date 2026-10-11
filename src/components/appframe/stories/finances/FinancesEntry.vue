<script setup>
import { ref } from 'vue'
import { CheckCircle, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { TOTAL, peso } from './money'

// Scene: Sunday's offering, entered. The home's card for a Sunday with
// nothing entered opens a new entry already filled in — money in, the date,
// the statement line, the tin — so all that is left is the amount. It is
// typed, Save is pressed, and the balance it lands on comes back.

const typed = ref('')
const pressed = ref(false)
const saved = ref(false)
const { at, type, still } = useSceneTimeline()

const done = type(typed, '12,850.00', 900, 130)
at(done + 450, () => (pressed.value = true))
at(done + 750, () => (saved.value = true))

const DIRECTIONS = ['Money in', 'Money out', 'Transfer']

// What the card filled in, in the order the sheet asks for it.
const FILLED = [
  { label: 'Description', value: 'Sunday tithes and offering' },
  { label: 'Statement line', value: 'Tithes and Offering · On Site' },
]
</script>

<template>
  <div class="flex h-full flex-col px-4 pt-5">
    <div class="st-rise flex items-center justify-between">
      <p class="text-lg font-semibold">New entry</p>
      <X class="size-5 text-gray-400" />
    </div>

    <!-- Money in is chosen, in the colour money in wears. -->
    <div class="st-rise mt-3 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700" style="--d: 60ms">
      <span
        v-for="(d, i) in DIRECTIONS"
        :key="d"
        :class="[
          'rounded-md py-1.5 text-center text-xs font-medium',
          i === 0 ? 'bg-white text-teal-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-teal-300 dark:ring-gray-700' : 'text-gray-500 dark:text-gray-400',
        ]"
      >
        {{ d }}
      </span>
    </div>

    <div class="st-rise mt-3 grid grid-cols-[1.25fr_1fr] gap-2.5" style="--d: 120ms">
      <div>
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Amount</p>
        <div
          :class="[
            'flex h-9 items-center rounded-lg bg-white px-2.5 text-sm tabular-nums ring-2 dark:bg-gray-800',
            saved ? 'ring-gray-200 dark:ring-gray-700' : 'ring-primary dark:ring-primary-light',
          ]"
        >
          <span class="mr-1 text-gray-400">₱</span>
          <span :class="[typed ? 'font-semibold' : 'text-gray-400', still || saved ? '' : 'st-caret']">{{ typed || '0.00' }}</span>
        </div>
      </div>
      <div>
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Date</p>
        <div class="flex h-9 items-center rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">Sun, Oct 12</div>
      </div>
    </div>

    <div v-for="(f, i) in FILLED" :key="f.label" class="st-rise mt-3" :style="{ '--d': `${180 + i * 60}ms` }">
      <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">{{ f.label }}</p>
      <div class="flex h-9 items-center truncate rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">{{ f.value }}</div>
    </div>

    <div class="st-rise mt-3 grid grid-cols-2 gap-2.5" style="--d: 300ms">
      <div>
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Account</p>
        <div class="flex h-9 items-center rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">Cash on Hand</div>
      </div>
      <div>
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Received from</p>
        <div class="flex h-9 items-center rounded-lg bg-white px-2.5 text-sm text-gray-400 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">Optional</div>
      </div>
    </div>

    <div class="mt-auto pb-5">
      <Transition name="swap" mode="out-in">
        <span
          v-if="!saved"
          key="save"
          :class="['st-rise st-filled relative flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-white', pressed ? 'st-tap bg-primary-hover' : 'bg-primary']"
          style="--d: 400ms"
        >
          Save
        </span>
        <span
          v-else
          key="done"
          class="flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-50 text-sm font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30"
        >
          <CheckCircle class="size-5" />
          In the book · {{ peso(TOTAL) }} in all
        </span>
      </Transition>
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

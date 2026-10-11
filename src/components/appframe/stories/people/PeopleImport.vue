<script setup>
import { onUnmounted, ref } from 'vue'
import { CheckCircle, Table } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: the whole roll at once. Rows from a spreadsheet land in the sheet as
// a paste does, Add is pressed, and the roll's count climbs to take them all:
// a church moving two hundred names out of Excel does it in one go, not one
// person at a time.

const ROWS = [
  ['Ramon', 'Aquino', '1974-02-08'],
  ['Liza', 'Dizon', '1988-11-23'],
  ['Paolo', 'Reyes', '1990-06-30'],
  ['Nina', 'Flores', '2006-01-12'],
  ['Tess', 'Ramos', '1959-09-04'],
  ['Jun', 'Castillo', '1981-04-17'],
]
const ADDED = 86
const FROM = 128

const pressed = ref(false)
const count = ref(FROM)
const saved = ref(false)
const { at, still } = useSceneTimeline()

let frame = 0
const climb = (duration) => {
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration)
    count.value = FROM + Math.round(ADDED * (1 - Math.pow(1 - p, 3)))
    if (p < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

if (still) {
  count.value = FROM + ADDED
  pressed.value = saved.value = true
} else {
  at(2300, () => (pressed.value = true))
  at(2600, () => {
    saved.value = true
    climb(1200)
  })
}

onUnmounted(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="flex h-full flex-col px-4 pt-6">
    <div class="st-rise flex items-center gap-2">
      <Table class="size-5 text-primary dark:text-primary-light" />
      <p class="text-xl font-bold">Add many</p>
    </div>
    <p class="st-rise mt-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">Pasted from Google Sheets</p>

    <div class="st-rise mt-3 rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 120ms">
      <div class="grid grid-cols-[1fr_1fr_1.1fr] gap-2 border-b border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-700">
        <span>First</span><span>Last</span><span>Birthday</span>
      </div>
      <div
        v-for="(row, i) in ROWS"
        :key="row[0]"
        class="st-rise grid grid-cols-[1fr_1fr_1.1fr] gap-2 border-b border-gray-100 px-3 py-2 text-xs last:border-0 dark:border-gray-700/60"
        :style="{ '--d': `${500 + i * 110}ms` }"
      >
        <span class="truncate font-semibold">{{ row[0] }}</span>
        <span class="truncate">{{ row[1] }}</span>
        <span class="tabular-nums text-gray-500 dark:text-gray-400">{{ row[2] }}</span>
      </div>
      <p class="st-rise px-3 py-2 text-center text-[11px] text-gray-400" style="--d: 1250ms">and 80 more rows</p>
    </div>

    <div class="mt-auto pb-5">
      <Transition name="swap" mode="out-in">
        <span
          v-if="!saved"
          key="add"
          :class="['st-rise st-filled relative flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-white', pressed ? 'st-tap bg-primary-hover' : 'bg-primary']"
          style="--d: 1500ms"
        >
          Add {{ ADDED }} people
        </span>
        <span v-else key="done" class="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
          <CheckCircle class="size-5" />
          <span class="tabular-nums">{{ count }}</span> on the roll now
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

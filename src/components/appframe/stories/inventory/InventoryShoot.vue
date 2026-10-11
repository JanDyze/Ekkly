<script setup>
import { ref } from 'vue'
import { CheckCircle } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: snap it, and it stands on its own. A keyboard photographed where it
// stands — the wall, the window, the table under it — the background melts
// away on the phone, and the cut-out and the photo as taken sit side by side
// with the cut-out chosen. Then Save.

const { at } = useSceneTimeline()

const working = ref(false)
const progress = ref(0)
const cut = ref(false)
const choices = ref(false)
const saved = ref(false)

at(500, () => {
  working.value = true
  progress.value = 0.3
})
at(900, () => (progress.value = 0.75))
at(1300, () => (progress.value = 1))
at(1550, () => {
  working.value = false
  cut.value = true
})
at(2400, () => (choices.value = true))
at(3700, () => (saved.value = true))

const KEYS = 14
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">New item</p>

    <!-- The photo. Everything behind the keyboard fades once it is cut out. -->
    <div class="st-rise relative mt-3 h-[190px] rounded-2xl bg-gray-100 dark:bg-gray-800" style="--d: 80ms">
      <div :class="['absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none', cut ? 'opacity-0' : 'opacity-100']" aria-hidden="true">
        <div class="absolute inset-0 rounded-2xl bg-amber-100 dark:bg-amber-950" />
        <div class="absolute left-5 top-4 h-14 w-16 rounded-md bg-sky-200 ring-4 ring-white/70 dark:bg-sky-900 dark:ring-white/10" />
        <div class="absolute inset-x-0 bottom-0 h-[38%] rounded-b-2xl bg-stone-300 dark:bg-stone-700" />
        <div class="absolute inset-x-7 bottom-[33%] h-3 rounded-sm bg-amber-800/50 dark:bg-amber-700/50" />
      </div>

      <!-- The keyboard itself, which stays. -->
      <div class="absolute left-1/2 top-[38%] w-44 -translate-x-1/2 rounded-lg bg-gray-800 px-2 pb-2 pt-2.5 dark:bg-gray-950 dark:ring-1 dark:ring-white/15">
        <div class="mb-1.5 flex items-center gap-1.5">
          <span class="size-1.5 rounded-full bg-emerald-400" />
          <span class="h-1.5 w-8 rounded-full bg-gray-600" />
        </div>
        <div class="flex h-8 gap-[2px]">
          <span v-for="k in KEYS" :key="k" class="flex-1 rounded-b-sm bg-white" />
        </div>
      </div>

      <!-- How far along the cut is. -->
      <div v-if="working" class="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-2.5 ring-1 ring-gray-200 dark:bg-gray-900/90 dark:ring-gray-700">
        <p class="text-xs font-medium">Removing the background…</p>
        <div class="mt-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-full rounded-full bg-primary transition-[width] duration-300 dark:bg-primary-light" :style="{ width: `${progress * 100}%` }" />
        </div>
      </div>
    </div>

    <!-- Both, side by side; the cut-out is the one kept. -->
    <div v-if="choices" class="mt-3 grid grid-cols-2 gap-2.5">
      <div class="st-rise rounded-xl bg-white ring-2 ring-primary dark:bg-gray-800 dark:ring-primary-light">
        <div class="flex h-14 items-center justify-center rounded-t-xl bg-gray-100 dark:bg-gray-700">
          <div class="w-20 rounded bg-gray-800 p-1 dark:bg-gray-950">
            <div class="flex h-3.5 gap-px"><span v-for="k in 10" :key="k" class="flex-1 rounded-b-[1px] bg-white" /></div>
          </div>
        </div>
        <p class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold">
          <CheckCircle class="size-3.5 text-primary dark:text-primary-light" />
          Cut out
        </p>
      </div>
      <div class="st-rise rounded-xl bg-white ring-2 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 90ms">
        <div class="relative flex h-14 items-center justify-center rounded-t-xl bg-amber-100 dark:bg-amber-950">
          <div class="absolute inset-x-0 bottom-0 h-5 bg-stone-300 dark:bg-stone-700" />
          <div class="relative w-20 rounded bg-gray-800 p-1 dark:bg-gray-950">
            <div class="flex h-3.5 gap-px"><span v-for="k in 10" :key="k" class="flex-1 rounded-b-[1px] bg-white" /></div>
          </div>
        </div>
        <p class="px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">As taken</p>
      </div>
    </div>
    <div v-else class="mt-3 h-[90px]" />

    <div class="mt-3 flex justify-end">
      <span
        :class="[
          'st-pop st-filled relative flex h-10 items-center rounded-lg px-5 text-sm font-semibold text-white',
          saved ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
        style="--d: 2600ms"
      >
        Save
      </span>
    </div>
  </div>
</template>

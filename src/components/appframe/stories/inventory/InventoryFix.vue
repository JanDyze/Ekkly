<script setup>
import { ref } from 'vue'
import { CheckCircle, Warning } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryThing from './StoryThing.vue'
import { thing } from './cast'

// Scene: nothing broken is forgotten. The card on the app's home says how
// many things wait for repair and how long the oldest has; under it the list,
// each with what is wrong; the mic comes back fixed and is ticked off.

const BROKEN = [
  { id: 'mic', what: 'Crackles when the volume is up', waited: '5 weeks' },
  { id: 'printer', what: 'Paper jams on every page', waited: '2 weeks' },
  { id: 'speaker', what: 'Right one gives no sound', waited: '4 days' },
]

const { at } = useSceneTimeline()
const fixed = ref(false)
at(2400, () => (fixed.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">Needs repair</p>

    <div
      class="st-rise mt-3 rounded-[22px] border border-amber-300 bg-amber-50 p-3.5 text-amber-950 dark:border-amber-500/50 dark:bg-gray-800 dark:text-white"
      style="--d: 100ms"
    >
      <p class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
        <Warning class="size-3.5" />
        Needs repair
      </p>
      <p class="mt-1.5 text-lg font-bold leading-tight">{{ fixed ? '2 things are broken' : '3 things are broken' }}</p>
      <p class="mt-0.5 text-xs text-amber-800 dark:text-gray-400">{{ fixed ? 'The oldest has waited 2 weeks.' : 'The oldest has waited 5 weeks.' }}</p>
    </div>

    <ul
      class="st-rise mt-3 divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700"
      style="--d: 300ms"
    >
      <li v-for="row in BROKEN" :key="row.id" class="flex items-center gap-3 px-3 py-2.5">
        <StoryThing :thing="thing(row.id)" />
        <span class="min-w-0 flex-1">
          <span :class="['block truncate text-sm font-semibold', fixed && row.id === 'mic' ? 'text-gray-400 line-through dark:text-gray-500' : '']">
            {{ thing(row.id).name }}
          </span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.what }} · {{ row.waited }}</span>
        </span>
        <CheckCircle v-if="fixed && row.id === 'mic'" class="st-pop size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronRight } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: each ministry's list, apart. The open tasks by the ministry each is
// filed under, the most first, with how many are late in amber, and the ones
// filed under none last. Media's lead says two are late, and it is tapped:
// that is the list somebody should be opening this week.

const tapped = ref(false)
const { at } = useSceneTimeline()
at(2600, () => (tapped.value = true))

const MINISTRIES = [
  { name: 'Worship', open: 5, late: 0 },
  { name: 'Media', open: 4, late: 2 },
  { name: 'Ushers', open: 3, late: 0 },
  { name: 'Care', open: 2, late: 1 },
  { name: '', open: 1, late: 0 },
]
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise">
      <p class="text-xl font-bold">By ministry</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">4 ministries</p>
    </div>

    <ul class="mt-3 divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700">
      <li
        v-for="(m, i) in MINISTRIES"
        :key="m.name || 'none'"
        :class="[
          'st-rise relative flex items-center gap-3 px-3.5 py-3',
          i === 0 ? 'rounded-t-2xl' : '',
          i === MINISTRIES.length - 1 ? 'rounded-b-2xl' : '',
          tapped && m.name === 'Media' ? 'st-tap bg-primary/5 text-primary dark:bg-primary-light/10 dark:text-primary-light' : '',
        ]"
        :style="{ '--d': `${150 + i * 170}ms` }"
      >
        <span class="min-w-0 flex-1">
          <span :class="['block text-sm font-semibold', m.name ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400']">
            {{ m.name || 'No ministry' }}
          </span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            {{ plural(m.open, 'open task', 'open tasks') }}<span
              v-if="m.late"
              class="st-pop inline-block font-semibold text-amber-600 dark:text-amber-400"
              :style="{ '--d': `${1300 + i * 120}ms` }"
            >&nbsp;· {{ m.late }} late</span>
          </span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </li>
    </ul>
  </div>
</template>

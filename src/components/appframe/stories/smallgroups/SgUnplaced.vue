<script setup>
import { ref } from 'vue'
import { ChevronRight } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'

// Scene: the members in no group. How many there are counts up first, then
// they arrive under their age bands, the way the section groups them, so
// whoever is placing people sees who would fit the youth group and who the
// adults' one; and a thumb goes to one of them, to invite.

const TOTAL = 12
const count = ref(0)
const tapped = ref(false)
const { at } = useSceneTimeline()
for (let n = 1; n <= TOTAL; n++) at(250 + n * 60, () => (count.value = n))
at(2900, () => (tapped.value = true))

// A few from each band: the section lists all twelve, but a screen holds
// these and no more.
const BANDS = [
  { key: 'youth', label: 'Youth', count: 5, people: ['joan', 'carlo', 'bong'].map(person) },
  { key: 'adults', label: 'Adults', count: 7, people: ['ellen', 'marites'].map(person) },
]
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">Not in a group</p>
    <p class="st-rise mt-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">
      <span class="font-semibold tabular-nums text-gray-700 dark:text-gray-200">{{ count }}</span> of 58 members, not counting kids
    </p>

    <div class="mt-4 flex flex-col gap-4">
      <section v-for="(band, b) in BANDS" :key="band.key" class="st-rise" :style="{ '--d': `${700 + b * 450}ms` }">
        <p class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ band.label }} <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ band.count }}</span>
        </p>
        <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
          <li
            v-for="(p, i) in band.people"
            :key="p.id"
            :class="[
              'st-rise relative flex min-h-12 items-center gap-3 px-4 py-1.5',
              tapped && p.id === 'carlo' ? 'st-tap rounded-none text-primary dark:text-primary-light' : '',
            ]"
            :style="{ '--d': `${800 + b * 450 + i * 90}ms` }"
          >
            <StoryFace :person="p" />
            <span class="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900 dark:text-white">{{ nameOf(p) }}</span>
            <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

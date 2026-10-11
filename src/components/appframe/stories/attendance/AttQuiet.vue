<script setup>
import { ref } from 'vue'
import { ChevronRight, HandWaving } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'

// Scene: the people gone quiet. The home's invitation comes first — how many
// have not been seen in three weeks, said as "Invite them back" — then the
// list behind it, longest away first, and a thumb goes to the first of them.
// Their faces are at full strength: they are missed, not struck off.

const QUIET = [
  { p: person('danilo'), seen: 'Aug 30', weeks: 6 },
  { p: person('lorna'), seen: 'Sep 6', weeks: 5 },
  { p: person('enrico'), seen: 'Sep 13', weeks: 4 },
]

const tapped = ref(false)
const { at } = useSceneTimeline()
at(2900, () => (tapped.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise rounded-[24px] border border-gray-200 bg-white px-4 pb-3.5 pt-3.5 dark:border-gray-700 dark:bg-gray-800">
      <p class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light">
        <HandWaving class="size-4" />
        Invite them back
      </p>
      <p class="mt-1 text-xl font-bold leading-tight tracking-tight">5 people not seen in three weeks</p>
      <p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">Danny, Lorna and 3 others</p>
      <div class="mt-3 flex -space-x-2.5">
        <StoryFace
          v-for="(row, i) in QUIET"
          :key="row.p.id"
          :person="row.p"
          size="st-pop size-9 text-xs ring-2 ring-white dark:ring-gray-800"
          :style="{ '--d': `${400 + i * 90}ms` }"
        />
        <StoryFace :person="person('rodel')" size="st-pop size-9 text-xs ring-2 ring-white dark:ring-gray-800" style="--d: 670ms" />
        <StoryFace :person="person('josefina')" size="st-pop size-9 text-xs ring-2 ring-white dark:ring-gray-800" style="--d: 760ms" />
      </div>
    </div>

    <p class="st-rise mb-1.5 mt-5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 1000ms">
      Longest away first <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">5</span>
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li
        v-for="(row, i) in QUIET"
        :key="row.p.id"
        :class="[
          'st-rise relative flex items-center gap-3 px-4 py-2',
          i === 0 ? 'rounded-t-2xl' : '',
          i === QUIET.length - 1 ? 'rounded-b-2xl' : '',
          tapped && i === 0 ? 'st-tap text-primary dark:text-primary-light' : '',
        ]"
        :style="{ '--d': `${1150 + i * 140}ms` }"
      >
        <StoryFace :person="row.p" size="size-10 text-xs" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ nameOf(row.p) }}</span>
          <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">Last seen {{ row.seen }}</span>
        </span>
        <span class="shrink-0 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">{{ row.weeks }} wk</span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </li>
    </ul>
  </div>
</template>

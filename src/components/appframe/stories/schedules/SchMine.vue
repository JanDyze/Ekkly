<script setup>
import { ref } from 'vue'
import { ChevronRight } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import DateTile from './DateTile.vue'
import { person } from './cast'

// Scene: knowing when you are on. The Schedules home's card that is always
// there says it plainly — you are on this Sunday, as what — with everyone
// serving alongside along its foot; under it, My turns, the next one filled,
// and a thumb opens it.

const WITH = ['joel', 'paolo', 'lea', 'rey', 'grace'].map(person)
const TURNS = [
  { month: 'Oct', day: 18, roles: 'Song leader', line: 'Sunday, October 18' },
  { month: 'Nov', day: 1, roles: 'Backup song leader', line: 'Sunday, November 1' },
  { month: 'Nov', day: 15, roles: 'Song leader', line: 'Sunday, November 15' },
]

const tapped = ref(false)
const { at } = useSceneTimeline()
at(2900, () => (tapped.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise st-filled rounded-[24px] border border-black/15 bg-primary px-4 pb-3 pt-3.5 text-white dark:border-black/40">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <p class="inline-flex max-w-full rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">Good morning, Mica</p>
          <p class="mt-1 truncate text-xl font-bold leading-tight tracking-tight">You’re on this Sunday</p>
          <p class="mt-1 truncate text-sm text-white/75">Song leader · Kapayapaan</p>
        </div>
      </div>
      <div class="mt-3 flex -space-x-2.5">
        <StoryFace
          v-for="(p, i) in WITH"
          :key="p.id"
          :person="p"
          size="st-pop size-9 text-xs ring-2 ring-primary"
          :style="{ '--d': `${500 + i * 90}ms` }"
        />
      </div>
      <p class="st-rise mt-1.5 truncate text-xs text-white/80" style="--d: 1000ms">Joel preaching · Mica leading</p>
    </div>

    <p class="st-rise mb-1.5 mt-5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 1200ms">
      Coming up <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">3</span>
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li
        v-for="(turn, i) in TURNS"
        :key="`${turn.month}${turn.day}`"
        :class="[
          'st-rise relative flex items-center gap-3 px-4 py-2',
          i === 0 ? 'rounded-t-2xl' : '',
          i === TURNS.length - 1 ? 'rounded-b-2xl' : '',
          tapped && i === 0 ? 'st-tap text-primary dark:text-primary-light' : '',
        ]"
        :style="{ '--d': `${1350 + i * 150}ms` }"
      >
        <DateTile :month="turn.month" :day="turn.day" :highlight="i === 0" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ turn.roles }}</span>
          <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ turn.line }}</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
      </li>
    </ul>
  </div>
</template>

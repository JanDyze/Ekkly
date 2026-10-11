<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'

// Scene: the songs and their keys, in order. On the Sunday's own screen, the
// songs come in under the people singing them, one after another as the
// worship leader picks them, each with the key it is sung in that day, so
// the band and the screen both know what is coming.

const SONGS = [
  { id: 'waymaker', title: 'Way Maker', note: 'Start with the bridge', key: 'E' },
  { id: 'goodness', title: 'Goodness of God', note: '', key: 'A' },
  { id: 'ikaw', title: 'Ikaw Lamang', note: 'Acoustic, then full band', key: 'D' },
]

const shown = ref(0)
const { at } = useSceneTimeline()
SONGS.forEach((_, i) => at(1000 + i * 700, () => (shown.value = i + 1)))

const mica = person('mica')
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">Sunday, October 18</p>
    <p class="st-rise mt-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">Kapayapaan · 9 serving</p>

    <section class="st-rise mt-4" style="--d: 150ms">
      <div class="mb-1.5 flex items-end justify-between px-1">
        <p class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Worship</p>
        <span class="text-sm font-semibold text-primary dark:text-primary-light">Plan</span>
      </div>
      <div class="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <span class="flex size-11 shrink-0 items-center justify-center">
          <StoryFace :person="mica" size="size-10 text-xs" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug">{{ nameOf(mica) }}</span>
          <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">Song leader</span>
        </span>
      </div>
    </section>

    <section class="st-rise mt-5" style="--d: 300ms">
      <p class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Songs <span v-if="shown" class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ shown }}</span>
      </p>
      <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
        <li v-if="!shown" class="flex min-h-14 items-center px-4 text-[15px] text-gray-400 dark:text-gray-500">No songs chosen yet</li>
        <li v-for="(s, i) in SONGS.slice(0, shown)" :key="s.id" class="st-rise flex min-h-14 items-center gap-3 px-4 py-2" style="--d: 0ms">
          <span class="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ i + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-medium leading-snug">{{ s.title }}</span>
            <span v-if="s.note" class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ s.note }}</span>
          </span>
          <span class="st-pop shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200" style="--d: 250ms">
            {{ s.key }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { MagnifyingGlass } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryThing from './StoryThing.vue'
import { THINGS } from './cast'

// Scene: everything the church owns. The list arrives under its categories,
// each thing with its picture and where it is kept; someone types "mic" and
// it narrows to the four wireless mics in the sound booth.

const query = ref('')
const { type, still } = useSceneTimeline()
type(query, 'mic', 1700, 200)

// As many rows as the screen holds: the list is longer than one screen, as a
// real one is, and the rest would spill under the screen's foot.
const FITS = 5

const groups = computed(() => {
  const q = query.value.toLowerCase()
  const shown = THINGS.filter((t) => !q || t.name.toLowerCase().includes(q)).slice(0, FITS)
  const byCategory = new Map()
  for (const t of shown) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, [])
    byCategory.get(t.category).push(t)
  }
  return [...byCategory.entries()].map(([name, things]) => ({ name, things }))
})

const lineOf = (t) => [t.place, t.count ? `${t.count} in all` : ''].filter(Boolean).join(' · ')
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">All items</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">86 items</p>
    </div>

    <div class="st-rise mt-3 flex h-10 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 80ms">
      <MagnifyingGlass class="size-4 text-gray-400" />
      <span :class="['text-sm', query ? '' : 'text-gray-400', still ? '' : 'st-caret']">{{ query || 'Search — a name, a place' }}</span>
    </div>

    <div class="mt-3 flex flex-col gap-3">
      <section v-for="(group, g) in groups" :key="group.name" class="st-rise" :style="{ '--d': `${160 + g * 120}ms` }">
        <p class="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ group.name }} <span class="ml-0.5 tabular-nums text-gray-400 dark:text-gray-500">{{ group.things.length }}</span>
        </p>
        <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700">
          <li v-for="t in group.things" :key="t.id" class="flex items-center gap-3 px-3 py-1.5">
            <StoryThing :thing="t" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ t.name }}</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ lineOf(t) }}</span>
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

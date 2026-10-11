<script setup>
import { ref } from 'vue'
import { BookmarkSimple, Check } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { MEMORY_VERSE, person } from './cast'

// Scene: a lesson a teacher can follow. What the children should leave
// knowing, the memory verse, and what to bring, ticked off one by one as the
// teacher packs the bag on Saturday night.

const carla = person('carla')
const BRING = ['A cardboard tree', 'Crayons and paper', 'Bread for snack time']
const packed = ref(0)
const { at } = useSceneTimeline()
BRING.forEach((_, i) => at(2000 + i * 500, () => (packed.value = i + 1)))
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold leading-tight">Zacchaeus climbs a tree</p>
    <div class="st-rise mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">
      <StoryFace :person="carla" size="size-5 text-[8px]" />
      Little Lambs · Carla teaching
    </div>

    <div class="st-rise mt-3 rounded-2xl bg-primary/5 px-3.5 py-3 ring-1 ring-primary/15 dark:bg-primary-light/10 dark:ring-primary-light/20" style="--d: 200ms">
      <p class="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">They should leave knowing</p>
      <p class="mt-1 text-sm font-semibold leading-snug">Jesus wants to be friends with people others leave out.</p>
    </div>

    <div class="st-rise mt-3 flex gap-2.5 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 600ms">
      <BookmarkSimple class="mt-0.5 size-4 shrink-0 text-primary dark:text-primary-light" />
      <span class="min-w-0">
        <span class="block text-sm leading-snug">“{{ MEMORY_VERSE.text }}”</span>
        <span class="mt-1 block text-xs font-semibold text-primary dark:text-primary-light">{{ MEMORY_VERSE.reference }} KJV</span>
      </span>
    </div>

    <p class="st-rise mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 1100ms">What to bring</p>
    <ul class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="(item, i) in BRING"
        :key="item"
        class="st-rise flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        :style="{ '--d': `${1250 + i * 120}ms` }"
      >
        <span
          :class="[
            'flex size-5 shrink-0 items-center justify-center rounded-md',
            packed > i ? 'st-pop st-filled bg-primary text-white' : 'ring-1 ring-gray-300 dark:ring-gray-600',
          ]"
        >
          <Check v-if="packed > i" class="size-3.5" />
        </span>
        <span :class="['min-w-0 truncate text-sm', packed > i ? 'text-gray-400 line-through dark:text-gray-500' : '']">{{ item }}</span>
      </li>
    </ul>
  </div>
</template>

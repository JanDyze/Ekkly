<script setup>
import { ref } from 'vue'
import { Check, Microphone } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { CLASSES, person } from './cast'

// Scene: Sunday, ready before Sunday. The coming message arrives in the
// church's colour, then each class with its teacher and whether its lesson is
// in. The last one is still missing, until its teacher's plan lands and it
// turns ready too: the whole Sunday's teaching, checked at a glance.

const ben = person('ben')
const youthReady = ref(false)
const { at } = useSceneTimeline()
at(2700, () => (youthReady.value = true))

const ready = (cls) => cls.id !== 'youth' || youthReady.value
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">This Sunday</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">October 19</p>
    </div>

    <div class="st-pop st-filled relative mt-3 rounded-2xl bg-primary p-4 text-white" style="--d: 150ms">
      <p class="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-1 text-xs font-semibold">
        <Microphone class="size-3.5" />
        The message
      </p>
      <p class="mt-2 text-lg font-bold leading-tight">The man in the tree</p>
      <div class="mt-2 flex items-center gap-2">
        <StoryFace :person="ben" size="size-6 text-[9px] ring-2 ring-white/70" />
        <span class="truncate text-sm text-white/80">Ben preaching · Luke 19:1-10</span>
      </div>
    </div>

    <p class="st-rise mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400" style="--d: 600ms">Sunday school</p>
    <ul class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="(cls, i) in CLASSES"
        :key="cls.id"
        class="st-rise flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        :style="{ '--d': `${750 + i * 160}ms` }"
      >
        <StoryFace :person="person(cls.teacher)" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">{{ cls.name }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ cls.ages }}</span>
        </span>
        <span
          v-if="ready(cls)"
          :key="`ready-${cls.id}-${ready(cls)}`"
          class="st-pop flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          :style="{ '--d': cls.id === 'youth' ? '0ms' : `${1100 + i * 160}ms` }"
        >
          <Check class="size-3.5" />
          Ready
        </span>
        <span
          v-else
          class="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        >
          No lesson
        </span>
      </li>
    </ul>
  </div>
</template>

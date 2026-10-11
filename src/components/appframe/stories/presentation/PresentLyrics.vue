<script setup>
import { computed, ref } from 'vue'
import { Music2 } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PresentWall from './PresentWall.vue'
import { SLIDES, SLIDE_COUNT, SONG } from './hymn'

// Scene: the words on the wall, a slide at a time. The song's slides are
// listed under what is on screen; Next is pressed as the band sings, the live
// slide moves down the list in green, and the wall follows it a line ahead
// of the congregation.

const live = ref(-1)
const tapping = ref(false)
const { at } = useSceneTimeline()

at(600, () => (live.value = 0))
const next = (ms, to) => {
  at(ms, () => (tapping.value = true))
  at(ms + 250, () => {
    tapping.value = false
    live.value = to
  })
}
next(1700, 1)
next(2900, 2)

const lines = computed(() => SLIDES[live.value]?.lines || [])
</script>

<template>
  <div class="px-4 pt-5">
    <div class="st-rise flex items-center gap-1.5">
      <p class="flex-1 text-xs font-bold text-gray-500 dark:text-gray-400">On screen</p>
      <span class="rounded-xl bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">Previous</span>
      <span :class="['st-filled relative rounded-xl px-3 py-1.5 text-[11px] font-bold text-white', tapping ? 'st-tap bg-primary-hover' : 'bg-primary']">Next</span>
    </div>

    <div class="st-rise mt-2" style="--d: 80ms">
      <PresentWall :lines="lines" />
    </div>

    <p class="st-rise mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400" style="--d: 160ms">
      <Music2 class="size-3" />
      {{ SONG }}
      <span class="font-medium normal-case">· {{ SLIDE_COUNT }} slides</span>
    </p>

    <div class="mt-1.5 flex flex-col gap-1.5">
      <div
        v-for="(slide, i) in SLIDES"
        :key="i"
        :class="[
          'st-rise rounded-xl border-2 px-2.5 py-1.5 transition-colors duration-300',
          i === live ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        ]"
        :style="{ '--d': `${240 + i * 100}ms` }"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wide text-primary dark:text-primary-light">
            {{ slide.label }} <span class="ml-0.5 font-medium text-gray-400">{{ slide.part }}</span>
          </span>
          <span v-if="i === live" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">LIVE</span>
        </div>
        <p v-for="line in slide.lines" :key="line" class="truncate text-[11px] leading-snug text-gray-700 dark:text-gray-200">{{ line }}</p>
      </div>
    </div>
  </div>
</template>

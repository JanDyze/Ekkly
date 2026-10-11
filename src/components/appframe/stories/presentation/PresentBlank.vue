<script setup>
import { computed, ref } from 'vue'
import { HandsPraying } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PresentBar from './PresentBar.vue'
import PresentWall from './PresentWall.vue'
import { SLIDES } from './hymn'

// Scene: a clear screen for the prayer. The song is on the wall; Blank is
// pressed and the wall goes dark while the pastor prays. Unblank brings back
// the very slide it left, so nobody hunts for it — blanking is a toggle
// because that slide is always what is wanted next.

const blanked = ref(false)
const tapping = ref(false)
const { at } = useSceneTimeline()

const press = (ms, to) => {
  at(ms, () => (tapping.value = true))
  at(ms + 250, () => {
    tapping.value = false
    blanked.value = to
  })
}
press(1200, true)
press(3200, false)

const SLIDE = SLIDES[1]
const lines = computed(() => (blanked.value ? [] : SLIDE.lines))
</script>

<template>
  <div>
    <PresentBar :slides="26" live :blanked="blanked" :tap-blank="tapping" />

    <div class="px-4 pt-3">
      <p class="st-rise text-xs font-bold text-gray-500 dark:text-gray-400" style="--d: 80ms">On screen</p>
      <div class="st-rise mt-2" style="--d: 120ms">
        <PresentWall :lines="lines" />
      </div>

      <div class="mt-3 h-9">
        <Transition name="note" mode="out-in">
          <p v-if="blanked" key="prayer" class="flex h-9 items-center gap-2 rounded-xl bg-gray-100 px-3 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <HandsPraying class="size-4 shrink-0" />
            Nothing on the wall while the pastor prays
          </p>
          <p v-else key="keys" class="st-rise flex h-9 items-center px-1 text-[11px] text-gray-400" style="--d: 200ms">
            B blanks and unblanks · Arrows advance
          </p>
        </Transition>
      </div>

      <div
        :class="[
          'st-rise mt-2 rounded-xl border-2 px-2.5 py-1.5 transition-colors duration-300',
          blanked ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800' : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
        ]"
        style="--d: 240ms"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wide text-primary dark:text-primary-light">
            {{ SLIDE.label }} <span class="ml-0.5 font-medium text-gray-400">{{ SLIDE.part }}</span>
          </span>
          <span v-if="!blanked" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">LIVE</span>
        </div>
        <p v-for="line in SLIDE.lines" :key="line" class="truncate text-[11px] leading-snug text-gray-700 dark:text-gray-200">{{ line }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-enter-active,
.note-leave-active {
  transition: opacity 0.2s ease;
}
.note-enter-from,
.note-leave-to {
  opacity: 0;
}
</style>

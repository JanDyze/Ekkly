<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import RecorderHead from './RecorderHead.vue'
import { person, nameOf } from './cast'

// Scene: the swipe deck, for a roll too long to scroll. One face at a time:
// a thumb leans the card right and Present stamps across it, or left for Not
// yet, someone to come back to when the latecomers are in. The header keeps
// the count either way, as AttendanceSwipe does.

const DECK = ['josefina', 'rodel', 'angelica', 'enrico', 'lorna'].map(person)
// Right, left, right: Rodel is not in yet, and comes round again later.
const CALLS = ['present', 'skip', 'present']
const BEFORE = 36
const TO_GO = 12

const index = ref(0)
const phase = ref('rest')
const passed = ref(0)
const marked = ref(0)
const { at } = useSceneTimeline()

CALLS.forEach((call, i) => {
  const start = 900 + i * 1100
  at(start, () => (phase.value = call === 'present' ? 'lean-right' : 'lean-left'))
  at(start + 380, () => (phase.value = call === 'present' ? 'fly-right' : 'fly-left'))
  at(start + 760, () => {
    if (call === 'present') marked.value++
    else passed.value++
    index.value++
    phase.value = 'rest'
  })
})

const current = computed(() => DECK[index.value])
const upNext = computed(() => DECK[index.value + 1])
const leaning = computed(() => (phase.value.endsWith('right') ? 'present' : phase.value.endsWith('left') ? 'skip' : ''))

// Where the top card is in its throw: resting, leaning under the thumb, or
// gone toward the side it was thrown to. It fades where it is rather than
// flying clear, because a card thrown off would cross the edge of the screen.
const CARD = {
  rest: 'translate-x-0 rotate-0 opacity-100',
  'lean-right': 'translate-x-6 rotate-3 opacity-100',
  'lean-left': '-translate-x-6 -rotate-3 opacity-100',
  'fly-right': 'translate-x-8 rotate-6 scale-90 opacity-0',
  'fly-left': '-translate-x-8 -rotate-6 scale-90 opacity-0',
}
</script>

<template>
  <div class="flex h-full flex-col">
    <RecorderHead class="st-rise" title="Sunday Service" date="Sun, Oct 11" :present="BEFORE + marked" :expected="48" />

    <p class="st-rise px-4 pb-1 pt-2 text-center text-xs text-gray-500 dark:text-gray-400" style="--d: 100ms">
      <span class="font-bold tabular-nums text-gray-900 dark:text-white">{{ TO_GO - index }}</span> to go
      <span v-if="passed" class="text-gray-400 dark:text-gray-500"> · {{ passed }} to come back to</span>
    </p>

    <div class="st-rise relative mx-auto mt-2 h-[224px] w-[200px]" style="--d: 200ms">
      <!-- Who is next, waiting behind the card being decided. -->
      <div
        v-if="upNext"
        :key="`next-${upNext.id}`"
        class="absolute inset-0 flex scale-95 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800"
      >
        <StoryFace :person="upNext" size="size-16 text-lg" />
        <p class="text-sm font-bold leading-tight text-gray-500 dark:text-gray-400">{{ nameOf(upNext) }}</p>
        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">Up next</p>
      </div>

      <div
        v-if="current"
        :key="`card-${current.id}`"
        :class="[
          'card-throw absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800',
          CARD[phase],
        ]"
      >
        <!-- The verdict, stamped across the card while it is thrown. -->
        <span
          v-if="leaning"
          :class="[
            'st-pop absolute left-1/2 top-6 z-10 -ml-[64px] w-32 rounded-xl border-4 py-1.5 text-center text-base font-black uppercase tracking-widest',
            leaning === 'present'
              ? '-rotate-12 border-emerald-500 bg-emerald-50/90 text-emerald-500 dark:bg-emerald-500/10'
              : 'border-gray-400 bg-gray-50/90 text-gray-500 dark:bg-gray-700/60 dark:text-gray-300',
          ]"
          style="--d: 0ms"
        >
          {{ leaning === 'present' ? 'Present' : 'Not yet' }}
        </span>
        <StoryFace :person="current" size="size-20 text-2xl" />
        <div>
          <p class="text-lg font-bold leading-tight text-gray-900 dark:text-white">{{ nameOf(current) }}</p>
          <p v-if="current.nickname" class="mt-1 text-sm text-gray-500 dark:text-gray-400">“{{ current.nickname }}”</p>
        </div>
      </div>
    </div>

    <div class="st-rise mt-4 flex items-center justify-center gap-3" style="--d: 300ms">
      <span
        :class="[
          'relative flex size-14 items-center justify-center rounded-full border-2 border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400',
          leaning === 'skip' ? 'st-tap' : '',
        ]"
      >
        <X class="size-6" />
      </span>
      <span class="flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 dark:border-gray-600 dark:text-gray-500">
        <RotateCcw class="size-4" />
      </span>
      <span
        :class="[
          'relative flex size-14 items-center justify-center rounded-full border-2 border-emerald-200 text-emerald-500 dark:border-emerald-500/30',
          leaning === 'present' ? 'st-tap' : '',
        ]"
      >
        <Check class="size-6" />
      </span>
    </div>
    <p class="st-rise mt-2 flex items-center justify-center gap-4 text-[11px] text-gray-400 dark:text-gray-500" style="--d: 360ms">
      <span class="flex items-center gap-1"><ArrowLeft class="size-3" /> Not yet</span>
      <span class="flex items-center gap-1">Present <ArrowRight class="size-3" /></span>
    </p>
  </div>
</template>

<style scoped>
.card-throw {
  transition:
    transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.38s ease;
}
@media (prefers-reduced-motion: reduce) {
  .card-throw {
    transition: none;
  }
}
</style>

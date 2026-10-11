<script setup>
import { computed, ref } from 'vue'
import { CheckCircle } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryThing from './StoryThing.vue'
import { thing } from './cast'

// Scene: what is out, and what is late. Borrowed opens with the late one
// first, in red; a thumb on Back; it leaves the list, and a word says it is
// back.

const LOANS = [
  { id: 'projector', who: 'Mark Villanueva', when: '3 days late', state: 'late' },
  { id: 'tables', who: 'Joy Bautista · 10 of 20', when: 'Due Sunday', state: 'soon' },
  { id: 'reel', who: 'Ben Santos', when: 'Due Sunday', state: 'soon' },
  { id: 'guitar', who: 'Ella Garcia', when: 'Due in 3 weeks', state: 'out' },
]

const GROUPS = [
  { state: 'late', label: 'Not back yet' },
  { state: 'soon', label: 'Due this week' },
  { state: 'out', label: 'Out' },
]

const { at } = useSceneTimeline()
const tapped = ref(false)
const back = ref(false)
at(1800, () => (tapped.value = true))
at(2300, () => (back.value = true))

const groups = computed(() =>
  GROUPS.map((g) => ({ ...g, rows: LOANS.filter((l) => l.state === g.state && !(back.value && l.id === 'projector')) })).filter(
    (g) => g.rows.length
  )
)
</script>

<template>
  <div class="relative h-full px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Borrowed</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ back ? '3 out' : '4 out · 1 late' }}</p>
    </div>

    <TransitionGroup tag="div" name="loans" class="relative mt-3 flex flex-col gap-3">
      <section v-for="(group, g) in groups" :key="group.state" class="st-rise" :style="{ '--d': `${120 + g * 120}ms` }">
        <p class="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ group.label }} <span class="ml-0.5 tabular-nums text-gray-400 dark:text-gray-500">{{ group.rows.length }}</span>
        </p>
        <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700">
          <li v-for="row in group.rows" :key="row.id" class="flex items-center gap-3 px-3 py-2">
            <StoryThing :thing="thing(row.id)" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ thing(row.id).name }}</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                {{ row.who }} ·
                <span :class="row.state === 'late' ? 'font-semibold text-red-600 dark:text-red-400' : ''">{{ row.when }}</span>
              </span>
            </span>
            <span
              v-if="row.state === 'late'"
              :class="[
                'relative flex h-8 shrink-0 items-center rounded-lg bg-primary/10 px-2.5 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light',
                tapped ? 'st-tap' : '',
              ]"
            >
              Back
            </span>
          </li>
        </ul>
      </section>
    </TransitionGroup>

    <p
      v-if="back"
      class="st-pop absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white dark:bg-white dark:text-gray-900"
    >
      <CheckCircle class="size-4" />
      Projector is back
    </p>
  </div>
</template>

<style scoped>
.loans-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.25s ease;
}
.loans-leave-to {
  opacity: 0;
}
.loans-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .loans-leave-active,
  .loans-move {
    transition: none;
  }
}
</style>

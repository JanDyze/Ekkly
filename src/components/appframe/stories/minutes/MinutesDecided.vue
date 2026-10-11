<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, MagnifyingGlass, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: "when did we agree to that?" Decisions gathers what every written-up
// meeting settled, under the meeting that settled it. "mixer" is typed, and
// the two decisions about the sound system come together from meetings two
// months apart, which used to mean opening every set of minutes in between.

const GROUPS = [
  {
    id: 'oct',
    heading: 'Church council · Oct 4',
    decisions: [
      { topic: 'Christmas outreach', text: '₱18,000 from the outreach fund for 120 gift packs.' },
      { topic: 'Sound system', text: 'Buy a new mixer, up to ₱35,000, after three quotes.' },
    ],
  },
  {
    id: 'sep',
    heading: 'Finance committee · Sep 20',
    decisions: [{ topic: 'Building fund', text: 'Open a separate bank account for the building fund.' }],
  },
  {
    id: 'aug',
    heading: 'Church council · Aug 2',
    decisions: [{ topic: 'Sound system', text: 'Daniel Cruz looks at the old mixer before we buy.' }],
  },
]

// As many meetings as the screen holds before the search narrows them: the
// list is longer than one screen, as a real one is, and the rest would spill
// out under the screen's foot.
const FITS = 2

const query = ref('')
const { type, still } = useSceneTimeline()
type(query, 'mixer', 1500, 170)

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return GROUPS.slice(0, FITS)
  return GROUPS.map((g) => ({
    ...g,
    decisions: g.decisions.filter((d) => `${d.topic} ${d.text}`.toLowerCase().includes(q)),
  }))
    .filter((g) => g.decisions.length)
    .slice(0, FITS)
})
</script>

<template>
  <div class="px-4 pt-5">
    <div class="st-rise flex items-center gap-2">
      <span class="-ml-1 flex size-9 items-center justify-center rounded-full text-gray-600 dark:text-gray-300"><ArrowLeft class="size-5" /></span>
      <span class="min-w-0">
        <span class="block text-xl font-bold leading-tight">Decisions</span>
        <span class="block text-xs text-gray-500 dark:text-gray-400">48 decisions</span>
      </span>
    </div>

    <div class="st-rise relative mt-3 flex h-11 items-center rounded-xl border border-gray-200 bg-white pl-9.5 pr-10 text-sm dark:border-gray-700 dark:bg-gray-800" style="--d: 80ms">
      <MagnifyingGlass class="absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
      <span :class="[query ? '' : 'text-gray-400', still ? '' : 'st-caret']">{{ query || 'Search what was decided' }}</span>
      <X v-if="query" class="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
    </div>

    <TransitionGroup tag="div" name="decided" class="relative mt-4 flex flex-col gap-4">
      <section v-for="(g, i) in shown" :key="g.id" class="st-rise" :style="{ '--d': `${160 + i * 120}ms` }">
        <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ g.heading }}
          <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ g.decisions.length }}</span>
        </h2>
        <div class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
          <p v-for="d in g.decisions" :key="d.text" class="flex flex-col gap-0.5 px-4 py-2.5">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ d.topic }}</span>
            <span class="text-sm font-medium leading-snug">{{ d.text }}</span>
          </p>
        </div>
      </section>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.decided-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.25s ease;
}
.decided-leave-to {
  opacity: 0;
}
.decided-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { CheckCircle, Copy, MagnifyingGlass } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { CLASSES } from './cast'

// Scene: a good lesson taught again. The library is searched for last year's
// lesson, it is found as the search narrows, Teach this again is pressed, a
// class is chosen, and it lands on that class's Sunday — a copy, so last
// year's stays as it was taught.

const PLANS = [
  { id: 'zac', title: 'Zacchaeus climbs a tree', where: 'Explorers · Oct 2025' },
  { id: 'david', title: 'David and the giant', where: 'Little Lambs · Aug 2025' },
  { id: 'lamp', title: 'A lamp for my feet', where: 'In the library' },
  { id: 'sower', title: 'The sower and the seed', where: 'Youth · Jun 2025' },
]

const query = ref('')
const pressed = ref(false)
const chosen = ref('')
const done = ref(false)
const { at, type, still } = useSceneTimeline()

const typed = type(query, 'Zacc', 700, 140)
at(typed + 600, () => (pressed.value = true))
at(typed + 1100, () => (chosen.value = 'lambs'))
at(typed + 1800, () => (done.value = true))

const rows = computed(() => {
  const q = query.value.toLowerCase()
  return PLANS.filter((p) => !q || p.title.toLowerCase().includes(q))
})
</script>

<template>
  <div class="flex h-full flex-col px-4 pt-6">
    <p class="st-rise text-xl font-bold">Lesson plans</p>

    <div class="st-rise mt-3 flex h-10 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 80ms">
      <MagnifyingGlass class="size-4 text-gray-400" />
      <span :class="['text-sm', query ? '' : 'text-gray-400', still || pressed ? '' : 'st-caret']">{{ query || 'Search by title or passage' }}</span>
    </div>

    <TransitionGroup tag="ul" name="plans" class="relative mt-3 flex flex-col gap-1.5">
      <li
        v-for="(plan, i) in rows"
        :key="plan.id"
        class="st-rise rounded-2xl bg-white px-3 py-2.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        :style="{ '--d': `${160 + i * 70}ms` }"
      >
        <span class="block truncate text-sm font-semibold">{{ plan.title }}</span>
        <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ plan.where }}</span>
      </li>
    </TransitionGroup>

    <div v-if="pressed" class="st-rise mt-3 rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <p class="flex items-center gap-1.5 text-sm font-semibold">
        <Copy class="size-4 text-primary dark:text-primary-light" />
        Teach this again
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Which class, on Sunday, October 19</p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="cls in CLASSES"
          :key="cls.id"
          :class="[
            'relative rounded-full px-2.5 py-1 text-xs font-semibold',
            chosen === cls.id ? 'st-tap st-filled bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
          ]"
        >
          {{ cls.name }}
        </span>
      </div>
    </div>

    <div
      v-if="done"
      class="st-pop mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
    >
      <CheckCircle class="size-5 shrink-0" />
      Planned for Little Lambs
    </div>
  </div>
</template>

<style scoped>
.plans-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.25s ease;
}
.plans-leave-to {
  opacity: 0;
}
.plans-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

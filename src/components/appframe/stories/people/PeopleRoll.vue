<script setup>
import { computed, ref } from 'vue'
import { MagnifyingGlass } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { CAST, nameOf } from './cast'

// Scene: everyone in one place. The roll arrives, someone types "an" into the
// search, it narrows as they type, and they tap the one they wanted.

const query = ref('')
const tapped = ref(false)
const { at, type, still } = useSceneTimeline()

const done = type(query, 'Ana', 1300, 160)
at(done + 500, () => (tapped.value = true))

// As many rows as the screen holds, never more: the roll is longer than one
// screen, as a real one is, and the rest would spill out under the screen's
// foot before the search narrows it.
const FITS = 5

const rows = computed(() => {
  const q = query.value.toLowerCase()
  return CAST.filter((p) => !q || nameOf(p).toLowerCase().includes(q)).slice(0, FITS)
})
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Everyone</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">214 people</p>
    </div>

    <div class="st-rise mt-3 flex h-10 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 80ms">
      <MagnifyingGlass class="size-4 text-gray-400" />
      <span :class="['text-sm', query ? '' : 'text-gray-400', still ? '' : 'st-caret']">{{ query || 'Search the roll' }}</span>
    </div>

    <TransitionGroup tag="ul" name="roll" class="relative mt-3 flex flex-col gap-1.5">
      <li
        v-for="(p, i) in rows"
        :key="p.id"
        :class="[
          'st-rise relative flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 dark:bg-gray-800',
          tapped && p.id === 'ana' ? 'st-tap text-primary ring-primary dark:text-primary-light dark:ring-primary-light' : 'ring-gray-200 dark:ring-gray-700',
        ]"
        :style="{ '--d': `${160 + i * 70}ms` }"
      >
        <StoryFace :person="p" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ nameOf(p) }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ p.member ? 'Member' : 'Attendee' }} · {{ p.ministry }}</span>
        </span>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.roll-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.25s ease;
}
.roll-leave-to {
  opacity: 0;
}
.roll-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

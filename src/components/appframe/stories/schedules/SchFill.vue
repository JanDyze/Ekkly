<script setup>
import { ref } from 'vue'
import { MagnifyingGlass, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'

// Scene: a role filled in two taps. A Sunday's worship team has no song
// leader yet, in amber; the row is tapped, the people who lead songs come up
// in the picker — anyone already on another role that Sunday flagged, so
// nobody is put on twice by accident — and Mica is picked.

const mica = person('mica')
const band = [person('paolo'), person('lea')]
const PICKER = [
  { p: person('mica'), line: 'Song Leader' },
  { p: person('rey'), also: 'Ushers' },
  { p: person('grace'), line: 'Song Leader' },
]

const asking = ref(false)
const picking = ref(false)
const filled = ref(false)
const { at } = useSceneTimeline()
at(1200, () => (asking.value = true))
at(1500, () => (picking.value = true))
at(2900, () => {
  picking.value = false
  filled.value = true
})
</script>

<template>
  <div class="relative h-full">
    <div class="px-4 pt-6">
      <p class="st-rise text-xl font-bold">Sunday, October 25</p>
      <p class="st-rise mt-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">Pag-ibig · 7 serving</p>

      <section class="st-rise mt-4" style="--d: 150ms">
        <div class="mb-1.5 flex items-end justify-between px-1">
          <p class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Worship</p>
          <span class="text-sm font-semibold text-primary dark:text-primary-light">Plan</span>
        </div>
        <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
          <li :class="['relative flex min-h-14 items-center gap-3 rounded-t-2xl px-4 py-2.5', asking && !filled ? 'st-tap text-amber-600 dark:text-amber-400' : '']">
            <span class="flex size-11 shrink-0 items-center justify-center">
              <StoryFace v-if="filled" :person="mica" size="st-pop size-10 text-xs" style="--d: 0ms" />
              <span v-else class="size-9 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600" />
            </span>
            <span class="min-w-0 flex-1">
              <span :class="['block truncate text-[15px] font-medium leading-snug', filled ? 'text-gray-900 dark:text-white' : 'text-amber-700 dark:text-amber-400']">
                {{ filled ? nameOf(mica) : 'Nobody yet' }}
              </span>
              <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">Song leader</span>
            </span>
          </li>
          <li class="flex min-h-14 items-center gap-3 rounded-b-2xl px-4 py-2.5">
            <span class="flex size-11 shrink-0 items-center justify-center">
              <span class="flex -space-x-3.5">
                <StoryFace v-for="p in band" :key="p.id" :person="p" size="size-8 text-[10px] ring-2 ring-white dark:ring-gray-800" />
              </span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">Paolo Cruz, Lea Navarro</span>
              <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">Band</span>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- The picker, over the Sunday, from the foot of the screen. -->
    <template v-if="picking">
      <div class="sheet-dim absolute inset-0 rounded-[28px] bg-black/50" />
      <div class="sheet-up absolute inset-x-0 bottom-0 flex flex-col rounded-[28px] border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <span class="min-w-0">
            <span class="block truncate text-base font-semibold">Song leader</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">Pick one person</span>
          </span>
          <X class="size-5 shrink-0 text-gray-400" />
        </div>
        <div class="px-4 pb-2 pt-3">
          <div class="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-800">
            <MagnifyingGlass class="size-4" />
            Name or ministry
          </div>
        </div>
        <ul class="px-2 pb-4">
          <li
            v-for="(row, i) in PICKER"
            :key="row.p.id"
            :class="[
              'relative flex items-center gap-3 rounded-xl px-2 py-2',
              i === 0 ? 'pick-tap' : '',
            ]"
          >
            <StoryFace :person="row.p" size="size-8 text-[10px]" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium">{{ nameOf(row.p) }}</span>
              <span v-if="row.also" class="block truncate text-xs font-semibold text-amber-600 dark:text-amber-400">Also {{ row.also }}</span>
              <span v-else class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.line }}</span>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The picker comes up from the screen's foot, never from below it: it starts
   where it ends and only fades and settles, so it never crosses the edge. */
.sheet-up {
  transform-origin: bottom;
  animation: sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.sheet-dim {
  animation: sheet-dim 0.3s ease-out both;
}
/* Mica's row, pressed, a beat before the picker closes on her. */
.pick-tap {
  animation: pick-tap 0.5s ease-out 0.9s both;
}
@keyframes sheet-up {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
}
@keyframes sheet-dim {
  from {
    opacity: 0;
  }
}
@keyframes pick-tap {
  0%,
  100% {
    background-color: transparent;
  }
  40% {
    background-color: color-mix(in oklab, var(--color-primary) 14%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sheet-up,
  .sheet-dim,
  .pick-tap {
    animation: none;
  }
}
</style>

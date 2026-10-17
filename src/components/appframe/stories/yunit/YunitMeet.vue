<script setup>
import { ref } from 'vue'
import { CalendarBlank, CheckSquare, ClipboardText, PaperPlaneRight, User } from '../../../../icons'
import YunitMascot from '../../../yunit/YunitMascot.vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import YunitName from '../../../yunit/YunitWordmark.vue'

// Scene: meeting him. YUNIT's page before anything is said: him, large, a
// wave once he has arrived, what he is for, and four ways to start for
// someone who does not know what to ask. A thumb goes to Overdue tasks, and
// he nods: a question asked in one tap.

const mascot = ref(null)
const tapped = ref(false)
const { at, still } = useSceneTimeline()
if (!still) {
  at(900, () => mascot.value?.play('wave'))
  at(2700, () => mascot.value?.play('nod'))
}
at(2600, () => (tapped.value = true))

// The page's own four, by their short labels.
const STARTERS = [
  { icon: CalendarBlank, label: 'This Sunday' },
  { icon: User, label: 'Birthdays this week' },
  { icon: CheckSquare, label: 'Overdue tasks' },
  { icon: ClipboardText, label: 'Last month’s attendance' },
]
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <YunitMascot ref="mascot" :interactive="false" :follow="false" :sparks="false" :fidget="false" class="size-24" />
      <p class="st-rise mt-1 text-3xl font-black leading-10 tracking-tight" style="--d: 300ms"><YunitName /></p>
      <p class="st-rise text-[11px] text-gray-500 dark:text-gray-400" style="--d: 360ms">Yet another Useful Intelligence Tool</p>
      <p class="st-rise mt-2.5 max-w-60 text-sm leading-snug text-gray-700 dark:text-gray-200" style="--d: 450ms">
        Ask about the church, or tell me what to change. I’ll check with you first.
      </p>

      <div class="mt-4 grid w-full grid-cols-2 gap-2">
        <span
          v-for="(s, i) in STARTERS"
          :key="s.label"
          :class="[
            'st-rise relative flex items-center gap-2 rounded-2xl bg-white px-2.5 py-2 text-left text-xs leading-snug ring-1 dark:bg-gray-800',
            tapped && i === 2 ? 'st-tap text-primary ring-primary dark:text-primary-light dark:ring-primary-light' : 'text-gray-800 ring-gray-200 dark:text-gray-100 dark:ring-gray-700',
          ]"
          :style="{ '--d': `${700 + i * 120}ms` }"
        >
          <span class="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
            <component :is="s.icon" class="size-4" />
          </span>
          <span class="font-medium text-gray-800 dark:text-gray-100">{{ s.label }}</span>
        </span>
      </div>
    </div>

    <div class="px-3 pb-4 pt-3">
      <div class="flex items-center gap-2 rounded-3xl bg-white p-1.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <span class="min-w-0 flex-1 truncate px-2.5 text-sm text-gray-400">Ask or tell YUNIT…</span>
        <span class="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
          <PaperPlaneRight class="size-4.5" />
        </span>
      </div>
    </div>
  </div>
</template>

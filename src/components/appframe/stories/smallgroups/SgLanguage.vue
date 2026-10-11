<script setup>
import { ref } from 'vue'
import { X } from '../../../../icons'
import { sgLabel } from '../../../../data/sgFormLabels'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: the form in Tagalog. A leader types tonight's lesson, then taps TAG,
// and every label on the form turns Tagalog — the real labels the form uses
// (data/sgFormLabels.js), so the scene says what the form will say. What was
// typed stays as it was: only the form's own words change.

const lang = ref('en')
const lesson = ref('')
const verse = ref('')
const tapped = ref(false)
const { at, type, still } = useSceneTimeline()

const typed = type(lesson, 'Ang Mabuting Pastol', 500, 55)
type(verse, 'Juan 10:11-18', typed + 200, 60)
at(2900, () => (tapped.value = true))
at(3050, () => (lang.value = 'tl'))

const t = (key) => sgLabel(lang.value, key)
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="st-rise flex items-center justify-between gap-3 rounded-t-[28px] border-b border-gray-200 bg-white px-4 pb-3 pt-5 dark:border-gray-700 dark:bg-gray-800">
      <div class="min-w-0">
        <p :key="lang" class="sg-swap truncate text-lg font-semibold">{{ t('newSession') }}</p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">Kabataan Cell</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span class="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
          <span
            :class="[
              'min-w-[40px] rounded-md px-2 py-1 text-center text-[11px] font-bold transition-colors',
              lang === 'en' ? 'st-filled bg-primary text-white' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            ENG
          </span>
          <span
            :class="[
              'relative min-w-[40px] rounded-md px-2 py-1 text-center text-[11px] font-bold transition-colors',
              lang === 'tl' ? 'st-filled bg-primary text-white' : 'text-gray-500 dark:text-gray-400',
              tapped ? 'st-tap' : '',
            ]"
          >
            TAG
          </span>
        </span>
        <X class="size-5 text-gray-400" />
      </div>
    </div>

    <div class="px-4 pt-3">
      <p class="st-rise mb-3 border-b border-primary/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light" style="--d: 120ms">
        <span :key="lang" class="sg-swap inline-block">{{ t('lesson') }}</span>
      </p>

      <div class="flex flex-col gap-3">
        <div class="st-rise" style="--d: 200ms">
          <p :key="lang" class="sg-swap mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('lessonTitle') }}</p>
          <p class="h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
            <span :class="lesson.length < 19 && !still ? 'st-caret' : ''">{{ lesson }}</span>
          </p>
        </div>
        <div class="st-rise" style="--d: 280ms">
          <p :key="lang" class="sg-swap mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('scripture') }}</p>
          <p class="h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
            <span :class="lesson.length === 19 && verse.length < 13 && !still ? 'st-caret' : ''">{{ verse }}</span>
          </p>
        </div>
        <div class="st-rise" style="--d: 360ms">
          <p :key="lang" class="sg-swap mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('discussionNotes') }}</p>
          <p class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-5 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
            Ang pastol ay nag-aalay ng buhay para sa tupa.
          </p>
        </div>
      </div>

      <p class="st-rise mb-3 mt-5 border-b border-primary/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light" style="--d: 440ms">
        <span :key="lang" class="sg-swap inline-block">{{ t('attendance') }}</span>
      </p>
      <div class="st-rise flex items-center gap-2 text-xs" style="--d: 500ms">
        <span :key="lang" class="sg-swap rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light">
          {{ t('markAll') }}
        </span>
        <span class="ml-auto font-semibold tabular-nums text-gray-600 dark:text-gray-300">5 / 6</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* A label changing language: the new word fades in where the old one was,
   so the eye sees the form change rather than a page reload. */
.sg-swap {
  animation: sg-swap 0.35s ease-out both;
}
@keyframes sg-swap {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sg-swap {
    animation: none;
  }
}
</style>

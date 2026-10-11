<script setup>
import { onUnmounted, ref } from 'vue'
import { CheckCircle2, FileText, ListChecks, Loader2, Sparkles } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import MinutesHeader from './MinutesHeader.vue'

// Scene: YUNIT writes the minutes up. On the meeting's summary, Write it up
// is pressed; he reads the notes first, with a clock that admits how long it
// is taking, then the minutes arrive a section at a time, each with the mark
// the page gives it, the way MinuteWritingPanel shows a write-up landing.
// The write-up is kept to three short sections so that, with the status
// over it, it still ends above the foot of the screen.

const SECTIONS = [
  {
    icon: FileText,
    tone: 'text-primary dark:text-primary-light',
    title: 'In short',
    lines: ['The council planned the Christmas outreach and agreed its budget.'],
  },
  {
    icon: CheckCircle2,
    tone: 'text-emerald-600 dark:text-emerald-400',
    title: 'What we decided',
    lines: ['₱18,000 from the outreach fund for 120 gift packs.', 'The outreach is on Saturday, December 12.'],
  },
  {
    icon: ListChecks,
    tone: 'text-blue-600 dark:text-blue-400',
    title: 'Who does what',
    lines: ['Ben Santos canvasses prices by Friday.'],
  },
]

// 'idle' with nothing written, 'reading' the notes, 'writing' the minutes,
// then 'done'.
const stage = ref('idle')
const pressed = ref(false)
const shown = ref(0)
const seconds = ref(0)
const { at, still } = useSceneTimeline()

let clock = 0
at(800, () => (pressed.value = true))
at(1050, () => {
  stage.value = 'reading'
  if (!still) clock = setInterval(() => seconds.value++, 1000)
})
at(2300, () => (stage.value = 'writing'))
SECTIONS.forEach((_, i) => at(2450 + i * 550, () => (shown.value = i + 1)))
at(4200, () => {
  clearInterval(clock)
  stage.value = 'done'
})

onUnmounted(() => clearInterval(clock))
</script>

<template>
  <div class="h-full rounded-[28px] bg-white dark:bg-gray-800">
    <MinutesHeader class="st-rise">
      <h2 class="min-w-0 flex-1 truncate text-sm font-bold">Summary</h2>
      <span
        :class="[
          'st-filled relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white',
          pressed && stage !== 'done' ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
      >
        <Loader2 v-if="stage === 'reading' || stage === 'writing'" class="size-4 animate-spin" />
        <Sparkles v-else class="size-4" />
        {{ stage === 'idle' ? 'Write it up' : stage === 'done' ? 'Write again' : 'Writing…' }}
      </span>
    </MinutesHeader>

    <div class="flex flex-col gap-2 px-3 pt-3">
      <div
        v-if="stage === 'idle'"
        class="st-rise rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center dark:border-gray-600 dark:bg-gray-700/50"
        style="--d: 120ms"
      >
        <Sparkles class="mx-auto mb-3 size-8 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">No summary written yet</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Draw every agenda item together into one set of minutes — attendance, what was decided, the money, and who has to do what.
        </p>
      </div>

      <!-- What he is doing, said plainly, with the time it has taken. -->
      <div
        v-if="stage === 'reading' || stage === 'writing'"
        class="st-rise flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 dark:border-primary-light/30 dark:bg-primary-light/10"
      >
        <Sparkles class="size-5 shrink-0 text-primary dark:text-primary-light" />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{{ stage === 'writing' ? 'Writing the minutes…' : 'Reading the notes…' }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
            {{ stage === 'writing' ? 'The page below is filling in.' : 'Working through the whole meeting.' }}
          </span>
        </span>
        <span class="shrink-0 font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ seconds }}s</span>
      </div>

      <div v-if="stage === 'reading'" class="flex flex-col gap-2.5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div class="h-4 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div class="h-2.5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div class="h-2.5 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div class="mt-3 h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div class="h-2.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      <div
        v-if="stage === 'writing' || stage === 'done'"
        :class="[
          'flex flex-col gap-2 rounded-lg border bg-white p-3 dark:bg-gray-800',
          stage === 'done' ? 'border-gray-300 dark:border-gray-600' : 'border-primary/30 dark:border-primary-light/30',
        ]"
      >
        <section v-for="s in SECTIONS.slice(0, stage === 'done' ? SECTIONS.length : shown)" :key="s.title" class="st-rise">
          <h3 class="flex items-center gap-1.5 text-sm font-bold">
            <component :is="s.icon" :class="['size-4 shrink-0', s.tone]" />
            {{ s.title }}
          </h3>
          <ul :class="['mt-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300', s.lines.length > 1 ? 'list-disc pl-4' : '']">
            <li v-for="line in s.lines" :key="line">{{ line }}</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

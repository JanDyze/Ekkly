<script setup>
import { computed, ref } from 'vue'
import AppArt from '../../../common/AppArt.vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import YunitFrame from './YunitFrame.vue'
import YunitTyping from './YunitTyping.vue'

// Scene: a number nobody has to dig for. Asked how attendance went, he reads
// the totals, answers in a sentence and lays the figures out on a card that
// wears the Attendance app's picture, then offers what might be asked next.
// Attendance is a head count per gathering, so the card says how full the
// Sundays were, never who came.

const QUESTION = 'How was attendance last month?'
const draft = ref('')
const step = ref(0)
const { at, type } = useSceneTimeline()

// 1 sent · 2 looking · 3 answer · 4 suggestions
const typed = type(draft, QUESTION, 250, 34)
at(typed + 250, () => {
  draft.value = ''
  step.value = 1
})
at(typed + 600, () => (step.value = 2))
at(typed + 1500, () => (step.value = 3))
at(typed + 2700, () => (step.value = 4))

const mood = computed(() => ['listening', 'thinking', 'thinking', 'talking', 'happy'][step.value])
const status = computed(
  () =>
    ({
      1: 'Thinking…',
      2: 'Looking at attendance totals and averages…',
      3: 'Answering…',
    })[step.value] || 'Your church’s assistant'
)

const DETAILS = [
  ['Average', '142 a Sunday'],
  ['Fullest', '168 · Sep 28'],
  ['Quietest', '121 · Sep 7'],
]
const NEXT = ['Compare with 2025', 'And the youth?']
</script>

<template>
  <YunitFrame :mood="mood" :status="status" :draft="draft" :sending="step === 1">
    <div class="flex flex-col gap-4">
      <p v-if="step >= 1" class="st-rise st-filled ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-3.5 py-2.5 text-sm text-white">
        {{ QUESTION }}
      </p>

      <YunitTyping v-if="step === 1 || step === 2" />

      <div v-else-if="step >= 3" class="flex flex-col gap-2.5">
        <p class="st-rise text-sm leading-snug">September averaged 142 on Sundays, up 9 from August.</p>

        <div class="st-rise flex gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 150ms">
          <AppArt app-key="attendance" class="size-9 shrink-0" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">Sunday service</span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">September 2026 · 4 Sundays</span>
            <span class="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <template v-for="(d, i) in DETAILS" :key="d[0]">
                <span class="st-rise text-gray-500 dark:text-gray-400" :style="{ '--d': `${400 + i * 160}ms` }">{{ d[0] }}</span>
                <span class="st-rise font-medium tabular-nums" :style="{ '--d': `${400 + i * 160}ms` }">{{ d[1] }}</span>
              </template>
            </span>
          </span>
        </div>

        <div v-if="step >= 4" class="flex gap-2">
          <span
            v-for="(s, i) in NEXT"
            :key="s"
            class="st-pop rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            :style="{ '--d': `${i * 100}ms` }"
          >
            {{ s }}
          </span>
        </div>
      </div>
    </div>
  </YunitFrame>
</template>

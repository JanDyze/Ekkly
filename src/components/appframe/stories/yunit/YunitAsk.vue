<script setup>
import { computed, ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import YunitFrame from './YunitFrame.vue'
import YunitTyping from './YunitTyping.vue'
import { nameOf, person } from './cast'

// Scene: a question, asked the way anyone would ask it. It is typed as said,
// half in Tagalog, and sent; he thinks, says what he is looking at, and
// answers the way he always does — a sentence, then a card for each person,
// each one a record to open.

const QUESTION = 'Sino ang may birthday this week?'
const draft = ref('')
const step = ref(0)
const { at, type } = useSceneTimeline()

// 1 sent · 2 looking · 3 answering · 4 done
const typed = type(draft, QUESTION, 300, 32)
at(typed + 250, () => {
  draft.value = ''
  step.value = 1
})
at(typed + 700, () => (step.value = 2))
at(typed + 1700, () => (step.value = 3))
at(typed + 2600, () => (step.value = 4))

const mood = computed(() => ['listening', 'thinking', 'thinking', 'talking', 'happy'][step.value])
const status = computed(
  () =>
    ({
      1: 'Thinking…',
      2: 'Looking at search members and attendees…',
      3: 'Answering…',
    })[step.value] || 'Your church’s assistant'
)

const BIRTHDAYS = [
  { p: person('joy'), when: 'Today · turns 30' },
  { p: person('ben'), when: 'Thursday, Oct 15 · turns 42' },
  { p: person('grace'), when: 'Sunday, Oct 18 · turns 65' },
]
</script>

<template>
  <YunitFrame :mood="mood" :status="status" :draft="draft" :sending="step === 1">
    <div class="flex flex-col gap-4">
      <p v-if="step >= 1" class="st-rise st-filled ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-3.5 py-2.5 text-sm text-white">
        {{ QUESTION }}
      </p>

      <YunitTyping v-if="step === 1 || step === 2" />

      <div v-else-if="step >= 3" class="flex flex-col gap-2">
        <p class="st-rise text-sm">Three this week, and Joy’s is today.</p>
        <div
          v-for="(b, i) in BIRTHDAYS"
          :key="b.p.id"
          class="st-rise flex items-center gap-2.5 rounded-2xl bg-white p-2 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
          :style="{ '--d': `${200 + i * 220}ms` }"
        >
          <StoryFace :person="b.p" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">{{ nameOf(b.p) }}</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ b.when }}</span>
          </span>
        </div>
      </div>
    </div>
  </YunitFrame>
</template>

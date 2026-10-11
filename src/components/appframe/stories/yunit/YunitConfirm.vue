<script setup>
import { computed, ref } from 'vue'
import { Check, Plus } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import YunitFrame from './YunitFrame.vue'
import YunitTyping from './YunitTyping.vue'

// Scene: nothing changes until you say so. Asked to give Ben a task, he does
// not add it: he comes back with a card saying exactly what will happen, and
// only when Confirm is pressed is it done. A misunderstood request costs a
// tap on Cancel, never a wrong record (lib/yunit.js).

const REQUEST = 'Give Ben the bulletins to print by Saturday'
const draft = ref('')
const step = ref(0)
const { at, type } = useSceneTimeline()

// 1 sent · 2 thinking · 3 card waiting · 4 confirm pressed · 5 doing · 6 done
const typed = type(draft, REQUEST, 250, 28)
at(typed + 250, () => {
  draft.value = ''
  step.value = 1
})
at(typed + 500, () => (step.value = 2))
at(typed + 1300, () => (step.value = 3))
at(typed + 2350, () => (step.value = 4))
at(typed + 2550, () => (step.value = 5))
at(typed + 3000, () => (step.value = 6))

const mood = computed(() => (step.value === 6 ? 'happy' : step.value === 2 ? 'thinking' : step.value === 0 ? 'listening' : 'idle'))
const status = computed(() => (step.value === 1 || step.value === 2 ? 'Thinking…' : 'Your church’s assistant'))
</script>

<template>
  <YunitFrame :mood="mood" :status="status" :draft="draft" :sending="step === 1">
    <div class="flex flex-col gap-4">
      <p v-if="step >= 1" class="st-rise st-filled ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-3.5 py-2.5 text-sm text-white">
        {{ REQUEST }}
      </p>

      <YunitTyping v-if="step === 1 || step === 2" />

      <div v-else-if="step >= 3" class="flex flex-col gap-2.5">
        <p class="st-rise text-sm">Here it is. Shall I add it?</p>

        <!-- The change, waiting on the person. -->
        <div class="st-rise rounded-2xl bg-white p-3 ring-1 ring-primary/25 dark:bg-gray-800 dark:ring-primary-light/30" style="--d: 150ms">
          <div class="flex gap-2.5">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <Plus class="size-4.5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Assign a task</p>
              <p class="mt-0.5 text-sm leading-snug">Give Ben Santos “Print the bulletins”, due Saturday, Oct 17.</p>
            </div>
          </div>

          <div v-if="step <= 4" class="mt-3 flex gap-2">
            <span
              :class="['st-filled relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white', step === 4 ? 'st-tap bg-primary-hover' : 'bg-primary']"
            >
              <Check class="size-4" />
              Confirm
            </span>
            <span class="flex h-9 flex-1 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">Cancel</span>
          </div>
          <p v-else-if="step === 5" class="mt-3 flex h-9 items-center text-sm text-gray-500 dark:text-gray-400">Doing it…</p>
          <p v-else class="st-pop mt-3 flex h-9 items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Check class="size-4" /> Done
          </p>
        </div>
      </div>
    </div>
  </YunitFrame>
</template>

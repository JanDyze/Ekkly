<script setup>
import { ref } from 'vue'
import { ArrowsLeftRight, Warning } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryThing from './StoryThing.vue'
import { thing } from './cast'

// Scene: lent, with a day to bring it back. The projector's page; a thumb on
// Lend; the sheet asks who and until when, the name is typed, Lend; and the
// page says who has it and when it is due.

const projector = thing('projector')
const { at, type } = useSceneTimeline()

const lendTap = ref(false)
const sheet = ref(false)
const who = ref('')
const confirm = ref(false)
const lent = ref(false)

at(1000, () => (lendTap.value = true))
at(1300, () => (sheet.value = true))
const typed = type(who, 'Mark Villanueva', 1700, 70)
at(typed + 500, () => (confirm.value = true))
at(typed + 900, () => {
  sheet.value = false
  lent.value = true
})
</script>

<template>
  <div class="relative h-full px-4 pt-6">
    <div class="st-rise flex h-[130px] items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <StoryThing :thing="projector" size="size-24 rounded-2xl" icon="size-14" />
    </div>
    <p class="st-rise mt-3 text-xl font-bold" style="--d: 80ms">Projector</p>
    <p :class="['st-rise text-sm', lent ? 'font-semibold text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400']" style="--d: 120ms">
      {{ lent ? 'Out on loan' : 'Here · Office' }}
    </p>

    <div class="st-rise mt-3 flex gap-2" style="--d: 200ms">
      <span
        :class="[
          'relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-sm font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light',
          lendTap ? 'st-tap' : '',
        ]"
      >
        <ArrowsLeftRight class="size-4" />
        Lend
      </span>
      <span class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-sm font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light">
        <Warning class="size-4" />
        Needs repair
      </span>
    </div>

    <!-- Who has it now. -->
    <div v-if="lent" class="st-rise mt-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <p class="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Out now</p>
      <p class="mt-1 text-sm font-semibold">Mark Villanueva</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">Due Sunday · for the youth camp</p>
    </div>

    <!-- The sheet that asks who, over the page. It floats clear of the
         screen's foot, so its rise never takes it past the edge. -->
    <template v-if="sheet">
      <div class="absolute inset-0 rounded-[28px] bg-black/30" />
      <div class="st-rise absolute inset-x-3 bottom-4 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <p class="text-base font-semibold">Lend Projector</p>
        <p class="mt-2.5 text-xs font-medium text-gray-600 dark:text-gray-300">Who is borrowing it</p>
        <div class="mt-1 flex h-9 items-center rounded-lg px-3 text-sm ring-2 ring-primary dark:ring-primary-light">
          <span :class="who ? '' : 'text-gray-400'">{{ who || 'Ana Reyes' }}</span>
        </div>
        <p class="mt-2.5 text-xs font-medium text-gray-600 dark:text-gray-300">When it should be back</p>
        <div class="mt-1 flex h-9 items-center rounded-lg px-3 text-sm ring-1 ring-gray-300 dark:ring-gray-600">Sunday</div>
        <div class="mt-3 flex justify-end">
          <span :class="['st-filled relative flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white', confirm ? 'st-tap bg-primary-hover' : 'bg-primary']">
            Lend
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Check } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { kindOf, kindTile } from '../../../../utils/ticketUtils'
import { TICKETS } from './cast'

// Scene: hearing back. The ticket that was sent opens; its steps fill in —
// sent, picked up, done — and the Ekkly team's answer arrives under them,
// so sending something is never the last anyone hears of it.

const T = TICKETS.print
const kind = kindOf(T.kind)

const reached = ref(1)
const replied = ref(false)
const { at } = useSceneTimeline()

at(900, () => (reached.value = 2))
at(1900, () => (reached.value = 3))
at(2500, () => (replied.value = true))

const steps = computed(() => [
  { key: 'sent', label: 'Sent', done: reached.value >= 1 },
  { key: 'seen', label: 'Picked up', done: reached.value >= 2 },
  { key: 'done', label: 'Done', done: reached.value >= 3 },
])
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise flex items-center gap-2">
      <span :class="['flex size-7 items-center justify-center rounded-lg', kindTile(T.kind)]">
        <component :is="kind.icon" class="size-4" />
      </span>
      <span class="text-[13px] font-semibold text-gray-600 dark:text-gray-300">{{ kind.label }}</span>
    </p>
    <p class="st-rise mt-3 text-lg font-semibold leading-snug" style="--d: 80ms">{{ T.title }}</p>
    <p class="st-rise mt-0.5 text-[12px] text-gray-500 dark:text-gray-400" style="--d: 120ms">
      From you · Sunday · {{ T.where }}
    </p>
    <p class="st-rise mt-3 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300" style="--d: 160ms">
      Our ushers still copy it by hand onto the board in the lobby.
    </p>

    <ol class="st-rise mt-6 flex items-start" style="--d: 220ms">
      <li v-for="(step, i) in steps" :key="step.key" class="relative flex flex-1 flex-col items-center">
        <span
          v-if="i > 0"
          :class="[
            'absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 transition-colors duration-500',
            step.done ? 'bg-primary dark:bg-primary-light' : 'bg-gray-200 dark:bg-gray-700',
          ]"
        />
        <span
          :class="[
            'relative flex size-6 items-center justify-center rounded-full transition-colors duration-500',
            step.done ? 'bg-primary text-white dark:bg-primary-light dark:text-gray-900' : 'bg-white ring-2 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
          ]"
        >
          <Check v-if="step.done" class="st-pop size-3.5" />
        </span>
        <span :class="['mt-1.5 text-[11px]', step.done ? 'font-semibold' : 'text-gray-400 dark:text-gray-500']">{{ step.label }}</span>
      </li>
    </ol>

    <!-- The answer, as the conversation draws it (TicketThread): Ekkly's
         side on the left, marked as Ekkly's. -->
    <div v-if="replied" class="st-pop mt-6 flex max-w-[92%] items-end gap-2">
      <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white dark:bg-white dark:text-gray-900">
        J
      </span>
      <div class="min-w-0">
        <p class="mb-1 px-1 text-[11px] text-gray-500 dark:text-gray-400">Jan · Ekkly · Just now</p>
        <p class="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] leading-relaxed ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          Done! Open the Sunday and tap Print. Thank you for the idea.
        </p>
      </div>
    </div>
  </div>
</template>

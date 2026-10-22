<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import TicketLine from './TicketLine.vue'
import { TICKETS } from './cast'

// Scene: what a church's administrator sees. What needs an answer from them
// first — a question landing at the top as it is sent — then a kind word to
// read, and the bugs and ideas that went to Ekkly, there to see and nothing
// to do.

const arrived = ref(false)
const { at } = useSceneTimeline()
at(1400, () => (arrived.value = true))

const HEAD = 'mt-4 mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'
const BLOCK =
  'divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700'
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-lg font-bold leading-tight">{{ arrived ? 2 : 1 }} {{ arrived ? 'tickets need' : 'ticket needs' }} an answer</p>

    <p :class="['st-rise', HEAD]" style="--d: 120ms">
      Needs an answer <span class="ml-1 tabular-nums opacity-70">{{ arrived ? 2 : 1 }}</span>
    </p>
    <div :class="['st-rise', BLOCK]" style="--d: 180ms">
      <div v-if="arrived" class="st-rise bg-primary/5 dark:bg-primary-light/10">
        <TicketLine :ticket="TICKETS.ministry" line="Jonathan Ramos · Just now" />
      </div>
      <TicketLine :ticket="TICKETS.taps" />
    </div>

    <p :class="['st-rise', HEAD]" style="--d: 260ms">Kind words <span class="ml-1 tabular-nums opacity-70">1</span></p>
    <div :class="['st-rise', BLOCK]" style="--d: 320ms">
      <TicketLine :ticket="TICKETS.attendance" />
    </div>

    <p :class="['st-rise', HEAD]" style="--d: 400ms">Sent to Ekkly <span class="ml-1 tabular-nums opacity-70">1</span></p>
    <div :class="['st-rise', BLOCK]" style="--d: 460ms">
      <TicketLine :ticket="TICKETS.songs" />
    </div>
    <p class="st-rise mt-1.5 px-1 text-[11px] text-gray-500 dark:text-gray-400" style="--d: 500ms">
      Ekkly answers these. You see what they say.
    </p>
  </div>
</template>

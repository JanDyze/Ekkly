<script setup>
import { ref } from 'vue'
import { CheckCircle, PaperPlaneTilt } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { SENDABLE_KINDS, kindRing, kindTile } from '../../../../utils/ticketUtils'
import { TICKETS } from './cast'

// Scene: feedback in a sentence. The form asks what you would like to tell
// us; Suggestion is tapped, the idea is typed, Send is pressed, and the form
// thanks them and says where the answer will be.

const KINDS = SENDABLE_KINDS
const IDEA = TICKETS.print.title

const picked = ref('')
const tapKind = ref(false)
const title = ref('')
const pressed = ref(false)
const sent = ref(false)
const { at, type, still } = useSceneTimeline()

at(600, () => (tapKind.value = true))
at(800, () => (picked.value = 'suggestion'))
const typed = type(title, IDEA, 1200, 45)
at(typed + 350, () => (pressed.value = true))
at(typed + 650, () => (sent.value = true))
</script>

<template>
  <div class="flex h-full flex-col px-4 pt-6">
    <p class="st-rise text-xl font-bold">Send feedback</p>

    <div v-if="!sent" class="mt-3 flex flex-1 flex-col">
      <p class="st-rise text-[13px] font-semibold" style="--d: 80ms">What would you like to tell us?</p>
      <div class="st-rise mt-2 grid grid-cols-2 gap-1.5" style="--d: 140ms">
        <span
          v-for="kind in KINDS"
          :key="kind.key"
          :class="[
            'relative flex items-center gap-2 rounded-xl bg-white p-2 ring-1 dark:bg-gray-800',
            picked === kind.key ? ['ring-2', kindRing(kind.key)] : 'ring-gray-200 dark:ring-gray-700',
            kind.key === 'suggestion' && tapKind && !picked ? 'st-tap' : '',
          ]"
        >
          <span :class="['flex size-7 shrink-0 items-center justify-center rounded-lg', kindTile(kind.key)]">
            <component :is="kind.icon" class="size-4" />
          </span>
          <span class="min-w-0">
            <span class="block text-[12px] font-semibold leading-tight">{{ kind.label }}</span>
            <span class="block truncate text-[10px] leading-tight text-gray-500 dark:text-gray-400">{{ kind.hint }}</span>
          </span>
        </span>
      </div>

      <p class="st-rise mt-4 text-[13px] font-semibold" style="--d: 200ms">{{ picked ? 'What is your idea?' : 'In a sentence' }}</p>
      <div
        :class="[
          'st-rise mt-1.5 rounded-xl border bg-white px-3 py-2 text-[13px] dark:bg-gray-800',
          picked ? 'border-primary dark:border-primary-light' : 'border-gray-300 dark:border-gray-600',
        ]"
        style="--d: 240ms"
      >
        <span :class="[title ? '' : 'text-gray-400', picked && !still && !pressed ? 'st-caret' : '']">
          {{ title || 'Say it in a few words' }}
        </span>
      </div>

      <div class="mt-auto mb-5 flex justify-end">
        <span
          :class="[
            'relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm',
            title ? 'st-filled bg-primary text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
            pressed ? 'st-tap' : '',
          ]"
        >
          <PaperPlaneTilt class="size-4" />
          Send
        </span>
      </div>
    </div>

    <!-- Sent: the thanks, and where the answer will be. -->
    <div v-else class="flex flex-1 flex-col items-center pt-16 text-center">
      <span :class="['st-pop flex size-16 items-center justify-center rounded-2xl', kindTile('suggestion')]">
        <CheckCircle class="size-9" />
      </span>
      <p class="st-rise mt-4 text-lg font-bold" style="--d: 120ms">Thanks for the idea</p>
      <p class="st-rise mt-1 px-4 text-[13px] text-gray-500 dark:text-gray-400" style="--d: 200ms">
        It has gone to the Ekkly team. Their answer shows on this ticket.
      </p>
    </div>
  </div>
</template>

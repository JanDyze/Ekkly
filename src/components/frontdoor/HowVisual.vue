<script setup>
import { computed } from 'vue'
import { CheckCircle2, Clock, Copy, LinkSimple, Send } from '../../icons'
import { suggestChurchId } from '../../../lib/churchId.js'

// What one step of "How it works" looks like while it happens, as a card from
// the app: the request being filled in, the church being opened, and people
// asking to join. `p` runs from 0 to 1 as the reader moves through the step,
// and everything has happened by about two thirds of the way, so a reader who
// stops there sees it finished. Sample data, with their church's name if they
// gave one.

const props = defineProps({
  step: { type: Number, required: true },
  p: { type: Number, default: 1 },
  church: { type: String, default: '' },
  domain: { type: String, default: 'ekkly.online' },
})

const clamp = (n) => Math.min(1, Math.max(0, n))
const name = computed(() => props.church.trim() || 'Grace Baptist Church')
const link = (text) => `${suggestChurchId(text) || 'your-church'}.${props.domain}`

/* ---------------------------------------------------- 1. ask for a church */

const typed = computed(() => name.value.slice(0, Math.round(clamp(props.p / 0.45) * name.value.length)))
const typing = computed(() => typed.value.length < name.value.length)
const sent = computed(() => props.p >= 0.6)

/* ------------------------------------------------------- 2. we open it */

const approved = computed(() => props.p >= 0.2)
const DONE = computed(() => [
  { text: 'Your church is open' },
  { text: 'Its link works', detail: link(name.value) },
  { text: 'You are its first administrator' },
  { text: 'Its apps are switched on' },
])
const doneCount = computed(() => Math.floor(clamp((props.p - 0.25) / 0.42) * DONE.value.length + 0.001))

/* ------------------------------------------------ 3. bring your people in */

const copied = computed(() => props.p >= 0.12)
const PEOPLE = [
  { initials: 'AR', name: 'Ana Reyes', tone: 'bg-amber-200 text-amber-800' },
  { initials: 'BC', name: 'Ben Cruz', tone: 'bg-sky-200 text-sky-800' },
  { initials: 'CS', name: 'Carla Santos', tone: 'bg-teal-200 text-teal-800' },
]
const letIn = (i) => props.p >= 0.3 + i * 0.13
const JOINED = 24
const joined = computed(() => Math.round(clamp((props.p - 0.3) / 0.4) * JOINED))

const field = 'mt-1 flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-gray-700 dark:bg-gray-900'
const label = 'mt-4 block text-xs font-semibold text-gray-500 dark:text-gray-400'
</script>

<template>
  <div class="rounded-3xl bg-white p-5 text-gray-900 shadow-2xl shadow-black/40 sm:p-6 dark:bg-gray-800 dark:text-white dark:ring-1 dark:ring-white/10" aria-hidden="true">
    <!-- 1. The request, being filled in and sent. -->
    <template v-if="step === 0">
      <div class="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-800">PM</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">Pastor Mark</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Signed in with Google</p>
        </div>
        <CheckCircle2 class="h-5 w-5 text-emerald-500" />
      </div>
      <span :class="label">Church name</span>
      <div :class="field">
        <span class="truncate font-semibold">{{ typed }}</span><span v-if="typing" class="caret">|</span>
      </div>
      <span :class="label">Your church’s link</span>
      <div :class="[field, 'font-mono text-[13px]']">
        <span class="truncate"><span class="font-semibold text-primary dark:text-primary-light">{{ suggestChurchId(typed) || 'your-church' }}</span>.{{ domain }}</span>
      </div>
      <div
        :class="[
          'mt-5 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-colors duration-300',
          sent ? 'bg-emerald-600' : 'bg-primary',
        ]"
      >
        <CheckCircle2 v-if="sent" class="h-4 w-4" />
        <Send v-else class="h-4 w-4" />
        {{ sent ? 'Request sent' : 'Send request' }}
      </div>
    </template>

    <!-- 2. The church, approved and opened. -->
    <template v-else-if="step === 1">
      <div class="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-white">{{ name[0] }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Your request</p>
        </div>
        <span
          :class="[
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300',
            approved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
          ]"
        >
          <CheckCircle2 v-if="approved" class="h-3.5 w-3.5" />
          <Clock v-else class="h-3.5 w-3.5" />
          {{ approved ? 'Approved' : 'Waiting' }}
        </span>
      </div>
      <ul class="mt-4 space-y-3">
        <li v-for="(item, i) in DONE" :key="item.text" :class="['flex items-center gap-3 transition-opacity duration-300', i < doneCount ? 'opacity-100' : 'opacity-35']">
          <span
            :class="[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
              i < doneCount ? 'bg-emerald-500 text-white' : 'border-2 border-dashed border-gray-300 dark:border-gray-600',
            ]"
          >
            <CheckCircle2 v-if="i < doneCount" class="h-4 w-4" />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold">{{ item.text }}</span>
            <span v-if="item.detail" class="block truncate font-mono text-xs text-primary dark:text-primary-light">{{ item.detail }}</span>
          </span>
        </li>
      </ul>
    </template>

    <!-- 3. The link shared, and people let in. -->
    <template v-else>
      <div class="flex items-center gap-2 rounded-xl bg-gray-50 p-2 pl-3 dark:bg-gray-900">
        <LinkSimple class="h-4 w-4 shrink-0 text-gray-400" />
        <span class="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold">{{ link(name) }}</span>
        <span
          :class="[
            'inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition-colors duration-300',
            copied ? 'bg-emerald-600 text-white' : 'bg-primary text-white',
          ]"
        >
          <CheckCircle2 v-if="copied" class="h-3.5 w-3.5" />
          <Copy v-else class="h-3.5 w-3.5" />
          {{ copied ? 'Copied' : 'Copy' }}
        </span>
      </div>
      <p class="mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Asking to join</p>
      <ul class="mt-2 space-y-2">
        <li v-for="(person, i) in PEOPLE" :key="person.name" class="flex items-center gap-3">
          <span :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', person.tone]">{{ person.initials }}</span>
          <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ person.name }}</span>
          <span
            :class="[
              'inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-bold transition-colors duration-300',
              letIn(i) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-primary text-white',
            ]"
          >
            <CheckCircle2 v-if="letIn(i)" class="h-3.5 w-3.5" />
            {{ letIn(i) ? 'In' : 'Let in' }}
          </span>
        </li>
      </ul>
      <div class="mt-4 flex items-baseline gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
        <span class="text-3xl font-black tabular-nums">{{ joined }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">people in {{ name }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.caret {
  margin-left: 1px;
  color: var(--color-primary);
  font-weight: 400;
}
</style>

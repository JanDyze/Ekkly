<script setup>
import { computed, ref } from 'vue'
import { Check, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { person, nameOf } from './cast'

// Scene: tick who came. Tonight's session form is open at its attendance, and
// names are ticked one at a time as people come through the door; the count
// at the top keeps up, and whoever is left over reads Absent without anyone
// having to say so.

const ROSTER = ['ramon', 'liza', 'paolo', 'nina', 'jun', 'carlo'].map(person)
// Who arrives, in the order they come in. Jun does not make it tonight.
const ARRIVALS = ['ramon', 'liza', 'nina', 'paolo', 'carlo']

const present = ref([])
const last = ref('')
const { at } = useSceneTimeline()
ARRIVALS.forEach((id, i) =>
  at(900 + i * 480, () => {
    present.value = [...present.value, id]
    last.value = id
  })
)

const isPresent = (p) => present.value.includes(p.id)
const count = computed(() => present.value.length)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- The form's head, as the sheet has it: what it is, whose group, and
         the language it is being filled in. -->
    <div class="st-rise flex items-center justify-between gap-3 rounded-t-[28px] border-b border-gray-200 bg-white px-4 pb-3 pt-5 dark:border-gray-700 dark:bg-gray-800">
      <div class="min-w-0">
        <p class="truncate text-lg font-semibold">New Session</p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">Kabataan Cell</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span class="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
          <span class="st-filled min-w-[40px] rounded-md bg-primary px-2 py-1 text-center text-[11px] font-bold text-white">ENG</span>
          <span class="min-w-[40px] px-2 py-1 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400">TAG</span>
        </span>
        <X class="size-5 text-gray-400" />
      </div>
    </div>

    <div class="px-4 pt-4">
      <p class="st-rise mb-3 border-b border-primary/20 pb-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light" style="--d: 120ms">
        Attendance
      </p>

      <div class="st-rise mb-2 flex items-center gap-2 text-xs" style="--d: 200ms">
        <span class="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light">Mark all present</span>
        <span class="rounded-md bg-gray-100 px-2.5 py-1 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">Clear all</span>
        <span :key="count" class="st-pop ml-auto font-semibold tabular-nums text-gray-600 dark:text-gray-300" style="--d: 0ms">{{ count }} / {{ ROSTER.length }}</span>
      </div>

      <ul class="st-rise divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800" style="--d: 300ms">
        <li
          v-for="p in ROSTER"
          :key="p.id"
          :class="['relative flex items-center gap-3 px-3 py-1.5', last === p.id ? 'st-tap text-primary dark:text-primary-light' : '']"
        >
          <span
            :class="[
              'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-200',
              isPresent(p) ? 'st-filled border-primary bg-primary text-white' : 'border-gray-300 dark:border-gray-600',
            ]"
          >
            <Check v-if="isPresent(p)" class="st-pop size-4" style="--d: 0ms" />
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">{{ nameOf(p) }}</span>
          <span
            :class="[
              'shrink-0 text-xs font-semibold',
              isPresent(p) ? 'text-primary dark:text-primary-light' : 'text-gray-400 dark:text-gray-500',
            ]"
          >
            {{ isPresent(p) ? 'Present' : 'Absent' }}
          </span>
        </li>
      </ul>

      <p class="st-rise mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200" style="--d: 400ms">
        Total Attendance: <span :key="count" class="st-pop inline-block tabular-nums" style="--d: 0ms">{{ count }}</span>
      </p>
    </div>
  </div>
</template>

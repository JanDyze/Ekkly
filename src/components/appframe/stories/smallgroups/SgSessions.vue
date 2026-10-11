<script setup>
import { ref } from 'vue'
import { ChevronRight, Users } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: every meeting, counted. The month's sessions arrive, each with what
// the group studied, and how many came climbs on each as it lands. Above them,
// in amber, the one meeting this week nobody has logged yet, and a thumb goes
// to it: the leader's form is a tap away.

const SESSIONS = [
  { id: 'nanay', group: 'Mga Nanay ng Bayan', line: '3 days ago · Ang dasal ni Hana', came: 11 },
  { id: 'mag-asawa', group: 'Mag-asawa Cell', line: 'last week · Ruth at Boaz', came: 8 },
  { id: 'kabataan', group: 'Kabataan Cell', line: 'last week · Mabuting Pastol', came: 9 },
]

const came = ref(SESSIONS.map(() => 0))
const tapped = ref(false)
const { at } = useSceneTimeline()
SESSIONS.forEach((s, i) => {
  for (let n = 1; n <= s.came; n++) at(900 + i * 220 + n * 55, () => (came.value[i] = n))
})
at(3000, () => (tapped.value = true))
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Sessions</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">86 sessions</p>
    </div>

    <section class="st-rise mt-4" style="--d: 150ms">
      <p class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Not logged yet <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">1</span>
      </p>
      <div class="rounded-2xl bg-white ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <div :class="['relative flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2.5', tapped ? 'st-tap text-amber-600 dark:text-amber-400' : '']">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-medium leading-snug text-amber-700 dark:text-amber-400">Thursday’s session</span>
            <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">Kabataan Cell</span>
          </span>
          <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
      </div>
    </section>

    <section class="st-rise mt-5" style="--d: 550ms">
      <p class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        October 2026 <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">14</span>
      </p>
      <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
        <li
          v-for="(s, i) in SESSIONS"
          :key="s.id"
          class="st-rise flex min-h-14 items-center gap-3 px-4 py-2.5"
          :style="{ '--d': `${600 + i * 150}ms` }"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ s.group }}</span>
            <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ s.line }}</span>
          </span>
          <span class="flex w-9 shrink-0 items-center justify-end gap-1 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
            <Users class="size-4" />
            {{ came[i] }}
          </span>
          <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </li>
      </ul>
    </section>
  </div>
</template>

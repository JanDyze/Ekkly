<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { MicrophoneStage } from '../../icons'
import { formatTimeRange } from '../../utils/sgUtils'

// The coming seven days, for the home of all apps on a desktop: a column a
// day, today first, each with what is on at what time, and your turn serving
// on the Sunday you are on. Under the apps, where a phone has no room and a
// desktop had only sky, so a glance at the home answers "what is this week"
// as well as "what is today" without opening Events.
//
// A day shows its first three things and how many more, so every column is
// one height and the band never runs on; the day's own link opens all of it
// in Events. Everything is the home's already (useToday), gated as it is.

const props = defineProps({
  // useToday's `week`: { date, day, letter, isToday } for the coming seven.
  days: { type: Array, required: true },
  // useToday's `eventsThisWeek`, in date and time order.
  events: { type: Array, default: () => [] },
  // useToday's `myNextTurn`, or null.
  turn: { type: Object, default: null },
})

const SHOWN = 3

const columns = computed(() =>
  props.days.map((day) => {
    const on = props.events.filter((event) => event.date === day.date)
    const [y, m, d] = day.date.split('-').map(Number)
    return {
      ...day,
      weekday: new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' }),
      serving: props.turn?.date === day.date ? props.turn : null,
      shown: on.slice(0, SHOWN),
      more: Math.max(on.length - SHOWN, 0),
    }
  })
)

const dayLink = (date) => ({ name: 'Events', query: { date } })
const keyOf = (event) => `${event.id || event.title}:${event.date}:${event.time || ''}`
</script>

<template>
  <section aria-labelledby="home-week" class="flex flex-col gap-3">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="home-week" class="text-sm font-bold text-gray-800 dark:text-gray-100">This week</h2>
      <RouterLink to="/events/calendar" class="text-sm font-semibold text-primary hover:underline dark:text-primary-light">Open calendar</RouterLink>
    </div>

    <ol class="grid grid-cols-7 overflow-hidden rounded-[28px] bg-white/85 ring-1 ring-black/5 backdrop-blur-md dark:bg-gray-900/70 dark:ring-white/10">
      <li
        v-for="day in columns"
        :key="day.date"
        :class="[
          'flex min-w-0 flex-col gap-1.5 border-gray-200/80 p-3 not-first:border-l dark:border-white/10',
          day.isToday ? 'bg-primary/5 dark:bg-primary-light/10' : '',
        ]"
      >
        <RouterLink
          :to="dayLink(day.date)"
          class="mb-1 flex items-center gap-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          :aria-label="`${day.weekday} ${day.day}${day.isToday ? ', today' : ''}, in Events`"
        >
          <span class="text-xs font-semibold uppercase tracking-wide">{{ day.weekday }}</span>
          <span
            :class="[
              'flex size-7 items-center justify-center rounded-full text-sm font-bold tabular-nums',
              day.isToday ? 'bg-primary text-white dark:bg-primary-light dark:text-gray-900' : 'text-gray-900 dark:text-white',
            ]"
          >
            {{ day.day }}
          </span>
        </RouterLink>

        <!-- Your turn first: it is the one thing on the day that is yours. -->
        <RouterLink
          v-if="day.serving"
          :to="{ name: 'SchedulesSunday', params: { date: day.date } }"
          class="flex min-w-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15 dark:bg-primary-light/15 dark:text-primary-light"
        >
          <MicrophoneStage class="size-3.5 shrink-0" />
          <span class="truncate">You're serving</span>
        </RouterLink>

        <RouterLink
          v-for="event in day.shown"
          :key="keyOf(event)"
          :to="dayLink(day.date)"
          class="block min-w-0 rounded-lg px-2 py-1 -mx-2 hover:bg-gray-900/5 dark:hover:bg-white/10"
        >
          <span v-if="event.time" class="block text-[11px] font-medium tabular-nums text-gray-500 dark:text-gray-400">{{ formatTimeRange(event.time) }}</span>
          <span class="block truncate text-[13px] font-semibold text-gray-900 dark:text-white">{{ event.title || 'A gathering' }}</span>
        </RouterLink>

        <RouterLink
          v-if="day.more"
          :to="dayLink(day.date)"
          class="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          {{ day.more }} more
        </RouterLink>

        <p v-if="!day.shown.length && !day.serving" class="text-xs text-gray-400 dark:text-gray-500">Nothing on</p>
      </li>
    </ol>
  </section>
</template>

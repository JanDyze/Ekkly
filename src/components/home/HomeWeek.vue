<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatTimeRange } from '../../utils/sgUtils'

// The coming seven days, for the home of all apps on a desktop, as a short
// agenda beside Today: only the days with something on, each with what and
// when, so a glance answers "what is this week" without opening Events. A
// grid of seven columns said "Nothing on" five times and weighed as much as
// Today; a list of the days that matter is lighter and says more.
//
// A day shows its first three things and how many more; the day's link opens
// all of it in Events, and Open calendar the month. Everything is the home's
// already (useToday), gated as it is.

const props = defineProps({
  // useToday's `week`: { date, day, isToday } for the coming seven.
  days: { type: Array, required: true },
  // useToday's `eventsThisWeek`, in date and time order.
  events: { type: Array, default: () => [] },
})

const SHOWN = 3

const agenda = computed(() =>
  props.days
    .map((day, i) => {
      const on = props.events.filter((event) => event.date === day.date)
      const [y, m, d] = day.date.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      return {
        ...day,
        name: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'long' }),
        short: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        shown: on.slice(0, SHOWN),
        more: Math.max(on.length - SHOWN, 0),
      }
    })
    .filter((day) => day.shown.length)
)

const dayLink = (date) => ({ name: 'Events', query: { date } })
const keyOf = (event) => `${event.id || event.title}:${event.date}:${event.time || ''}`
</script>

<template>
  <section aria-labelledby="home-week">
    <div class="flex items-baseline justify-between gap-4 px-1">
      <h2 id="home-week" class="text-sm font-semibold text-gray-900 dark:text-white">This week</h2>
      <RouterLink to="/events/calendar" class="text-[13px] font-medium text-primary hover:underline dark:text-primary-light">Open calendar</RouterLink>
    </div>

    <ol v-if="agenda.length" class="mt-3 flex flex-col gap-4">
      <li v-for="day in agenda" :key="day.date">
        <RouterLink
          :to="dayLink(day.date)"
          class="flex items-baseline gap-2 px-1 text-[13px] hover:underline"
        >
          <span :class="['font-semibold', day.isToday ? 'text-primary dark:text-primary-light' : 'text-gray-900 dark:text-white']">{{ day.name }}</span>
          <span class="text-gray-500 dark:text-gray-400">{{ day.short }}</span>
        </RouterLink>
        <ul class="mt-1 flex flex-col">
          <li v-for="event in day.shown" :key="keyOf(event)">
            <RouterLink
              :to="dayLink(day.date)"
              class="flex min-w-0 items-baseline gap-3 rounded-lg px-1 py-1 hover:bg-gray-900/[0.04] dark:hover:bg-white/[0.06]"
            >
              <span class="w-16 shrink-0 text-[13px] tabular-nums text-gray-500 dark:text-gray-400">{{ formatTimeRange(event.time) || 'All day' }}</span>
              <span class="min-w-0 truncate text-sm text-gray-900 dark:text-gray-100">{{ event.title || 'A gathering' }}</span>
            </RouterLink>
          </li>
          <li v-if="day.more">
            <RouterLink :to="dayLink(day.date)" class="block px-1 py-1 pl-20 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {{ day.more }} more
            </RouterLink>
          </li>
        </ul>
      </li>
    </ol>

    <p v-else class="mt-3 px-1 text-sm text-gray-500 dark:text-gray-400">Nothing on the calendar this week.</p>
  </section>
</template>

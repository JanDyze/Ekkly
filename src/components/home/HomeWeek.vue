<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatTimeRange } from '../../utils/sgUtils'

// The coming seven days, for the home of all apps on a desktop, as a compact
// timeline beside the day's work: only the days with something on, each a
// small label over its events, every event a time and a title in the same two
// columns, so the eye runs down the titles. Today's group is set off in the
// church's colour. The titles and times are what is read, so the day's label
// is small and said once, not a large block per day as it was.
//
// A preview, not the calendar: the first six events of the week, and the rest
// a link away (View all, and Open calendar for the month). Everything is the
// home's already (useToday), gated as it is.

const props = defineProps({
  // useToday's `week`: { date, day, isToday } for the coming seven.
  days: { type: Array, required: true },
  // useToday's `eventsThisWeek`, in date and time order.
  events: { type: Array, default: () => [] },
  limit: { type: Number, default: 6 },
})

const total = computed(() => props.events.filter((event) => props.days.some((day) => day.date === event.date)).length)

// The days with something on, the first `limit` events across them.
const agenda = computed(() => {
  let room = props.limit
  return props.days
    .map((day, i) => {
      const on = props.events.filter((event) => event.date === day.date)
      const [y, m, d] = day.date.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const shown = on.slice(0, Math.max(room, 0))
      room -= shown.length
      return {
        ...day,
        name: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'long' }),
        short: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        shown,
      }
    })
    .filter((day) => day.shown.length)
})
const hidden = computed(() => total.value - agenda.value.reduce((n, day) => n + day.shown.length, 0))

const dayLink = (date) => ({ name: 'Events', query: { date } })
const keyOf = (event) => `${event.id || event.title}:${event.date}:${event.time || ''}`
</script>

<template>
  <section aria-labelledby="home-week" class="overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
    <header class="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
      <h2 id="home-week" class="flex items-center gap-2.5 text-base font-semibold text-gray-900 dark:text-white">
        This week
        <span v-if="total" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">{{ total }}</span>
      </h2>
      <RouterLink to="/events/calendar" class="text-sm font-semibold text-primary hover:underline dark:text-primary-light">Open calendar</RouterLink>
    </header>

    <ol v-if="agenda.length" class="border-t border-gray-100 dark:border-white/10">
      <li
        v-for="day in agenda"
        :key="day.date"
        :class="['px-5 py-3 not-first:border-t not-first:border-gray-100 dark:not-first:border-white/10', day.isToday ? 'bg-primary/[0.06] dark:bg-primary-light/10' : '']"
      >
        <RouterLink
          :to="dayLink(day.date)"
          :class="[
            'text-xs font-semibold uppercase tracking-wide hover:underline',
            day.isToday ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
          ]"
        >
          {{ day.name }} · {{ day.short }}
        </RouterLink>
        <ul class="mt-1.5 flex flex-col gap-1">
          <li v-for="event in day.shown" :key="keyOf(event)">
            <RouterLink :to="dayLink(day.date)" class="group flex min-w-0 items-baseline gap-3 text-sm">
              <span class="w-[4.5rem] shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatTimeRange(event.time) || 'All day' }}</span>
              <span class="min-w-0 truncate font-medium text-gray-900 group-hover:underline dark:text-gray-100">{{ event.title || 'A gathering' }}</span>
            </RouterLink>
          </li>
        </ul>
      </li>
    </ol>

    <p v-else class="border-t border-gray-100 px-5 py-5 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">Nothing on the calendar this week.</p>

    <div v-if="hidden > 0" class="border-t border-gray-100 px-5 py-3 dark:border-white/10">
      <RouterLink :to="{ name: 'EventsUpcoming' }" class="text-sm font-semibold text-primary hover:underline dark:text-primary-light">
        View all {{ total }} this week
      </RouterLink>
    </div>
  </section>
</template>

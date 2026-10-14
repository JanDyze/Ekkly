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
// A day shows its first two things and how many more; the day's link opens
// all of it in Events, and Open calendar the month. A thing with a photo shows
// it, small, before its name. Everything is the home's already (useToday),
// gated as it is.

const props = defineProps({
  // useToday's `week`: { date, day, isToday } for the coming seven.
  days: { type: Array, required: true },
  // useToday's `eventsThisWeek`, in date and time order.
  events: { type: Array, default: () => [] },
})

// Two a day: a third on a busy week ran the column past the foot of a
// laptop's screen.
const SHOWN = 2

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
        weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
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
  <!-- A heading on the home's sky, as Today's columns have, over the week as
       one card: a list of days reads as one thing, not a card a day. -->
  <section aria-labelledby="home-week" class="flex min-h-0 flex-col gap-2">
    <div class="flex items-baseline justify-between gap-4 px-1 text-(--scene-ink)">
      <h2 id="home-week" class="text-[15px] font-semibold">This week</h2>
      <RouterLink to="/events/calendar" class="text-[13px] font-semibold underline-offset-2 hover:underline">Open calendar</RouterLink>
    </div>

    <div class="min-h-0 overflow-y-auto rounded-[20px] border border-gray-200 bg-white px-3 py-3.5 [scrollbar-width:thin] dark:border-gray-700 dark:bg-gray-800">
      <!-- A day each, its date as a calendar shows it down the left (today's
           in the church's colour) and what is on beside it, so the week reads
           down one edge at a glance rather than from small labels. -->
      <ol v-if="agenda.length" class="flex flex-col gap-3">
        <li v-for="day in agenda" :key="day.date" class="flex gap-3">
          <RouterLink
            :to="dayLink(day.date)"
            :aria-label="`${day.name}, ${day.short}, in Events`"
            :class="[
              'flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none transition-colors',
              day.isToday
                ? 'bg-primary text-white hover:bg-primary-hover dark:bg-primary-light dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15',
            ]"
          >
            <span class="text-[10px] font-bold uppercase tracking-wide">{{ day.weekday }}</span>
            <span class="mt-1 text-lg font-bold tabular-nums">{{ day.day }}</span>
          </RouterLink>
          <ul class="flex min-w-0 flex-1 flex-col justify-center">
            <li v-for="event in day.shown" :key="keyOf(event)">
              <RouterLink
                :to="dayLink(day.date)"
                class="flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-gray-900/[0.04] dark:hover:bg-white/[0.06]"
              >
                <img v-if="event.photo" :src="event.photo" alt="" class="size-7 shrink-0 rounded-lg object-cover" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{{ event.title || 'A gathering' }}</span>
                  <span class="block text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatTimeRange(event.time) || 'All day' }}</span>
                </span>
              </RouterLink>
            </li>
            <li v-if="day.more">
              <RouterLink :to="dayLink(day.date)" class="block px-1.5 py-0.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                {{ day.more }} more
              </RouterLink>
            </li>
          </ul>
        </li>
      </ol>

      <p v-else class="px-1 text-sm text-gray-500 dark:text-gray-400">Nothing on the calendar this week.</p>
    </div>
  </section>
</template>

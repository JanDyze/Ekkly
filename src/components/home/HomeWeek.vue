<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatTimeRange } from '../../utils/sgUtils'
import { useFitCount } from '../../composables/useFitCount'

// The coming seven days, for the home of all apps on a desktop, as a compact
// timeline beside the day's work: only the days with something on, each a
// small label over its events, every event a time and a title in the same two
// columns, so the eye runs down the titles. Today's group is set off in the
// church's colour. The titles and times are what is read, so the day's label
// is small and said once.
//
// A preview, not the calendar, on a home that keeps to one screen: the days
// and events are one list, as many rows shown as fit whole (useFitCount), a
// day's label never left without its first event under it, and the rest a
// link away (View all, and Open calendar for the month). Everything is the
// home's already (useToday), gated as it is.

const props = defineProps({
  // useToday's `week`: { date, day, isToday } for the coming seven.
  days: { type: Array, required: true },
  // useToday's `eventsThisWeek`, in date and time order.
  events: { type: Array, default: () => [] },
})

const keyOf = (event) => `${event.id || event.title}:${event.date}:${event.time || ''}`

// One row per day with something on, then one per event under it.
const rows = computed(() =>
  props.days.flatMap((day, i) => {
    const on = props.events.filter((event) => event.date === day.date)
    if (!on.length) return []
    const [y, m, d] = day.date.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const name = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'long' })
    const short = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return [
      { key: `day:${day.date}`, day: true, date: day.date, isToday: day.isToday, label: `${name} · ${short}` },
      ...on.map((event) => ({ key: keyOf(event), date: day.date, isToday: day.isToday, event })),
    ]
  })
)
const total = computed(() => rows.value.filter((row) => !row.day).length)

const list = ref(null)
const fit = useFitCount(list, rows)
// A day's label shows only with its first event under it.
const shown = (i) => i < fit.value && (!rows.value[i].day || i + 1 < fit.value)
const hidden = computed(() => rows.value.filter((row, i) => !row.day && !shown(i)).length)

const dayLink = (date) => ({ name: 'Events', query: { date } })
</script>

<template>
  <section aria-labelledby="home-week" class="@container flex min-h-0 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 pt-4 pb-3 dark:border-white/10">
      <h2 id="home-week" class="flex items-center gap-2.5 text-base font-semibold whitespace-nowrap text-gray-900 dark:text-white">
        This week
        <span v-if="total" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">{{ total }}</span>
      </h2>
      <!-- "Calendar" alone where the column is narrow, so the heading keeps to one line. -->
      <RouterLink to="/events/calendar" class="text-sm font-semibold whitespace-nowrap text-primary hover:underline dark:text-primary-light">
        <span class="hidden @[18rem]:inline">Open calendar</span><span class="@[18rem]:hidden">Calendar</span>
      </RouterLink>
    </header>

    <ol v-if="rows.length" ref="list" class="relative min-h-0 flex-1 overflow-hidden">
      <li
        v-for="(row, i) in rows"
        :key="row.key"
        :class="[
          'px-5',
          row.day ? 'pt-3 pb-1 not-first:border-t not-first:border-gray-100 dark:not-first:border-white/10' : 'pb-1.5 last:pb-3',
          row.isToday ? 'bg-primary/[0.06] dark:bg-primary-light/10' : '',
          shown(i) ? '' : 'invisible',
        ]"
        :aria-hidden="shown(i) ? undefined : 'true'"
      >
        <RouterLink
          v-if="row.day"
          :to="dayLink(row.date)"
          :class="[
            'text-xs font-semibold uppercase tracking-wide hover:underline',
            row.isToday ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
          ]"
        >
          {{ row.label }}
        </RouterLink>
        <RouterLink v-else :to="dayLink(row.date)" class="group flex min-w-0 items-baseline gap-3 text-sm">
          <span class="w-[4.5rem] shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ formatTimeRange(row.event.time) || 'All day' }}</span>
          <span class="min-w-0 truncate font-medium text-gray-900 group-hover:underline dark:text-gray-100">{{ row.event.title || 'A gathering' }}</span>
        </RouterLink>
      </li>
    </ol>

    <p v-else class="px-5 py-5 text-sm text-gray-600 dark:text-gray-300">Nothing on the calendar this week.</p>

    <div v-if="hidden > 0" class="shrink-0 border-t border-gray-100 px-5 py-2.5 dark:border-white/10">
      <RouterLink :to="{ name: 'EventsUpcoming' }" class="text-sm font-semibold text-primary hover:underline dark:text-primary-light">
        {{ hidden }} more this week
      </RouterLink>
    </div>
  </section>
</template>

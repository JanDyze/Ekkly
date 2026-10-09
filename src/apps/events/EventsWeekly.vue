<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useEventsOverview } from '../../composables/useEventsOverview'
import { usePermissions } from '../../composables/usePermissions'
import { WEEKDAYS, OCCURRENCES } from '../../composables/useRecurringSchedules'
import { isCalledOff } from '../../../lib/eventStatus'
import { getEventTypeDot } from '../../utils/eventColors'
import { clockLabel } from '../../utils/timeUtils'

// The gatherings that happen every week, and when — "when do you meet?", the
// first thing a newcomer asks and the thing a member forgets to tell them.
//
// Laid out as the week itself: Sunday to Saturday, a row a day, each
// gathering a line with its time first, so the shape of the week — a full
// Sunday, a Wednesday night, a quiet Monday — is seen before a word is read.
// It was a list of rows each spelling out a weekday, a time and a place, the
// weekday twice and the same sanctuary five times. A place is named now only
// where it is not the usual one, and that one is said once, under the week.
//
// They are the schedules kept in Settings, which put each one on the
// calendar week after week. Only an administrator changes them, there; for
// everyone else this is where they are read. Each line opens its next
// occurrence on the calendar.

const { schedulesLoading, weekly, ahead, usualPlace, placeOf } = useEventsOverview()
const { isAdmin } = usePermissions()

const todayIndex = new Date().getDay()

/** "1st and 3rd only", for one that skips weeks; nothing for every week. */
const weeksOf = (schedule) => {
  const weeks = (schedule.occurrences || [])
    .map((value) => OCCURRENCES.find((o) => o.value === value)?.label)
    .filter(Boolean)
  if (!weeks.length) return ''
  const list = weeks.length === 1 ? weeks[0] : `${weeks.slice(0, -1).join(', ')} and ${weeks[weeks.length - 1]}`
  return `${list} only`
}

/** Where its next occurrence is on the calendar, if it has one in view. */
const nextOf = (schedule) => {
  const next = ahead.value.find((e) => e.scheduleId === schedule.id && !isCalledOff(e))
  return next ? { name: 'Events', query: { date: next.date } } : null
}

/** The seven days, each with its gatherings in the order they start. */
const days = computed(() =>
  WEEKDAYS.map((day) => ({
    ...day,
    isToday: day.value === todayIndex,
    gatherings: weekly.value
      .filter((s) => Number(s.weekday) === day.value)
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
      .map((s) => ({
        key: s.firestoreId || s.id,
        title: s.title || 'Untitled',
        time: clockLabel(s.time),
        type: s.type,
        note: [placeOf(s), weeksOf(s)].filter(Boolean).join(' · '),
        to: nextOf(s),
      })),
  }))
)

const subtitle = computed(() => {
  if (schedulesLoading.value) return ''
  const n = weekly.value.length
  const on = days.value.filter((d) => d.gatherings.length).length
  return `${n} ${n === 1 ? 'gathering' : 'gatherings'}, ${on} ${on === 1 ? 'day' : 'days'} a week`
})

const note = computed(() => {
  const parts = []
  if (usualPlace.value) parts.push(`At ${usualPlace.value} unless it says otherwise.`)
  if (isAdmin.value) parts.push('Changed in Settings, under Schedule.')
  return parts.join(' ')
})
</script>

<template>
  <AppScreen title="Every week" :subtitle="subtitle" :back="{ name: 'EventsHome' }" root="/events">
    <div v-if="schedulesLoading" class="flex flex-col gap-2">
      <div v-for="n in 7" :key="n" class="h-12 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="weekly.length" title="When we meet" :note="note">
      <template v-if="isAdmin" #action>
        <RouterLink
          :to="{ path: '/settings', query: { section: 'schedule' } }"
          class="text-xs font-semibold text-primary hover:underline dark:text-primary-light"
        >
          Edit
        </RouterLink>
      </template>

      <div
        v-for="day in days"
        :key="day.value"
        :class="['flex gap-3 px-4', day.gatherings.length ? 'py-2.5' : 'py-1.5', day.isToday ? 'bg-primary/5 dark:bg-primary-light/5' : '']"
      >
        <!-- The day: filled on today, faint when nothing meets. -->
        <span
          :class="[
            'flex w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase leading-none',
            day.gatherings.length ? 'h-11' : 'h-7',
            day.isToday
              ? 'weekly-today bg-primary text-white'
              : day.gatherings.length
                ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                : 'text-gray-300 dark:text-gray-600',
          ]"
        >
          {{ day.short }}
        </span>

        <ul v-if="day.gatherings.length" class="flex min-w-0 flex-1 flex-col justify-center gap-1.5" :aria-label="day.label">
          <li v-for="gathering in day.gatherings" :key="gathering.key">
            <component
              :is="gathering.to ? RouterLink : 'div'"
              :to="gathering.to || undefined"
              :class="[
                'grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-2 rounded-lg',
                gathering.to ? '-mx-1.5 px-1.5 py-0.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/40' : '',
              ]"
            >
              <!-- Time first, in a column, so the day reads down like a timetable. -->
              <span class="text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">{{ gathering.time }}</span>
              <span class="min-w-0">
                <span class="flex min-w-0 items-center gap-2">
                  <span :class="['size-2 shrink-0 rounded-full', getEventTypeDot(gathering.type)]" aria-hidden="true" />
                  <span class="truncate text-[15px] font-medium text-gray-900 dark:text-white">{{ gathering.title }}</span>
                </span>
                <span v-if="gathering.note" class="mt-0.5 block truncate pl-4 text-xs text-gray-500 dark:text-gray-400">
                  {{ gathering.note }}
                </span>
              </span>
            </component>
          </li>
        </ul>
        <span v-else class="sr-only">{{ day.label }}: nothing meets</span>
      </div>
    </ListGroup>

    <ListGroup v-else>
      <ListRow
        title="Nothing meets every week yet"
        :subtitle="isAdmin ? 'Add the Sunday service and the rest in Settings, under Schedule' : ''"
        muted
      />
    </ListGroup>
  </AppScreen>
</template>

<style scoped>
/* White on the dark page's lighter accent all but disappears, so today's day
   goes deeper there instead, as DateTile's does. */
:global(.dark) .weekly-today {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

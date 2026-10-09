<script setup>
import { computed, ref } from 'vue'
import { CaretDown, Repeat } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { useEventsOverview } from '../../composables/useEventsOverview'
import { isCalledOff } from '../../../lib/eventStatus'
import { getEventTypeDot, CALLED_OFF_BADGE } from '../../utils/eventColors'
import { clockLabel as timeLabel } from '../../utils/timeUtils'

// What is on, in order: the next two months, this week first.
//
// It used to be every gathering as a row of its own — some fifty, and forty-odd
// of them the same six weekly services again, each spelling out its time and
// its place. What was worth reading (an outreach, a service moved to ten, one
// called off) looked exactly like the eighth Bible Study, and the page was a
// wall of words.
//
// So each week, and each month after that, now leads with what is out of the
// ordinary — a gathering typed in, a service at another time or place, an
// occasion, one called off — and folds the routine into a single line, "The
// usual", that opens to show it. A called-off gathering stays in, struck
// through and labelled: a service that vanishes without a word is how someone
// drives to a locked building. A place is only named when it is not the usual
// one. Every row opens its day on the calendar.

const { loading, today, ahead, differenceOf, placeOf, isRoutine } = useEventsOverview()

const dayAfter = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const shortDate = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** This week, next week, then a month at a time — each split into news and the routine. */
const groups = computed(() => {
  const endThis = dayAfter(6)
  const endNext = dayAfter(13)
  const byKey = new Map()
  ahead.value.forEach((event) => {
    const key = event.date <= endThis ? 'this' : event.date <= endNext ? 'next' : event.date.slice(0, 7)
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        title: key === 'this' ? 'This week' : key === 'next' ? 'Next week' : monthLabel(key),
        news: [],
        routine: [],
      })
    }
    const group = byKey.get(key)
    if (isRoutine(event)) group.routine.push(event)
    else group.news.push(event)
  })
  return [...byKey.values()]
})

/** "Sunday Service, Bible Study and 4 more" — each once, in the order they come. */
const namesOf = (events) => {
  const names = [...new Set(events.map((e) => e.title).filter(Boolean))]
  if (names.length <= 2) return names.join(' and ')
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
}

// Which groups have their routine open. Closed to begin with: the routine is
// what Every week is for, and here it is only the backdrop to the news.
const open = ref(new Set())
const toggle = (key) => {
  const next = new Set(open.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  open.value = next
}

const subtitle = computed(() => {
  if (loading.value) return ''
  const news = groups.value.reduce((n, g) => n + g.news.length, 0)
  const all = ahead.value.filter((e) => !isCalledOff(e)).length
  if (!news) return `${all} in the next two months, all as usual`
  return `${news} out of the ordinary, ${all} in all`
})

/** The quiet line: when, and where if it is not the usual place. */
const detailOf = (event) => [timeLabel(event.time), placeOf(event)].filter(Boolean).join(' · ')

/** For a service moved this once: what it is now, and what it usually is. */
const changeOf = (event) => {
  const change = differenceOf(event)
  if (!change) return null
  const { usual, timeMoved, placeMoved } = change
  return {
    now: [timeMoved && timeLabel(event.time), placeMoved && event.location].filter(Boolean).join(', '),
    usual: [timeMoved && timeLabel(usual.time), placeMoved && usual.location].filter(Boolean).join(', '),
  }
}

/** For one called off: where it went, or why. */
const offLineOf = (event) =>
  event.postponedTo ? `Moved to ${shortDate(event.postponedTo)}` : event.statusNote || detailOf(event)

const dayOf = (event) => ({ name: 'Events', query: { date: event.date } })
</script>

<template>
  <AppScreen title="Coming up" :subtitle="subtitle" :back="{ name: 'EventsHome' }" root="/events">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else-if="groups.length" class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.key" :title="group.title">
        <!-- What is out of the ordinary, in date order. -->
        <ListRow
          v-for="event in group.news"
          :key="`${event.id}-${event.date}`"
          :to="dayOf(event)"
          :title="event.title || 'Untitled'"
          :muted="isCalledOff(event)"
        >
          <template #leading>
            <DateTile :date="event.date" weekday :highlight="event.date === today" :past="isCalledOff(event)" />
          </template>

          <!-- The gathering's kind as a dot before its name, the one place its
               colour appears; a called-off one drops it with everything else. -->
          <template #title>
            <span v-if="isCalledOff(event)" class="line-through">{{ event.title || 'Untitled' }}</span>
            <span v-else class="flex min-w-0 items-center gap-2">
              <span :class="['size-2 shrink-0 rounded-full', getEventTypeDot(event.type)]" aria-hidden="true" />
              <span class="truncate">{{ event.title || 'Untitled' }}</span>
            </span>
          </template>

          <!-- What changed, said first: the new time or place in amber, and
               what it usually is after it. -->
          <template #subtitle>
            <template v-if="isCalledOff(event)">{{ offLineOf(event) }}</template>
            <template v-else-if="changeOf(event)">
              <span class="font-medium text-amber-700 dark:text-amber-400">Now {{ changeOf(event).now }}</span>
              · usually {{ changeOf(event).usual }}
            </template>
            <template v-else>{{ detailOf(event) }}</template>
          </template>

          <template v-if="isCalledOff(event)" #trailing>
            <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', CALLED_OFF_BADGE]">
              {{ event.status === 'postponed' ? 'Moved' : 'Called off' }}
            </span>
          </template>
        </ListRow>

        <!-- The routine, folded into one line that opens. -->
        <template v-if="group.routine.length">
          <ListRow
            :title="group.news.length ? 'And the usual' : 'The usual'"
            :subtitle="namesOf(group.routine)"
            :aria-expanded="open.has(group.key)"
            @click="toggle(group.key)"
          >
            <template #leading>
              <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <Repeat class="size-5" />
              </span>
            </template>
            <template #trailing>
              <span class="shrink-0 text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ group.routine.length }}</span>
              <CaretDown
                :class="['size-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500', open.has(group.key) ? 'rotate-180' : '']"
              />
            </template>
          </ListRow>

          <ListRow
            v-for="event in open.has(group.key) ? group.routine : []"
            :key="`${event.id}-${event.date}`"
            :to="dayOf(event)"
            :title="event.title || 'Untitled'"
            :subtitle="detailOf(event)"
            class="bg-gray-50/70 dark:bg-gray-900/30"
          >
            <template #leading>
              <DateTile :date="event.date" weekday :highlight="event.date === today" />
            </template>
          </ListRow>
        </template>
      </ListGroup>
    </div>

    <ListGroup v-else>
      <ListRow title="Nothing on the calendar in the next two months" muted />
    </ListGroup>
  </AppScreen>
</template>

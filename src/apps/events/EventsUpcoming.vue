<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { useEventsOverview } from '../../composables/useEventsOverview'
import { isCalledOff } from '../../../lib/eventStatus'
import { clockLabel as timeLabel } from '../../utils/timeUtils'

// What is on, in order: the next two months as a list, this week first.
//
// The calendar answers "what is on this month, and how is it shaped"; on a
// phone its days are small and its titles cut short, and "what is on next" is
// the question most people bring. This answers it in a list that reads top to
// bottom, each gathering with its day, its time and where. A gathering called
// off stays in, struck through and labelled, as on the calendar — a service
// that vanishes without a word is how someone drives to a locked building.
// Each opens its day on the calendar.

const { loading, ahead, today } = useEventsOverview()

const dayAfter = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** This week, next week, then a month at a time. */
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
        events: [],
      })
    }
    byKey.get(key).events.push(event)
  })
  return [...byKey.values()]
})

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = ahead.value.filter((e) => !isCalledOff(e)).length
  return `${n} in the next two months`
})

const detailOf = (event) =>
  [event.date === today ? 'Today' : '', timeLabel(event.time), event.location].filter(Boolean).join(' · ')

const dayOf = (event) => ({ name: 'Events', query: { date: event.date } })
</script>

<template>
  <AppScreen title="Coming up" :subtitle="subtitle" :back="{ name: 'EventsHome' }" root="/events">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else-if="groups.length" class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.key" :title="group.title" :count="group.events.length">
        <ListRow
          v-for="event in group.events"
          :key="`${event.id}-${event.date}`"
          :to="dayOf(event)"
          :title="event.title || 'Untitled'"
          :subtitle="detailOf(event)"
          :muted="isCalledOff(event)"
        >
          <template #leading>
            <DateTile :date="event.date" :highlight="event.date === today" :past="isCalledOff(event)" />
          </template>
          <template v-if="isCalledOff(event)" #title>
            <span class="line-through">{{ event.title || 'Untitled' }}</span>
          </template>
          <template v-if="isCalledOff(event)" #trailing>
            <span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              {{ event.status === 'postponed' ? 'Moved' : 'Called off' }}
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>

    <ListGroup v-else>
      <ListRow title="Nothing on the calendar in the next two months" muted />
    </ListGroup>
  </AppScreen>
</template>

<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useEventsOverview } from '../../composables/useEventsOverview'
import { usePermissions } from '../../composables/usePermissions'
import { WEEKDAYS, OCCURRENCES } from '../../composables/useRecurringSchedules'
import { clockLabel } from '../../utils/timeUtils'

// The gatherings that happen every week, and when — "when do you meet?", the
// first thing a newcomer asks and the thing a member forgets to tell them.
//
// They are the schedules kept in Settings, which put each one on the
// calendar week after week. Only an administrator changes them, there; for
// everyone else this is where they are read.

const { schedulesLoading, weekly } = useEventsOverview()
const { isAdmin } = usePermissions()

/** "Sundays", or "1st and 3rd Sundays", or "Last Sunday" for one that skips weeks. */
const whenOf = (schedule) => {
  const day = WEEKDAYS[schedule.weekday]?.label || ''
  const weeks = (schedule.occurrences || [])
    .map((value) => OCCURRENCES.find((o) => o.value === value)?.label)
    .filter(Boolean)
  if (!weeks.length) return `${day}s`
  const list = weeks.length === 1 ? weeks[0] : `${weeks.slice(0, -1).join(', ')} and ${weeks[weeks.length - 1]}`
  return `${list} ${day}${weeks.length === 1 ? '' : 's'}`
}

const detailOf = (schedule) => [clockLabel(schedule.time), schedule.location].filter(Boolean).join(' · ')

const subtitle = computed(() => {
  if (schedulesLoading.value) return ''
  const n = weekly.value.length
  return `${n} ${n === 1 ? 'gathering' : 'gatherings'}`
})
</script>

<template>
  <AppScreen title="Every week" :subtitle="subtitle" :back="{ name: 'EventsHome' }" root="/events">
    <div v-if="schedulesLoading" class="flex flex-col gap-2">
      <div v-for="n in 3" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup
      v-else-if="weekly.length"
      title="When we meet"
      :note="isAdmin ? 'Changed in Settings, under Schedule; each one puts itself on the calendar.' : ''"
    >
      <ListRow
        v-for="schedule in weekly"
        :key="schedule.firestoreId || schedule.id"
        :to="isAdmin ? { path: '/settings', query: { section: 'schedule' } } : null"
        :title="schedule.title || 'Untitled'"
        :subtitle="detailOf(schedule)"
      >
        <template #leading>
          <span class="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light">
            <span class="text-[11px] font-bold uppercase">{{ WEEKDAYS[schedule.weekday]?.short }}</span>
          </span>
        </template>
        <template #trailing>
          <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{{ whenOf(schedule) }}</span>
        </template>
      </ListRow>
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

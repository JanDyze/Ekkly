<script setup>
import { computed } from 'vue'
import { Users } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useSmallGroupsOverview } from '../../composables/useSmallGroupsOverview'
import { formatRelativeSessionDate, sessionTotals } from '../../utils/sgUtils'

// Every session every group has logged, newest month first: which group met,
// what it studied, and how many came. A group's own page lists its own; this
// is the church-wide view a pastor looks at on a Monday — who met last week,
// and how full it was.
//
// Above them, for a leader, the meetings of theirs this week that were never
// logged, in amber: the count on this section's door on the home.

const { loading, groups, sessions, unlogged, idOf } = useSmallGroupsOverview()

const groupName = (id) => groups.value.find((g) => idOf(g) === id)?.name || 'Small group'

const byMonth = computed(() => {
  const months = new Map()
  for (const session of sessions.value) {
    const date = new Date(`${String(session.date).slice(0, 10)}T00:00:00`)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(key)) months.set(key, { key, label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), sessions: [] })
    months.get(key).sessions.push(session)
  }
  return [...months.values()].sort((a, b) => b.key.localeCompare(a.key))
})

const lineOf = (session) =>
  [formatRelativeSessionDate(session.date), session.lesson?.title].filter(Boolean).join(' · ')
const weekdayOf = (day) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = sessions.value.length
  return `${n.toLocaleString()} ${n === 1 ? 'session' : 'sessions'}`
})
</script>

<template>
  <AppScreen title="Sessions" :subtitle="subtitle" :back="{ name: 'SmallGroupsHome' }" root="/small-groups">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <!-- Yours, not logged: each opens the group, where the form is. -->
      <ListGroup v-if="unlogged.length" title="Not logged yet" :count="unlogged.length">
        <ListRow
          v-for="{ group, day } in unlogged"
          :key="`${idOf(group)}:${day}`"
          :to="{ name: 'SmallGroupDetails', params: { id: idOf(group) } }"
          :title="`${weekdayOf(day)}’s session`"
          :subtitle="group.name"
          warn
        />
      </ListGroup>

      <ListGroup v-if="!sessions.length">
        <ListRow title="No sessions yet" subtitle="A group’s leader logs each meeting from the group’s page." muted />
      </ListGroup>

      <ListGroup v-for="month in byMonth" :key="month.key" :title="month.label" :count="month.sessions.length">
        <ListRow
          v-for="session in month.sessions"
          :key="session.id"
          :to="{ name: 'SgSessionDetails', params: { id: session.groupId, sessionId: session.id } }"
          :title="groupName(session.groupId)"
          :subtitle="lineOf(session)"
        >
          <template #trailing>
            <span class="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400" :aria-label="`${sessionTotals(session).total} came`">
              <Users class="size-4" />
              {{ sessionTotals(session).total }}
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>

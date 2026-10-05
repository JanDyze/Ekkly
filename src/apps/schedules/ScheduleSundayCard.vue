<script setup>
import { computed } from 'vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { isSundayPlanned } from '../../composables/useLineups'
import { findRosterMember } from '../../utils/lineupUtils'
import { SONG_LEADER_ROLE, assignmentsOf, peopleOnService } from '../../data/scheduleRoles'
import { getDisplayName } from '../../utils/memberUtils'

// One Sunday on the Calendar, as one row of the month's list (ListGroup): the
// date, then one strong line — the theme, or who leads — and one quiet line —
// who leads, how many serve, how many songs, and for whoever plans, what is
// still empty. Everything else is a tap away on the Sunday's own screen.
//
// A Sunday nobody has planned says so, in amber for whoever plans, and opens
// straight into planning it. In search results, which span months, the quiet
// line is what matched instead.

const props = defineProps({
  sunday: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  // The roles the person looking holds on it.
  myRoles: { type: Array, default: () => [] },
  canPlan: { type: Boolean, default: false },
  past: { type: Boolean, default: false },
  // In search results: what matched, already worded.
  matches: { type: Array, default: null },
})

const planned = computed(() => isSundayPlanned(props.sunday))
const assignments = computed(() => assignmentsOf(props.sunday))
const crew = computed(() => peopleOnService(props.sunday).filter((id) => findRosterMember(props.members, id)).length)

const leader = computed(() => {
  const member = findRosterMember(props.members, assignments.value[SONG_LEADER_ROLE]?.[0])
  return member ? getDisplayName(member) : ''
})

const empty = computed(() =>
  props.canPlan && !props.past ? props.roles.filter((role) => !(assignments.value[role.id] || []).length) : []
)

const title = computed(() => {
  if (!planned.value) return 'Not planned yet'
  return props.sunday.theme || (leader.value ? `${leader.value} leading` : `${crew.value} serving`)
})

const subtitle = computed(() => {
  if (props.matches?.length) return props.matches.join(' · ')
  if (!planned.value) return props.canPlan && !props.past ? 'Tap to plan it' : ''
  // Short, and never the strong line again: who leads unless that is the
  // title, how many serve unless that is the title, the songs, and for
  // whoever plans how many roles are still open — the Sunday itself lists
  // which.
  const parts = []
  if (props.sunday.theme && leader.value) parts.push(`${leader.value} leading`)
  if (props.sunday.theme || leader.value) parts.push(`${crew.value} serving`)
  const songs = props.sunday.songs?.length || 0
  if (songs) parts.push(`${songs} song${songs === 1 ? '' : 's'}`)
  if (empty.value.length) parts.push(`${empty.value.length} role${empty.value.length === 1 ? '' : 's'} open`)
  return parts.join(' · ')
})

const link = computed(() => ({
  name: 'SchedulesSunday',
  params: { date: props.sunday.date },
  ...(!planned.value && props.canPlan && !props.past ? { query: { edit: '1' } } : {}),
}))
</script>

<template>
  <ListRow
    :to="link"
    :title="title"
    :subtitle="subtitle"
    :warn="!planned && canPlan && !past"
    :muted="!planned && !(canPlan && !past)"
  >
    <template #leading>
      <DateTile :date="sunday.date" :past="past" :highlight="myRoles.length > 0 && !past" />
    </template>
  </ListRow>
</template>

<script setup>
import { computed } from 'vue'
import { ClipboardCheck } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import TeamDutiesCard from '../../components/schedules/TeamDutiesCard.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import { usePermissions } from '../../composables/usePermissions'
import { useRecurringSchedules } from '../../composables/useRecurringSchedules'
import { rolesOfTeam } from '../../data/scheduleTeams'
import { assignmentsOf } from '../../data/scheduleRoles'
import { findRosterMember, formatShortDate } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'

// The ushers' section: this Sunday's jobs, ticked off as the morning goes,
// the head count for the service, and who is on the door each Sunday.
//
// The jobs are a list the team keeps once and does every week — the recurring
// part of ushering — so a new usher can see what Sunday involves without
// being told. The head count is not kept here: it goes straight into
// Attendance, against the Sunday service, where the church already reads it.

const { loading, roles, comingSundays, canPlanTeam, myRolesOn } = useScheduleOverview()
const { members } = useMembers()
const { can } = usePermissions()
const { schedules } = useRecurringSchedules()

const teamRoles = computed(() => rolesOfTeam(roles.value, 'ushers'))
const canPlan = computed(() => canPlanTeam('ushers'))

const thisSunday = computed(() => comingSundays.value[0] || null)

/** Everyone on the door that Sunday, by the name they go by. */
const crewOf = (sunday) => {
  const all = assignmentsOf(sunday)
  const ids = [...new Set(teamRoles.value.flatMap((role) => all[role.id] || []))]
  return ids.map((id) => findRosterMember(members.value, id)).filter(Boolean).map(getDisplayName)
}

// Ticking is for whoever is on the door that Sunday, and whoever plans it.
const canTick = computed(() => {
  if (canPlan.value) return true
  if (!thisSunday.value) return false
  const ids = new Set(teamRoles.value.map((r) => r.id))
  return myRolesOn(thisSunday.value).some((role) => ids.has(role.id))
})

/**
 * The Sunday service's own attendance record for that date, which is where a
 * head count belongs: the same gathering the calendar and the Attendance page
 * already know, so the number lands beside every other Sunday's.
 */
const headCountLink = computed(() => {
  if (!thisSunday.value || !can('attendance.manage')) return null
  const enabled = schedules.value.filter((s) => s.enabled !== false && s.weekday === 0)
  const service = enabled.find((s) => s.type === 'worship') || enabled[0]
  if (!service) return { name: 'Attendance' }
  return { name: 'RecordAttendance', query: { key: `recurring-${service.id}-${thisSunday.value.date}` } }
})
</script>

<template>
  <AppScreen title="Ushers" subtitle="Who is on the door, and the Sunday jobs" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <div class="flex flex-col gap-5">
      <div v-if="loading" class="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <template v-else>
        <TeamDutiesCard
          v-if="thisSunday"
          team="ushers"
          :date="thisSunday.date"
          :can-tick="canTick"
          :can-edit="canPlan"
          :title="`Jobs for ${formatShortDate(thisSunday.date)}`"
        />

        <ListGroup v-if="headCountLink">
          <ListRow :to="headCountLink" title="Record the head count" subtitle="It goes into Attendance for the service">
            <template #leading>
              <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <ClipboardCheck class="size-5" />
              </span>
            </template>
          </ListRow>
        </ListGroup>

        <ListGroup title="On the door" :count="comingSundays.length">
          <ListRow
            v-for="sunday in comingSundays"
            :key="sunday.date"
            :to="{ name: 'SchedulesSunday', params: { date: sunday.date } }"
            :title="crewOf(sunday).length ? crewOf(sunday).join(', ') : 'Nobody yet'"
            :warn="!crewOf(sunday).length && canPlan"
            :muted="!crewOf(sunday).length && !canPlan"
          >
            <template #leading><DateTile :date="sunday.date" :highlight="myRolesOn(sunday).length > 0" /></template>
          </ListRow>
        </ListGroup>
      </template>
    </div>
  </AppScreen>
</template>

<script setup>
import { computed } from 'vue'
import { ListMusic, ProjectorScreen } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import { usePermissions } from '../../composables/usePermissions'
import { SONG_LEADER_ROLE, assignmentsOf } from '../../data/scheduleRoles'
import { findRosterMember } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'

// The worship team's section: each Sunday coming up, as who leads and what is
// sung, a line each. A Sunday opens on its own screen, where the team's Plan
// is. The words go on the screen from the same plan, in Presentation.

const { loading, comingSundays, canPlanTeam, myRolesOn } = useScheduleOverview()
const { members } = useMembers()
const { can } = usePermissions()

const canPlan = computed(() => canPlanTeam('worship'))

const leaderOf = (sunday) => {
  const member = findRosterMember(members.value, assignmentsOf(sunday)[SONG_LEADER_ROLE]?.[0])
  return member ? getDisplayName(member) : ''
}

const isMine = (sunday) => myRolesOn(sunday).length > 0

const songsLine = (sunday) => {
  const songs = sunday.songs || []
  if (!songs.length) return 'No songs yet'
  const titles = songs.slice(0, 2).map((s) => s.title).join(', ')
  return `${songs.length} song${songs.length === 1 ? '' : 's'} · ${titles}${songs.length > 2 ? '…' : ''}`
}
</script>

<template>
  <AppScreen title="Worship" subtitle="Who leads, and what is sung" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <div class="flex flex-col gap-5">
      <div v-if="loading" class="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />

      <ListGroup v-else title="Coming up" :count="comingSundays.length">
        <ListRow
          v-for="sunday in comingSundays"
          :key="sunday.date"
          :to="{ name: 'SchedulesSunday', params: { date: sunday.date } }"
          :title="leaderOf(sunday) ? `${leaderOf(sunday)} leading` : 'Nobody leading yet'"
          :warn="!leaderOf(sunday) && canPlan"
          :muted="!leaderOf(sunday) && !canPlan"
          :subtitle="songsLine(sunday)"
        >
          <template #leading><DateTile :date="sunday.date" :highlight="isMine(sunday)" /></template>
        </ListRow>
      </ListGroup>

      <ListGroup>
        <ListRow v-if="can('songs.view')" to="/songs" title="Song list" subtitle="Every song, its keys and its words">
          <template #leading>
            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <ListMusic class="size-5" />
            </span>
          </template>
        </ListRow>
        <ListRow to="/presentation" title="On the screen" subtitle="The words, for the tech team">
          <template #leading>
            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <ProjectorScreen class="size-5" />
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>

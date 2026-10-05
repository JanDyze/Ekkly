<script setup>
import { computed, ref } from 'vue'
import { UserCheck } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { formatServiceDate, todayIso } from '../../utils/lineupUtils'

// Every service this account is on, across every month on file.
//
// "When am I on?" is the question most visits to Schedules are, and it used to
// be answered by searching your own name. It is a section now: the turns still
// to come, soonest first, each saying what you are doing, with the ones
// already served folded away underneath.

const { loading, myMember, myTurns, myUpcoming, myRolesOn } = useScheduleOverview()

const today = todayIso()

// Most recent first, and only the last few: what you did last month is worth a
// glance, what you did last year is not what this section is for.
const past = computed(() =>
  myTurns.value
    .filter((s) => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
)

const showPast = ref(false)

const subtitle = computed(() => {
  if (!myMember.value) return 'Not linked to anyone on the roll'
  const n = myUpcoming.value.length
  return n ? `${n} coming up` : 'None coming up'
})
</script>

<template>
  <AppScreen title="My turns" :subtitle="subtitle" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <div v-if="loading" class="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />

    <!-- An account not tied to anybody on the roll has no turns to find. -->
    <div v-else-if="!myMember" class="p-8 text-center text-gray-500 dark:text-gray-400">
      <UserCheck class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-base font-medium text-gray-700 dark:text-gray-300">Your account is not linked to anyone on the roll</p>
      <p class="mx-auto mt-1 max-w-xs text-sm">Once it is, every Sunday you are on shows here.</p>
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup title="Coming up" :count="myUpcoming.length || null">
        <ListRow
          v-for="(turn, index) in myUpcoming"
          :key="turn.date"
          :to="{ name: 'SchedulesSunday', params: { date: turn.date } }"
          :title="myRolesOn(turn).map((r) => r.name).join(' · ')"
          :subtitle="[formatServiceDate(turn.date), turn.theme, turn.draft ? 'draft' : ''].filter(Boolean).join(' · ')"
        >
          <template #leading><DateTile :date="turn.date" :highlight="index === 0" /></template>
        </ListRow>
        <ListRow v-if="!myUpcoming.length" title="You are not on any Sunday coming up" subtitle="When you are put on one, it shows here." muted />
      </ListGroup>

      <!-- Already served, folded away -->
      <ListGroup v-if="past.length" title="Served lately" :count="past.length">
        <template #action>
          <button
            type="button"
            class="-my-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
            @click="showPast = !showPast"
          >
            {{ showPast ? 'Hide' : 'Show' }}
          </button>
        </template>
        <template v-if="showPast">
          <ListRow
            v-for="turn in past"
            :key="turn.date"
            :to="{ name: 'SchedulesSunday', params: { date: turn.date } }"
            :title="myRolesOn(turn).map((r) => r.name).join(' · ')"
            :subtitle="formatServiceDate(turn.date)"
          >
            <template #leading><DateTile :date="turn.date" past /></template>
          </ListRow>
        </template>
        <ListRow v-else :title="`${past.length} Sunday${past.length === 1 ? '' : 's'}`" muted @click="showPast = true" />
      </ListGroup>
    </div>
  </AppScreen>
</template>

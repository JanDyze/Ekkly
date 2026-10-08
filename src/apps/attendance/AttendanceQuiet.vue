<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { useAttendanceOverview } from '../../composables/useAttendanceOverview'
import { getFullName } from '../../utils/memberUtils'

// People who used to come and have not been marked present in three weeks or
// more, longest away first.
//
// The one pastoral fact attendance holds, and the one a list organised by
// gathering can never show: it is about people, not services. Only people who
// have been marked present at least once are here — someone never seen in any
// count is far more likely a gap in the counting than someone who has
// stopped coming (useAttendanceStats). Each opens their record, where their
// number is.

const { loading, quietPeople } = useAttendanceOverview()

const sinceOf = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

const weeksOf = (date) => {
  if (!date) return 0
  return Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / (7 * 86400000))
}

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = quietPeople.value.length
  return n ? `${n} not seen in three weeks or more` : 'Everyone has been lately'
})

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
</script>

<template>
  <AppScreen title="Not seen lately" :subtitle="subtitle" :back="{ name: 'AttendanceHome' }" root="/attendance">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup
      v-else-if="quietPeople.length"
      title="Longest away first"
      :count="quietPeople.length"
      note="Only people who have been counted before. A call or a visit is often all it takes."
    >
      <ListRow
        v-for="row in quietPeople"
        :key="row.id"
        :to="recordOf(row.member)"
        :title="getFullName(row.member)"
        :subtitle="`Last seen ${sinceOf(row.date)}`"
      >
        <template #leading>
          <MemberAvatar :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
        </template>
        <template #trailing>
          <span class="shrink-0 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {{ weeksOf(row.date) }} wk
          </span>
        </template>
      </ListRow>
    </ListGroup>

    <ListGroup v-else>
      <ListRow title="Everyone has been lately" muted />
    </ListGroup>
  </AppScreen>
</template>

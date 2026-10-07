<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview, whenOfBirthday as whenOf } from '../../composables/usePeopleOverview'
import { getFullName, isBlankDetail } from '../../utils/memberUtils'

// Whose birthday is coming, a month ahead.
//
// It used to be a sort on the roll — by birthday, this month first — which
// answered the question only after choosing the sort and scrolling past the
// people whose day had already gone. Here it is the question itself: today,
// the rest of this week, and the weeks after, each saying how old they turn.

const { loading, members, birthdays, canEdit } = usePeopleOverview()

const groups = computed(() =>
  [
    { key: 'today', title: 'Today', rows: birthdays.value.filter((r) => r.days === 0) },
    { key: 'week', title: 'This week', rows: birthdays.value.filter((r) => r.days >= 1 && r.days <= 6) },
    { key: 'later', title: 'Coming up', rows: birthdays.value.filter((r) => r.days >= 7) },
  ].filter((group) => group.rows.length)
)

const undated = computed(() => members.value.filter((m) => isBlankDetail(m.dateOfBirth)).length)

const undatedNote = computed(() => {
  if (!undated.value) return ''
  const who = `${undated.value} ${undated.value === 1 ? 'person has' : 'people have'} no birthday on file`
  return canEdit.value ? `${who}. Missing info lists them.` : `${who}.`
})

const subtitle = computed(() => {
  const n = birthdays.value.length
  return n ? `${n} in the next month` : 'None in the next month'
})

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
</script>

<template>
  <AppScreen title="Birthdays" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/members">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup
        v-for="(group, index) in groups"
        :key="group.key"
        :title="group.title"
        :count="group.rows.length"
        :note="index === groups.length - 1 ? undatedNote : ''"
      >
        <ListRow
          v-for="row in group.rows"
          :key="row.member.firestoreId || row.member.id"
          :to="recordOf(row.member)"
          :title="getFullName(row.member)"
          :subtitle="row.turning ? `Turns ${row.turning}` : ''"
        >
          <template #leading>
            <MemberAvatar :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
          </template>
          <template #trailing>
            <span
              :class="[
                'shrink-0 text-sm font-semibold',
                row.days === 0 ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
              ]"
            >
              {{ whenOf(row.days) }}
            </span>
          </template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="!groups.length" :note="undatedNote">
        <ListRow title="No birthdays in the next month" muted />
      </ListGroup>
    </div>
  </AppScreen>
</template>

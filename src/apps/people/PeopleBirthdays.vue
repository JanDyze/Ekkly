<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import DeskTable from '../../components/appframe/DeskTable.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview, whenOfBirthday as whenOf } from '../../composables/usePeopleOverview'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { getFullName, isBlankDetail, nicknameOf } from '../../utils/memberUtils'

// Whose birthday is coming, a month ahead.
//
// It used to be a sort on the roll — by birthday, this month first — which
// answered the question only after choosing the sort and scrolling past the
// people whose day had already gone. Here it is the question itself: today,
// the rest of this week, and the weeks after, each saying how old they turn.
//
// A phone reads it as a list. A desktop reads it as a table, the date and the
// age it is in columns down the page rather than a card per person.

const { loading, members, birthdays, canEdit } = usePeopleOverview()
// The table on a desktop, the lists on a phone.
const desk = useMediaQuery('(min-width: 1024px)')

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

const keyOf = (member) => member.firestoreId || member.id
const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })

/* ------------------------------------------------------------ the table */

/** "Wed, 22 Oct": the day it falls on this time round. */
const dayOf = (days) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

const countdown = (days) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`)

// Sized to fit beside the rail on the narrowest desktop (a table this short
// never scrolls sideways): the name gives way first, the rest are as wide as
// what they say.
const columns = [
  { key: 'person', label: 'Name', width: 'minmax(12rem, 2fr)' },
  { key: 'turning', label: 'Turns', width: '4.5rem' },
  { key: 'day', label: 'Date', width: 'minmax(7rem, 9rem)' },
  { key: 'when', label: 'When', width: '6.5rem', align: 'right' },
]

const tableGroups = computed(() =>
  groups.value.map((group) => ({ key: group.key, label: group.title, count: group.rows.length, rows: group.rows }))
)
</script>

<template>
  <!-- On a desktop the page holds still and the table scrolls its own rows. -->
  <AppScreen title="Birthdays" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/people" desk :fill="desk">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <!-- A desk: one table, the date and the age in columns. -->
    <template v-else-if="desk && groups.length">
      <DeskTable
        label="Birthdays in the next month"
        :columns="columns"
        :groups="tableGroups"
        :row-key="(row) => keyOf(row.member)"
        :row-to="(row) => recordOf(row.member)"
        fill
      >
        <template #cell-person="{ row }">
          <span class="flex min-w-0 items-center gap-3">
            <MemberAvatar :member="row.member" alt="" size="h-9 w-9" class="shrink-0" />
            <span class="min-w-0">
              <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ getFullName(row.member) }}</span>
              <span v-if="nicknameOf(row.member)" class="block truncate text-xs text-gray-500 dark:text-gray-400">“{{ nicknameOf(row.member) }}”</span>
            </span>
          </span>
        </template>
        <template #cell-turning="{ row }">
          <span class="tabular-nums">{{ row.turning ?? '—' }}</span>
        </template>
        <template #cell-day="{ row }">
          <span class="tabular-nums">{{ dayOf(row.days) }}</span>
        </template>
        <template #cell-when="{ row }">
          <span
            :class="[
              'font-semibold tabular-nums',
              row.days === 0 ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ countdown(row.days) }}
          </span>
        </template>
      </DeskTable>
      <p v-if="undatedNote" class="mt-3 px-1 text-xs text-gray-500 dark:text-gray-400">{{ undatedNote }}</p>
    </template>

    <!-- A phone: today, this week and the weeks after, as lists. -->
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
          :key="keyOf(row.member)"
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

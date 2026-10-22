<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import DeskTable from '../../components/appframe/DeskTable.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { usePeopleGroups } from '../../composables/usePeopleGroups'
import { getFullName, nicknameOf } from '../../utils/memberUtils'
import { ageOf, groupByBand } from '../../utils/ageBands'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { facetFromQuery, facetPeople, facetTitle } from '../../utils/peopleFacets'

// One ministry's people, under the same age headings the roll uses, so "the
// youth in the choir" reads without counting. The people in no ministry at
// all are shown here too (PeopleUnplaced), the same way, and the people
// behind any figure on Overview (PeopleFacet: its query says which, through
// utils/peopleFacets.js, the same reading Overview counts by).
//
// Putting people in or out of a ministry is not done here. A ministry grants
// access, so it is changed on a person's record or from a deliberate
// selection on the roll, which both say what it hands out first.

const route = useRoute()
const { loading: peopleLoading, members, ministries, unplaced, unplacedToAsk } = usePeopleOverview()
// The members in no small group, asked the same way (PeopleUngrouped).
const { loading: groupsLoading, ungrouped, groups: smallGroups } = usePeopleGroups()
const isUngrouped = computed(() => route.name === 'PeopleUngrouped')

// A figure from Overview, and the people behind it.
const isFacet = computed(() => route.name === 'PeopleFacet')
const facet = computed(() => (isFacet.value ? facetFromQuery(route.query) : {}))
const facetList = computed(() => {
  if (!isFacet.value) return []
  const groupedKeys = new Set(smallGroups.value.flatMap((group) => group.people.map((m) => String(m.firestoreId || m.id))))
  return facetPeople(members.value, facet.value, { ministryNames: ministries.value.map((m) => m.name), groupedKeys })
})

const loading = computed(
  () => peopleLoading.value || ((isUngrouped.value || (isFacet.value && facet.value.grouped)) && groupsLoading.value)
)

const isUnplaced = computed(() => route.name === 'PeopleUnplaced')
// Opened from the People home's "Not serving yet" card (?ask=1), the list is
// the people that card counted — members past the Kids band — so the number
// on the card is the number here.
const askOnly = computed(() => isUnplaced.value && route.query.ask === '1')
const name = computed(() =>
  isFacet.value
    ? facetTitle(facet.value)
    : isUngrouped.value
      ? 'Not in a small group'
      : isUnplaced.value
        ? 'Not in a ministry'
        : String(route.params.name || '')
)
const ministry = computed(() =>
  isFacet.value
    ? { name: name.value, people: facetList.value }
    : isUngrouped.value
    ? { name: name.value, people: ungrouped.value }
    : isUnplaced.value
    ? { name: name.value, people: askOnly.value ? unplacedToAsk.value : unplaced.value }
    : ministries.value.find((m) => m.name.toLowerCase() === name.value.toLowerCase()) || null
)
const people = computed(() => ministry.value?.people || [])
const groups = computed(() => groupByBand(people.value))

const subtitle = computed(() => {
  if (loading.value) return ''
  if (!ministry.value) return 'Not a ministry the church keeps'
  const n = people.value.length
  if (askOnly.value || isUngrouped.value) return `${n} ${n === 1 ? 'member' : 'members'}, not counting kids`
  return `${n} ${n === 1 ? 'person' : 'people'}`
})

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })

/* ------------------------------------------------------------ the table */

// On a desktop the same people as a table: what a ministry's leader reaches
// for when they open it (how old, member or not, the number to ring, and
// where else they serve) in columns, rather than a card a person.
const desk = useMediaQuery('(min-width: 1024px)')

// Where else each serves: the ministries other than this one, or, for the
// people in none, their tags, which is all there is to go on. A figure's
// people (a facet) are in no one ministry, so it is every one they are in.
const elsewhere = (member) => {
  if (isUnplaced.value || isUngrouped.value) return (member.tags || []).join(', ')
  if (isFacet.value) return (member.ministries || []).join(', ')
  const here = name.value.toLowerCase()
  return (member.ministries || []).filter((m) => String(m).toLowerCase() !== here).join(', ')
}

const columns = computed(() => [
  { key: 'person', label: 'Name', width: 'minmax(14rem, 2fr)' },
  { key: 'age', label: 'Age', width: '5rem' },
  { key: 'status', label: 'On the roll as', width: '7.5rem', min: 720 },
  { key: 'phone', label: 'Number', width: 'minmax(8rem, 1fr)', min: 860 },
  {
    key: 'elsewhere',
    label: isUnplaced.value || isUngrouped.value ? 'Tags' : isFacet.value ? 'Ministries' : 'Also serves in',
    width: 'minmax(9rem, 1.4fr)',
    min: 1000,
  },
])

const tableGroups = computed(() =>
  groups.value.map((group) => ({
    key: group.band.key,
    label: group.band.label,
    count: group.members.length,
    dot: group.band.dotClass,
    rows: group.members,
  }))
)
</script>

<template>
  <AppScreen
    :title="ministry?.name || name"
    :subtitle="subtitle"
    :back="isFacet ? { name: 'PeopleGlance' } : isUngrouped ? { name: 'PeopleMinistries', query: { tab: 'groups' } } : { name: 'PeopleMinistries' }"
    root="/people"
    desk
    :fill="desk"
  >
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <!-- A desk: one table, grouped by age as the phone's lists are. -->
    <DeskTable
      v-else-if="desk && groups.length"
      :label="ministry?.name || name"
      :columns="columns"
      :groups="tableGroups"
      :row-key="(member) => member.firestoreId || member.id"
      :row-to="recordOf"
      fill
    >
      <template #cell-person="{ row }">
        <span class="flex min-w-0 items-center gap-3">
          <MemberAvatar :member="row" alt="" size="h-9 w-9" class="shrink-0" />
          <span class="min-w-0">
            <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ getFullName(row) }}</span>
            <span v-if="nicknameOf(row)" class="block truncate text-xs text-gray-500 dark:text-gray-400">“{{ nicknameOf(row) }}”</span>
          </span>
        </span>
      </template>
      <template #cell-age="{ row }">
        <span class="tabular-nums">{{ ageOf(row) ?? '—' }}</span>
      </template>
      <template #cell-status="{ row }">
        {{ row.isMember === false ? 'Attendee' : 'Member' }}
      </template>
      <template #cell-phone="{ row }">
        <span :class="row.contactNumber ? 'tabular-nums' : 'text-gray-300 dark:text-gray-600'">{{ row.contactNumber || '—' }}</span>
      </template>
      <template #cell-elsewhere="{ row }">
        <span :class="['block truncate', elsewhere(row) ? '' : 'text-gray-300 dark:text-gray-600']">{{ elsewhere(row) || '—' }}</span>
      </template>
    </DeskTable>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.band.key" :title="group.band.label" :count="group.members.length">
        <ListRow
          v-for="member in group.members"
          :key="member.firestoreId || member.id"
          :to="recordOf(member)"
          :title="getFullName(member)"
          :subtitle="nicknameOf(member) ? `“${nicknameOf(member)}”` : ''"
        >
          <template #leading>
            <MemberAvatar :member="member" alt="" size="h-10 w-10" class="shrink-0" />
          </template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="!groups.length">
        <ListRow
          :title="isFacet ? 'Nobody to show here' : isUngrouped ? 'Every member is in a small group' : isUnplaced ? 'Everyone serves somewhere' : ministry ? 'Nobody is in this ministry yet' : 'This ministry is no longer on file'"
          muted
        />
      </ListGroup>
    </div>
  </AppScreen>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { getFullName } from '../../utils/memberUtils'
import { groupByBand } from '../../utils/ageBands'

// One ministry's people, under the same age headings the roll uses, so "the
// youth in the choir" reads without counting. The people in no ministry at
// all are shown here too (PeopleUnplaced), the same way.
//
// Putting people in or out of a ministry is not done here. A ministry grants
// access, so it is changed on a person's record or from a deliberate
// selection on the roll, which both say what it hands out first.

const route = useRoute()
const { loading, ministries, unplaced, unplacedToAsk } = usePeopleOverview()

const isUnplaced = computed(() => route.name === 'PeopleUnplaced')
// Opened from the People home's "Not serving yet" card (?ask=1), the list is
// the people that card counted — members past the Kids band — so the number
// on the card is the number here.
const askOnly = computed(() => isUnplaced.value && route.query.ask === '1')
const name = computed(() => (isUnplaced.value ? 'Not in a ministry' : String(route.params.name || '')))
const ministry = computed(() =>
  isUnplaced.value
    ? { name: name.value, people: askOnly.value ? unplacedToAsk.value : unplaced.value }
    : ministries.value.find((m) => m.name.toLowerCase() === name.value.toLowerCase()) || null
)
const people = computed(() => ministry.value?.people || [])
const groups = computed(() => groupByBand(people.value))

const subtitle = computed(() => {
  if (loading.value) return ''
  if (!ministry.value) return 'Not a ministry the church keeps'
  const n = people.value.length
  if (askOnly.value) return `${n} ${n === 1 ? 'member' : 'members'}, not counting kids`
  return `${n} ${n === 1 ? 'person' : 'people'}`
})

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
</script>

<template>
  <AppScreen
    :title="ministry?.name || name"
    :subtitle="subtitle"
    :back="{ name: 'PeopleMinistries' }"
    root="/members"
  >
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.band.key" :title="group.band.label" :count="group.members.length">
        <ListRow
          v-for="member in group.members"
          :key="member.firestoreId || member.id"
          :to="recordOf(member)"
          :title="getFullName(member)"
          :subtitle="member.nickname ? `“${member.nickname}”` : ''"
        >
          <template #leading>
            <MemberAvatar :member="member" alt="" size="h-10 w-10" class="shrink-0" />
          </template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="!groups.length">
        <ListRow
          :title="isUnplaced ? 'Everyone serves somewhere' : ministry ? 'Nobody is in this ministry yet' : 'This ministry is no longer on file'"
          muted
        />
      </ListGroup>
    </div>
  </AppScreen>
</template>

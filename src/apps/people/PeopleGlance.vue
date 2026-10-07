<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useMembers } from '../../composables/useMembers'
import { useMemberStats } from '../../composables/useMemberStats'
import { UNKNOWN_BAND } from '../../utils/ageBands'

// The roll at a glance: how many are members and how many still attendees,
// the ages the ministries plan around, and men and women.
//
// These are the numbers a church is asked for — by a district, at an annual
// meeting, by whoever plans the youth camp — and they used to be worked out
// by sorting the roll and counting headings. The age bands are the ones the
// roll and the attendance recorder both use (utils/ageBands.js), so all three
// agree on where "youth" ends.

const { members, loading } = useMembers()
const { stats, agedTotal } = useMemberStats(members)

const share = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '')

const roll = computed(() => [
  { key: 'members', title: 'Members', count: stats.value.members },
  { key: 'attendees', title: 'Attendees', count: stats.value.attendees },
])

const bands = computed(() => [
  ...stats.value.bands.map((band) => ({ ...band, share: share(band.count, agedTotal.value) })),
  ...(stats.value.unknownAge ? [{ ...UNKNOWN_BAND, barClass: '', count: stats.value.unknownAge, share: '' }] : []),
])

const sexes = computed(() => {
  const unknown = stats.value.total - stats.value.male - stats.value.female
  return [
    { key: 'male', title: 'Men and boys', count: stats.value.male },
    { key: 'female', title: 'Women and girls', count: stats.value.female },
    ...(unknown ? [{ key: 'unknown', title: 'Not on file', count: unknown, muted: true }] : []),
  ]
})

const ageNote = computed(() =>
  stats.value.unknownAge ? 'Shares are of the people whose age is on file.' : ''
)

const subtitle = computed(() =>
  loading.value ? '' : `${stats.value.total.toLocaleString()} ${stats.value.total === 1 ? 'person' : 'people'}`
)
</script>

<template>
  <AppScreen title="Overview" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/members">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup title="On the roll">
        <ListRow v-for="row in roll" :key="row.key" :title="row.title">
          <template #trailing>
            <span class="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">
              <span class="font-semibold text-gray-900 dark:text-white">{{ row.count.toLocaleString() }}</span>
              <span class="ml-2 inline-block w-10 text-right">{{ share(row.count, stats.total) }}</span>
            </span>
          </template>
        </ListRow>
      </ListGroup>

      <ListGroup title="Ages" :note="ageNote">
        <!-- The bands side by side, so the shape of the church reads before
             any number does. -->
        <div v-if="agedTotal" class="flex h-2.5 gap-0.5 overflow-hidden rounded-full mx-4 mt-4 mb-2" aria-hidden="true">
          <span
            v-for="band in stats.bands.filter((b) => b.count)"
            :key="band.key"
            :class="band.barClass"
            :style="{ flexGrow: band.count }"
          />
        </div>
        <ListRow v-for="band in bands" :key="band.key" :title="band.label" :muted="band.key === 'unknown'">
          <template #leading>
            <span :class="['size-2.5 shrink-0 rounded-full', band.dotClass]" />
          </template>
          <template #trailing>
            <span class="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">
              <span class="font-semibold text-gray-900 dark:text-white">{{ band.count.toLocaleString() }}</span>
              <span class="ml-2 inline-block w-10 text-right">{{ band.share }}</span>
            </span>
          </template>
        </ListRow>
      </ListGroup>

      <ListGroup title="Men and women">
        <ListRow v-for="row in sexes" :key="row.key" :title="row.title" :muted="row.muted">
          <template #trailing>
            <span class="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">
              <span class="font-semibold text-gray-900 dark:text-white">{{ row.count.toLocaleString() }}</span>
              <span class="ml-2 inline-block w-10 text-right">{{ row.muted ? '' : share(row.count, stats.total) }}</span>
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>

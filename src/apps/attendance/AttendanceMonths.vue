<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useAttendanceOverview } from '../../composables/useAttendanceOverview'

// How many different people the church saw, month by month.
//
// Reach rather than an average turnout: a prayer meeting will never draw the
// whole church, so averaging it with a Sunday gives a number that mostly
// tracks which gatherings fell in the month (useAttendanceStats). The people
// seen at all in a month is the one figure that is about the whole church —
// and set against the roll, it says how much of the church is still coming.

const { loading, months, stats } = useAttendanceOverview()

// Each month's bar is against the busiest month shown, so the months can be
// read against each other rather than against a roll nobody fills.
const largest = computed(() => Math.max(...months.value.map((m) => m.count), 1))

const subtitle = computed(() => {
  if (loading.value || !months.value.length) return ''
  return `Out of ${stats.value.roster.toLocaleString()} on the roll`
})
</script>

<template>
  <AppScreen title="By month" :subtitle="subtitle" :back="{ name: 'AttendanceHome' }" root="/attendance">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup
      v-else-if="months.length"
      title="People seen at least once"
      note="Everyone counted at any gathering in the month, each person once."
    >
      <ListRow
        v-for="month in months"
        :key="month.key"
        :title="`${month.longLabel} ${month.key.slice(0, 4)}`"
        :subtitle="`${month.gatherings} ${month.gatherings === 1 ? 'gathering' : 'gatherings'}${month.share !== null ? ` · ${month.share}% of the roll` : ''}`"
      >
        <template #trailing>
          <span class="flex w-28 shrink-0 items-center gap-2">
            <span class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden="true">
              <span
                class="block h-full rounded-full bg-primary dark:bg-primary-light"
                :style="{ width: `${Math.max(4, Math.round((month.count / largest) * 100))}%` }"
              />
            </span>
            <span class="w-8 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ month.count }}</span>
          </span>
        </template>
      </ListRow>
    </ListGroup>

    <ListGroup v-else>
      <ListRow title="Nothing counted yet" muted />
    </ListGroup>
  </AppScreen>
</template>

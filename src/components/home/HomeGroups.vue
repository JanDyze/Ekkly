<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import HomePanel from './HomePanel.vue'
import { useSmallGroupsOverview } from '../../composables/useSmallGroupsOverview'
import { formatTimeRange } from '../../utils/sgUtils'

// The small groups meeting this week, on the desktop home (a panel someone
// turns on; useHomeLayout): each group's next meeting in the coming seven
// days, soonest first, when and where, yours marked — so whoever wants to
// join one on Thursday knows there is one on Thursday. Read off each group's
// usual day; a group with no day set is not guessed at.

const { loading, active, myGroups, idOf } = useSmallGroupsOverview()

const DAY = 86400000
const today = new Date()
today.setHours(0, 0, 0, 0)

// The first few, soonest first, as Praying for keeps to its first six; the
// panel says at its foot how many more there are (HomePanel's total).
const SHOWN = 6

const all = computed(() => {
  const mine = new Set(myGroups.value.map(idOf))
  return active.value
    .filter((group) => typeof group.meetingDay === 'number')
    .map((group) => {
      const ahead = (group.meetingDay - today.getDay() + 7) % 7
      const date = new Date(today.getTime() + ahead * DAY)
      const day = ahead === 0 ? 'Today' : ahead === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'long' })
      return {
        key: idOf(group),
        ahead,
        name: group.name || 'Small group',
        line: [day, formatTimeRange(group.meetingTime), group.location].filter(Boolean).join(' · '),
        mine: mine.has(idOf(group)),
        to: `/small-groups/${idOf(group)}`,
      }
    })
    .sort((a, b) => a.ahead - b.ahead || a.name.localeCompare(b.name))
})
const rows = computed(() => all.value.slice(0, SHOWN))
</script>

<template>
  <HomePanel
    id="home-groups"
    title="Small groups"
    :count="all.length"
    :total="all.length"
    :link="{ to: '/small-groups', label: 'All groups' }"
    :loading="loading"
    :empty="rows.length ? null : { doodle: 'hammock', title: 'No groups meeting', line: 'Groups with a usual day show here for the week.' }"
  >
    <ul class="divide-y divide-gray-100 dark:divide-white/10">
      <li v-for="row in rows" :key="row.key">
        <RouterLink :to="row.to" class="flex min-w-0 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.name }}</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.line }}</span>
          </span>
          <span
            v-if="row.mine"
            class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
          >
            Yours
          </span>
        </RouterLink>
      </li>
    </ul>
  </HomePanel>
</template>

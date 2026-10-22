<script setup>
import { computed } from 'vue'
import HomePanel from './HomePanel.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { usePermissions } from '../../composables/usePermissions'
import { assignmentsOf } from '../../data/scheduleRoles'
import { findRosterMember } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'

// Next Sunday on the desktop home (a panel someone turns on; useHomeLayout):
// the one thing nearly everyone looks up each week, which was three taps into
// Schedules. The date and its theme, your own part in it first if you have
// one, then who is on each role and the songs. Only what has been published,
// unless you plan (useScheduleOverview decides), so it never shows a draft.

const { loading, next, roles, myRolesOn } = useScheduleOverview()
const { members } = usePermissions()

const dateLabel = computed(() => {
  if (!next.value?.date) return ''
  const [y, m, d] = next.value.date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
})

const mine = computed(() => (next.value ? myRolesOn(next.value).map((role) => role.name) : []))

// Each role with someone on it, in the church's own order, and their names.
const crew = computed(() => {
  if (!next.value) return []
  const assignments = assignmentsOf(next.value)
  return roles.value
    .map((role) => ({
      key: role.id,
      role: role.name,
      names: (assignments[role.id] || [])
        .map((id) => findRosterMember(members.value, id))
        .filter(Boolean)
        .map((member) => getDisplayName(member)),
    }))
    .filter((row) => row.names.length)
})

const songs = computed(() => (next.value?.songs || []).map((song) => song.title).filter(Boolean))
</script>

<template>
  <HomePanel
    id="home-sunday"
    title="Next Sunday"
    :link="{ to: '/schedules', label: 'Schedules' }"
    :loading="loading"
    :empty="next ? null : { doodle: 'bench', title: 'Nothing planned yet', line: 'The next Sunday shows here once it is published.' }"
  >
    <div class="px-5 py-3">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ dateLabel }}</p>
      <p v-if="next.theme" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ next.theme }}</p>

      <p
        v-if="mine.length"
        class="mt-2.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary dark:bg-primary-light/15 dark:text-primary-light"
      >
        You’re serving: {{ mine.join(', ') }}
      </p>

      <dl class="mt-3 space-y-1.5">
        <div v-for="row in crew" :key="row.key" class="flex min-w-0 items-baseline gap-3 text-sm">
          <dt class="w-28 shrink-0 truncate text-xs text-gray-500 dark:text-gray-400">{{ row.role }}</dt>
          <dd class="min-w-0 truncate text-gray-900 dark:text-gray-100">{{ row.names.join(', ') }}</dd>
        </div>
      </dl>

      <template v-if="songs.length">
        <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Songs</p>
        <ol class="mt-1 space-y-0.5">
          <li v-for="(title, i) in songs" :key="`${i}-${title}`" class="flex min-w-0 gap-2 text-sm text-gray-900 dark:text-gray-100">
            <span class="w-4 shrink-0 text-right text-xs tabular-nums text-gray-400">{{ i + 1 }}</span>
            <span class="truncate">{{ title }}</span>
          </li>
        </ol>
      </template>
    </div>
  </HomePanel>
</template>

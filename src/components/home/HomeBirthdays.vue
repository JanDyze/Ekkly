<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import HomePanel from './HomePanel.vue'
import MemberAvatar from '../members/MemberAvatar.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { getDisplayName } from '../../utils/memberUtils'

// The coming birthdays, on the desktop home (a panel someone turns on;
// useHomeLayout): who to greet this week and this month, soonest first, each
// a face and a name and when. Community says today's; this is for getting a
// card ready before Sunday. Ages are left to the record: a birthday is to
// greet someone on, not to count.

const SHOWN = 8

const { loading, birthdays } = usePeopleOverview()

// The day, as the days until it (usePeopleOverview has already counted them).
const when = (days) => {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const rows = computed(() =>
  birthdays.value.slice(0, SHOWN).map(({ member, days }) => ({
    key: member.firestoreId || member.id,
    member,
    name: getDisplayName(member),
    when: when(days),
    today: days === 0,
    to: `/people/${member.id || member.firestoreId}`,
  }))
)
</script>

<template>
  <HomePanel
    id="home-birthdays"
    title="Birthdays"
    :count="birthdays.length"
    :total="birthdays.length"
    :link="{ to: { name: 'PeopleBirthdays' }, label: 'All birthdays' }"
    :loading="loading"
    :empty="rows.length ? null : { doodle: 'bench', title: 'No birthdays this month', line: 'They show here a month ahead.' }"
  >
    <ul class="divide-y divide-gray-100 dark:divide-white/10">
      <li v-for="row in rows" :key="row.key">
        <RouterLink :to="row.to" class="flex min-w-0 items-center gap-3 px-5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
          <MemberAvatar :member="row.member" alt="" size="h-8 w-8" class="shrink-0" />
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.name }}</span>
          <span
            :class="[
              'shrink-0 text-xs',
              row.today ? 'font-semibold text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ row.when }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </HomePanel>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import HomePanel from './HomePanel.vue'
import { dayLabel, raisedOn, usePrayerOverview } from '../../composables/usePrayerOverview'

// Praying for, on the desktop home (a panel someone turns on; useHomeLayout):
// the few requests to carry this week, so the church prays for one another by
// name between Sundays. What was marked urgent or high first, as whoever
// raised them asked, then what was shared this week; a handful at most, the
// rest a tap away in Prayer. Read here, never edited: it is the list, not the
// app.

const SHOWN = 6

const { loading, today, pressing, newThisWeek } = usePrayerOverview()

const idOf = (concern) => concern.firestoreId || concern.id

// Every one it would show, and the first of them shown; how many it has in
// all goes to the panel, which says at its foot how many it could not fit
// (HomePanel's total).
const all = computed(() => {
  const seen = new Set()
  return [...pressing.value, ...newThisWeek.value].filter((concern) => !seen.has(idOf(concern)) && seen.add(idOf(concern)))
})
const rows = computed(() =>
  all.value
    .slice(0, SHOWN)
    .map((concern) => ({
      key: idOf(concern),
      title: concern.title || 'Prayer concern',
      line: [concern.memberName ? `For ${concern.memberName}` : '', dayLabel(raisedOn(concern), today)].filter(Boolean).join(' · '),
      flag: concern.priority === 'urgent' ? 'Urgent' : concern.priority === 'high' ? 'High' : '',
      to: { name: 'PrayerNow', query: { open: idOf(concern) } },
    }))
)
</script>

<template>
  <HomePanel
    id="home-prayer"
    title="Praying for"
    :count="all.length"
    :total="all.length"
    :link="{ to: { name: 'PrayerNow' }, label: 'All requests' }"
    :loading="loading"
    :empty="rows.length ? null : { doodle: 'tea', title: 'Nothing new to pray for', line: 'Urgent and new requests show here.' }"
  >
    <ul class="divide-y divide-gray-100 dark:divide-white/10">
      <li v-for="row in rows" :key="row.key">
        <RouterLink :to="row.to" class="flex min-w-0 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ row.title }}</span>
            <span v-if="row.line" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.line }}</span>
          </span>
          <span
            v-if="row.flag"
            class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          >
            {{ row.flag }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </HomePanel>
</template>

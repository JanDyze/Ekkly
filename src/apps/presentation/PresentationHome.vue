<script setup>
import { computed } from 'vue'
import {
  BookOpen,
  CalendarDots,
  ChevronRight,
  ListMusic,
  Music2,
  Play,
  ProjectorScreen,
  TextT,
  VideoCamera,
} from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHero from '../../components/appframe/AppHero.vue'
import AppTile from '../../components/appframe/AppTile.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useServicePlans } from '../../composables/useServicePlans'
import { useServiceLyrics } from '../../composables/useServiceLyrics'
import { usePermissions } from '../../composables/usePermissions'
import { useMembers } from '../../composables/useMembers'
import { findRosterMember, formatServiceDate, formatShortDate, parseIso, todayIso } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'

// The Presentation app's home: the booth on a Sunday morning.
//
// Its own app rather than a corner of Schedules, because it is somebody
// else's job. Schedules is the worship team and whoever serves, deciding who
// is on during the week; this is the tech team putting the service on the
// screen, and it draws on the song list and Scripture as well as the schedule.
// The two point at each other — a Sunday in Schedules has a Present button,
// and this lists the Sundays Schedules has planned.
//
// So the hero answers the booth's question — is the next service ready to
// run, and what is in it — and the main action runs it.

const { loading, myMember, upcoming, next, leaderOf } = useScheduleOverview()
const { plans } = useServicePlans()
const { songs } = useServiceLyrics()
const { can } = usePermissions()
const { members } = useMembers()

const today = todayIso()

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Today", "This Sunday", or "Oct 18". */
const labelOf = (iso) => {
  const from = parseIso(today)
  const to = parseIso(iso)
  const days = from && to ? Math.round((to - from) / 86400000) : 0
  if (days === 0) return 'Today'
  if (days <= 6) return 'This Sunday'
  return formatShortDate(iso)
}

const plan = computed(() => (next.value ? plans.value[next.value.date] || null : null))

// What a run sheet holds, counted the way the booth thinks of it: songs,
// readings, and everything else said or shown.
const counts = computed(() => {
  const items = plan.value?.items
  if (!items) {
    const songCount = next.value?.songs?.length || 0
    return { songs: songCount, readings: 0, other: 0 }
  }
  return {
    songs: items.filter((i) => i.type === 'song').length,
    readings: items.filter((i) => i.type === 'scripture').length,
    other: items.filter((i) => i.type !== 'song' && i.type !== 'scripture').length,
  }
})

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const headline = computed(() => {
  if (loading.value) return 'Presentation'
  if (!next.value) return 'Nothing to run yet'
  const label = labelOf(next.value.date)
  // A run sheet is the tech team's own preparation. Without one, the service
  // still runs — it simply follows the schedule's songs — and saying so is
  // more useful than calling it unready.
  return plan.value ? `${label} is ready to run` : `${label} runs from the schedule`
})

const heroDetail = computed(() => {
  if (!next.value) return 'A Sunday shows here once it has been scheduled.'
  const { songs: s, readings, other } = counts.value
  const parts = [plural(s, 'song')]
  if (readings) parts.push(plural(readings, 'reading'))
  if (other) parts.push(plural(other, 'other item'))
  if (!plan.value) parts.push('no readings added yet')
  return parts.join(' · ')
})

/* -------------------------------------------------------------- tiles */

const canSeeSongs = computed(() => can('songs.view'))

const servicesDetail = computed(() => {
  const n = upcoming.value.length
  return n ? `${plural(n, 'service')} coming up` : 'None coming up'
})

const scheduleDetail = computed(() => {
  if (!next.value) return 'Nothing planned'
  const leader = findRosterMember(members.value, leaderOf(next.value))
  return leader ? `${getDisplayName(leader)} leading` : formatShortDate(next.value.date)
})

/* ------------------------------------------------------- the run sheet */

const ICONS = { song: Music2, scripture: BookOpen, video: VideoCamera }

// The first few things in the order they run — what a glance at the booth's
// screen should tell you before you open it.
const preview = computed(() => {
  if (plan.value?.items?.length) {
    return plan.value.items.slice(0, 5).map((item) => ({
      key: item.id,
      icon: ICONS[item.type] || TextT,
      title: item.title || item.reference || 'Untitled',
    }))
  }
  return (next.value?.songs || []).slice(0, 5).map((song, index) => ({
    key: `${song.songId}-${index}`,
    icon: Music2,
    title: song.key ? `${song.title} · ${song.key}` : song.title,
  }))
})

const moreCount = computed(() => {
  const total = plan.value?.items?.length ?? next.value?.songs?.length ?? 0
  return Math.max(0, total - preview.value.length)
})
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-3">
      <AppHero
        art="presentation"
        :greeting="greeting"
        :title="headline"
        :detail="heroDetail"
      />

      <nav class="grid grid-cols-2 gap-3" aria-label="Presentation">
        <AppTile
          :to="{ name: 'Services' }"
          title="Services"
          :detail="servicesDetail"
          :icon="ProjectorScreen"
          :wide="canSeeSongs"
          :delay="60"
        />
        <!-- Doorways into the apps this one draws on. -->
        <AppTile
          :to="next ? { name: 'SchedulesSunday', params: { date: next.date } } : { name: 'SchedulesHome' }"
          title="Schedule"
          :detail="scheduleDetail"
          :icon="CalendarDots"
          :delay="110"
        />
        <AppTile
          v-if="canSeeSongs"
          to="/songs"
          title="Songs"
          :detail="`${plural(songs.length, 'song')}`"
          :icon="ListMusic"
          :delay="160"
        />
      </nav>

      <RouterLink
        v-if="next"
        :to="{ name: 'Present', params: { date: next.date } }"
        class="animate-rise flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white transition-transform duration-200 ease-out hover:bg-primary-hover"
        style="animation-delay: 210ms"
      >
        <Play class="size-5" />
        Run {{ labelOf(next.date) === 'Today' ? 'today' : labelOf(next.date) === 'This Sunday' ? 'this Sunday' : labelOf(next.date) }}
      </RouterLink>

      <!-- The run order itself -->
      <section v-if="next" class="animate-rise mt-3" style="animation-delay: 260ms">
        <h2 class="mb-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ plan ? 'Run sheet' : 'From the schedule' }}
        </h2>
        <RouterLink
          :to="{ name: 'Present', params: { date: next.date } }"
          class="group block rounded-2xl border border-gray-200 bg-white p-4 transition-[transform,border-color] duration-200 ease-out hover:border-gray-300 dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-lg font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                {{ formatServiceDate(next.date) }}
              </p>
              <p v-if="next.theme" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                Theme · {{ next.theme }}
              </p>
            </div>
            <ChevronRight
              class="mt-1 size-4 shrink-0 text-gray-300 transition-transform duration-300 group-engaged:translate-x-1 dark:text-gray-600"
            />
          </div>
          <ol v-if="preview.length" class="mt-3 space-y-1.5">
            <li
              v-for="(item, index) in preview"
              :key="item.key"
              class="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"
            >
              <span class="w-4 shrink-0 text-right text-xs tabular-nums text-gray-400">{{ index + 1 }}</span>
              <component :is="item.icon" class="size-4 shrink-0 text-primary dark:text-primary-light" />
              <span class="min-w-0 truncate">{{ item.title }}</span>
            </li>
          </ol>
          <p v-if="moreCount" class="mt-1.5 pl-6.5 text-xs text-gray-400">and {{ moreCount }} more</p>
          <p v-if="!preview.length" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Nothing in the order yet. Open it to add songs, readings and notices.
          </p>
        </RouterLink>
      </section>
    </div>
  </AppScreen>
</template>

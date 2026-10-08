<script setup>
import { computed } from 'vue'
import { CalendarX, FilmSlate, Flag } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import AppShortcut from '../../components/appframe/AppShortcut.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useEventsOverview } from '../../composables/useEventsOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { clockLabel } from '../../utils/timeUtils'

// The Events app's home, built the way the other apps' are. One screen, and
// two things on it:
//
//   1. A deck of cards (AppHeroDeck). Which cards, and why only these, is
//      decided in useEventsOverview: a change of plan in the next two weeks,
//      a holiday this week, and this month's video in the week it is shown.
//      Under them, the card that is always there: what is on next, with the
//      coming seven days along its foot, each marked if something is on.
//   2. The doors: the calendar, what is coming up, what happens every week,
//      and the month's announcement video.
//
// It used to be the month grid itself. The grid is the Calendar section now;
// what it could not say at a glance — what is next, and what has changed —
// leads.

const { loading, today, next, week, thisWeek, ahead, changes, holiday, videoMonth, weekly } = useEventsOverview()
const { myMember } = usePermissions()

const dateOf = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const shortDate = (key) => dateOf(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const monthName = (key) => dateOf(`${key}-01`).toLocaleDateString(undefined, { month: 'long' })

/** "Today", "Tomorrow", "Friday", "Oct 24" — the nearer, the plainer. */
const whenOf = (key) => {
  const days = Math.round((dateOf(key) - dateOf(today)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 6) return dateOf(key).toLocaleDateString(undefined, { weekday: 'long' })
  return shortDate(key)
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

const dayOf = (key) => ({ name: 'Events', query: { date: key } })

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  const list = []

  // A change of plan leads: a gathering nobody hears is off is how someone
  // drives to a locked building.
  if (changes.value.length) {
    const first = changes.value[0]
    const one = changes.value.length === 1
    list.push({
      kind: 'dated',
      key: `changes:${changes.value.map((e) => `${e.id}-${e.date}-${e.status || 'off'}`).join(',')}`,
      tone: 'warn',
      icon: CalendarX,
      dismissible: true,
      kicker: 'Change of plan',
      title: one
        ? `${first.title || 'A gathering'} is ${first.statusLabel.toLowerCase() || 'called off'}`
        : `${changes.value.length} gatherings called off or moved`,
      detail: one
        ? [whenOf(first.date), first.postponedTo ? `moved to ${shortDate(first.postponedTo)}` : first.statusNote].filter(Boolean).join(' · ')
        : changes.value.map((e) => `${e.title} ${shortDate(e.date)}`).join(' · '),
      to: dayOf(first.date),
      date: first.date,
    })
  }

  if (holiday.value) {
    const h = holiday.value
    list.push({
      kind: 'dated',
      key: `holiday:${h.date}`,
      tone: 'plain',
      icon: Flag,
      dismissible: true,
      kicker: 'Holiday this week',
      title: h.name,
      detail: `${whenOf(h.date)} · ${h.type === 'regular' ? 'a regular holiday' : 'a special non-working day'}`,
      to: dayOf(h.date),
      date: h.date,
    })
  }

  if (videoMonth.value) {
    list.push({
      kind: 'video',
      key: `video:${videoMonth.value}`,
      tone: 'plain',
      icon: FilmSlate,
      dismissible: true,
      kicker: 'Announcement video',
      title: `${monthName(videoMonth.value)}'s video is ready`,
      detail: 'Made from the calendar, ready to show on Sunday.',
      to: { name: 'VideosMonth', params: { month: videoMonth.value } },
    })
  }

  // The card that is always there: what is on next.
  const n = next.value
  list.push({
    kind: 'next',
    key: 'next',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Events' : n ? n.title || 'A gathering' : 'Nothing on the calendar',
    detail: loading.value
      ? ''
      : n
        ? [whenOf(n.date), clockLabel(n.time), n.location].filter(Boolean).join(' · ')
        : 'What is coming up shows here once it is on the calendar.',
    to: n ? dayOf(n.date) : { name: 'Events' },
  })

  return list
})

/* -------------------------------------------------------------- the doors */

const doors = computed(() => {
  const ready = !loading.value
  const firstWeekly = weekly.value[0]
  return [
    {
      key: 'calendar',
      title: 'Calendar',
      art: 'events-calendar',
      to: { name: 'Events' },
      detail: !ready ? '' : thisWeek.value.length ? `${thisWeek.value.length} this week` : 'Nothing this week',
    },
    {
      key: 'upcoming',
      title: 'Coming up',
      art: 'events-upcoming',
      to: { name: 'EventsUpcoming' },
      detail: !ready ? '' : next.value ? `Next: ${next.value.title}` : 'Nothing coming up',
    },
    {
      key: 'weekly',
      title: 'Every week',
      art: 'events-weekly',
      to: { name: 'EventsWeekly' },
      detail: firstWeekly
        ? `${firstWeekly.title}, ${clockLabel(firstWeekly.time)}`
        : 'When we meet',
    },
    {
      key: 'videos',
      title: 'Videos',
      art: 'videos',
      to: { name: 'VideosHome' },
      detail: `${monthName(today.slice(0, 7))}'s announcement video`,
    },
  ]
})

const aheadCount = computed(() => ahead.value.filter((e) => e.date <= today.slice(0, 7) + '-31').length)
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What is on, and what has changed, most important on top -->
      <AppHeroDeck :cards="cards" scope="events" label="Events today" class="animate-rise">
        <template #card="{ card }">
          <!-- Something on a day: its date, the way a calendar shows it. -->
          <DeckCard
            v-if="card.kind === 'dated'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <template #leading>
              <DateTile :date="card.date" class="size-14! rounded-2xl!" />
            </template>
          </DeckCard>

          <!-- This month's video: the Videos artwork, as it opens there. -->
          <DeckCard
            v-else-if="card.kind === 'video'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <template #leading>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
                <AppArt app-key="videos" flat class="size-9" />
              </span>
            </template>
          </DeckCard>

          <!-- What is on next, and the week ahead along its foot. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <!-- Light through an arched window, the outline of Ekkly's mark
                   (BRAND.md: the window is the motif). -->
              <svg class="absolute -bottom-10 right-5 h-60 w-36" viewBox="0 0 144 240" fill="none">
                <defs>
                  <linearGradient id="events-arch-light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="white" stop-opacity="0.2" />
                    <stop offset="0.75" stop-color="white" stop-opacity="0.03" />
                    <stop offset="1" stop-color="white" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" fill="url(#events-arch-light)" />
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.14" stroke-width="1.5" />
              </svg>
            </template>
            <!-- The Events artwork, on white because its orange and blue are
                 Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10">
                <AppArt app-key="events" :play="1" class="size-10" />
              </span>
            </template>
            <!-- The coming seven days: each one's letter and date, and a dot for
                 each thing on it, today ringed. -->
            <template v-if="!loading" #default>
              <div class="grid grid-cols-7 gap-1" aria-hidden="true">
                <span
                  v-for="day in week"
                  :key="day.date"
                  :class="[
                    'flex flex-col items-center gap-1 rounded-xl py-1.5',
                    day.isToday ? 'bg-white/20 ring-1 ring-white/50' : '',
                  ]"
                >
                  <span class="text-[10px] font-semibold uppercase text-white/70">{{ day.letter }}</span>
                  <span class="text-sm font-bold tabular-nums">{{ day.day }}</span>
                  <span class="flex h-1.5 gap-0.5">
                    <span v-for="n in Math.min(day.count, 3)" :key="n" class="size-1.5 rounded-full bg-white" />
                  </span>
                </span>
              </div>
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <nav class="grid grid-cols-2 gap-2.5" aria-label="Events">
        <AppShortcut
          v-for="(door, index) in doors"
          :key="door.key"
          :to="door.to"
          :title="door.title"
          :detail="door.detail"
          :art="door.art"
          :delay="120 + index * 30"
        >
          <template #aside>
            <!-- Calendar: today, the way the grid marks it. -->
            <span
              v-if="door.key === 'calendar'"
              class="flex h-9 w-8 flex-col items-center justify-center rounded-lg bg-primary text-white leading-none dark:bg-primary-light dark:text-gray-900"
            >
              <span class="text-[9px] font-bold uppercase">{{ dateOf(today).toLocaleDateString(undefined, { month: 'short' }) }}</span>
              <span class="mt-0.5 text-sm font-bold tabular-nums">{{ dateOf(today).getDate() }}</span>
            </span>

            <!-- Coming up: how many are on the rest of this month. -->
            <span
              v-else-if="door.key === 'upcoming' && aheadCount"
              class="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold tabular-nums text-primary dark:bg-primary-light/15 dark:text-primary-light"
            >
              {{ aheadCount }}
            </span>
          </template>
        </AppShortcut>
      </nav>
    </div>
  </AppScreen>
</template>

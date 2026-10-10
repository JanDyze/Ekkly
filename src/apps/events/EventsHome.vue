<script setup>
import { computed } from 'vue'
import { CalendarX, Clock, FilmSlate, Flag, MapPin, Sparkle } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import DeckWeek from '../../components/appframe/DeckWeek.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useEventsOverview } from '../../composables/useEventsOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { clockLabel } from '../../utils/timeUtils'
import { isCalledOff } from '../../../lib/eventStatus'

// The Events app's home, built the way the other apps' are. One screen, and
// two things on it:
//
//   1. A deck of cards (AppHeroDeck). Which cards, and why only these, is
//      decided in useEventsOverview: a change of plan in the next two weeks,
//      a weekly service somewhere or sometime other than usual, a holiday
//      this week, a one-off gathering coming up, and the month's video —
//      this month's in the week it is shown, next month's for planners in the
//      week before.
//      Under them, the card that is always there: what is on next, with the
//      coming seven days along its foot, each marked if something is on.
//   2. The doors: the calendar, what is coming up, what happens every week,
//      and the month's announcement video.
//
// It used to be the month grid itself. The grid is the Calendar section now;
// what it could not say at a glance — what is next, and what has changed —
// leads.

const {
  loading,
  today,
  calendar,
  next,
  week,
  ahead,
  changes,
  different,
  oneOffs,
  holiday,
  videoMonth,
  videoPrepMonth,
  weekly,
} = useEventsOverview()
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

/** The month's gatherings, each once: what its video announces. */
const titlesIn = (month) =>
  [...new Set(calendar.value.filter((e) => e.date.startsWith(month) && !isCalledOff(e)).map((e) => e.title).filter(Boolean))].map(
    (title) => ({ key: title, label: title })
  )

/** The first Sunday of a month, "YYYY-MM": when its video is shown. */
const firstSundayOf = (month) => {
  const date = dateOf(`${month}-01`)
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7))
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Who a gathering is for, as chips: its tags, or everyone, and who it leaves out. */
const audienceChips = (event) => [
  ...(event.audienceTags?.length
    ? event.audienceTags.map((tag) => ({ key: `for-${tag}`, label: tag }))
    : [{ key: 'everyone', label: 'Everyone' }]),
  ...(event.excludeTags || []).map((tag) => ({ key: `not-${tag}`, label: tag, strike: true })),
]

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
      // The dates crossed out, and where a moved one went.
      chips: one
        ? [
            { key: 'from', label: shortDate(first.date), strike: true },
            ...(first.postponedTo ? [{ key: 'to', label: `Now ${shortDate(first.postponedTo)}` }] : []),
          ]
        : changes.value.map((e) => ({ key: `${e.id}-${e.date}`, label: shortDate(e.date), strike: true })),
    })
  }

  // A weekly service somewhere or sometime else this once: people come by
  // habit, so the usual is shown crossed out beside what it is now.
  for (const e of different.value) {
    const name = e.title || 'A service'
    const now = [e.timeMoved && clockLabel(e.time), e.placeMoved && e.location].filter(Boolean).join(', ')
    list.push({
      kind: 'dated',
      key: `different:${e.id}-${e.date}-${e.time}-${e.location}`,
      tone: 'warn',
      icon: e.timeMoved ? Clock : MapPin,
      dismissible: true,
      kicker: e.timeMoved && e.placeMoved ? 'Not the usual time or place' : e.timeMoved ? 'Not the usual time' : 'Not the usual place',
      title: `${name} is at ${now}`,
      detail: [whenOf(e.date), e.timeMoved && !e.placeMoved ? e.location : ''].filter(Boolean).join(' · '),
      to: dayOf(e.date),
      date: e.date,
      chips: [
        ...(e.timeMoved
          ? [{ key: 'usual-time', label: clockLabel(e.usual.time), strike: true }, { key: 'time', label: `Now ${clockLabel(e.time)}` }]
          : []),
        ...(e.placeMoved
          ? [{ key: 'usual-place', label: e.usual.location, strike: true }, { key: 'place', label: `Now ${e.location}` }]
          : []),
      ],
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
      week: true,
    })
  }

  // Something somebody typed in, not one of the weekly gatherings: the thing
  // people have to remember, prepare for, or bring someone to. The nearest
  // one, unless the card that is always there already leads with it; the rest
  // are in Coming up.
  const special = oneOffs.value.find((e) => e.id !== next.value?.id)
  if (special) {
    const more = oneOffs.value.filter((e) => e.id !== next.value?.id).length - 1
    list.push({
      kind: 'dated',
      key: `oneoff:${special.id}-${special.date}`,
      tone: 'plain',
      icon: Sparkle,
      dismissible: true,
      kicker: special.forMe ? 'Coming up, for you' : more > 0 ? `Coming up, and ${more} more` : 'Coming up',
      title: special.title || 'A gathering',
      detail: [whenOf(special.date), clockLabel(special.time), special.location].filter(Boolean).join(' · '),
      to: dayOf(special.date),
      date: special.date,
      chips: audienceChips(special),
    })
  }

  // Next month's video, for planners, while what it announces can still be
  // added to the calendar.
  if (videoPrepMonth.value) {
    list.push({
      kind: 'video',
      key: `video-prep:${videoPrepMonth.value}`,
      tone: 'plain',
      icon: FilmSlate,
      dismissible: true,
      kicker: 'Announcement video',
      title: `Get ${monthName(videoPrepMonth.value)}'s video ready`,
      detail: `Shown ${firstSundayOf(videoPrepMonth.value)}, made from whatever is on the calendar by then.`,
      to: { name: 'VideosMonth', params: { month: videoPrepMonth.value } },
      chips: titlesIn(videoPrepMonth.value),
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
      // What it announces: the month's gatherings, each once.
      chips: titlesIn(videoMonth.value),
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

// A door is its name and nothing more. What is on this week and what comes
// next are the deck's to say, and each section opens on the rest.
const doors = computed(() => [
  { key: 'calendar', title: 'Calendar', art: 'events-calendar', to: { name: 'Events' } },
  { key: 'upcoming', title: 'Coming up', art: 'events-upcoming', to: { name: 'EventsUpcoming' } },
  { key: 'weekly', title: 'Every week', art: 'events-weekly', to: { name: 'EventsWeekly' } },
  { key: 'videos', title: 'Videos', art: 'videos', to: { name: 'VideosHome' } },
])
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
            <DeckWeek v-if="card.week" :days="week" :mark="card.date" />
            <DeckChips v-else :tone="card.tone" :items="card.chips" />
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
            <DeckChips :items="card.chips" :max="3" />
          </DeckCard>

          <!-- What is on next, and the week ahead along its foot. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <CardPanes />
            </template>
            <!-- The Events artwork, on white because its orange and blue are
                 Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                <AppArt app-key="events" :play="1" class="size-10" />
              </span>
            </template>
            <!-- The coming seven days: each one's letter and date, and a dot for
                 each thing on it, today ringed. -->
            <template v-if="!loading" #default>
              <DeckWeek tone="accent" :days="week" />
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Events" />
    </div>
  </AppScreen>
</template>

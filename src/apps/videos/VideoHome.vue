<script setup>
import { computed } from 'vue'
import { ArrowUpDown, CalendarX, FilmSlate, FilmStrip } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import { formatLength, useVideoOverview } from '../../composables/useVideoOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { parseIso } from '../../utils/lineupUtils'

// The Videos app's home, built the way People's and Minutes' are. One screen,
// and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useVideoOverview explains: the video for the month's first
//      gathering in the week before it, a change of plan a video already
//      posted still gets wrong, and events that arrived after a month's
//      running order was arranged. Under them, the card that is always
//      there: this month's video, already made, a tap from playing.
//   2. The doors: this month, next month, and how every month looks and
//      sounds — each its name alone, with a count on a month only for the
//      events still to put in their place.
//
// Nobody has to start a video. The calendar, the weekly services, the small
// groups and the serving schedule already say what is happening, so the
// video is there the moment the month is. The home used to be one card
// saying so, a button to watch it and the first few things it announced;
// what is in it is the month's own screen now, and the deck says only what
// needs doing about it.

const {
  loading,
  thisMonth,
  nextMonth,
  thisMonthScenes,
  scenesOf,
  dueSoon,
  changesAhead,
  arrivedSince,
  announcements,
  lengthOf,
  monthName,
} = useVideoOverview()
const { myMember, canManage } = usePermissions()

// Arranging a month and choosing the look are for whoever manages events;
// watching and saving a month's video is for anyone who can see the calendar.
const canEdit = computed(() => canManage('events'))

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

const monthTo = (monthKey) => ({ name: 'VideosMonth', params: { month: monthKey } })

/** "6 announcements · 0:54 long" */
const sizeOf = (scenes) => {
  const count = announcements(scenes).length
  return `${plural(count, 'announcement', 'announcements')} · ${formatLength(lengthOf(scenes))} long`
}

/** "For Sunday", said from how many days off it is. */
const forDay = (date, days) => {
  if (days === 0) return 'For today'
  if (days === 1) return 'For tomorrow'
  const weekday = parseIso(date)?.toLocaleDateString('en-US', { weekday: 'long' }) || ''
  return days >= 7 ? `For next ${weekday}` : `For ${weekday}`
}

const chipsOf = (scenes) => scenes.map((scene) => ({ key: scene.id, label: scene.title || 'Announcement' }))

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // The video for the month's first gathering, in the week it is to be made.
  // Keyed by the month, so putting it away is for this month's showing only.
  const due = dueSoon.value
  if (due) {
    const scenes = scenesOf(due.monthKey)
    const said = announcements(scenes)
    const name = monthName(due.monthKey)
    list.push({
      kind: 'due',
      key: `due:${due.monthKey}`,
      tone: 'plain',
      icon: FilmSlate,
      dismissible: true,
      kicker: forDay(due.date, due.days),
      title: said.length ? `${name}’s video is ready` : `Nothing on ${name}’s calendar yet`,
      detail: said.length
        ? sizeOf(scenes)
        : canEdit.value
          ? 'Add its events and the video fills itself in.'
          : 'It fills itself in as events go on the calendar.',
      to: monthTo(due.monthKey),
      date: due.date,
      chips: chipsOf(said),
    })
  }

  // A change of plan a posted video still gets wrong. Keyed by which ones, so
  // another one called off is news again.
  const changes = changesAhead.value
  if (changes.length) {
    const first = changes[0]
    list.push({
      key: `changes:${changes.map((scene) => scene.id).join(',')}`,
      tone: 'warn',
      icon: CalendarX,
      dismissible: true,
      kicker: changes.length === 1 ? first.eyebrow || 'Change of plans' : 'Changes of plan',
      title: changes.length === 1 ? first.title || 'A gathering' : `${changes.length} gatherings have changed`,
      detail:
        changes.length === 1
          ? 'A video already posted may still say it is on.'
          : 'A video already posted may still say they are on.',
      to: monthTo(first.date.slice(0, 7)),
      chips: changes.map((scene) => ({
        key: scene.id,
        label: scene.title || 'A gathering',
        strike: scene.eyebrow === 'Called off',
      })),
    })
  }

  // Events added since somebody arranged a month: only they can put them in
  // their place, so only they see it. Keyed by which events, so a new one
  // brings the card back.
  if (canEdit.value) {
    ;[thisMonth, nextMonth].forEach((monthKey) => {
      const arrived = arrivedSince(monthKey)
      if (!arrived.length) return
      list.push({
        key: `arrived:${monthKey}:${arrived.map((scene) => scene.id).join(',')}`,
        tone: 'plain',
        icon: ArrowUpDown,
        dismissible: true,
        kicker: 'New on the calendar',
        title: `${plural(arrived.length, 'event', 'events')} added since ${monthName(monthKey)} was arranged`,
        detail: 'Each went in just before the closing card.',
        to: monthTo(monthKey),
        chips: chipsOf(arrived),
      })
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: this month's video, made and ready to play. */
const alwaysCard = computed(() => {
  const scenes = thisMonthScenes.value
  const said = announcements(scenes)
  const name = monthName(thisMonth)
  return {
    key: 'month',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Videos' : said.length ? `${name}’s video` : `Nothing to announce in ${name} yet`,
    detail: loading.value ? '' : said.length ? sizeOf(scenes) : 'It fills itself in as events go on the calendar.',
    to: monthTo(thisMonth),
    // What it says, in order, along the foot: three at most, on one line.
    preview: said.slice(0, 3),
    more: Math.max(0, said.length - 3),
  }
})

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): what this month's video
// announces, in the order it plays, each with the line over it in the video
// ("Coming up", "Every week", "Called off"), so what it says can be read
// before it is watched.
const inThisMonth = computed(() =>
  announcements(thisMonthScenes.value).map((scene) => ({
    key: String(scene.id),
    to: monthTo(thisMonth),
    date: scene.date || '',
    photo: scene.date ? '' : scene.photo || '',
    icon: FilmStrip,
    title: scene.title || 'Announcement',
    line: scene.eyebrow || '',
    aside: scene.eyebrow === 'Called off' || scene.eyebrow === 'Postponed' ? scene.eyebrow : '',
    tone: 'urgent',
  }))
)

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on a month only for the events that came
// in after it was arranged — the one thing in there waiting on whoever
// manages it. How many announcements, and how long, are what the month shows
// once opened, and this month's are on the card above.
const doors = computed(() => {
  const waiting = (monthKey) => (canEdit.value && !loading.value ? arrivedSince(monthKey).length : 0)
  return [
    { key: 'this', title: monthName(thisMonth), art: 'videos-month', to: monthTo(thisMonth), badge: waiting(thisMonth) },
    { key: 'next', title: monthName(nextMonth), art: 'videos-next', to: monthTo(nextMonth), badge: waiting(nextMonth) },
    ...(canEdit.value ? [{ key: 'look', title: 'Look and sound', art: 'videos-look', to: { name: 'VideosLook' } }] : []),
  ]
})

// Simple view's figures (AppHome's `stats`), each opening what it counts.
const simpleStats = computed(() => [
  {
    key: 'month',
    label: `Announcements in ${monthName(thisMonth)}`,
    value: thisMonthScenes.value.filter((scene) => !scene.hidden).length,
    to: { name: 'VideosMonth', params: { month: thisMonth } },
  },
  { key: 'changes', label: 'Changes coming', value: changesAhead.value.length, to: { name: 'VideosMonth', params: { month: thisMonth } } },
])
</script>

<template>
  <AppHome :stats="simpleStats" :loading="loading" :cards="cards" scope="videos" label="Videos this week" :doors="doors" name="Videos">
    <!-- 1. What needs doing, most important on top -->
    <template #card="{ card }">
      <!-- The video for the first gathering, dated the way a calendar
           shows it, and what it announces. -->
      <DeckCard
        v-if="card.kind === 'due'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        inset
      >
        <template #leading>
          <DateTile :date="card.date" highlight />
        </template>
        <DeckChips v-if="card.chips.length" :items="card.chips" :max="3" />
      </DeckCard>

      <DeckCard
        v-else-if="card.tone !== 'accent'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <DeckChips v-if="card.chips?.length" :tone="card.tone" :items="card.chips" :max="3" />
      </DeckCard>

      <!-- This month's video, and the first things it says. -->
      <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
        <template #art>
          <CardPanes />
        </template>
        <!-- The Videos artwork, on white because its orange and blue are
             Ekkly's and need a white ground on a coloured card. -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="videos" :play="1" class="size-10" />
          </span>
        </template>
        <!-- One line, each title giving up width as it fills, the way
             DeckChips lays its chips, in white on the church's colour. -->
        <ul v-if="card.preview.length" class="flex min-w-0 gap-1.5">
          <li
            v-for="scene in card.preview"
            :key="scene.id"
            class="min-w-0 max-w-40 shrink truncate rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white"
          >
            {{ scene.title || 'Announcement' }}
          </li>
          <li v-if="card.more" class="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
            +{{ card.more }}
          </li>
        </ul>
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        :title="`In ${monthName(thisMonth)}’s video`"
        :rows="inThisMonth"
        :loading="loading"
        :link="{ to: monthTo(thisMonth), label: 'Watch' }"
        doodle="hammock"
        few="That’s the whole video."
        :empty="{ title: 'Nothing to announce yet', line: 'The month’s gatherings show here as they go on the calendar.' }"
      />
    </template>
  </AppHome>
</template>

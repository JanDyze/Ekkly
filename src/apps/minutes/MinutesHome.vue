<script setup>
import { computed } from 'vue'
import { CalendarCheck, ListChecks, NotePencil } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useMinutesOverview } from '../../composables/useMinutesOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { meetingWhen, minuteProgress } from '../../utils/minuteSummary'
import { daysBetween, todayKey } from '../../utils/taskUtils'

// The Minutes app's home, built the way People's and Tasks' are. One screen,
// and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useMinutesOverview explains: this week's meeting not yet opened,
//      the notes never written up, and the commitments that never reached
//      anyone's task list. Under them, the card that is always there: the
//      last meeting, and what it decided.
//   2. The doors: every meeting, the ones to write up, the action items and
//      the decisions, each its name alone, with a count on the corner only
//      for what is waiting on whoever runs the minutes.
//
// It used to be one long list of meetings, with a line above it about the
// ones never written up. The list is a section now (MinutesMeetings), and
// what a meeting asked of people and what it settled — the two things anyone
// opens old minutes to find — are a tap from the home instead of a search.

const {
  loading,
  canEdit,
  meetings,
  lastMeeting,
  nextMeeting,
  toWriteUp,
  notOnList,
  decisions,
  startingId,
  openMeeting,
  dayOf,
  idOf,
} = useMinutesOverview()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const today = todayKey()

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

const timeLabel = (time) => {
  const [h, m] = String(time || '').split(':')
  const hour = Number(h)
  if (!time || !Number.isFinite(hour)) return ''
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m ?? '00'} ${hour >= 12 ? 'PM' : 'AM'}`
}

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // This week's meeting, before it starts. A scheduled one has no record yet
  // and only someone who manages minutes can open it, so only they see it.
  const next = nextMeeting.value
  if (next && (!next.isScheduled || canEdit.value)) {
    const day = dayOf(next) || next.date
    const when = meetingWhen(day, today)
    list.push({
      kind: 'next',
      key: `next:${next.id}`,
      tone: 'plain',
      icon: CalendarCheck,
      dismissible: true,
      kicker: when.relative || when.label,
      title: next.title || 'Meeting',
      detail: [
        timeLabel(next.startTime),
        next.location,
        next.isScheduled ? 'Tap to set its agenda' : 'Agenda ready',
      ]
        .filter(Boolean)
        .join(' · '),
      date: day,
      meeting: next,
    })
  }

  if (canEdit.value && toWriteUp.value.length) {
    const oldest = toWriteUp.value[0]
    const waited = daysBetween(dayOf(oldest), today)
    list.push({
      key: `writeup:${toWriteUp.value.map((m) => m.id).join(',')}`,
      tone: waited > 14 ? 'warn' : 'plain',
      icon: NotePencil,
      dismissible: true,
      kicker: 'To write up',
      title: `${plural(toWriteUp.value.length, 'meeting is', 'meetings are')} still rough notes`,
      detail: waited > 14 ? `The oldest is from ${meetingWhen(dayOf(oldest), today).label}.` : 'The oldest first.',
      to: { name: 'MinutesWriteUp' },
      chips: toWriteUp.value.map((m) => ({ key: m.id, label: m.title || 'Meeting' })),
    })
  }

  // A standing chore, remembered until there are more of them.
  if (canEdit.value && notOnList.value.length) {
    list.push({
      key: 'actions',
      tone: 'plain',
      icon: ListChecks,
      dismissible: true,
      remember: true,
      level: notOnList.value.length,
      kicker: 'From the minutes',
      title: `${plural(notOnList.value.length, 'action item', 'action items')} on nobody’s list`,
      detail: 'Agreed at a meeting, never made a task.',
      to: { name: 'MinutesActions' },
      chips: notOnList.value.map((item) => ({ key: item.key, label: item.task })),
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: the last meeting, and what it settled. */
const alwaysCard = computed(() => {
  const last = lastMeeting.value
  const settled = last ? decisions.value.filter((d) => d.minute === last).length : 0
  return {
    key: 'last',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Minutes' : last ? last.title || 'The last meeting' : 'No meetings yet',
    detail: loading.value
      ? ''
      : last
        ? [meetingWhen(dayOf(last), today).relative || meetingWhen(dayOf(last), today).label, settled ? plural(settled, 'decision', 'decisions') : '']
            .filter(Boolean)
            .join(' · ')
        : 'Start one before the meeting, and type into it as you go.',
    to: last ? { name: 'MinuteDetails', params: { id: last.firestoreId || last.id } } : { name: 'MinutesMeetings' },
  }
})

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): the meetings held lately,
// newest first, each with how far its minutes got (amber while they are still
// notes), so the last few are a click away rather than a search.
const recentMeetings = computed(() =>
  meetings.value
    .filter((m) => dayOf(m) <= today)
    .slice(0, 20)
    .map((m) => {
      const progress = minuteProgress(m)
      return {
        key: String(idOf(m)),
        to: { name: 'MinuteDetails', params: { id: idOf(m) } },
        date: dayOf(m),
        title: m.title || 'Meeting',
        line: progress.label,
        aside: progress.tone === 'attention' ? 'To write up' : '',
        tone: 'warn',
      }
    })
)

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what is waiting on
// whoever runs the minutes — amber when a write-up has waited over a fortnight.
const doors = computed(() => [
  { key: 'meetings', title: 'Meetings', art: 'minutes-meetings', to: { name: 'MinutesMeetings' } },
  {
    key: 'writeup',
    title: 'To write up',
    art: 'minutes-writeup',
    to: { name: 'MinutesWriteUp' },
    badge: canEdit.value && !loading.value ? toWriteUp.value.length : 0,
    urgent: toWriteUp.value.some((m) => daysBetween(dayOf(m), today) > 14),
  },
  {
    key: 'actions',
    title: 'Action items',
    art: 'minutes-actions',
    to: { name: 'MinutesActions' },
    badge: canEdit.value && !loading.value ? notOnList.value.length : 0,
  },
  { key: 'decisions', title: 'Decisions', art: 'minutes-decisions', to: { name: 'MinutesDecisions' } },
])
</script>

<template>
  <AppHome :cards="cards" scope="minutes" label="Minutes this week" :doors="doors" name="Minutes">
    <!-- 1. What needs doing, most important on top -->
    <template #card="{ card }">
      <!-- The next meeting, dated the way a calendar shows it. A scheduled
           one is made into a record by the tap, so it is a button. -->
      <DeckCard
        v-if="card.kind === 'next'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.meeting.isScheduled ? null : { name: 'MinuteDetails', params: { id: card.meeting.firestoreId || card.meeting.id } }"
        :action="card.meeting.isScheduled"
        :inset="card.dismissible"
        :aria-busy="startingId === card.meeting.id || undefined"
        @click="card.meeting.isScheduled && openMeeting(card.meeting)"
      >
        <template #leading>
          <DateTile :date="card.date" highlight />
        </template>
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

      <!-- The last meeting, and how much it settled. -->
      <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
        <template #art>
          <CardPanes />
        </template>
        <!-- The Minutes artwork, on white because its orange and blue are
             Ekkly's and need a white ground on a coloured card. -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="minutes" :play="1" class="size-10" />
          </span>
        </template>
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        title="Lately"
        :rows="recentMeetings"
        :loading="loading"
        :count="false"
        :link="{ to: { name: 'MinutesMeetings' }, label: 'See all' }"
        doodle="tea"
        few="That’s every meeting so far."
        :empty="{ title: 'No meetings yet', line: 'Each meeting shows here once it is held.' }"
      />
    </template>
  </AppHome>
</template>

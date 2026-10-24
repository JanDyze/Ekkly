<script setup>
import { computed } from 'vue'
import { CalendarCheck, ClockCounterClockwise, NotePencil, UserPlus, UsersThree } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import DeckFaces from '../../components/appframe/DeckFaces.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useSmallGroupsOverview } from '../../composables/useSmallGroupsOverview'
import { usePermissions } from '../../composables/usePermissions'
import { useSgLanguage } from '../../composables/useSgLanguage'
import { getDisplayName } from '../../utils/memberUtils'
import { formatTimeRange } from '../../utils/sgUtils'

// The Small groups app's home, built the way People's and Tasks' are. One
// screen, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useSmallGroupsOverview explains: your group meeting today, a
//      meeting of yours this week never logged, the groups gone quiet, and the
//      members in no group. Under them, the card that is always there: your
//      own group when you have one, and the church's groups when you do not.
//   2. The doors: every group, every session, the people in none, and the
//      blank forms, each its name alone, with a count on the corner only for
//      the sessions of yours still to log.
//
// It used to be the groups' cover cards on one page, with search and Print
// over them. The cards are a section now (SmallGroupsAll), because what a
// leader opens this app for on a Thursday night is their own group's form,
// and the deck puts it on top.

const {
  loading,
  canEdit,
  active,
  myLed,
  myGroups,
  meetingToday,
  unlogged,
  quiet,
  thisWeek,
  ungrouped,
  eligible,
  idOf,
  sizeOf,
} = useSmallGroupsOverview()
const { can, myMember } = usePermissions()
const { weekdayName } = useSgLanguage()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const groupTo = (group) => ({ name: 'SmallGroupDetails', params: { id: idOf(group) } })
const weekdayOf = (day) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Thursdays · 7:00 – 9:00 PM · 12 people": when a group meets, and its size. */
const rhythmOf = (group) =>
  [
    typeof group.meetingDay === 'number' ? `${weekdayName(group.meetingDay)}s` : '',
    formatTimeRange(group.meetingTime),
    plural(sizeOf(group), 'person', 'people'),
  ]
    .filter(Boolean)
    .join(' · ')

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // Tonight's form, while people are still in the room.
  meetingToday.value.forEach((group) => {
    list.push({
      key: `today:${idOf(group)}`,
      tone: 'plain',
      icon: CalendarCheck,
      dismissible: true,
      kicker: 'Meets today',
      title: group.name || 'Your group',
      detail: [formatTimeRange(group.meetingTime), group.location, 'Log it when you meet'].filter(Boolean).join(' · '),
      to: groupTo(group),
    })
  })

  // A meeting of yours this week with nothing logged for it.
  unlogged.value.slice(0, 2).forEach(({ group, day }) => {
    list.push({
      key: `unlogged:${idOf(group)}:${day}`,
      tone: 'warn',
      icon: NotePencil,
      dismissible: true,
      kicker: 'Not logged',
      title: `${weekdayOf(day)}’s session`,
      detail: `${group.name || 'Your group'} · who came, and what was taught`,
      to: groupTo(group),
    })
  })

  // For whoever runs the groups: the ones drifting.
  if (canEdit.value && quiet.value.length) {
    list.push({
      key: `quiet:${quiet.value.map(({ group }) => idOf(group)).join(',')}`,
      tone: 'plain',
      icon: ClockCounterClockwise,
      dismissible: true,
      kicker: 'Gone quiet',
      title: `${plural(quiet.value.length, 'group has', 'groups have')} not met in a month`,
      detail: 'Worth a call to the leader.',
      to: { name: 'SmallGroupsAll' },
      chips: quiet.value.map(({ group }) => ({ key: idOf(group), label: group.name || 'Small group' })),
    })
  }

  // A standing chore, remembered until there are more of them.
  if (canEdit.value && can('members.view') && ungrouped.value.length) {
    list.push({
      key: 'unplaced',
      tone: 'plain',
      icon: UserPlus,
      dismissible: true,
      remember: true,
      level: ungrouped.value.length,
      kicker: 'Not in a group',
      title: `${plural(ungrouped.value.length, 'member is', 'members are')} in no group`,
      detail: 'The people somebody should invite.',
      to: { name: 'SmallGroupsUnplaced' },
      faces: { members: ungrouped.value, empty: 0, caption: '' },
    })
  }

  list.push(alwaysCard.value)
  return list
})

/**
 * The card that is always there: your own group when you have one — the one
 * you lead before one you only belong to — and the church's groups otherwise.
 */
const alwaysCard = computed(() => {
  const mine = myLed.value[0] || myGroups.value[0]
  if (!loading.value && mine) {
    return {
      key: 'mine',
      tone: 'accent',
      kicker: greeting.value,
      title: mine.name || 'Your group',
      detail: rhythmOf(mine),
      to: groupTo(mine),
    }
  }
  const placed = eligible.value.length - ungrouped.value.length
  // Groups, not sessions: a group that logged twice still met once this week
  // as far as anyone asking is concerned.
  const met = new Set(thisWeek.value.map((s) => s.groupId)).size
  return {
    key: 'church',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Small groups' : active.value.length ? plural(active.value.length, 'group', 'groups') : 'No groups yet',
    detail: loading.value
      ? ''
      : [
          eligible.value.length ? `${placed} of ${eligible.value.length} members in one` : '',
          met ? `${met} met this week` : '',
        ]
          .filter(Boolean)
          .join(' · '),
    to: { name: 'SmallGroupsAll' },
  }
})

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): the groups in the order
// they next meet, today's first, each with when and where and how many are in
// it, so the week of small groups reads down one column. A group with no set
// day goes last.
const nextMeetingOf = (group) => {
  if (typeof group.meetingDay !== 'number') return ''
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + ((group.meetingDay - date.getDay() + 7) % 7))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const groupsByDay = computed(() =>
  active.value
    .map((group) => ({ group, on: nextMeetingOf(group) }))
    .sort((a, b) => (a.on || '9999').localeCompare(b.on || '9999') || String(a.group.name).localeCompare(String(b.group.name)))
    .map(({ group, on }) => ({
      key: String(idOf(group)),
      to: groupTo(group),
      date: on,
      weekday: true,
      icon: on ? null : UsersThree,
      title: group.name || 'Small group',
      line: [formatTimeRange(group.meetingTime), group.location].filter(Boolean).join(' · '),
      aside: plural(sizeOf(group), 'person', 'people'),
    }))
)

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for the sessions of
// yours still to log.
const doors = computed(() => [
  { key: 'groups', title: 'Groups', art: 'smallgroups-groups', to: { name: 'SmallGroupsAll' } },
  {
    key: 'sessions',
    title: 'Sessions',
    art: 'smallgroups-sessions',
    to: { name: 'SmallGroupsSessions' },
    badge: loading.value ? 0 : unlogged.value.length,
    urgent: unlogged.value.length > 0,
  },
  ...(can('members.view') ? [{ key: 'unplaced', title: 'Not in a group', art: 'smallgroups-unplaced', to: { name: 'SmallGroupsUnplaced' } }] : []),
  { key: 'forms', title: 'Forms', art: 'smallgroups-forms', to: { name: 'SmallGroupsForms' } },
])

// Simple view's figures (AppHome's `stats`), each opening what it counts.
const simpleStats = computed(() => [
  { key: 'groups', label: 'Groups meeting', value: active.value.length, to: { name: 'SmallGroupsAll' } },
  { key: 'week', label: 'Met this week', value: thisWeek.value.length, to: { name: 'SmallGroupsSessions' } },
  ...(unlogged.value.length
    ? [{ key: 'unlogged', label: 'Meetings to log', value: unlogged.value.length, to: { name: 'SmallGroupsSessions' }, warn: true }]
    : []),
  { key: 'unplaced', label: 'Not in a group', value: ungrouped.value.length, to: { name: 'SmallGroupsUnplaced' } },
])
</script>

<template>
  <AppHome :stats="simpleStats" :loading="loading" :cards="cards" scope="smallgroups" label="Small groups this week" :doors="doors" name="Small groups">
    <!-- 1. What needs doing, most important on top -->
    <template #card="{ card }">
      <DeckCard
        v-if="card.tone !== 'accent'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <DeckFaces v-if="card.faces" :tone="card.tone" v-bind="card.faces" />
        <DeckChips v-else-if="card.chips?.length" :tone="card.tone" :items="card.chips" :max="3" />
      </DeckCard>

      <!-- Your group, or the church's groups. -->
      <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
        <template #art>
          <CardPanes />
        </template>
        <!-- The Small groups artwork, on white because its orange and blue
             are Ekkly's and need a white ground on a coloured card. -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="smallgroups" :play="1" class="size-10" />
          </span>
        </template>
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        title="This week’s groups"
        :rows="groupsByDay"
        :loading="loading"
        :link="{ to: { name: 'SmallGroupsAll' }, label: 'See all' }"
        doodle="bench"
        few="That’s every group."
        :empty="{ title: 'No groups yet', line: 'Each group shows here once it is started.' }"
      />
    </template>
  </AppHome>
</template>

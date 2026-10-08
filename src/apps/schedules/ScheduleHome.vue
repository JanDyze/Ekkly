<script setup>
import { computed } from 'vue'
import { BellRinging, BookOpenText, HandWaving, MicrophoneStage, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import AppShortcut from '../../components/appframe/AppShortcut.vue'
import AppArt from '../../components/common/AppArt.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import { useSermons } from '../../composables/useSermons'
import { useFollowUps } from '../../composables/useFollowUps'
import { usePermissions } from '../../composables/usePermissions'
import { rolesOfTeam } from '../../data/scheduleTeams'
import { findRosterMember, formatMonthLabel, formatServiceDate, formatShortDate, parseIso, todayIso } from '../../utils/lineupUtils'
import { SONG_LEADER_ROLE, assignmentsOf, peopleOnService } from '../../data/scheduleRoles'
import { getDisplayName } from '../../utils/memberUtils'

// The Schedules app's home, built the way People's is (src/apps/people/
// PeopleHome.vue). One screen, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top: a month
//      still in draft, the next Sunday nobody has planned, the nearest Sunday
//      with a role nobody is on, a team's own part still to do (the songs,
//      the message), newcomers to follow up, and your own next turn when it
//      is not this Sunday. Under them all, the card that is always there: the
//      next Sunday, with everyone serving on it. Anything that matters gets
//      the main card rather than a line in a list behind a button; each can
//      be put away until the app is next opened.
//   2. The doors: each section as a tile with its own artwork and a line of
//      what is true inside it — your next turn, how much of the month is
//      planned, who leads and who preaches, who is on the door, who is still
//      to be called.
//
// It used to lead with a hero card and one button, "N things need you", that
// opened the list in a sheet; the deck is that list, one card at a time, and
// the sheet is gone.

const {
  loading,
  canPlan,
  canPlanTeam,
  myMember,
  next,
  myRolesOn,
  myUpcoming,
  drafts,
  gaps,
  nextUnplanned,
  roles,
  comingSundays,
  thisMonth,
  thisMonthSundays,
} = useScheduleOverview()
const { members } = useMembers()
const { sermonOn } = useSermons()
const { followUpOf } = useFollowUps()
const { can } = usePermissions()

const today = todayIso()
const memberOf = (id) => findRosterMember(members.value, id)
const keyOf = (member) => member.firestoreId || member.id
const sundayLink = (date, edit) => ({ name: 'SchedulesSunday', params: { date }, ...(edit ? { query: { edit } } : {}) })

const daysUntil = (iso) => {
  const from = parseIso(today)
  const to = parseIso(iso)
  return from && to ? Math.round((to - from) / 86400000) : 0
}

/** "today", "this Sunday", or "on Oct 18" — how far off a service is, in words. */
const whenOf = (iso) => {
  const days = daysUntil(iso)
  if (days === 0) return 'today'
  if (days <= 6) return 'this Sunday'
  return `on ${formatShortDate(iso)}`
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/* --------------------------------------------------------- the next Sunday */

const myRoles = computed(() => (next.value ? myRolesOn(next.value) : []))

/** Everyone on the next Sunday, the people the card is about. */
const serving = computed(() => (next.value ? peopleOnService(next.value).map(memberOf).filter(Boolean) : []))

/** Who preaches and who leads: the two a congregation asks about first. */
const keyPeople = computed(() => {
  if (!next.value) return ''
  const assignments = assignmentsOf(next.value)
  return [
    { doing: 'preaching', member: memberOf(assignments.preacher?.[0]) },
    { doing: 'leading', member: memberOf(assignments[SONG_LEADER_ROLE]?.[0]) },
  ]
    .filter((row) => row.member)
    .map((row) => `${getDisplayName(row.member)} ${row.doing}`)
    .join(' · ')
})

const sundayCard = computed(() => {
  const sunday = next.value
  if (loading.value || !sunday) {
    return {
      kind: 'sunday',
      key: 'sunday',
      tone: 'accent',
      kicker: greeting.value,
      title: loading.value ? 'Schedules' : canPlan.value ? 'Nothing planned yet' : 'Nothing scheduled yet',
      detail: loading.value
        ? ''
        : canPlan.value
          ? 'Plan a Sunday and everyone on it can see when they are on.'
          : 'The next service shows here once it is scheduled.',
      to: null,
    }
  }
  const when = whenOf(sunday.date)
  const title = myRoles.value.length
    ? `You're on ${when}`
    : when === 'today'
      ? 'Today'
      : when === 'this Sunday'
        ? 'This Sunday'
        : formatServiceDate(sunday.date)
  const detail = [
    myRoles.value.length ? myRoles.value.map((role) => role.name).join(' · ') : daysUntil(sunday.date) <= 6 ? formatShortDate(sunday.date) : '',
    sunday.theme || '',
  ]
    .filter(Boolean)
    .join(' · ')
  return { kind: 'sunday', key: 'sunday', tone: 'accent', kicker: greeting.value, title, detail, to: sundayLink(sunday.date) }
})

/* -------------------------------------------------------------- the deck */

const coming = computed(() => comingSundays.value[0] || null)

const newcomersWaiting = computed(() =>
  can('consolidation.view')
    ? members.value.filter((m) => m.isMember === false && followUpOf(m.firestoreId || m.id).step === 'new').length
    : 0
)

const cards = computed(() => {
  const list = []

  if (canPlan.value) {
    // A month in draft is a month nobody else can see, so it leads.
    drafts.value.forEach((month) =>
      list.push({
        kind: 'plain',
        key: `draft:${month}`,
        tone: 'warn',
        icon: BellRinging,
        dismissible: true,
        kicker: 'Not published',
        title: `${formatMonthLabel(month).split(' ')[0]} is still a draft`,
        detail: 'Nobody else can see it until it is published.',
        to: { name: 'SchedulesCalendar', params: { month } },
      })
    )

    if (nextUnplanned.value) {
      list.push({
        kind: 'dated',
        key: `plan:${nextUnplanned.value.date}`,
        tone: 'plain',
        icon: Plus,
        dismissible: true,
        kicker: 'Still to plan',
        title: `Plan ${formatShortDate(nextUnplanned.value.date)}`,
        detail: 'Nobody is on it yet.',
        to: sundayLink(nextUnplanned.value.date, '1'),
        date: nextUnplanned.value.date,
      })
    }

    // The nearest Sunday with an open role; the calendar has the rest.
    const gap = gaps.value.find((row) => row.planned)
    if (gap) {
      list.push({
        kind: 'dated',
        key: `gap:${gap.date}:${gap.empty.map((role) => role.id).join(',')}`,
        tone: 'warn',
        icon: BellRinging,
        dismissible: true,
        kicker: 'Open roles',
        title: `${formatShortDate(gap.date)} needs ${gap.empty.length === 1 ? 'one more' : `${gap.empty.length} more`}`,
        detail: gap.empty.map((role) => role.name).join(' · '),
        to: sundayLink(gap.date),
        date: gap.date,
      })
    }
  } else if (coming.value) {
    // A team's own planners see their own part of the coming Sunday.
    const date = coming.value.date
    if (canPlanTeam('worship') && !coming.value.songs?.length) {
      list.push({
        kind: 'dated',
        key: `songs:${date}`,
        tone: 'plain',
        icon: MicrophoneStage,
        dismissible: true,
        kicker: 'Worship',
        title: `Pick the songs for ${formatShortDate(date)}`,
        detail: 'The band and the screen both wait on them.',
        to: sundayLink(date, 'worship'),
        date,
      })
    }
    if (canPlanTeam('preaching') && !sermonOn(date)) {
      list.push({
        kind: 'dated',
        key: `message:${date}`,
        tone: 'plain',
        icon: BookOpenText,
        dismissible: true,
        kicker: 'Preaching',
        title: `Write the message for ${formatShortDate(date)}`,
        detail: 'Its passages and slides go up on the screen on their own.',
        to: sundayLink(date, 'preaching'),
        date,
      })
    }
  }

  if (can('consolidation.manage') && newcomersWaiting.value) {
    const n = newcomersWaiting.value
    list.push({
      kind: 'plain',
      key: `newcomers:${n}`,
      tone: 'plain',
      icon: HandWaving,
      dismissible: true,
      kicker: 'Welcome',
      title: `${n} ${n === 1 ? 'newcomer' : 'newcomers'} to follow up`,
      detail: 'A call in the week is what brings someone back.',
      to: { name: 'SchedulesWelcome' },
    })
  }

  // Your own next turn, when it is not the Sunday the card below already is.
  const mine = myUpcoming.value[0]
  if (mine && mine.date !== next.value?.date) {
    list.push({
      kind: 'dated',
      key: `mine:${mine.date}`,
      tone: 'plain',
      icon: MicrophoneStage,
      dismissible: true,
      kicker: 'Your next turn',
      title: `You're on ${formatShortDate(mine.date)}`,
      detail: myRolesOn(mine).map((role) => role.name).join(' · '),
      to: sundayLink(mine.date),
      date: mine.date,
    })
  }

  list.push(sundayCard.value)
  return list
})

const FACES = 6

/* -------------------------------------------------------------- the doors */

/** Who is on one team's roles on the coming Sunday. */
const teamOn = (key) => {
  if (!coming.value) return []
  const assignments = assignmentsOf(coming.value)
  const ids = rolesOfTeam(roles.value, key).flatMap((role) => assignments[role.id] || [])
  return [...new Set(ids)].map(memberOf).filter(Boolean)
}

const leader = computed(() => (coming.value ? memberOf(assignmentsOf(coming.value)[SONG_LEADER_ROLE]?.[0]) : null))
const preacher = computed(() => (coming.value ? memberOf(assignmentsOf(coming.value).preacher?.[0]) : null))
const ushers = computed(() => teamOn('ushers'))
const sermonTitle = computed(() => (coming.value ? sermonOn(coming.value.date)?.title || '' : ''))

const plannedThisMonth = computed(() => thisMonthSundays.value.filter((s) => s.planned).length)

const doors = computed(() => {
  const ready = !loading.value
  const comingDate = coming.value ? formatShortDate(coming.value.date) : ''
  const mine = myUpcoming.value[0]

  const teamDoor = (key, door) =>
    // A team with no roles yet is only worth a door to someone who could set it up.
    rolesOfTeam(roles.value, key).length || canPlanTeam(key) || (key === 'welcome' && can('consolidation.view')) ? [door] : []

  return [
    {
      key: 'mine',
      title: 'My turns',
      art: 'schedules-mine',
      to: { name: 'SchedulesMine' },
      detail: !ready ? '' : !myMember.value ? 'Not linked to the roll' : mine ? `Next: ${formatShortDate(mine.date)}` : 'None coming up',
    },
    {
      key: 'calendar',
      title: 'Calendar',
      art: 'schedules-calendar',
      to: { name: 'SchedulesCalendar' },
      detail: ready ? `${formatMonthLabel(thisMonth).split(' ')[0]}: ${plannedThisMonth.value} of ${thisMonthSundays.value.length} planned` : '',
    },
    ...teamDoor('worship', {
      key: 'worship',
      title: 'Worship',
      art: 'schedules-worship',
      to: { name: 'SchedulesWorship' },
      detail: !ready || !coming.value ? '' : coming.value.songs?.length ? `${coming.value.songs.length} songs for ${comingDate}` : `No songs yet for ${comingDate}`,
    }),
    ...teamDoor('preaching', {
      key: 'preaching',
      title: 'Preaching',
      art: 'schedules-preaching',
      to: { name: 'SchedulesPreaching' },
      detail: !ready || !coming.value ? '' : sermonTitle.value || `No message yet for ${comingDate}`,
    }),
    ...teamDoor('ushers', {
      key: 'ushers',
      title: 'Ushers',
      art: 'schedules-ushers',
      to: { name: 'SchedulesUshers' },
      detail: !ready || !coming.value ? '' : ushers.value.length ? ushers.value.map(getDisplayName).join(', ') : `Nobody on the door ${comingDate}`,
    }),
    ...teamDoor('welcome', {
      key: 'welcome',
      title: 'Welcome',
      art: 'schedules-welcome',
      to: { name: 'SchedulesWelcome' },
      detail: !ready ? '' : newcomersWaiting.value ? `${newcomersWaiting.value} to follow up` : 'Everyone followed up',
    }),
    ...(canPlan.value
      ? [{ key: 'who', title: 'Who serves', art: 'schedules-who', to: { name: 'SchedulesTeam' }, detail: 'Who is on, and how often' }]
      : []),
  ]
})
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What matters about Sunday, most important on top -->
      <AppHeroDeck :cards="cards" scope="schedules" label="Schedules today" class="animate-rise">
        <template #card="{ card }">
          <!-- Something on a Sunday: its date, the way a calendar shows it. -->
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

          <!-- The next Sunday: always at the bottom of the deck, with
               everyone serving on it along its foot. -->
          <DeckCard
            v-else-if="card.kind === 'sunday'"
            tone="accent"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
          >
            <template #art>
              <!-- Light through an arched window, the outline of Ekkly's mark
                   (BRAND.md: the window is the motif). -->
              <svg class="absolute -bottom-10 right-5 h-60 w-36" viewBox="0 0 144 240" fill="none">
                <defs>
                  <linearGradient id="schedules-arch-light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="white" stop-opacity="0.2" />
                    <stop offset="0.75" stop-color="white" stop-opacity="0.03" />
                    <stop offset="1" stop-color="white" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" fill="url(#schedules-arch-light)" />
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.14" stroke-width="1.5" />
              </svg>
            </template>
            <!-- The Schedules artwork, on white because its orange and blue
                 are Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10">
                <AppArt app-key="lineups" :play="1" class="size-10" />
              </span>
            </template>
            <template v-if="serving.length" #default>
              <div class="flex items-center">
                <div class="flex -space-x-2.5">
                  <MemberAvatar
                    v-for="member in serving.slice(0, FACES)"
                    :key="keyOf(member)"
                    :member="member"
                    alt=""
                    size="h-10 w-10"
                    plain-class="ring-2 ring-white/70"
                  />
                </div>
                <span
                  v-if="serving.length > FACES"
                  class="ml-2 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
                >
                  +{{ serving.length - FACES }}
                </span>
              </div>
              <p v-if="keyPeople" class="mt-2 truncate text-xs text-white/80">{{ keyPeople }}</p>
            </template>
          </DeckCard>

          <DeckCard
            v-else
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          />
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <nav class="grid grid-cols-2 gap-2.5" aria-label="Schedules">
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
            <!-- My turns: the date of the next one. -->
            <span
              v-if="door.key === 'mine' && myUpcoming[0]"
              class="flex h-9 w-8 flex-col items-center justify-center rounded-lg bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light"
            >
              <span class="text-[9px] font-bold uppercase">{{ parseIso(myUpcoming[0].date)?.toLocaleDateString('en-US', { month: 'short' }) }}</span>
              <span class="mt-0.5 text-sm font-bold tabular-nums">{{ parseIso(myUpcoming[0].date)?.getDate() }}</span>
            </span>

            <!-- Calendar: this month's Sundays, planned or not. -->
            <span v-else-if="door.key === 'calendar' && !loading" class="mt-2 flex h-2 w-16 gap-1" aria-hidden="true">
              <span
                v-for="sunday in thisMonthSundays"
                :key="sunday.date"
                :class="['flex-1 rounded-full', sunday.planned ? 'bg-primary dark:bg-primary-light' : 'bg-gray-100 dark:bg-gray-700']"
              />
            </span>

            <!-- Worship and Preaching: whoever leads and preaches next. -->
            <MemberAvatar
              v-else-if="door.key === 'worship' && leader"
              :member="leader"
              alt=""
              size="h-8 w-8"
              plain-class="ring-2 ring-white dark:ring-gray-800"
            />
            <MemberAvatar
              v-else-if="door.key === 'preaching' && preacher"
              :member="preacher"
              alt=""
              size="h-8 w-8"
              plain-class="ring-2 ring-white dark:ring-gray-800"
            />

            <!-- Ushers: who is on the door. -->
            <span v-else-if="door.key === 'ushers' && ushers.length" class="flex -space-x-2">
              <MemberAvatar
                v-for="member in ushers.slice(0, 3)"
                :key="keyOf(member)"
                :member="member"
                alt=""
                size="h-7 w-7"
                plain-class="ring-2 ring-white dark:ring-gray-800"
              />
            </span>

            <!-- Welcome: how many are still to be called. -->
            <span
              v-else-if="door.key === 'welcome' && newcomersWaiting"
              class="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold tabular-nums text-primary dark:bg-primary-light/15 dark:text-primary-light"
            >
              {{ newcomersWaiting }}
            </span>
          </template>
        </AppShortcut>
      </nav>
    </div>
  </AppScreen>
</template>

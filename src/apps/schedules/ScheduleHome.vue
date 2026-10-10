<script setup>
import { computed } from 'vue'
import { BellRinging, BookOpenText, HandWaving, MicrophoneStage, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import DeckFaces from '../../components/appframe/DeckFaces.vue'
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
import { getDisplayName, listPhrase } from '../../utils/memberUtils'

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
//   2. The doors: each section as a tile with its own artwork and its name,
//      and a badge only when something behind it is waiting on you. What is
//      true inside each is the deck's and the section's to say.
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
  sundaysOf,
} = useScheduleOverview()
const { members } = useMembers()
const { sermonOn } = useSermons()
const { followUpOf } = useFollowUps()
const { can } = usePermissions()

const today = todayIso()
const memberOf = (id) => findRosterMember(members.value, id)
const keyOf = (member) => member.firestoreId || member.id
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/** "Ana, Ben and 3 others": who a card is about, the first two by name. */
const namesOf = (people) => {
  const names = people.slice(0, 2).map(getDisplayName)
  if (people.length > 2) names.push(plural(people.length - 2, 'other', 'others'))
  return listPhrase(names)
}

/** Everyone serving on a Sunday, as roll records. */
const servingOn = (sunday) => (sunday ? peopleOnService(sunday).map(memberOf).filter(Boolean) : [])
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

const newcomers = computed(() =>
  can('consolidation.view')
    ? members.value.filter((m) => m.isMember === false && followUpOf(m.firestoreId || m.id).step === 'new')
    : []
)
const newcomersWaiting = computed(() => newcomers.value.length)

/**
 * A team's part of the coming Sunday as a card's faces: whoever is on its
 * roles, and the one who leads it named, or an empty seat where nobody is.
 */
const teamFaces = (key, lead, doing) => {
  const team = teamOn(key)
  return {
    members: team,
    empty: team.length ? 0 : 1,
    caption: lead ? `${getDisplayName(lead)} ${doing}` : team.length ? '' : `Nobody ${doing} yet`,
  }
}

const cards = computed(() => {
  const list = []

  if (canPlan.value) {
    // A month in draft is a month nobody else can see, so it leads.
    drafts.value.forEach((month) =>
      list.push({
        kind: 'draft',
        key: `draft:${month}`,
        tone: 'warn',
        icon: BellRinging,
        dismissible: true,
        kicker: 'Not published',
        title: `${formatMonthLabel(month).split(' ')[0]} is still a draft`,
        detail: 'Nobody else can see it until it is published.',
        to: { name: 'SchedulesCalendar', params: { month } },
        sundays: sundaysOf(month),
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
        // Every role, as a seat nobody is in yet.
        faces: { members: [], empty: roles.value.length, caption: `${plural(roles.value.length, 'role', 'roles')} to fill` },
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
        // Who is on so far, and a seat for each role still open.
        faces: { members: servingOn(gap.sunday), empty: gap.empty.length, caption: `${servingOn(gap.sunday).length} on so far` },
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
        faces: teamFaces('worship', leader.value, 'leading'),
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
        faces: teamFaces('preaching', preacher.value, 'preaching'),
      })
    }
  }

  if (can('consolidation.manage') && newcomersWaiting.value) {
    const n = newcomersWaiting.value
    const people = newcomers.value
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
      faces: { members: people, empty: 0, caption: namesOf(people) },
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
      // Who else is on with you that Sunday.
      faces: (() => {
        const others = servingOn(mine).filter((member) => !myMember.value || keyOf(member) !== keyOf(myMember.value))
        return { members: others, empty: 0, caption: others.length ? `With ${namesOf(others)}` : '' }
      })(),
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

// A door is its name and nothing more, unless something behind it is waiting
// on you: then a badge says how many. Your next turn, the open roles, the
// songs and the message still to write are all cards in the deck above, so a
// line on the tile only said them twice.
const doors = computed(() => {
  const ready = !loading.value

  const teamDoor = (key, door) =>
    // A team with no roles yet is only worth a door to someone who could set it up.
    rolesOfTeam(roles.value, key).length || canPlanTeam(key) || (key === 'welcome' && can('consolidation.view')) ? [door] : []

  return [
    { key: 'mine', title: 'My turns', art: 'schedules-mine', to: { name: 'SchedulesMine' } },
    { key: 'calendar', title: 'Calendar', art: 'schedules-calendar', to: { name: 'SchedulesCalendar' } },
    ...teamDoor('worship', { key: 'worship', title: 'Worship', art: 'schedules-worship', to: { name: 'SchedulesWorship' } }),
    ...teamDoor('preaching', { key: 'preaching', title: 'Preaching', art: 'schedules-preaching', to: { name: 'SchedulesPreaching' } }),
    ...teamDoor('ushers', { key: 'ushers', title: 'Ushers', art: 'schedules-ushers', to: { name: 'SchedulesUshers' } }),
    ...teamDoor('welcome', {
      key: 'welcome',
      title: 'Welcome',
      art: 'schedules-welcome',
      to: { name: 'SchedulesWelcome' },
      badge: ready ? newcomersWaiting.value : 0,
    }),
    ...(canPlan.value ? [{ key: 'who', title: 'Who serves', art: 'schedules-who', to: { name: 'SchedulesTeam' } }] : []),
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
            <DeckFaces v-if="card.faces" :tone="card.tone" v-bind="card.faces" />
          </DeckCard>

          <!-- A month in draft: its Sundays, the planned ones filled in. -->
          <DeckCard
            v-else-if="card.kind === 'draft'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <div class="flex gap-1.5" aria-hidden="true">
              <span
                v-for="sunday in card.sundays"
                :key="sunday.date"
                :class="[
                  'flex h-9 flex-1 items-center justify-center rounded-xl text-sm font-bold tabular-nums',
                  sunday.planned
                    ? 'bg-amber-500 text-white dark:bg-amber-500/80'
                    : 'border-2 border-dashed border-amber-300 text-amber-700 dark:border-gray-600 dark:text-gray-400',
                ]"
              >
                {{ parseIso(sunday.date)?.getDate() }}
              </span>
            </div>
            <p class="mt-1.5 text-xs text-amber-800 dark:text-gray-400">
              {{ card.sundays.filter((s) => s.planned).length }} of {{ card.sundays.length }} Sundays planned
            </p>
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
              <CardPanes />
            </template>
            <!-- The Schedules artwork, on white because its orange and blue
                 are Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
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
          >
            <DeckFaces v-if="card.faces" :tone="card.tone" v-bind="card.faces" />
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Schedules" />
    </div>
  </AppScreen>
</template>

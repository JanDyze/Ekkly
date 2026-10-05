<script setup>
import { computed, ref } from 'vue'
import { BellRinging, HandWaving, IdentificationBadge, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHero from '../../components/appframe/AppHero.vue'
import AppShortcut from '../../components/appframe/AppShortcut.vue'
import AppActionsSheet from '../../components/appframe/AppActionsSheet.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import { useSermons } from '../../composables/useSermons'
import { useFollowUps } from '../../composables/useFollowUps'
import { usePermissions } from '../../composables/usePermissions'
import { rolesOfTeam } from '../../data/scheduleTeams'
import { findRosterMember, formatMonthLabel, formatServiceDate, formatShortDate, parseIso, todayIso } from '../../utils/lineupUtils'
import { SONG_LEADER_ROLE, assignmentsOf } from '../../data/scheduleRoles'
import { getDisplayName } from '../../utils/memberUtils'

// The Schedules app's home. One screen, no scrolling, and three things on it:
//
//   1. The next Sunday — when it is, whether you are on it, who preaches and
//      who leads — and the way into it. It is the question nearly every visit
//      is.
//   2. What is waiting on you, behind one button with the count on it: a
//      Sunday still to plan, a month left in draft, a role nobody is on, a
//      message not yet written, newcomers to call, or your own next turn when
//      it is not this Sunday. The list opens in a sheet (AppActionsSheet); the
//      home itself carries none of it. Nothing waiting, no button.
//   3. The doors: a picture and a name for each section, two short rows like
//      a phone's home screen. A count on a corner says what is waiting inside.
//
// What it used to carry and does not: a tile per section with a sentence on
// each (the sentences repeated the Sunday above, or the section itself), a
// main button, and the waiting jobs themselves — they are one tap away, behind
// the button, rather than on the face of the home.

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
} = useScheduleOverview()
const { members } = useMembers()
const { sermonOn } = useSermons()
const { followUpOf } = useFollowUps()
const { can } = usePermissions()

const today = todayIso()

/* ------------------------------------------------------------ the Sunday */

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

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

const myRoles = computed(() => (next.value ? myRolesOn(next.value) : []))

const headline = computed(() => {
  if (loading.value) return 'Schedules'
  const sunday = next.value
  if (!sunday) return canPlan.value ? 'Nothing planned yet' : 'Nothing scheduled yet'
  const when = whenOf(sunday.date)
  if (myRoles.value.length) return `You're on ${when}`
  if (when === 'today') return 'Today'
  if (when === 'this Sunday') return 'This Sunday'
  return formatServiceDate(sunday.date)
})

const heroDetail = computed(() => {
  if (!next.value) {
    return canPlan.value ? 'Plan a Sunday and everyone on it can see when they are on.' : 'The next service shows here once it is scheduled.'
  }
  const parts = []
  if (myRoles.value.length) parts.push(myRoles.value.map((r) => r.name).join(' · '))
  else if (daysUntil(next.value.date) <= 6) parts.push(formatShortDate(next.value.date))
  if (next.value.theme) parts.push(next.value.theme)
  return parts.join(' · ')
})

// Who preaches and who leads: the two a congregation asks about first.
const keyPeople = computed(() => {
  if (!next.value) return []
  const assignments = assignmentsOf(next.value)
  return [
    { key: 'preacher', doing: 'preaching', id: assignments.preacher?.[0] },
    { key: 'leader', doing: 'leading', id: assignments[SONG_LEADER_ROLE]?.[0] },
  ]
    .map((person) => ({ ...person, member: findRosterMember(members.value, person.id) }))
    .filter((person) => person.member)
})

/* --------------------------------------------------- what is waiting on you */

const coming = computed(() => comingSundays.value[0] || null)

const newcomersWaiting = computed(() =>
  can('consolidation.view')
    ? members.value.filter((m) => m.isMember === false && followUpOf(m.firestoreId || m.id).step === 'new').length
    : 0
)

/** Everything waiting on this person, soonest and most pressing first. */
const waiting = computed(() => {
  const list = []
  const sundayLink = (date, edit) => ({ name: 'SchedulesSunday', params: { date }, ...(edit ? { query: { edit } } : {}) })

  if (canPlan.value) {
    if (nextUnplanned.value) {
      list.push({
        key: 'plan',
        icon: Plus,
        tone: 'action',
        text: `Plan ${formatShortDate(nextUnplanned.value.date)}`,
        hint: 'Nobody is on it yet',
        to: sundayLink(nextUnplanned.value.date, '1'),
      })
    }
    drafts.value.forEach((month) =>
      list.push({
        key: `draft-${month}`,
        icon: BellRinging,
        tone: 'warn',
        text: `${formatMonthLabel(month).split(' ')[0]} is still a draft`,
        hint: 'Nobody else can see it until it is published',
        to: { name: 'SchedulesCalendar', params: { month } },
      })
    )
    gaps.value
      .filter((gap) => gap.planned)
      .forEach((gap) =>
        list.push({
          key: `gap-${gap.date}`,
          icon: BellRinging,
          tone: 'warn',
          text: `${formatShortDate(gap.date)} needs ${gap.empty.map((r) => r.name.toLowerCase()).join(', ')}`,
          hint: 'Still open on a Sunday coming up',
          to: sundayLink(gap.date),
        })
      )
  } else if (coming.value) {
    // A team's own planners see their own part of the coming Sunday.
    const date = coming.value.date
    if (canPlanTeam('worship') && !coming.value.songs?.length) {
      list.push({ key: 'songs', icon: Plus, tone: 'action', text: `Pick the songs for ${formatShortDate(date)}`, hint: 'Worship', to: sundayLink(date, 'worship') })
    }
    if (canPlanTeam('preaching') && !sermonOn(date)) {
      list.push({ key: 'message', icon: Plus, tone: 'action', text: `Write the message for ${formatShortDate(date)}`, hint: 'Preaching', to: sundayLink(date, 'preaching') })
    }
  }

  if (can('consolidation.manage') && newcomersWaiting.value) {
    list.push({
      key: 'newcomers',
      icon: HandWaving,
      tone: 'action',
      text: `${newcomersWaiting.value} newcomer${newcomersWaiting.value === 1 ? '' : 's'} to follow up`,
      hint: 'Welcome',
      to: { name: 'SchedulesWelcome' },
    })
  }

  // Your own next turn, when it is not the Sunday the card above already shows.
  const mine = myUpcoming.value[0]
  if (mine && mine.date !== next.value?.date) {
    list.push({
      key: 'mine',
      icon: IdentificationBadge,
      tone: 'mine',
      text: `You're on ${formatShortDate(mine.date)}`,
      hint: myRolesOn(mine).map((r) => r.name).join(' · '),
      to: sundayLink(mine.date),
    })
  }
  return list
})

const showActions = ref(false)
/** Amber when something needs acting on; the accent when it is only your own turn. */
const urgentWaiting = computed(() => waiting.value.some((item) => item.tone !== 'mine'))

/* -------------------------------------------------------------- the doors */

const planningCount = computed(() => (canPlan.value ? drafts.value.length + gaps.value.filter((g) => g.planned).length : 0))

const doors = computed(() => {
  const teamDoor = (key, title, name) =>
    // A team with no roles yet is only worth a door to someone who could set it up.
    rolesOfTeam(roles.value, key).length || canPlanTeam(key) || (key === 'welcome' && can('consolidation.view'))
      ? [{ key, title, glyph: key, to: { name } }]
      : []
  return [
    { key: 'mine', title: 'My turns', glyph: 'mine', to: { name: 'SchedulesMine' }, badge: myUpcoming.value.length },
    { key: 'calendar', title: 'Calendar', glyph: 'calendar', to: { name: 'SchedulesCalendar' }, badge: planningCount.value, urgent: true },
    ...teamDoor('worship', 'Worship', 'SchedulesWorship'),
    ...teamDoor('preaching', 'Preaching', 'SchedulesPreaching'),
    ...teamDoor('ushers', 'Ushers', 'SchedulesUshers'),
    ...teamDoor('welcome', 'Welcome', 'SchedulesWelcome').map((door) => ({ ...door, badge: newcomersWaiting.value })),
    ...(canPlan.value ? [{ key: 'who', title: 'Who serves', glyph: 'who', to: { name: 'SchedulesTeam' } }] : []),
  ]
})

</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-3">
      <!-- 1. The next Sunday, and the way into it -->
      <AppHero
        art="lineups"
        :greeting="greeting"
        :title="headline"
        :detail="heroDetail"
        :to="next ? { name: 'SchedulesSunday', params: { date: next.date } } : null"
      >
        <div v-if="keyPeople.length" class="mt-4 flex items-center gap-2.5 pr-8">
          <div class="flex shrink-0 -space-x-2">
            <MemberAvatar
              v-for="person in keyPeople"
              :key="person.key"
              :member="person.member"
              alt=""
              size="h-8 w-8"
              plain-class="ring-2 ring-primary"
            />
          </div>
          <p class="min-w-0 flex-1 truncate text-sm text-white/85">
            {{ keyPeople.map((p) => `${getDisplayName(p.member)} ${p.doing}`).join(' · ') }}
          </p>
        </div>
      </AppHero>

      <!-- 2. What is waiting on you: one button, the list behind it -->
      <button
        v-if="waiting.length"
        type="button"
        :class="[
          'animate-rise inline-flex h-11 items-center gap-2 self-start rounded-full px-4 text-sm font-semibold transition-transform duration-200 ease-out pressed:scale-[0.97]',
          urgentWaiting
            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-500/30'
            : 'bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary-light/15 dark:text-primary-light dark:ring-primary-light/25',
        ]"
        style="animation-delay: 60ms"
        @click="showActions = true"
      >
        <BellRinging class="size-4.5" />
        {{ waiting.length }} {{ waiting.length === 1 ? 'thing needs' : 'things need' }} you
      </button>

      <!-- 3. The doors -->
      <nav class="mt-1 grid grid-cols-4 gap-x-2 gap-y-3" aria-label="Schedules">
        <AppShortcut
          v-for="(door, index) in doors"
          :key="door.key"
          :to="door.to"
          :title="door.title"
          :glyph="door.glyph"
          :badge="door.badge || 0"
          :urgent="door.urgent || false"
          :delay="120 + index * 30"
        />
      </nav>
    </div>

    <AppActionsSheet :show="showActions" :items="waiting" @close="showActions = false" />
  </AppScreen>
</template>

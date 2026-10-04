<script setup>
import { computed } from 'vue'
import {
  CalendarDots,
  ChevronRight,
  EyeOff,
  IdentificationBadge,
  Plus,
  UsersThree,
  Warning,
} from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHero from '../../components/appframe/AppHero.vue'
import AppTile from '../../components/appframe/AppTile.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import {
  findRosterMember,
  formatMonthLabel,
  formatServiceDate,
  formatShortDate,
  parseIso,
  todayIso,
} from '../../utils/lineupUtils'
import { peopleOnService } from '../../data/scheduleRoles'
import { getDisplayName } from '../../utils/memberUtils'

// The Schedules app's home, and its navigation.
//
// A launcher, the shape every app inside Ekkly takes (src/components/appframe):
// a hero that answers the question most visits are — who is on this Sunday,
// and whether it is you — then a tile into each section saying what is true
// in it, one main action, and the Sunday itself. Nothing here is a tab; each
// section is a step in, with a way back.
//
// Putting a Sunday on the screen is not here: that is the Presentation app,
// the tech team's own, and each Sunday's screen carries a Present button into
// it for whoever is looking at one.

const {
  loading,
  canPlan,
  myMember,
  upcoming,
  next,
  myRolesOn,
  myUpcoming,
  leaderOf,
  thisMonth,
  thisMonthSundays,
  thisMonthStatus,
  drafts,
  gaps,
  nextUnplanned,
} = useScheduleOverview()
const { members } = useMembers()

const today = todayIso()

/* ---------------------------------------------------------------- hero */

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

const nameOf = (id) => {
  const member = findRosterMember(members.value, id)
  return member ? getDisplayName(member) : ''
}

// One sentence that is true today. Being on the service yourself comes first,
// because it is the one thing in here that is about you.
const headline = computed(() => {
  if (loading.value) return 'Schedules'
  const sunday = next.value
  if (!sunday) return canPlan.value ? 'Nothing planned yet' : 'Nothing scheduled yet'
  const mine = myRolesOn(sunday)
  if (mine.length) return `You're on ${whenOf(sunday.date)} · ${mine.map((r) => r.name).join(', ')}`
  const leader = nameOf(leaderOf(sunday))
  if (leader) return `${leader} leads ${whenOf(sunday.date)}`
  return `${peopleOnService(sunday).length} serving ${whenOf(sunday.date)}`
})

const heroDetail = computed(() => {
  if (!next.value) {
    return canPlan.value ? 'Plan a Sunday and everyone on it can see when they are on.' : 'The next service shows here once it is scheduled.'
  }
  // Named as a theme: on its own, in quotation marks, it read as a stray
  // quotation rather than as what the Sunday is about.
  return next.value.theme ? `Theme · ${next.value.theme}` : formatServiceDate(next.value.date)
})

const plannedThisMonth = computed(() => thisMonthSundays.value.filter((s) => s.planned).length)
const segmentsLabel = computed(
  () => `${formatMonthLabel(thisMonth)} · ${plannedThisMonth.value} of ${thisMonthSundays.value.length} Sundays planned`
)

/* --------------------------------------------------------------- tiles */

const calendarDetail = computed(() => {
  if (canPlan.value && drafts.value.length) return `${formatMonthLabel(drafts.value[0]).split(' ')[0]} is a draft`
  if (canPlan.value && thisMonthStatus.value !== 'published' && !plannedThisMonth.value) return 'Start this month'
  return `${upcoming.value.length} Sunday${upcoming.value.length === 1 ? '' : 's'} coming up`
})

const turnsDetail = computed(() => {
  if (!myMember.value) return 'Link your account first'
  const first = myUpcoming.value[0]
  return first ? `Next: ${formatShortDate(first.date)}` : 'None coming up'
})

const teamDetail = computed(() => {
  const count = gaps.value.filter((g) => g.planned).length
  return count ? `${count} Sunday${count === 1 ? '' : 's'} short` : 'Who serves how often'
})

/* ------------------------------------------------------------ the action */

// Planners plan. Everyone else came to find out when they are on, so the main
// action is their own next Sunday, or failing that the next one at all.
const action = computed(() => {
  if (canPlan.value) {
    const target = nextUnplanned.value
    return target
      ? {
          label: `Plan ${formatShortDate(target.date)}`,
          icon: Plus,
          to: { name: 'SchedulesSunday', params: { date: target.date }, query: { edit: '1' } },
        }
      : { label: 'Open the calendar', icon: CalendarDots, to: { name: 'SchedulesCalendar' } }
  }
  const mine = myUpcoming.value[0]
  if (mine) return { label: 'Open your next turn', icon: IdentificationBadge, to: { name: 'SchedulesSunday', params: { date: mine.date } } }
  if (next.value) return { label: 'See this Sunday', icon: CalendarDots, to: { name: 'SchedulesSunday', params: { date: next.value.date } } }
  return null
})

/* --------------------------------------------------------- this Sunday */

const crew = computed(() =>
  next.value
    ? peopleOnService(next.value)
        .map((id) => findRosterMember(members.value, id))
        .filter(Boolean)
    : []
)

const tileDelay = (index) => 60 + index * 50
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-3">
      <AppHero
        art="lineups"
        :greeting="greeting"
        :title="headline"
        :detail="heroDetail"
        :segments="canPlan ? thisMonthSundays.map((s) => s.planned) : []"
        :segments-label="canPlan ? segmentsLabel : ''"
      />

      <!-- The sections. Team is the planners' own, and takes the whole row
           beneath the other two rather than leave a hole beside it. -->
      <nav class="grid grid-cols-2 gap-3" aria-label="Schedules">
        <AppTile
          :to="{ name: 'SchedulesCalendar' }"
          title="Calendar"
          :detail="calendarDetail"
          :icon="CalendarDots"
          :urgent="canPlan && drafts.length > 0"
          :delay="tileDelay(0)"
        />
        <AppTile
          :to="{ name: 'SchedulesMine' }"
          title="My turns"
          :detail="turnsDetail"
          :icon="IdentificationBadge"
          :badge="myUpcoming.length"
          :delay="tileDelay(1)"
        />
        <AppTile
          v-if="canPlan"
          :to="{ name: 'SchedulesTeam' }"
          title="Team"
          :detail="teamDetail"
          :icon="UsersThree"
          wide
          :delay="tileDelay(2)"
        />
      </nav>

      <RouterLink
        v-if="action"
        :to="action.to"
        class="animate-rise flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white transition-transform duration-200 ease-out hover:bg-primary-hover pressed:scale-[0.98]"
        style="animation-delay: 220ms"
      >
        <component :is="action.icon" class="size-5" />
        {{ action.label }}
      </RouterLink>

      <!-- The Sunday itself -->
      <section v-if="next" class="animate-rise mt-3" style="animation-delay: 310ms">
        <h2 class="mb-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ whenOf(next.date) === 'today' ? 'Today' : 'Next service' }}
        </h2>
        <RouterLink
          :to="{ name: 'SchedulesSunday', params: { date: next.date } }"
          class="group block rounded-2xl border border-gray-200 bg-white p-4 transition-[transform,border-color] duration-200 ease-out hover:border-gray-300 pressed:scale-[0.99] dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-lg font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                {{ formatServiceDate(next.date) }}
              </p>
              <p v-if="next.theme" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                {{ next.theme }}
              </p>
            </div>
            <span
              v-if="next.draft"
              class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            >
              Draft
            </span>
            <ChevronRight
              class="mt-1 size-4 shrink-0 text-gray-300 transition-transform duration-300 group-engaged:translate-x-1 dark:text-gray-600"
            />
          </div>
          <div class="mt-3 flex items-center gap-3">
            <div class="flex -space-x-2">
              <MemberAvatar
                v-for="person in crew.slice(0, 4)"
                :key="person.firestoreId"
                :member="person"
                alt=""
                size="h-8 w-8"
                class="ring-2 ring-white dark:ring-gray-800"
              />
            </div>
            <p class="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
              <template v-if="nameOf(leaderOf(next))">{{ nameOf(leaderOf(next)) }} leading · </template>
              {{ crew.length }} serving · {{ next.songs?.length || 0 }} songs
            </p>
          </div>
        </RouterLink>
      </section>

      <!-- For whoever plans: what is still undone -->
      <section
        v-if="canPlan && (drafts.length || gaps.length)"
        class="animate-rise mt-3"
        style="animation-delay: 360ms"
      >
        <h2 class="mb-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">Still to do</h2>
        <div class="flex flex-col gap-2">
          <RouterLink
            v-for="draft in drafts"
            :key="draft"
            :to="{ name: 'SchedulesCalendar', params: { month: draft } }"
            class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition-transform duration-200 pressed:scale-[0.99] dark:border-gray-700/80 dark:bg-gray-800"
          >
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <EyeOff class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatMonthLabel(draft) }} is still a draft
              </span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                Nobody else can see it until it is published.
              </span>
            </span>
            <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </RouterLink>
          <RouterLink
            v-for="gap in gaps.slice(0, 4)"
            :key="gap.date"
            :to="{ name: 'SchedulesSunday', params: { date: gap.date } }"
            class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition-transform duration-200 pressed:scale-[0.99] dark:border-gray-700/80 dark:bg-gray-800"
          >
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <Warning class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatServiceDate(gap.date) }}
              </span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                {{ gap.planned ? `No ${gap.empty.map((r) => r.name.toLowerCase()).join(', ')}` : 'Not planned yet' }}
              </span>
            </span>
            <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </RouterLink>
        </div>
      </section>
    </div>
  </AppScreen>
</template>

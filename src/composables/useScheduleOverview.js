import { computed } from 'vue'
import { useAllLineups, isSundayPlanned, blankSunday } from './useLineups'
import { usePermissions } from './usePermissions'
import { useAppSettings } from './useAppSettings'
import { monthKeyOf, shiftMonth, sundaysInMonth, todayIso } from '../utils/lineupUtils'
import { SONG_LEADER_ROLE, assignmentsOf } from '../data/scheduleRoles'
import { memberKey } from '../utils/sgUtils'
import { TEAMS, teamByKey } from '../data/scheduleTeams'

// What is true across every schedule on file, for the Schedules app's home
// and the sections that summarise it — the next service, the account's own
// turns, and what a planner still has to do. One reading of the data, so the
// hero, the tiles and the sections cannot disagree about which Sunday is next.

export function useScheduleOverview() {
  const { canManage, myMember } = usePermissions()
  const { scheduleRoles: roles } = useAppSettings()
  const { lineups, loading } = useAllLineups()

  // Whoever is granted Schedules plans every Sunday, every team, and decides
  // when a month is published. A team's own planners — the worship leader, the
  // pastor, the head usher — plan their team's part of each Sunday.
  const canPlan = computed(() => canManage('lineups'))
  const canPlanTeam = (key) => canPlan.value || Boolean(teamByKey(key) && canManage(teamByKey(key).area))
  /** Planning anything at all — which is also who may see a month still in draft. */
  const canPlanAny = computed(() => canPlan.value || TEAMS.some((team) => canManage(team.area)))
  const today = todayIso()
  const thisMonth = monthKeyOf()

  const visibleMonths = computed(() =>
    lineups.value.filter((m) => canPlanAny.value || m.status === 'published')
  )

  /** Every planned service the account may see, soonest first, with its month. */
  const services = computed(() =>
    visibleMonths.value
      .flatMap((m) => m.sundays.map((sunday) => ({ ...sunday, month: m.month, draft: m.status !== 'published' })))
      .filter((sunday) => sunday.date && isSundayPlanned(sunday))
      .sort((a, b) => a.date.localeCompare(b.date))
  )

  const upcoming = computed(() => services.value.filter((s) => s.date >= today))
  const next = computed(() => upcoming.value[0] || null)

  const myIds = computed(() => {
    const mine = myMember.value
    return mine ? new Set([memberKey(mine), String(mine.firestoreId)]) : new Set()
  })

  /** The roles this account holds on a service — what the app shows, never what it allows. */
  const myRolesOn = (sunday) => {
    if (!sunday || !myIds.value.size) return []
    const assignments = assignmentsOf(sunday)
    return roles.value.filter((role) => (assignments[role.id] || []).some((id) => myIds.value.has(id)))
  }

  const myTurns = computed(() => services.value.filter((s) => myRolesOn(s).length))
  const myUpcoming = computed(() => myTurns.value.filter((s) => s.date >= today))

  const leaderOf = (sunday) => assignmentsOf(sunday)[SONG_LEADER_ROLE]?.[0] || null

  /* ------------------------------------------------------ this month */

  const monthOf = (key) => lineups.value.find((m) => m.month === key) || null

  /** This month's Sundays, each marked planned or not — the hero's segments. */
  const thisMonthSundays = computed(() => {
    const stored = monthOf(thisMonth)
    const byDate = new Map((stored?.sundays || []).map((s) => [s.date, s]))
    return sundaysInMonth(thisMonth).map((date) => {
      const sunday = byDate.get(date) || blankSunday(date)
      return { date, planned: isSundayPlanned(sunday) }
    })
  })

  const thisMonthStatus = computed(() => monthOf(thisMonth)?.status || 'draft')

  /* ------------------------------------------------------ still to do */

  // This month and next only: a gap in March is not today's problem, and
  // listing every Sunday of the year would bury the one that is.
  const planningMonths = [thisMonth, shiftMonth(thisMonth, 1)]

  /** Months a planner has started that nobody else can see yet. */
  const drafts = computed(() =>
    planningMonths.filter((key) => {
      const stored = monthOf(key)
      return stored && stored.status !== 'published' && stored.sundays.some(isSundayPlanned)
    })
  )

  /** Sundays still to come with a role nobody is on, soonest first. */
  const gaps = computed(() =>
    planningMonths
      .flatMap((key) => {
        const byDate = new Map((monthOf(key)?.sundays || []).map((s) => [s.date, s]))
        return sundaysInMonth(key).map((date) => ({ month: key, sunday: byDate.get(date) || blankSunday(date) }))
      })
      .filter(({ sunday }) => sunday.date >= today)
      .map(({ month, sunday }) => {
        const assignments = assignmentsOf(sunday)
        const empty = roles.value.filter((role) => !(assignments[role.id] || []).length)
        return { month, date: sunday.date, empty, planned: isSundayPlanned(sunday) }
      })
      .filter((row) => row.empty.length)
  )

  /**
   * The Sundays still to come this month and next, planned or not — what a
   * team's section lists, so a team can plan ahead onto an empty Sunday. A
   * month in draft reads as unplanned to anyone who may not see drafts.
   */
  const comingSundays = computed(() =>
    planningMonths
      .flatMap((key) => {
        const stored = visibleMonths.value.find((m) => m.month === key)
        const byDate = new Map((stored?.sundays || []).map((s) => [s.date, s]))
        return sundaysInMonth(key).map((date) => ({
          ...(byDate.get(date) || blankSunday(date)),
          month: key,
          draft: stored ? stored.status !== 'published' : true,
        }))
      })
      .filter((sunday) => sunday.date >= today)
  )

  /** The first Sunday still to come that nobody has planned at all. */
  const nextUnplanned = computed(() => gaps.value.find((row) => !row.planned) || null)

  return {
    loading,
    lineups,
    roles,
    canPlan,
    canPlanTeam,
    canPlanAny,
    myMember,
    services,
    upcoming,
    next,
    myRolesOn,
    myTurns,
    myUpcoming,
    leaderOf,
    thisMonth,
    thisMonthSundays,
    thisMonthStatus,
    drafts,
    gaps,
    nextUnplanned,
    comingSundays,
  }
}

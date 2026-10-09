import { computed } from 'vue'
import { usePermissions } from './usePermissions'
import { usePeopleOverview } from './usePeopleOverview'
import { useScheduleOverview } from './useScheduleOverview'
import { useEvents } from './useEvents'
import { useRecurringEvents } from './useRecurringEvents'
import { useTasks } from './useTasks'
import { useAttendance } from './useAttendance'
import { usePrayerConcerns } from './usePrayerConcerns'
import { memberKey } from '../utils/sgUtils'
import { isAssignedTo, isDueToday, isOverdue } from '../utils/taskUtils'
import { isCalledOff } from '../../lib/eventStatus'
import { isRecorded } from '../../lib/attendance'

// What is true across every app today, for the home of all apps (Apps.vue):
// whose birthday it is, when you are next serving, what is on, what you owe,
// and what is waiting on whoever runs things. It took over from the dashboard,
// which asked the same questions as a page of tiles; here each answer is a
// card in a deck, and the apps are one tap below.
//
// Each part is gated on the capability of the app it comes from, which also
// covers an app the church has switched off, so a member sees a home about
// their own church rather than a row of empty admin cards.

const pad = (value) => String(value).padStart(2, '0')

// Built from local parts, never parsed from the string: `new Date('2026-08-01')`
// is UTC midnight, which is still July anywhere west of Greenwich.
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const dayAfter = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return keyOf(date)
}

export function useToday() {
  const { can, canManage, myMember } = usePermissions()
  const people = usePeopleOverview()
  const schedules = useScheduleOverview()
  const { tasks } = useTasks()
  const { events: storedEvents } = useEvents()
  const { recurringEvents } = useRecurringEvents(storedEvents, people.members)
  const { aggregatedAttendance } = useAttendance()
  const { prayerConcerns } = usePrayerConcerns()

  const today = keyOf(new Date())
  const weekEnd = dayAfter(6)

  /* ------------------------------------------------------------ birthdays */

  const birthdaysToday = computed(() => (can('members.view') ? people.birthdaysToday.value : []))

  /* ------------------------------------------------------------- serving */

  /** Your next turn on a Sunday, within the week — the reason most people open the app on a Saturday. */
  const myNextTurn = computed(() => {
    if (!can('lineups.view')) return null
    const sunday = schedules.myUpcoming.value[0]
    if (!sunday || sunday.date > weekEnd) return null
    return { date: sunday.date, sunday, roles: schedules.myRolesOn(sunday) }
  })

  /* -------------------------------------------------------------- events */

  // The calendar as the Events page builds it: what is stored, and the weekly
  // schedules generated from it. Birthdays have cards of their own, and a
  // gathering called off is not something to go to.
  const calendar = computed(() =>
    can('events.view')
      ? [...storedEvents.value.filter((e) => !e.hidden && !e.isCancelled), ...recurringEvents.value]
          .filter((e) => e.date && !isCalledOff(e) && !String(e.id || '').startsWith('birthday-'))
          .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')))
      : []
  )

  const eventsToday = computed(() => calendar.value.filter((e) => e.date === today))
  const eventsThisWeek = computed(() => calendar.value.filter((e) => e.date >= today && e.date <= weekEnd))
  /** The next thing on after today, within the week. */
  const nextEvent = computed(() => eventsThisWeek.value.find((e) => e.date > today) || null)

  /** The coming seven days, each with how much is on it, for the strip on the deck. */
  const week = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = dayAfter(i)
      const [y, m, d] = date.split('-').map(Number)
      return {
        date,
        count: eventsThisWeek.value.filter((e) => e.date === date).length,
        letter: new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'narrow' }),
        day: d,
        isToday: i === 0,
      }
    })
  )

  /* --------------------------------------------------------------- tasks */

  const myTasks = computed(() => {
    if (!can('tasks.view') || !myMember.value) return []
    const id = memberKey(myMember.value)
    return tasks.value.filter((task) => !task.done && isAssignedTo(task, id))
  })
  const myOverdue = computed(() => myTasks.value.filter((task) => isOverdue(task)))
  const myDueToday = computed(() => myTasks.value.filter((task) => isDueToday(task)))

  /* ---------------------------------------------------------- attendance */

  /** Gatherings already past that nobody has counted, for whoever counts them. */
  const unrecordedRows = computed(() =>
    canManage('attendance')
      ? aggregatedAttendance.value
          .filter((row) => !isRecorded(row) && !row.skipped && row.date && row.date < today && !isCalledOff(row))
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      : []
  )
  const unrecorded = computed(() => unrecordedRows.value.length)

  /** The last gathering counted, for the Attendance tile. */
  const lastCount = computed(() => {
    if (!can('attendance.view')) return null
    return (
      [...aggregatedAttendance.value]
        .filter((row) => isRecorded(row) && !row.skipped && row.date)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null
    )
  })

  /* -------------------------------------------------------------- prayer */

  const openPrayers = computed(() =>
    can('prayer.view') ? prayerConcerns.value.filter((c) => c.status !== 'answered').length : 0
  )

  return {
    today,
    people,
    birthdaysToday,
    myNextTurn,
    eventsToday,
    eventsThisWeek,
    nextEvent,
    week,
    myTasks,
    myOverdue,
    myDueToday,
    unrecorded,
    unrecordedRows,
    lastCount,
    openPrayers,
    claims: people.claims,
    claimsWaiting: people.claimsWaiting,
  }
}

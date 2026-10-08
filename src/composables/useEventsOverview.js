import { computed } from 'vue'
import { useEvents } from './useEvents'
import { useMembers } from './useMembers'
import { useBirthdayEvents } from './useBirthdayEvents'
import { useRecurringEvents } from './useRecurringEvents'
import { useRecurringSchedules } from './useRecurringSchedules'
import { usePermissions } from './usePermissions'
import { isCalledOff, readEventStatus, eventStatusLabel } from '../../lib/eventStatus'
import philippineHolidays from '../data/philippineHolidays.json'

// What is true about the calendar, for the Events app's home and the sections
// that summarise it: what is on next, the week ahead, what has changed, and
// the services that happen every week. One reading of the calendar, built the
// way the Events page builds it (stored events, the weekly schedules expanded,
// birthdays), so the deck, the tiles and the sections cannot disagree.
//
// The deck's cards, and why only these — each one is something somebody acts
// on this week:
//
//   - A change of plan: a gathering in the next two weeks that has been called
//     off or moved. A cancellation nobody hears about is how someone drives
//     to a locked building, so it leads.
//   - A holiday this week: it changes who comes and whether the building is
//     open, and planners and members both plan around it.
//   - This month's announcement video, in the first week of the month, when
//     it is shown on a Sunday — made from the calendar, so it belongs here.
//
// Deliberately not cards: birthdays (People's deck and the home of all apps
// carry them), a quiet week (a church that meets on Sunday is not short of
// anything because Wednesday is empty), and events with missing details
// (planners would be nagged about every one they added in a hurry).

const pad = (value) => String(value).padStart(2, '0')
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dayAfter = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return keyOf(date)
}

/** A change of plan is worth telling people about this far ahead. */
const CHANGE_DAYS = 14

/** How far "Coming up" reads ahead. */
const AHEAD_DAYS = 60

/** The first days of a month, when its video is shown. */
const VIDEO_DAYS = 7

export function useEventsOverview() {
  const { events: stored, loading } = useEvents()
  const { members } = useMembers()
  const { birthdayEvents } = useBirthdayEvents(members, stored)
  const { recurringEvents } = useRecurringEvents(stored, members)
  const { schedules, loading: schedulesLoading } = useRecurringSchedules()
  const { can } = usePermissions()

  const canPlan = computed(() => can('events.manage'))
  const today = keyOf(new Date())

  /**
   * The calendar as the Events page shows it, birthdays left out: they are
   * People's, and a list of what is on that is half birthdays reads as a list
   * of birthdays. Called-off gatherings stay, marked — the same rule the page
   * keeps.
   */
  const calendar = computed(() =>
    [
      ...stored.value.filter(
        (e) => !e.hidden && !(e.isCancelled && String(e.overrideOf || '').startsWith('birthday-'))
      ),
      ...recurringEvents.value,
    ]
      .filter((e) => e.date && !e.isBirthday && !e.memberId && !String(e.id || '').startsWith('birthday-'))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || '')))
  )

  const ahead = computed(() => calendar.value.filter((e) => e.date >= today && e.date <= dayAfter(AHEAD_DAYS)))

  /** The next gathering that is still on. */
  const next = computed(() => ahead.value.find((e) => !isCalledOff(e)) || null)

  /** The next seven days, each with what is on it, for the strip on the deck. */
  const week = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = dayAfter(i)
      const on = calendar.value.filter((e) => e.date === date && !isCalledOff(e))
      const [y, m, d] = date.split('-').map(Number)
      return {
        date,
        count: on.length,
        letter: new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'narrow' }),
        day: d,
        isToday: i === 0,
      }
    })
  )

  const thisWeek = computed(() => ahead.value.filter((e) => e.date <= dayAfter(6) && !isCalledOff(e)))

  /** Gatherings in the next two weeks that are not happening on their date. */
  const changes = computed(() =>
    ahead.value
      .filter((e) => e.date <= dayAfter(CHANGE_DAYS) && isCalledOff(e))
      .map((e) => ({ ...e, statusLabel: eventStatusLabel(readEventStatus(e)) }))
  )

  /** A public holiday in the coming week. */
  const holiday = computed(
    () => philippineHolidays.find((h) => h.date >= today && h.date <= dayAfter(6)) || null
  )

  /** This month's video, in the days it is shown. */
  const videoMonth = computed(() => (Number(today.slice(8, 10)) <= VIDEO_DAYS ? today.slice(0, 7) : null))

  /** The services that happen every week, as Settings keeps them. */
  const weekly = computed(() => schedules.value.filter((s) => s.enabled !== false))

  return {
    loading,
    schedulesLoading,
    canPlan,
    today,
    calendar,
    ahead,
    next,
    week,
    thisWeek,
    changes,
    holiday,
    videoMonth,
    weekly,
  }
}

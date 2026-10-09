import { computed } from 'vue'
import { useEvents } from './useEvents'
import { useMembers } from './useMembers'
import { useBirthdayEvents } from './useBirthdayEvents'
import { useRecurringEvents } from './useRecurringEvents'
import { useRecurringSchedules } from './useRecurringSchedules'
import { usePermissions } from './usePermissions'
import { isCalledOff, readEventStatus, eventStatusLabel } from '../../lib/eventStatus'
import philippineHolidays from '../data/philippineHolidays.json'
import { differenceFromUsual, isRoutineOccurrence } from '../utils/eventRoutine'

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
//   - A weekly service that is not where or when it usually is, in the next
//     two weeks. Habit brings people to the usual hour and room, so an edited
//     occurrence is the other way someone ends up at a locked door.
//   - A one-off gathering in the next two weeks — an outreach, a fellowship
//     night, a members' meeting. The weekly ones run themselves; something
//     somebody typed in is what people have to remember, sign up for, cook
//     for or invite a neighbour to, and the deck is where they would see it.
//     Marked "for you" when it is for a tag the person carries.
//   - This month's announcement video, in the first week of the month, when
//     it is shown on a Sunday — made from the calendar, so it belongs here.
//   - For planners, next month's video in the last week of this one. The
//     first Sunday can be the 1st, so the card above arrives too late to fix
//     anything; this one comes while what it announces can still be added.
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

/** The last days of a month, when planners get the next one's video ready. */
const VIDEO_PREP_DAYS = 7

const normalize = (value) => String(value || '').trim().toLowerCase()

export function useEventsOverview() {
  const { events: stored, loading } = useEvents()
  const { members } = useMembers()
  const { birthdayEvents } = useBirthdayEvents(members, stored)
  const { recurringEvents } = useRecurringEvents(stored, members)
  const { schedules, loading: schedulesLoading } = useRecurringSchedules()
  const { can, myMember } = usePermissions()

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

  /**
   * Every edited weekly service in the next two months whose time or place is
   * not its usual one, by occurrence, with what it usually is. A called-off
   * one is a change of plan, not this. Coming up marks each of these; the
   * deck's card is the ones in the next two weeks.
   */
  const differences = computed(() => {
    const found = new Map()
    for (const e of ahead.value) {
      const change = differenceFromUsual(e, schedules.value)
      if (change) found.set(`${e.id}|${e.date}`, change)
    }
    return found
  })

  /** How an occurrence differs from its usual time and place, if it does. */
  const differenceOf = (e) => differences.value.get(`${e.id}|${e.date}`) || null

  /** Weekly services in the next two weeks somewhere or sometime else. */
  const different = computed(() =>
    ahead.value
      .filter((e) => e.date <= dayAfter(CHANGE_DAYS) && differenceOf(e))
      .map((e) => ({ ...e, ...differenceOf(e) }))
  )

  /**
   * Where the church usually meets: where its worship is held, or, with no
   * worship among its weekly gatherings, the place most of them are. Lists
   * say a gathering's place only when it is somewhere else, because "UEC
   * Canubing II sanctuary" on every row is the row's longest words saying
   * nothing anyone needed telling. Worship first, because the place the
   * Sunday service is held is what "the church" means to someone coming,
   * even where the hall next door hosts more of the week.
   */
  const usualPlace = computed(() => {
    const placed = schedules.value.filter((s) => s.enabled !== false && s.location)
    const commonest = (list) => {
      const counts = new Map()
      for (const s of list) {
        const key = normalize(s.location)
        const entry = counts.get(key) || { name: s.location, n: 0 }
        entry.n += 1
        counts.set(key, entry)
      }
      return [...counts.values()].sort((a, b) => b.n - a.n)[0]?.name || ''
    }
    return commonest(placed.filter((s) => s.type === 'worship')) || commonest(placed)
  })

  /** A gathering's place, or nothing when it is the usual one. */
  const placeOf = (e) => (e?.location && normalize(e.location) !== normalize(usualPlace.value) ? e.location : '')

  /** Whether an occurrence is the routine — see utils/eventRoutine.js. */
  const isRoutine = (e) => isRoutineOccurrence(e, schedules.value)

  /**
   * One-off gatherings in the next two weeks: typed in, not generated from a
   * weekly schedule nor an edit of one, and still on. `forMe` when it names a
   * tag the signed-in person carries — "for everyone" is not news to anyone.
   */
  const oneOffs = computed(() => {
    const mine = new Set((myMember.value?.tags || []).map(normalize))
    return ahead.value
      .filter((e) => e.date <= dayAfter(CHANGE_DAYS) && !e.isRecurring && !e.isOverride && !e.overrideOf && !isCalledOff(e))
      .map((e) => ({ ...e, forMe: (e.audienceTags || []).some((tag) => mine.has(normalize(tag))) }))
  })

  /** A public holiday in the coming week. */
  const holiday = computed(
    () => philippineHolidays.find((h) => h.date >= today && h.date <= dayAfter(6)) || null
  )

  /** This month's video, in the days it is shown. */
  const videoMonth = computed(() => (Number(today.slice(8, 10)) <= VIDEO_DAYS ? today.slice(0, 7) : null))

  /**
   * Next month, in the last week of this one, for planners: its video is shown
   * on its first Sunday, and what it announces is whatever is on the calendar
   * by then.
   */
  const videoPrepMonth = computed(() => {
    if (!canPlan.value) return null
    const [y, m, d] = today.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    if (d <= daysInMonth - VIDEO_PREP_DAYS) return null
    return keyOf(new Date(y, m, 1)).slice(0, 7)
  })

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
    different,
    differenceOf,
    usualPlace,
    placeOf,
    isRoutine,
    oneOffs,
    holiday,
    videoMonth,
    videoPrepMonth,
    weekly,
  }
}

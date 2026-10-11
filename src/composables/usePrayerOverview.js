import { computed } from 'vue'
import { usePrayerConcerns } from './usePrayerConcerns'
import { useMembers } from './useMembers'
import { usePermissions } from './usePermissions'
import { findRosterMember } from '../utils/lineupUtils'
import { daysBetween, todayKey } from '../utils/taskUtils'

/**
 * What the Prayer app's home says about the church's prayer concerns, in one
 * place, so its deck, its tiles and its lists cannot disagree (the way
 * useMinutesOverview and useTasksOverview serve their homes).
 *
 * These are pastoral records: somebody's illness, a marriage, a job lost. So
 * the deck is earned the way the other apps' are — a card only for something
 * somebody would act on this week — and it never turns a person into a
 * number to be brought down:
 *
 *   - the requests marked urgent or high and not yet answered, because
 *     whoever marked them asked the church to pray for these first, and the
 *     prayer meeting or the pastoral prayer on Sunday is where that happens;
 *   - the ones raised this week, so a need shared on Tuesday is prayed for on
 *     Sunday rather than found in a list a month later;
 *   - the ones answered in the last fortnight, because an answered prayer is
 *     the point of having asked, and it is told to the church while it is
 *     still news (thanksgiving belongs on the deck as much as the asking);
 *   - for whoever looks after the list, the open ones nobody has touched in a
 *     long while: a month for one marked active, three for one marked
 *     ongoing, which is a long need by its nature. Not a backlog to clear, a
 *     reason to ask the person how they are and write down what has changed.
 *     A standing chore, so the deck remembers it was put away until there
 *     are more of them.
 *
 * Left out on purpose:
 *   - how many concerns any one person has. A count beside somebody's name
 *     reads as a tally of their troubles, and it is nothing to act on;
 *   - the concerns about nobody on the roll. Most are for a family, the
 *     nation, a missionary, a building fund — linking them to a record would
 *     be wrong, so a card asking to would be a nag about nothing;
 *   - the ongoing ones as a card of their own. They are prayed for steadily
 *     and have no news by nature; they are a section, not an alert;
 *   - low priority, which only ever means "no hurry".
 */

// How long an open concern can go with no change before it is worth asking
// after: a month for one marked active, three months for one marked ongoing.
export const QUIET_AFTER = { active: 30, ongoing: 90 }

// Answered prayers stay on the deck for a fortnight: two Sundays to tell the
// church, then they are the Answered section's to keep.
const ANSWERED_FRESH = 14

// What the status values mean, in the words the lists and the form use. The
// stored values stay as they were, so nothing already written changes.
export const PRAYER_STATUSES = [
  { key: 'active', label: 'Praying now' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'answered', label: 'Answered' },
]

export const PRAYER_PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'normal', label: 'Normal' },
  { key: 'high', label: 'High' },
  { key: 'urgent', label: 'Urgent' },
]

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 }
export const priorityRank = (concern) => PRIORITY_RANK[concern?.priority] ?? 2

export const isOpen = (concern) => concern?.status !== 'answered'
export const isPressing = (concern) => isOpen(concern) && ['urgent', 'high'].includes(concern?.priority)

const isDayKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
const dayOf = (date) => (date instanceof Date && !Number.isNaN(date.getTime()) ? todayKey(date) : '')

/**
 * The day a concern was raised: the date typed on it, or the day it was
 * written down when nobody typed one.
 */
export const raisedOn = (concern) => (isDayKey(concern?.date) ? concern.date : dayOf(concern?.createdAt))

/**
 * The day anything last changed on it. For an answered concern that is
 * nearly always the day it was marked answered — the service keeps no
 * separate answered date — so it doubles as that.
 */
export const lastNewsOn = (concern) => dayOf(concern?.updatedAt) || raisedOn(concern)

/** Days since anything changed on an open concern. */
export const daysQuiet = (concern, today = todayKey()) => daysBetween(lastNewsOn(concern), today)

export const isQuiet = (concern, today = todayKey()) =>
  isOpen(concern) && daysQuiet(concern, today) >= (QUIET_AFTER[concern?.status] ?? QUIET_AFTER.active)

/** "No news in 5 weeks", said in the largest unit that fits. */
export const quietLabel = (days) => {
  if (days >= 60) return `No news in ${Math.floor(days / 30)} months`
  return `No news in ${Math.floor(days / 7)} weeks`
}

/** A day as a row says it: today, yesterday, a weekday this week, else the date. */
export const dayLabel = (key, today = todayKey()) => {
  if (!isDayKey(key)) return ''
  const days = daysBetween(key, today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (days > 1 && days < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year !== Number(today.slice(0, 4)) ? { year: 'numeric' } : {}),
  })
}

/** "October 2026", for a list's month headings. */
export const monthLabel = (key) => {
  if (!isDayKey(key)) return 'No date'
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Case and accents folded away, so "nino" finds "Niño".
const fold = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * One box reaching the whole concern — what it is, who it is for, the notes —
 * and the words a row only shows: its status, "urgent", "no news".
 */
export const matchesPrayerQuery = (concern, query, today = todayKey()) => {
  const wanted = fold(query).trim()
  if (!wanted) return true
  const status = PRAYER_STATUSES.find((s) => s.key === concern.status)?.label
  const fields = [
    concern.title,
    concern.description,
    concern.memberName,
    concern.notes,
    status,
    ['urgent', 'high'].includes(concern.priority) ? concern.priority : '',
    isQuiet(concern, today) ? 'no news' : '',
  ]
  return fields.some((field) => fold(field).includes(wanted))
}

/** Most pressing first, then the newest. */
export const comparePressing = (a, b) =>
  priorityRank(a) - priorityRank(b) || raisedOn(b).localeCompare(raisedOn(a))

export function usePrayerOverview() {
  const { prayerConcerns, loading, addPrayerConcernToFirestore, updatePrayerConcernInFirestore, removePrayerConcern } =
    usePrayerConcerns()
  const { members } = useMembers()
  const { canManage } = usePermissions()

  const today = todayKey()
  const canEdit = computed(() => canManage('prayer'))

  /** The person a concern is about, when it is about somebody on the roll. */
  const personOf = (concern) => (concern?.memberId ? findRosterMember(members.value, concern.memberId) : null)

  const byNewest = (list) => [...list].sort((a, b) => raisedOn(b).localeCompare(raisedOn(a)))

  const open = computed(() => prayerConcerns.value.filter(isOpen))
  const praying = computed(() => byNewest(prayerConcerns.value.filter((c) => c.status === 'active' || !c.status)))
  const ongoing = computed(() => byNewest(prayerConcerns.value.filter((c) => c.status === 'ongoing')))
  const answered = computed(() =>
    [...prayerConcerns.value.filter((c) => c.status === 'answered')].sort((a, b) => lastNewsOn(b).localeCompare(lastNewsOn(a)))
  )

  /** Marked urgent or high and not yet answered, urgent first. */
  const pressing = computed(() => open.value.filter(isPressing).sort(comparePressing))
  const urgent = computed(() => pressing.value.filter((c) => c.priority === 'urgent'))

  /**
   * Raised in the last seven days and still open. The pressing ones are left
   * to their own card, so no request is on two cards at once.
   */
  const newThisWeek = computed(() =>
    byNewest(
      open.value.filter((c) => {
        const days = daysBetween(raisedOn(c), today)
        return days >= 0 && days < 7 && !isPressing(c)
      })
    )
  )

  /** Open, and nothing has changed on it in a long while: the longest first. */
  const quiet = computed(() =>
    open.value.filter((c) => isQuiet(c, today)).sort((a, b) => lastNewsOn(a).localeCompare(lastNewsOn(b)))
  )

  /** Answered in the last fortnight, the newest first. */
  const answeredLately = computed(() =>
    answered.value.filter((c) => {
      const days = daysBetween(lastNewsOn(c), today)
      return days >= 0 && days <= ANSWERED_FRESH
    })
  )

  const answeredThisYear = computed(
    () => answered.value.filter((c) => lastNewsOn(c).slice(0, 4) === today.slice(0, 4)).length
  )

  /** The people on the roll the church is praying for, each once. */
  const prayedFor = computed(() => {
    const seen = new Set()
    const people = []
    for (const concern of byNewest(open.value)) {
      const person = personOf(concern)
      const key = person && (person.firestoreId || person.id)
      if (!person || seen.has(key)) continue
      seen.add(key)
      people.push(person)
    }
    return people
  })

  return {
    concerns: prayerConcerns,
    loading,
    canEdit,
    today,
    personOf,
    open,
    praying,
    ongoing,
    answered,
    pressing,
    urgent,
    newThisWeek,
    quiet,
    answeredLately,
    answeredThisYear,
    prayedFor,
    addConcern: addPrayerConcernToFirestore,
    updateConcern: updatePrayerConcernInFirestore,
    removeConcern: removePrayerConcern,
  }
}

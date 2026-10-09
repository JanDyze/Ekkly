import { computed } from 'vue'
import { useMembers } from './useMembers'
import { useMinistries } from './useMinistries'
import { useMemberClaims } from './useMemberClaims'
import { usePermissions } from './usePermissions'
import { daysUntilBirthday } from './useMemberSorting'
import { ageOf, bandOf } from '../utils/ageBands'
import { getFullName, missingMemberDetails } from '../utils/memberUtils'

// What is true across the whole roll, for the People app's home and the
// sections that summarise it — how many there are, whose birthday is coming,
// who serves where, and which records are still thin. One reading of the data,
// so the hero, the doors' counts and the sections cannot disagree.

// A month ahead is how far a birthday list is worth reading: far enough to buy
// a card, near enough that the list stays short.
const BIRTHDAY_WINDOW = 31

const byName = (a, b) => getFullName(a).localeCompare(getFullName(b))

const hasValue = (list, name) =>
  (Array.isArray(list) ? list : []).some((value) => String(value).toLowerCase() === name.toLowerCase())

/** "Today", "Tomorrow", "Saturday", "Oct 24" — the nearer the day, the plainer the word. */
export const whenOfBirthday = (days) => {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  if (days <= 6) return date.toLocaleDateString(undefined, { weekday: 'long' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function usePeopleOverview() {
  const { members, loading: membersLoading } = useMembers()
  const { ministryNames, loading: ministriesLoading } = useMinistries()
  const { pendingClaims } = useMemberClaims()
  const { canManage, isAdmin, myMember } = usePermissions()

  // Both lists, so a ministry is never reported empty, or missing, for the
  // moment before the roll arrives.
  const loading = computed(() => membersLoading.value || ministriesLoading.value)
  const canEdit = computed(() => canManage('members'))

  /* ------------------------------------------------------------ the roll */

  const counts = computed(() => {
    const total = members.value.length
    const memberCount = members.value.filter((m) => m.isMember !== false).length
    return { total, members: memberCount, attendees: total - memberCount }
  })

  /* ----------------------------------------------------------- birthdays */

  /** Everyone whose birthday falls in the coming month, soonest first, today included. */
  const birthdays = computed(() =>
    members.value
      .map((member) => ({ member, days: daysUntilBirthday(member) }))
      .filter((row) => row.days <= BIRTHDAY_WINDOW)
      .map((row) => {
        // The age they are turning, not the age they are: on the day itself
        // the record already says the new one.
        const age = ageOf(row.member)
        return { ...row, turning: age === null ? null : row.days === 0 ? age : age + 1 }
      })
      .sort((a, b) => a.days - b.days || byName(a.member, b.member))
  )

  const birthdaysToday = computed(() => birthdays.value.filter((row) => row.days === 0))
  const birthdaysThisWeek = computed(() => birthdays.value.filter((row) => row.days <= 6))

  /* ---------------------------------------------------------- ministries */

  /**
   * Each ministry the church keeps, with the people in it. A ministry with
   * nobody in it yet is still listed: it is somewhere people can be put.
   */
  const ministries = computed(() =>
    ministryNames.value.map((name) => ({
      name,
      people: members.value.filter((m) => hasValue(m.ministries, name)).sort(byName),
    }))
  )

  /** People in no ministry the church still recognises. */
  const unplaced = computed(() =>
    members.value
      .filter((m) => !ministryNames.value.some((name) => hasValue(m.ministries, name)))
      .sort(byName)
  )

  /**
   * Of those, the ones somebody might actually ask: members, past the Kids
   * band. A child or a visitor in no ministry is not a gap, and counting them
   * made a number that never went down. A record with no age stays in: most
   * of those are adults whose birthday was never written down.
   */
  const unplacedToAsk = computed(() =>
    unplaced.value.filter((m) => m.isMember !== false && bandOf(m)?.key !== 'kids')
  )

  /* ---------------------------------------------------------- thin records */

  const incomplete = computed(() =>
    members.value
      .map((member) => ({ member, missing: missingMemberDetails(member) }))
      .filter((row) => row.missing.length)
      .sort((a, b) => byName(a.member, b.member))
  )

  /* ------------------------------------------------------------ requests */

  // Account links are approved in Settings, which only an administrator opens.
  const claims = computed(() => (isAdmin.value ? pendingClaims.value : []))
  const claimsWaiting = computed(() => claims.value.length)

  return {
    members,
    loading,
    canEdit,
    isAdmin,
    myMember,
    counts,
    birthdays,
    birthdaysToday,
    birthdaysThisWeek,
    ministries,
    unplaced,
    unplacedToAsk,
    incomplete,
    claims,
    claimsWaiting,
  }
}

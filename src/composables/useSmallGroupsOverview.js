import { computed } from 'vue'
import { useSmallGroups, useAllSgSessions } from './useSmallGroups'
import { usePeopleGroups } from './usePeopleGroups'
import { usePermissions } from './usePermissions'
import { memberKey, sameMember } from '../utils/sgUtils'
import { daysBetween, todayKey } from '../utils/taskUtils'
import { addDays } from '../../lib/occurrences'

/**
 * What the Small groups app's home says about the church's groups, in one
 * place, so its deck and its tiles cannot disagree (the way useTasksOverview
 * and useMinutesOverview serve their homes).
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on this week:
 *
 *   - a group you lead meeting today, with nothing logged for it yet, so the
 *     form is a tap away while people are still in the room;
 *   - a group you lead that met this past week and was never logged, because
 *     a session written up a fortnight later is a session half remembered;
 *   - for whoever runs the groups, the ones that have not met in a month, the
 *     first sign of a group drifting apart;
 *   - and the members in no group at all, the people somebody should invite.
 *
 * Left out on purpose: how many came last week, church-wide. It is a number to
 * look at, not to act on; it is the Sessions section's, and a line on the card
 * that is always there.
 */

// A month without a session is when a group stops being "between meetings".
const QUIET_DAYS = 28

export function useSmallGroupsOverview() {
  const { groups, loading: groupsLoading } = useSmallGroups()
  const { sessions, loading: sessionsLoading } = useAllSgSessions()
  const { ungrouped, eligible, groups: peopleGroups } = usePeopleGroups()
  const { canManage, myMember } = usePermissions()

  const loading = computed(() => groupsLoading.value || sessionsLoading.value)
  const canEdit = computed(() => canManage('smallgroups'))
  const today = todayKey()

  const idOf = (group) => group.firestoreId || group.id
  const active = computed(() => groups.value.filter((g) => g.active))

  const myKey = computed(() => (myMember.value ? memberKey(myMember.value) : null))
  const leads = (group) =>
    Boolean(myKey.value) &&
    (sameMember(group.leaderId, myKey.value) ||
      sameMember(group.leaderId, myMember.value?.firestoreId) ||
      (group.coLeaderIds || []).some((id) => sameMember(id, myKey.value) || sameMember(id, myMember.value?.firestoreId)))
  const belongs = (group) =>
    leads(group) ||
    (Boolean(myKey.value) &&
      (group.memberIds || []).some((id) => sameMember(id, myKey.value) || sameMember(id, myMember.value?.firestoreId)))

  /** The groups you lead (or help lead), and the ones you belong to at all. */
  const myLed = computed(() => active.value.filter(leads))
  const myGroups = computed(() => active.value.filter(belongs))

  /** Every session a group has logged, newest first (sessions arrive so). */
  const sessionsOf = (group) => sessions.value.filter((s) => s.groupId === idOf(group))
  const lastSessionOf = (group) => sessionsOf(group)[0] || null

  /** How many people each group has, its leader counted once. */
  const sizeOf = (group) => peopleGroups.value.find((g) => g.id === idOf(group))?.people.length ?? (group.memberIds || []).length

  /** The most recent day on or before `on` that the group meets, within a week. */
  const lastMeetingDay = (group, on = today) => {
    if (typeof group.meetingDay !== 'number') return null
    for (let back = 0; back < 7; back += 1) {
      const day = addDays(on, -back)
      if (new Date(`${day}T00:00:00`).getDay() === group.meetingDay) return day
    }
    return null
  }
  const loggedSince = (group, day) => sessionsOf(group).some((s) => String(s.date).slice(0, 10) >= day)

  /** Groups you lead that meet today and have nothing logged for today. */
  const meetingToday = computed(() =>
    myLed.value.filter((g) => lastMeetingDay(g) === today && !loggedSince(g, today))
  )

  /** Groups you lead that met earlier this week and were never logged. */
  const unlogged = computed(() =>
    myLed.value
      .map((group) => ({ group, day: lastMeetingDay(group, addDays(today, -1)) }))
      .filter(({ group, day }) => day && !loggedSince(group, day))
  )

  /** Active groups with no session in a month, the longest quiet first. */
  const quiet = computed(() =>
    active.value
      .map((group) => {
        const last = lastSessionOf(group)
        const since = last ? daysBetween(String(last.date).slice(0, 10), today) : null
        return { group, last, since }
      })
      .filter(({ since }) => since === null || since >= QUIET_DAYS)
      .sort((a, b) => (b.since ?? Infinity) - (a.since ?? Infinity))
  )

  /** Sessions in the last seven days, church-wide. */
  const thisWeek = computed(() =>
    sessions.value.filter((s) => {
      const days = daysBetween(String(s.date).slice(0, 10), today)
      return days >= 0 && days < 7
    })
  )

  return {
    loading,
    canEdit,
    groups,
    active,
    sessions,
    myLed,
    myGroups,
    meetingToday,
    unlogged,
    quiet,
    thisWeek,
    ungrouped,
    eligible,
    idOf,
    sizeOf,
    sessionsOf,
    lastSessionOf,
  }
}

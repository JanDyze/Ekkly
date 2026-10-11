import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMinutes } from './useMinutes'
import { useScheduledMinutes } from './useScheduledMinutes'
import { useTasks } from './useTasks'
import { useMyMember } from './useMyMember'
import { usePermissions } from './usePermissions'
import { useToast } from './useToast'
import { startMinuteForOccurrence } from '../api/minutesService'
import { extractActionItems, sameTaskTitle } from '../utils/minuteActionItems'
import { minuteDecisions } from '../utils/minuteDecisions'
import { minuteProgress } from '../utils/minuteSummary'
import { daysBetween, todayKey } from '../utils/taskUtils'
import { getFullName } from '../utils/memberUtils'

/**
 * What the Minutes app's home says about the church's meetings, in one place,
 * so its deck and its tiles cannot disagree (the way useTasksOverview and
 * useFinanceOverview serve their homes).
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on this week:
 *
 *   - the next meeting, when it is this week and nobody has opened its minute
 *     yet, so the agenda is ready before people sit down rather than typed
 *     during the opening prayer;
 *   - the meetings whose notes were taken and never written up, because a
 *     page of rough notes is a record nobody else can read;
 *   - what meetings asked people to do that never reached anyone's task list,
 *     because a commitment only in the minutes is one nobody is reminded of.
 *
 * Left out on purpose: "decisions this month" as a card. Worth looking up,
 * never something to act on; it is a section of its own, and a count on the
 * card that is always there.
 */
export function useMinutesOverview() {
  const { minutes, loading } = useMinutes()
  const { scheduledMinutes, schedules } = useScheduledMinutes(minutes)
  const { tasks } = useTasks()
  const { myMember } = useMyMember()
  const { canManage } = usePermissions()
  const router = useRouter()
  const toast = useToast()

  const today = todayKey()
  const canEdit = computed(() => canManage('minutes'))

  const dayOf = (minute) => {
    const date = new Date(minute?.date)
    return Number.isNaN(date.getTime()) ? '' : todayKey(date)
  }
  const idOf = (minute) => minute.firestoreId || minute.id

  // Every stored meeting, newest first.
  const meetings = computed(() =>
    minutes.value.filter((m) => dayOf(m)).sort((a, b) => dayOf(b).localeCompare(dayOf(a)))
  )
  const held = computed(() => meetings.value.filter((m) => dayOf(m) <= today))

  /** The meeting held most recently, written into or not. */
  const lastMeeting = computed(() => held.value[0] || null)

  /**
   * The next meeting within a week that nobody has opened: a standing
   * gathering's next minute (useScheduledMinutes), or one somebody set up
   * ahead with an agenda and nothing under it yet.
   */
  const nextMeeting = computed(() => {
    const ahead = [
      ...scheduledMinutes.value,
      ...meetings.value.filter((m) => dayOf(m) >= today && ['agenda', 'empty'].includes(minuteProgress(m).key)),
    ]
      .filter((m) => daysBetween(today, dayOf(m) || m.date) <= 7)
      .sort((a, b) => (dayOf(a) || a.date).localeCompare(dayOf(b) || b.date))
    return ahead[0] || null
  })

  /** Notes taken and never written up, the oldest first: it has waited longest. */
  const toWriteUp = computed(() =>
    held.value.filter((m) => minuteProgress(m).key === 'notes').reverse()
  )

  /**
   * Every commitment the meetings minuted, newest meeting first, each saying
   * whether it reached the task list (matched on wording, the test the
   * meeting's own page uses) and whether the minute already calls it done.
   */
  const actionItems = computed(() =>
    held.value.flatMap((minute) => {
      const structure = minute.structure || {}
      const rows = String(structure.overallSummary || '').trim()
        ? extractActionItems(structure.overallSummary)
        : (structure.agenda || []).flatMap((title, index) =>
            extractActionItems(structure.discussions?.[index] || '').map((item) => ({ ...item, agenda: item.agenda || title }))
          )
      return rows.map((item, index) => ({
        ...item,
        key: `${idOf(minute)}:${index}`,
        minute,
        onList: tasks.value.some((task) => sameTaskTitle(task.title, item.task)),
        done: /^(done|complete|completed|finished|tapos)/i.test(item.status || ''),
      }))
    })
  )
  const notOnList = computed(() => actionItems.value.filter((item) => !item.onList && !item.done))

  /** Every decision the meetings recorded, newest meeting first. */
  const decisions = computed(() =>
    held.value.flatMap((minute) =>
      minuteDecisions(minute).map((decision, index) => ({ ...decision, key: `${idOf(minute)}:${index}`, minute }))
    )
  )

  /* -------------------------------------------------- starting a meeting */

  // The scheduled meeting being turned into a record, so a second tap while
  // the write is in flight does nothing.
  const startingId = ref('')

  /**
   * Opens a meeting. A scheduled one has no record behind it yet, so opening
   * it makes one first — only for someone who manages minutes.
   */
  const openMeeting = async (minute) => {
    if (!minute.isScheduled) {
      router.push({ name: 'MinuteDetails', params: { id: idOf(minute) } })
      return
    }
    if (startingId.value) return
    if (!canEdit.value) {
      toast.info('Only someone who manages minutes can start this meeting.')
      return
    }
    startingId.value = minute.id
    try {
      const schedule = schedules.value.find((entry) => entry.id === minute.scheduleId)
      if (!schedule) throw new Error('That gathering is no longer on the schedule')
      const minuteId = await startMinuteForOccurrence(schedule, minute.occurrenceDate, {
        // Recorded against the linked member when there is one, so the name on
        // the minutes matches the member list rather than a Google display name.
        createdBy: myMember.value ? getFullName(myMember.value) : '',
      })
      router.push({ name: 'MinuteDetails', params: { id: minuteId } })
    } catch (error) {
      console.error('Error starting minutes for a scheduled meeting:', error)
      toast.error('Could not start that meeting. Please try again.')
    } finally {
      startingId.value = ''
    }
  }

  return {
    minutes,
    loading,
    canEdit,
    meetings,
    scheduledMinutes,
    lastMeeting,
    nextMeeting,
    toWriteUp,
    actionItems,
    notOnList,
    decisions,
    startingId,
    openMeeting,
    dayOf,
    idOf,
  }
}

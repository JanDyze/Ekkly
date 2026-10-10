import { computed } from 'vue'
import { useTasks } from './useTasks'
import { usePermissions } from './usePermissions'
import { memberKey } from '../utils/sgUtils'
import { daysBetween, isAssignedTo, isDueToday, isOverdue, todayKey } from '../utils/taskUtils'

/**
 * What the Tasks app's home says about the church's list, in one place, so
 * its deck and its tiles cannot disagree (the way useScheduleOverview and
 * useFinanceOverview serve their homes).
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on this week:
 *
 *   - what is late, yours first, because yours is the one you can do
 *     something about today;
 *   - what is due today;
 *   - yours for the rest of the week, so the week has no surprises;
 *   - for whoever runs the list, the open tasks nobody has been given, since a
 *     task with nobody on it is a task nobody will do.
 *
 * Left out on purpose: "done this week" as a card. It is pleasant to read and
 * nobody acts on it; it stays a line on the card that is always there.
 */
export function useTasksOverview() {
  const { tasks, loading } = useTasks()
  const { canManage, myMember } = usePermissions()

  const today = todayKey()
  const canEdit = computed(() => canManage('tasks'))
  const myMemberId = computed(() => (myMember.value ? memberKey(myMember.value) : null))

  const open = computed(() => tasks.value.filter((t) => !t.done))
  const mine = computed(() => open.value.filter((t) => isAssignedTo(t, myMemberId.value)))

  const overdue = computed(() => open.value.filter((t) => isOverdue(t, today)))
  const myOverdue = computed(() => mine.value.filter((t) => isOverdue(t, today)))
  const dueToday = computed(() => open.value.filter((t) => isDueToday(t, today)))
  const myThisWeek = computed(() =>
    mine.value.filter((t) => {
      if (!t.dueDate) return false
      const days = daysBetween(today, t.dueDate)
      return days > 0 && days <= 7
    })
  )
  const unassigned = computed(() => open.value.filter((t) => !(t.assigneeIds || []).length))

  /** Finished in the last seven days, for the line on the card always there. */
  const doneThisWeek = computed(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return tasks.value.filter((t) => t.done && (t.doneAt?.getTime?.() || 0) >= since)
  })

  /** Open tasks by ministry, biggest first, and the ones filed under none. */
  const byMinistry = computed(() => {
    const groups = new Map()
    open.value.forEach((t) => {
      const name = (t.ministry || '').trim()
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name).push(t)
    })
    return [...groups.entries()]
      .map(([name, list]) => ({ name, tasks: list, overdue: list.filter((t) => isOverdue(t, today)).length }))
      .sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1) || b.tasks.length - a.tasks.length)
  })

  return {
    loading,
    today,
    canEdit,
    myMemberId,
    open,
    mine,
    overdue,
    myOverdue,
    dueToday,
    myThisWeek,
    unassigned,
    doneThisWeek,
    byMinistry,
  }
}

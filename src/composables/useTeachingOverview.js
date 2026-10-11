import { computed } from 'vue'
import { useSermons } from './useSermons'
import { useLessons } from './useLessons'
import { useTeachingClasses } from './useTeachingClasses'
import { useScheduleOverview } from './useScheduleOverview'
import { useMembers } from './useMembers'
import { usePermissions } from './usePermissions'
import { useAuth } from './useAuth'
import { blankSunday } from './useLineups'
import { hasSermonNotes } from '../api/sermonsService'
import { assignmentsOf } from '../data/scheduleRoles'
import { rolesOfTeam } from '../data/scheduleTeams'
import { findRosterMember, isoDateOf, parseIso, todayIso } from '../utils/lineupUtils'
import { memberKey } from '../utils/sgUtils'
import { daysBetween } from '../utils/taskUtils'

// The schedule role a Sunday school teacher is put on (scheduleRoles.js). A
// church may have renamed it or added one of its own, so a role whose name
// says Sunday school counts as well.
const SUNDAY_SCHOOL_ROLE = 'sunday-school'
const isTeachingRole = (role) => role.id === SUNDAY_SCHOOL_ROLE || /sunday\s*school/i.test(role.name)

/** The Sunday `weeks` before `date`. */
const sundayBefore = (date, weeks) => {
  const d = parseIso(date)
  if (!d) return ''
  d.setDate(d.getDate() - weeks * 7)
  return isoDateOf(d)
}

/**
 * What the Teaching app says about what the church is teaching, in one place,
 * so its deck, its tiles and its sections cannot disagree (the way
 * useMinutesOverview serves Minutes).
 *
 * Teaching owns very little of what it shows. Who preaches and who teaches on
 * a Sunday are the schedule's (Schedules, useScheduleOverview); the message is
 * the sermon record the preaching sheet also writes (useSermons); only the
 * classes and the lessons are Teaching's own. Reading them all here is what
 * lets a lesson sit beside the message it follows.
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on before Sunday:
 *
 *   - you preach this coming Sunday and nothing is written yet, because the
 *     week before is when the notes are made, and the slides, the screen and
 *     the children's lesson all wait on them;
 *   - you teach Sunday school this coming Sunday with no lesson, for the same
 *     reason: Saturday night is too late to find the materials;
 *   - for whoever plans the preaching, the coming message with nothing
 *     written, so somebody can ask the preacher before Friday;
 *   - for whoever runs Sunday school, the classes with no lesson for Sunday
 *     and the teachers on the schedule with nothing to teach, so a plan can
 *     be handed over while there is still a week;
 *   - for the same people, no classes at all yet, because until the classes
 *     exist nothing in the app can say which room is ready.
 *
 * Left out on purpose: how many lessons were taught this quarter, the plans
 * never used, the sermons with no recording. Each is worth looking up and
 * none is something to do this week; the sections show them. And the Sunday
 * with nobody preaching: that is the rota's gap, and Schedules' home already
 * asks the preaching team about it.
 */
export function useTeachingOverview() {
  const { sermons, loading: sermonsLoading, sermonOn, saveNotes } = useSermons()
  const { lessons, loading: lessonsLoading, lessonFor, lessonById } = useLessons()
  const { classes, activeClasses, loading: classesLoading, classById } = useTeachingClasses()
  const { loading: lineupsLoading, roles, services, comingSundays, canPlanTeam, myMember } = useScheduleOverview()
  const { members } = useMembers()
  const { canManage } = usePermissions()
  const { user } = useAuth()

  const today = todayIso()
  const loading = computed(() => sermonsLoading.value || lessonsLoading.value || classesLoading.value || lineupsLoading.value)

  /** Running Sunday school and the library: the area's own manage right. */
  const canManageTeaching = computed(() => canManage('teaching'))

  const myIds = computed(() => {
    const mine = myMember.value
    return mine ? new Set([memberKey(mine), String(mine.firestoreId)]) : new Set()
  })
  const isMe = (id) => myIds.value.has(String(id))

  /* ------------------------------------------------------------- Sundays */

  /** The coming Sunday, or today when today is one. */
  const thisSunday = computed(() => comingSundays.value[0]?.date || '')

  /** Days until the coming Sunday: 0 on the day. */
  const daysToSunday = computed(() => (thisSunday.value ? daysBetween(today, thisSunday.value) : 7))

  // Every Sunday the schedule has that this person may see, past and to come.
  const sundayByDate = computed(
    () => new Map([...services.value, ...comingSundays.value].map((sunday) => [sunday.date, sunday]))
  )
  const sundayOn = (date) => sundayByDate.value.get(date) || blankSunday(date)

  /** The Sundays this month and next still to come. */
  const comingDates = computed(() => comingSundays.value.map((sunday) => sunday.date))

  /** The Sundays just gone, newest first. */
  const pastDates = (weeks) =>
    thisSunday.value ? Array.from({ length: weeks }, (_, i) => sundayBefore(thisSunday.value, i + 1)) : []

  /* --------------------------------------------------------- who teaches */

  // The preacher's role first, then any other role the preaching team plans.
  const preachingRoleIds = computed(() => {
    const ids = rolesOfTeam(roles.value, 'preaching').map((role) => role.id)
    return ids.length ? ids : ['preacher']
  })
  const teachingRoleIds = computed(() => roles.value.filter(isTeachingRole).map((role) => role.id))
  /** The schedule's Sunday school role, for a people picker to offer its ministries first. */
  const teachingRole = computed(() => roles.value.find(isTeachingRole) || null)

  const idsOn = (date, roleIds) => {
    const assignments = assignmentsOf(sundayOn(date))
    return [...new Set(roleIds.flatMap((id) => assignments[id] || []))]
  }
  const toMembers = (ids) => ids.map((id) => findRosterMember(members.value, id)).filter(Boolean)

  const preacherIdsOn = (date) => idsOn(date, preachingRoleIds.value)
  const preachersOn = (date) => toMembers(preacherIdsOn(date))
  const scheduledTeacherIdsOn = (date) => idsOn(date, teachingRoleIds.value)
  const scheduledTeachersOn = (date) => toMembers(scheduledTeacherIdsOn(date))

  /** The Sunday's series, as the preaching team set it on the schedule. */
  const themeOn = (date) => sundayOn(date).theme || ''

  /* ------------------------------------------------------------- sermons */

  /**
   * Whoever may write a message: anyone who plans the preaching (the same
   * people the preaching sheet lets in), whoever runs Teaching, and the person
   * preaching that Sunday — a guest preacher writes their own notes ahead
   * without being given the whole preaching team's rights.
   */
  const canEditSermon = (date) => canManageTeaching.value || canPlanTeam('preaching') || preacherIdsOn(date).some(isMe)

  /** A message still to be preached with nothing written, which somebody is down to preach or a series names. */
  const sermonWaiting = (date) =>
    !hasSermonNotes(sermonOn(date)) && (preacherIdsOn(date).length > 0 || Boolean(themeOn(date)))

  /** Sermons already preached, newest first: the record of what the church has heard. */
  const preached = computed(() =>
    Object.values(sermons.value)
      .filter((sermon) => sermon.date < today && hasSermonNotes(sermon))
      .sort((a, b) => b.date.localeCompare(a.date))
  )

  /* ------------------------------------------------------------- lessons */

  const lessonsOn = (date) => lessons.value.filter((lesson) => lesson.date === date)

  /**
   * Whoever may plan a class's lesson for a Sunday: whoever runs Teaching, the
   * class's own teachers, and anyone the schedule puts on Sunday school that
   * day.
   */
  const canPlanFor = (classId, date) =>
    canManageTeaching.value ||
    (classById(classId)?.teacherIds || []).some(isMe) ||
    Boolean(date && scheduledTeacherIdsOn(date).some(isMe))

  /** Whoever may change a lesson: those who may plan it, its teachers, and whoever wrote it. */
  const canEditLesson = (lesson) =>
    Boolean(lesson) &&
    (canPlanFor(lesson.classId, lesson.date) ||
      lesson.teacherIds.some(isMe) ||
      Boolean(user.value && lesson.createdBy === user.value.uid))

  /** The classes this person usually teaches. */
  const myClasses = computed(() => activeClasses.value.filter((cls) => cls.teacherIds.some(isMe)))

  /**
   * Whether this person teaches at all — a class of their own, or a turn on
   * the schedule in the weeks to come — and so may add to the library.
   */
  const isTeacher = computed(
    () => myClasses.value.length > 0 || comingDates.value.some((date) => scheduledTeacherIdsOn(date).some(isMe))
  )
  const canWritePlans = computed(() => canManageTeaching.value || isTeacher.value)

  /**
   * Who a new lesson for a class on a date is offered to: those of the class's
   * teachers the schedule has on that Sunday, else the class's teachers, else
   * whoever the schedule has on Sunday school if this is the only class.
   */
  const suggestedTeacherIds = (classId, date) => {
    const regular = classById(classId)?.teacherIds || []
    const onSchedule = date ? scheduledTeacherIdsOn(date) : []
    const both = regular.filter((id) => onSchedule.includes(id))
    if (both.length) return both
    if (regular.length) return regular
    return activeClasses.value.length <= 1 ? onSchedule : []
  }

  /** Every class's lesson on a date, with the lessons for no class still listed after them. */
  const classLessonsOn = (date) => {
    const rows = activeClasses.value.map((cls) => ({ cls, lesson: lessonFor(cls.id, date) }))
    const shown = new Set(rows.map((row) => row.lesson?.id).filter(Boolean))
    lessonsOn(date)
      .filter((lesson) => !shown.has(lesson.id))
      .forEach((lesson) => rows.push({ cls: classById(lesson.classId), lesson }))
    return rows
  }

  /* -------------------------------------------------------- what's waiting */

  const sundayIsSoon = computed(() => daysToSunday.value <= 2)

  /** You preach this coming Sunday and nothing is written yet. */
  const myMessageWaiting = computed(
    () => Boolean(thisSunday.value) && preacherIdsOn(thisSunday.value).some(isMe) && !hasSermonNotes(sermonOn(thisSunday.value))
  )

  /** For whoever plans the preaching: this coming Sunday's message, still blank. */
  const messageWaiting = computed(
    () =>
      Boolean(thisSunday.value) &&
      !myMessageWaiting.value &&
      (canManageTeaching.value || canPlanTeam('preaching')) &&
      sermonWaiting(thisSunday.value)
  )

  /** The lessons this person is down to teach this coming Sunday. */
  const myLessonsThisSunday = computed(() =>
    thisSunday.value ? lessonsOn(thisSunday.value).filter((lesson) => lesson.teacherIds.some(isMe)) : []
  )

  /**
   * You are on Sunday school this coming Sunday, by the schedule or as a
   * class's teacher whose class has nothing planned, and no lesson has you
   * down to teach it.
   */
  const myLessonWaiting = computed(() => {
    if (!thisSunday.value || myLessonsThisSunday.value.length) return null
    const myClassWithout = myClasses.value.find((cls) => !lessonFor(cls.id, thisSunday.value))
    const scheduled = scheduledTeacherIdsOn(thisSunday.value).some(isMe)
    if (!scheduled && !myClassWithout) return null
    return { cls: myClassWithout || null }
  })

  /** For whoever runs Sunday school: the classes with nothing for this coming Sunday. */
  const classesWithoutLesson = computed(() =>
    thisSunday.value ? activeClasses.value.filter((cls) => !lessonFor(cls.id, thisSunday.value)) : []
  )

  /**
   * For whoever runs Sunday school: the teachers the schedule has on this
   * coming Sunday who are not down to teach any lesson that day, and whose
   * own class has none either.
   */
  const teachersWithoutLesson = computed(() => {
    if (!thisSunday.value) return []
    const date = thisSunday.value
    const teaching = new Set(lessonsOn(date).flatMap((lesson) => lesson.teacherIds))
    return scheduledTeachersOn(date).filter((member) => {
      const ids = [memberKey(member), String(member.firestoreId)]
      if (ids.some((id) => teaching.has(id))) return false
      const own = activeClasses.value.filter((cls) => cls.teacherIds.some((id) => ids.includes(id)))
      return !own.length || own.some((cls) => !lessonFor(cls.id, date))
    })
  })

  /** Coming Sundays in the next fortnight whose message this person could write and nobody has. */
  const sermonsToWrite = computed(() =>
    comingDates.value.filter((date) => daysBetween(today, date) <= 14 && canEditSermon(date) && sermonWaiting(date))
  )

  return {
    loading,
    sermons,
    lessons,
    classes,
    activeClasses,
    members,
    myMember,
    today,
    canManageTeaching,
    canWritePlans,
    isMe,
    thisSunday,
    daysToSunday,
    sundayIsSoon,
    comingDates,
    pastDates,
    sundayOn,
    themeOn,
    preacherIdsOn,
    preachersOn,
    scheduledTeacherIdsOn,
    scheduledTeachersOn,
    teachingRole,
    sermonOn,
    saveNotes,
    canEditSermon,
    sermonWaiting,
    preached,
    lessonFor,
    lessonById,
    lessonsOn,
    classById,
    classLessonsOn,
    canPlanFor,
    canEditLesson,
    myClasses,
    suggestedTeacherIds,
    myMessageWaiting,
    messageWaiting,
    myLessonWaiting,
    classesWithoutLesson,
    teachersWithoutLesson,
    sermonsToWrite,
  }
}

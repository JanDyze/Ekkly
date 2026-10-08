import { computed } from 'vue'
import { useAttendance } from './useAttendance'
import { useAttendanceStats } from './useAttendanceStats'
import { useMembers } from './useMembers'
import { usePermissions } from './usePermissions'

// What is true across every gathering counted, for the Attendance app's home
// and the sections that summarise it — how many different people the church
// saw this month, who has gone quiet, what is still to be counted, and the
// last few turnouts. One reading of the data (useAttendanceStats), so the
// deck, the tiles and the sections cannot disagree.

export function useAttendanceOverview() {
  const { aggregatedAttendance, loading, skipRecording, resumeRecording } = useAttendance()
  const { members } = useMembers()
  const { canManage } = usePermissions()
  const { stats, recentBars, months, quiet, awaiting, recorded } = useAttendanceStats(aggregatedAttendance, members)

  const canRecord = computed(() => canManage('attendance'))

  /** Everyone gone quiet, with their record, longest away first. */
  const quietPeople = computed(() => quiet.value.filter((row) => row.member))

  /** The most recent gathering counted, and how full it was. */
  const latest = computed(() => {
    const row = recorded.value[recorded.value.length - 1]
    if (!row) return null
    const count = row.totalAttendees ?? row.attendees?.length ?? 0
    const expected = row.expectedAttendees || members.value.length
    return { row, count, share: expected ? Math.min(100, Math.round((count / expected) * 100)) : 0 }
  })

  /**
   * Gatherings that happened and were left out of the count on purpose,
   * newest first — kept so a leaving-out can be taken back.
   */
  const leftOut = computed(() =>
    aggregatedAttendance.value
      .filter((row) => row.skipped && row.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  )

  return {
    rows: aggregatedAttendance,
    leftOut,
    skipRecording,
    resumeRecording,
    loading,
    members,
    canRecord,
    stats,
    recentBars,
    months,
    quietPeople,
    awaiting,
    latest,
  }
}

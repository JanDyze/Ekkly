import { getIconForEvent } from './eventIcons'

// One person's attendance as a person's record draws it, on a phone and on a
// desktop alike (PersonRecord, PersonDesk): the history from
// useMemberAttendance laid out as a grid.

export const ATTENDANCE_STYLE = {
  present: 'bg-green-500 dark:bg-green-500',
  absent: 'bg-red-500 dark:bg-red-500',
  unrecorded: 'bg-transparent border border-dashed border-gray-300 dark:border-gray-600',
}

export const STATE_WORD = { present: 'Came', absent: 'Did not come', unrecorded: 'Not recorded' }

/**
 * A gathering's day, "Sunday, 12 October". Read as a day on the calendar:
 * a bare "2026-10-12" handed to Date is midnight in London, which is the day
 * before anywhere west of it.
 */
export const longDay = (iso) => {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(iso)
  return Number.isNaN(date.getTime())
    ? String(iso || '')
    : date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * A gathering to a row, a month to a column: Sunday Service, then its Sundays
 * as small squares under AUG and SEP. Read across, a row is one person's habit
 * with one gathering — which is the question a profile is opened to answer —
 * and the months line up down the page, so "stopped coming to the prayer
 * meeting in August" is a gap you see rather than a date you look for.
 *
 * Oldest month on the left and oldest day first inside it, the way a week
 * reads. Dates are not printed; choosing a square says it.
 */
export const buildAttendanceGrid = (history = []) => {
  const thisYear = new Date().getFullYear()
  const months = new Map()
  const rows = new Map()

  history.forEach((item) => {
    const iso = String(item.date || '')
    const key = iso.slice(0, 7)
    if (!key) return
    if (!months.has(key)) {
      const [y, mo] = key.split('-').map(Number)
      const d = new Date(y, mo - 1, 1)
      months.set(key, {
        key,
        label:
          d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() +
          (y === thisYear ? '' : ` '${String(y).slice(2)}`),
      })
    }
    // By series, not by title: the Sunday with an occasion on it is still a
    // square on the Sunday service's row (useMemberAttendance.js).
    if (!rows.has(item.seriesKey)) {
      rows.set(item.seriesKey, {
        key: item.seriesKey,
        title: item.seriesTitle,
        icon: getIconForEvent({ icon: item.icon, type: item.type }),
        byMonth: {},
        latest: iso,
        present: 0,
        counted: 0,
      })
    }
    const row = rows.get(item.seriesKey)
    ;(row.byMonth[key] ||= []).push(item)
    if (iso > row.latest) row.latest = iso
    if (item.state !== 'unrecorded') row.counted += 1
    if (item.state === 'present') row.present += 1
  })

  const columns = [...months.values()].sort((x, y) => x.key.localeCompare(y.key))
  columns.forEach(({ key }) =>
    rows.forEach((row) => row.byMonth[key]?.sort((x, y) => String(x.date).localeCompare(String(y.date))))
  )

  return {
    columns,
    // The gathering seen most recently first: the one still going on is the
    // one the reader most likely came about.
    rows: [...rows.values()].sort((x, y) => y.latest.localeCompare(x.latest) || x.title.localeCompare(y.title)),
  }
}

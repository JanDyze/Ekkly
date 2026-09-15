// The dates the hero's sample church lives by, worked out from today so the
// tour never names a Sunday that falls on a Monday. "This Sunday" is the next
// one (today, on a Sunday); the rest hang off it: the board met the Sunday
// before, meets again two weeks on, and the youth camp is a Friday-to-Sunday
// about two months away.

const DAY = 24 * 60 * 60 * 1000

const addDays = (date, days) => new Date(date.getTime() + days * DAY)

const month = (date) => date.toLocaleDateString('en-GB', { month: 'long' })
const monthShort = (date) => date.toLocaleDateString('en-GB', { month: 'short' })

const today = new Date()
today.setHours(12, 0, 0, 0)

export const sunday = addDays(today, (7 - today.getDay()) % 7)
const boardMet = addDays(sunday, -7)
const nextBoard = addDays(sunday, 14)
const campFrom = addDays(sunday, 54)
const campTo = addDays(sunday, 56)

// "21 September"
export const dayMonth = (date) => `${date.getDate()} ${month(date)}`

export const SUNDAY = dayMonth(sunday)
export const SUNDAY_DAY = sunday.getDate()
export const BOARD_MET = dayMonth(boardMet)
export const NEXT_BOARD = `Sunday, ${dayMonth(nextBoard)}`

// "14–16 November", or "30 October – 1 November" when it crosses a month.
export const CAMP =
  campFrom.getMonth() === campTo.getMonth()
    ? `${campFrom.getDate()}–${campTo.getDate()} ${month(campTo)}`
    : `${dayMonth(campFrom)} – ${dayMonth(campTo)}`

// The same, the way someone types it into their notes: "nov 14-16", "oct 5".
export const CAMP_NOTE = `${monthShort(campFrom).toLowerCase()} ${campFrom.getDate()}-${campTo.getDate()}`
export const NEXT_BOARD_NOTE = `${monthShort(nextBoard).toLowerCase()} ${nextBoard.getDate()}`

// The last eight Sundays, this one last, labelled the way a chart's axis is:
// the month named only where it changes.
export const WEEK_LABELS = Array.from({ length: 8 }, (_, i) => addDays(sunday, (i - 7) * 7)).map((date, i, all) =>
  i === 0 || date.getMonth() !== all[i - 1].getMonth() ? `${date.getDate()} ${monthShort(date)}` : `${date.getDate()}`
)

// Reading the line typed into the Tasks app's quick-add box (TaskQuickAdd):
// the task, and whatever else was said in it — when it is due, who it is
// for, and the ministry — so "Print bulletins friday @Ana #worship" is a task
// with a date, a person and a ministry, not four words in a title waiting for
// someone to open the editor. A task added bare is due never and given to
// nobody, which is how a list fills with things nobody will do.
//
// What it reads, and takes out of the title:
//
//   today, tomorrow, next week, in 3 days
//   a weekday — friday, or fri after on/by — the next one, never today
//   a date — oct 24, 24 october, october 24th
//   @name — someone on the roll, by first name, nickname or full name
//   #ministry — a ministry the church keeps, spaces and dashes aside
//
// Anything it cannot be sure of (two people called Ana) stays in the title as
// typed, so nothing is ever given to the wrong person on a guess. The box
// shows what it understood before it is added, so a misreading is caught.

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dateOf = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
// Short forms are read only after "on", "by" or "due": "sat" and "sun" are
// words in titles too ("Fix the sun shade").
const WEEKDAY_SHORT = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 }
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

const monthOf = (word) => {
  const w = String(word || '').replace(/\.$/, '')
  if (w.length < 3) return -1
  return MONTHS.findIndex((month) => month.startsWith(w))
}
const dayNumberOf = (word) => {
  const match = String(word || '').match(/^(\d{1,2})(st|nd|rd|th)?$/)
  if (!match) return 0
  const n = Number(match[1])
  return n >= 1 && n <= 31 ? n : 0
}

/** The next time a month and day come round from today: this year, or next once it has passed. */
const nextMonthDay = (today, month, day) => {
  const date = new Date(today.getFullYear(), month, day)
  if (date.getMonth() !== month) return null
  return date < today ? new Date(today.getFullYear() + 1, month, day) : date
}

/** Plain letters, for matching a name or a ministry whatever its case, spaces or dashes. */
const flat = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const LEAD = /^(on|by|due)$/

/**
 * Reads `text` into { title, dueDate, people: [member], ministry }.
 * `context`: { today: 'YYYY-MM-DD', members: [], ministryNames: [] }.
 */
export function parseQuickTask(text, context = {}) {
  const today = dateOf(context.today || keyOf(new Date()))
  const members = context.members || []
  const ministryNames = context.ministryNames || []

  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  const plain = words.map((word) => word.toLowerCase().replace(/[.,;]+$/, ''))
  const used = new Set()
  let dueDate = ''
  const people = []
  let ministry = ''

  // A date found at `from`..`to`: the little word before it ("on", "by")
  // goes with it out of the title.
  const takeDate = (date, from, to) => {
    dueDate = keyOf(date)
    for (let i = from; i <= to; i++) used.add(i)
    if (from > 0 && LEAD.test(plain[from - 1]) && !used.has(from - 1)) used.add(from - 1)
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const lower = plain[i]
    const next = plain[i + 1] || ''

    // Someone on the roll, only when exactly one person answers to the name.
    if (word.startsWith('@') && word.length > 1) {
      const wanted = flat(word.slice(1))
      const matches = members.filter((m) =>
        [m.nickname, m.firstName, `${m.firstName || ''}${m.lastName || ''}`].some((name) => name && flat(name) === wanted)
      )
      if (matches.length === 1 && !people.includes(matches[0])) {
        people.push(matches[0])
        used.add(i)
      }
      continue
    }

    // A ministry: its whole name, or the one ministry it is the start of.
    if (word.startsWith('#') && word.length > 1) {
      const wanted = flat(word.slice(1))
      const starting = ministryNames.filter((name) => flat(name).startsWith(wanted))
      const found = ministryNames.find((name) => flat(name) === wanted) || (starting.length === 1 ? starting[0] : '')
      if (found && !ministry) {
        ministry = found
        used.add(i)
      }
      continue
    }

    if (dueDate || used.has(i)) continue

    const weekday = WEEKDAYS.indexOf(lower) >= 0
      ? WEEKDAYS.indexOf(lower)
      : i > 0 && LEAD.test(plain[i - 1]) && lower in WEEKDAY_SHORT ? WEEKDAY_SHORT[lower] : -1

    if (lower === 'today') {
      takeDate(today, i, i)
    } else if (lower === 'tomorrow' || lower === 'tmrw') {
      takeDate(addDays(today, 1), i, i)
    } else if (lower === 'next' && next === 'week') {
      takeDate(addDays(today, 7), i, i + 1)
    } else if (lower === 'in' && /^\d{1,3}$/.test(next) && /^days?$/.test(plain[i + 2] || '')) {
      takeDate(addDays(today, Number(next)), i, i + 2)
    } else if (weekday >= 0) {
      takeDate(addDays(today, ((weekday - today.getDay() + 7) % 7) || 7), i, i)
    } else if (monthOf(lower) >= 0 && dayNumberOf(next)) {
      const date = nextMonthDay(today, monthOf(lower), dayNumberOf(next))
      if (date) takeDate(date, i, i + 1)
    } else if (dayNumberOf(lower) && monthOf(next) >= 0) {
      const date = nextMonthDay(today, monthOf(next), dayNumberOf(lower))
      if (date) takeDate(date, i, i + 1)
    }
  }

  const title = words.filter((_, i) => !used.has(i)).join(' ').trim()
  return { title, dueDate, people, ministry }
}

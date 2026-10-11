import { daysBetween, dueLabel, todayKey } from './taskUtils'

// What the Inventory app asks of an item, in one place: what state it is in,
// whether it is out and when it is due back, how a row describes it, and what
// a search matches. The home's deck, its tiles and every list ask the same
// questions, and two answers to "is the projector overdue" would be worse
// than none.

/** How an item is, from fine to not usable. Red is kept for overdue. */
export const CONDITIONS = [
  { key: 'good', label: 'Good' },
  { key: 'worn', label: 'Worn, still works' },
  { key: 'repair', label: 'Needs repair' },
]

export const conditionLabel = (key) => CONDITIONS.find((c) => c.key === key)?.label || 'Good'

// Offered while someone types a category, so one church does not end up with
// "Sound", "Sounds" and "Sound system" for the same shelf. Anything else typed
// is kept as typed, and the church's own categories are offered first.
export const STARTER_CATEGORIES = [
  'Sound',
  'Instruments',
  'Media and projection',
  'Furniture',
  'Kitchen',
  'Kids ministry',
  'Decorations',
  'Cleaning',
  'Office',
  'Tools',
]

/**
 * A loan with no date to come back is not overdue on any day in particular,
 * which is how a borrowed ladder becomes the borrower's. After a month out it
 * is treated as overdue, so somebody asks.
 */
export const LONG_LOAN_DAYS = 30

/** How many of an item are out on loan just now. */
export const onLoan = (item) => (item?.loans || []).reduce((sum, loan) => sum + (loan.quantity || 1), 0)

/** How many are on the shelf. Never below nothing, whatever was typed. */
export const available = (item) => Math.max(0, (item?.quantity || 1) - onLoan(item))

/** 'overdue', 'soon' (due within a week) or 'out'. */
export const loanState = (loan, today = todayKey()) => {
  if (loan?.due) {
    const days = daysBetween(today, loan.due)
    if (days < 0) return 'overdue'
    return days <= 7 ? 'soon' : 'out'
  }
  return daysBetween(loan?.since, today) > LONG_LOAN_DAYS ? 'overdue' : 'out'
}

/** "Due tomorrow", "3 days late", "Out 5 weeks, no date given". */
export const loanDueLabel = (loan, today = todayKey()) => {
  if (loan?.due) {
    const label = dueLabel(loan.due, today)
    if (/late$/.test(label)) return label
    // "Due today", "Due tomorrow", but "Due Friday" and "Due Oct 20".
    return `Due ${['Today', 'Tomorrow'].includes(label) ? label.toLowerCase() : label}`
  }
  const days = Math.max(0, daysBetween(loan?.since, today))
  if (days === 0) return 'Out since today'
  if (days < 14) return `Out ${days} ${days === 1 ? 'day' : 'days'}, no date given`
  return `Out ${Math.round(days / 7)} weeks, no date given`
}

/** "Ana Reyes", or "Ana Reyes · 20 of 50" when only some went. */
export const borrowerLine = (loan, item) =>
  [loan.to || 'Someone', (item?.quantity || 1) > 1 ? `${loan.quantity || 1} of ${item.quantity}` : '']
    .filter(Boolean)
    .join(' · ')

/** The quiet line under an item's name in a list: where it is and how many. */
export const itemLine = (item) => {
  const count = item.quantity > 1 ? `${item.quantity}` : ''
  const out = onLoan(item)
  return [
    item.location || 'No place set',
    count && (out ? `${available(item)} of ${count} here` : `${count} in all`),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Every loan of every item, flattened, overdue first and then by due date. */
export const allLoans = (items, today = todayKey()) => {
  const rank = { overdue: 0, soon: 1, out: 2 }
  return items
    .flatMap((item) => (item.loans || []).map((loan) => ({ item, loan, state: loanState(loan, today) })))
    .sort(
      (a, b) =>
        rank[a.state] - rank[b.state] ||
        String(a.loan.due || '9999').localeCompare(String(b.loan.due || '9999')) ||
        String(a.loan.since).localeCompare(String(b.loan.since))
    )
}

const norm = (value) => String(value || '').toLowerCase()

/**
 * A search over everything a row says or implies: the name, its category and
 * place, the notes, who has it, and the words for its state — "borrowed",
 * "overdue", "repair", "no photo" — so the one box does what filters would.
 */
export const matchesItemQuery = (item, query, today = todayKey()) => {
  const q = norm(query).trim()
  if (!q) return true
  const loans = item.loans || []
  const words = [
    item.name,
    item.category,
    item.location,
    item.notes,
    item.repairNote,
    conditionLabel(item.condition),
    ...loans.map((loan) => loan.to),
    loans.length ? 'borrowed lent out on loan' : 'here available',
    loans.some((loan) => loanState(loan, today) === 'overdue') ? 'overdue late' : '',
    item.condition === 'repair' ? 'broken repair' : '',
    item.photo ? '' : 'no photo',
  ]
  return q.split(/\s+/).every((part) => words.some((word) => norm(word).includes(part)))
}

/** Names compared the way a person would: case and spacing ignored. */
export const sameName = (a, b) => norm(a).trim().replace(/\s+/g, ' ') === norm(b).trim().replace(/\s+/g, ' ')

/** Items in alphabetical order, the way a shelf list is read. */
export const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

/** Items under headings (a category, a place), headings in order and "none" last. */
export const groupItems = (items, keyOf, noneLabel) => {
  const groups = new Map()
  for (const item of items) {
    const key = String(keyOf(item) || '').trim()
    const id = key.toLowerCase()
    if (!groups.has(id)) groups.set(id, { key: id, label: key || noneLabel, items: [] })
    groups.get(id).items.push(item)
  }
  return [...groups.values()]
    .map((group) => ({ ...group, items: group.items.sort(byName) }))
    .sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.label.localeCompare(b.label))
}

import { computed } from 'vue'
import { useLedger } from './useLedger'
import { usePermissions } from './usePermissions'
import { isKnownCategory } from '../data/financeChart'
import { currentMonthKey, formatMonthLabel, isoDateOf, monthKeyOf, shiftMonth, todayIso } from '../utils/ledgerUtils'

// What is true across the books, for the Finances app's home and its sections:
// the balances, how each month came out, and the few things a treasurer is
// actually behind on. One reading of the ledger, so the deck, the tiles and
// the sections cannot disagree.
//
// The deck's cards are decided here, and each one has to pass the same test:
// would a treasurer or a church committee act on it this week? A card that
// fires on every church whatever it does trains people to swipe without
// reading, so each one is earned from the church's own habits rather than a
// rule of thumb:
//
//   - No opening balance: every figure is wrong until there is one, so it
//     leads, for whoever keeps the books.
//   - Sunday offerings not entered: only for a church that enters them week by
//     week (two or more in the last eight Sundays). A church that enters one
//     total a month is never told it missed a Sunday.
//   - Last month's statement: in the first ten days of a month, when church
//     committees meet and ask for it, and only if the month has anything in it.
//   - Entries no statement line can hold: they fall into Unclassified, which
//     makes the statement wrong without anyone noticing.
//
// Deliberately not cards: cash waiting to be banked (a church that never
// deposits would be nagged forever, and one that does knows), a large expense
// (a roof is not an emergency), and a month that went into the red (the first
// week of every month does, before the offerings come in).

const OFFERING = 'tithes-offering'

/** How far back a missed Sunday is still worth asking about. */
const SUNDAYS_LOOKED_AT = 8

/** Days after a Sunday an offering may be entered and still count for it. */
const LATE_ENTRY_DAYS = 2

/** The first days of a month, when last month's statement is wanted. */
const STATEMENT_DAYS = 10

const dayOffset = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDateOf(new Date(y, m - 1, d + days))
}

/**
 * The Sunday most recently behind us. A Sunday morning still counts as the
 * Sunday before: the offering is not taken until the service, and nobody can
 * have entered it before lunch.
 */
const lastSunday = () => {
  const now = new Date()
  const back = now.getDay() === 0 && now.getHours() < 13 ? 7 : now.getDay()
  return isoDateOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back))
}

const sumWhere = (entries, test) => entries.reduce((total, e) => (test(e) ? total + Math.trunc(Number(e.amount) || 0) : total), 0)

export function useFinanceOverview() {
  const ledger = useLedger()
  const { entries, opening, loading, balancesToday, statementForMonth } = ledger
  const { can } = usePermissions()

  const canManage = computed(() => can('finances.manage'))
  const thisMonth = currentMonthKey()

  /* --------------------------------------------------------- the months */

  /** Money in and out of one month; a transfer is neither. */
  const monthTotals = (key) => {
    const month = entries.value.filter((e) => monthKeyOf(e.date) === key)
    const income = sumWhere(month, (e) => e.direction === 'in')
    const expenses = sumWhere(month, (e) => e.direction === 'out')
    return { key, label: formatMonthLabel(key), income, expenses, net: income - expenses, count: month.length }
  }

  /** The last twelve months, newest first — this one included, even when empty. */
  const months = computed(() =>
    Array.from({ length: 12 }, (_, i) => monthTotals(shiftMonth(thisMonth, -i))).filter(
      (month, i) => i === 0 || month.count
    )
  )

  const current = computed(() => monthTotals(thisMonth))

  /* ------------------------------------------------- Sunday offerings */

  /**
   * The Sundays whose offering is missing, oldest first — for a church that
   * enters its offering week by week, and only after the last one it entered,
   * so an old gap the treasurer has long since given up on is not dug up.
   */
  const missedSundays = computed(() => {
    const offerings = new Set(entries.value.filter((e) => e.direction === 'in' && e.category === OFFERING).map((e) => e.date))
    const enteredFor = (sunday) =>
      Array.from({ length: LATE_ENTRY_DAYS + 1 }, (_, d) => dayOffset(sunday, d)).some((day) => offerings.has(day))

    const latest = lastSunday()
    const sundays = Array.from({ length: SUNDAYS_LOOKED_AT }, (_, i) => dayOffset(latest, -7 * (SUNDAYS_LOOKED_AT - 1 - i)))
      // Before the opening balance is history the opening already holds.
      .filter((sunday) => !opening.value.isSet || !opening.value.asOf || sunday >= opening.value.asOf)

    const entered = sundays.filter(enteredFor)
    if (entered.length < 2) return []
    const lastEntered = entered[entered.length - 1]
    return sundays.filter((sunday) => sunday > lastEntered && !enteredFor(sunday))
  })

  /* --------------------------------------------- last month's statement */

  const lastMonth = computed(() => {
    if (Number(todayIso().slice(8, 10)) > STATEMENT_DAYS) return null
    const totals = monthTotals(shiftMonth(thisMonth, -1))
    return totals.count ? totals : null
  })

  /* ------------------------------------------------ entries astray */

  /** Entries this month and last that no statement line can hold. */
  const unclassified = computed(() => {
    const recent = new Set([thisMonth, shiftMonth(thisMonth, -1)])
    return entries.value.filter(
      (e) => recent.has(monthKeyOf(e.date)) && e.direction !== 'transfer' && !isKnownCategory(e.direction, e.category, e.subcategory)
    )
  })

  /** The latest entry, for the Book's tile. */
  const latestEntry = computed(() =>
    [...entries.value].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null
  )

  /** The last bank deposit, for Accounts. */
  const lastDeposit = computed(
    () =>
      [...entries.value]
        .filter((e) => e.direction === 'transfer' && e.account === 'cash' && e.toAccount !== 'cash')
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null
  )

  return {
    ...ledger,
    loading,
    opening,
    canManage,
    balancesToday,
    statementForMonth,
    thisMonth,
    current,
    months,
    missedSundays,
    lastMonth,
    unclassified,
    latestEntry,
    lastDeposit,
  }
}

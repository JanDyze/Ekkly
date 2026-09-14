import { billingStatusLabel } from '../../lib/platformDefaults.js'

// How a church's plan reads at a glance — on the console's church list, its
// church page, and the church's own Settings — so all three say the same thing.

const todayKey = () => new Date().toISOString().slice(0, 10)

/** Whether a paid or trial plan has run past its date without being renewed. */
export const isPastDue = (plan, today = todayKey()) =>
  Boolean(plan?.paidThrough) && plan.paidThrough < today && ['active', 'trial'].includes(plan.status)

/**
 * `{ label, tone }` with tone one of: danger, attention, accent, muted.
 * Red is for owing money, amber for a trial that will end, the accent for paid.
 */
export const billingBadge = (plan, today = todayKey()) => {
  if (!plan) return { label: 'No plan yet', tone: 'muted' }
  if (plan.status === 'overdue' || isPastDue(plan, today)) {
    return { label: plan.status === 'trial' ? 'Trial ended' : 'Overdue', tone: 'danger' }
  }
  if (plan.status === 'trial') return { label: plan.paidThrough ? `Trial to ${shortDate(plan.paidThrough)}` : 'Trial', tone: 'attention' }
  if (plan.status === 'active') return { label: plan.paidThrough ? `Paid to ${shortDate(plan.paidThrough)}` : 'Paid up', tone: 'accent' }
  return { label: billingStatusLabel(plan.status), tone: 'muted' }
}

export const TONE_CLASSES = {
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  attention: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  accent: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  muted: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

/** '2026-10-14' -> 'Oct 14, 2026'. Read as a calendar date, never shifted by timezone. */
export const shortDate = (key) => {
  if (!key) return ''
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

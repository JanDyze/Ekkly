import { computed } from 'vue'
import { useInventory } from './useInventory'
import { usePermissions } from './usePermissions'
import { memberKey } from '../utils/sgUtils'
import { allLoans, available, onLoan } from '../utils/inventoryUtils'
import { daysBetween, todayKey } from '../utils/taskUtils'

/**
 * What the Inventory app's home says about the church's things, in one place,
 * so its deck and its tiles cannot disagree (the way useMinutesOverview and
 * useTasksOverview serve theirs).
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on this week:
 *
 *   - what is overdue to come back: past its date, or out over a month with
 *     no date at all. A borrowed amplifier is how a Sunday starts without one,
 *     and the longer a loan runs the more it becomes the borrower's, so whoever
 *     keeps the inventory hears about it first;
 *   - what is due back this week, so it can be asked for before the Sunday it
 *     is needed rather than on it;
 *   - what you have borrowed yourself, for anyone on the roll: the one card a
 *     person without the keys to the storeroom has something to do about;
 *   - what is waiting for repair, because a broken thing nobody chases is
 *     still on the list in a year, and a church budgets for fixing it;
 *   - what was never photographed. A photo is how a new volunteer finds "the
 *     grey extension reel" without asking, and taking one is a minute's work
 *     with the phone in hand. A standing chore, like the repairs.
 *
 * Left out on purpose: the total value of everything. Worth having for the
 * insurer or the year-end report, never something to act on this week; it is
 * a line on the card that is always there. And a "check everything" stocktake
 * reminder: nobody is asked to count chairs until the church says it does
 * that, and a card on a schedule of our choosing would be read as noise.
 */
export function useInventoryOverview() {
  const { items, loading } = useInventory()
  const { canManage, myMember } = usePermissions()

  const today = todayKey()
  const canEdit = computed(() => canManage('inventory'))

  const loans = computed(() => allLoans(items.value, today))
  const overdue = computed(() => loans.value.filter((row) => row.state === 'overdue'))
  const dueSoon = computed(() => loans.value.filter((row) => row.state === 'soon'))

  /** Everything out on loan, as items (an item lent twice counted once). */
  const borrowedItems = computed(() => items.value.filter((item) => onLoan(item) > 0))

  /** What the person looking has borrowed, by their record on the roll. */
  const mine = computed(() => {
    const id = myMember.value ? memberKey(myMember.value) : ''
    return id ? loans.value.filter((row) => row.loan.memberId === id) : []
  })

  /** Waiting for repair, the longest-waiting first. */
  const needsRepair = computed(() =>
    items.value
      .filter((item) => item.condition === 'repair')
      .sort((a, b) => String(a.conditionSince || '9999').localeCompare(String(b.conditionSince || '9999')))
  )

  /** How long the longest repair has waited, in days. */
  const longestRepair = computed(() =>
    needsRepair.value[0]?.conditionSince ? Math.max(0, daysBetween(needsRepair.value[0].conditionSince, today)) : 0
  )

  const unphotographed = computed(() => items.value.filter((item) => !item.photo))

  /** The places things are kept, each with what is there. */
  const places = computed(() => {
    const byPlace = new Map()
    for (const item of items.value) {
      const label = item.location.trim()
      const key = label.toLowerCase()
      if (!byPlace.has(key)) byPlace.set(key, { key, label: label || 'No place set', items: [] })
      byPlace.get(key).items.push(item)
    }
    return [...byPlace.values()].sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.label.localeCompare(b.label))
  })

  const counts = computed(() => ({
    items: items.value.length,
    pieces: items.value.reduce((sum, item) => sum + item.quantity, 0),
    out: borrowedItems.value.length,
    here: items.value.filter((item) => available(item) > 0).length,
    places: places.value.filter((place) => place.key).length,
    value: items.value.reduce((sum, item) => sum + item.value * item.quantity, 0),
  }))

  return {
    items,
    loading,
    canEdit,
    loans,
    overdue,
    dueSoon,
    borrowedItems,
    mine,
    needsRepair,
    longestRepair,
    unphotographed,
    places,
    counts,
    today,
  }
}

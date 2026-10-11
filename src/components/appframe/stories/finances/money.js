import { onUnmounted, ref } from 'vue'
import { prefersStill } from '../../../frontdoor/useSceneTimeline'

// The figures Finances' story shows, and how it writes them. Made up, as every
// story's are: the story plays for anyone who holds the tile, so it never
// shows the church's own books, whatever the person holding it may see.
//
// They agree with each other on purpose. October's in and out on the balance
// card are the statement's totals, the book's last balance is the balance
// card's, and the months add up to what the months screen says they do, so a
// treasurer watching closely finds a book that balances.

export const TODAY = { cash: 32400, bank: 151850 }
export const TOTAL = TODAY.cash + TODAY.bank
export const OCTOBER = { income: 58300, expenses: 21940 }

/** Whole pesos, the way the app's cards and tiles show them. */
export const peso = (n) => `${n < 0 ? '−' : ''}₱${Math.abs(Math.round(n)).toLocaleString('en-PH')}`

/** Pesos and centavos without the sign, the way the book and statement show them. */
export const amount = (n) =>
  Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * A figure that climbs to `to` when started, easing in as it lands, the way a
 * total adds itself up. With reduced motion it is simply `to` from the start.
 */
export function useClimb(to, from = 0) {
  const still = prefersStill()
  const value = ref(still ? to : from)
  let frame = 0

  const start = (duration) => {
    if (still) return
    const begun = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - begun) / duration)
      value.value = from + (to - from) * (1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }

  onUnmounted(() => cancelAnimationFrame(frame))
  return { value, start }
}

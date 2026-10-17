import { lookFrom, seeded } from './people'

// Where the congregation sits in the front door's church (ChurchInside), and
// who sits where. One-point perspective, vanishing at (800, 380): every line
// that runs away from the reader heads there, and everything on the floor is
// drawn at the size its distance gives it — `s`, 1 at y 600 and growing
// toward the reader.

export const VANISH_Y = 380
const sizeAt = (y) => (y - VANISH_Y) / 220
const aisleAt = (s) => 34 * s

// Seven rows, evenly spaced in depth rather than on the page, so they close up
// toward the stage the way pews do. Six seats a side.
const ROW_DEPTHS = [1, 0.86, 0.74, 0.64, 0.55, 0.47, 0.41]
const SEATS = 6
const SEAT = 46

export const ROWS = ROW_DEPTHS.map((depth, r) => {
  const y = VANISH_Y + 250 / depth
  const s = sizeAt(y)
  const inner = aisleAt(s) + 6 * s
  const length = SEATS * SEAT * s
  return { r, y, s, inner, length }
})

// Who sits where, and in what order they arrive. A few seats stay empty, as
// they do; the rest fill in a shuffled order, so the room fills all over
// rather than row by row.
export const PEOPLE = (() => {
  const random = seeded(11)
  const seats = []
  for (const row of ROWS) {
    for (const side of [-1, 1]) {
      for (let j = 0; j < SEATS; j++) {
        seats.push({
          key: `${row.r}-${side}-${j}`,
          row: row.r,
          x: 800 + side * (row.inner + (j + 0.5) * SEAT * row.s),
          y: row.y,
          s: row.s * (random() < 0.12 ? 0.78 : 0.96),
          look: lookFrom(random),
          // Broader or narrower in the shoulders, so a row is not of copies.
          build: 0.9 + random() * 0.24,
          order: random(),
          empty: random() < 0.1,
        })
      }
    }
  }
  const filled = seats.filter((seat) => !seat.empty)
  filled.sort((a, b) => a.order - b.order).forEach((seat, rank) => (seat.rank = rank))
  // Some raise their hands in worship, one or both, each in their own time.
  // Drawn from a seed of their own, so who sits where, and how they look,
  // stays as it was.
  const praising = seeded(31)
  for (const seat of filled) {
    const r = praising()
    seat.hands = r < 0.14 ? 2 : r < 0.32 ? 1 : 0
    seat.handSide = praising() < 0.5 ? -1 : 1
    seat.praiseAt = praising() * 0.45
  }
  return filled
})()

export const SEATED = PEOPLE.length

// The first-timer, who gets a tag as they sit down.
export const VISITOR = PEOPLE.find((person) => person.row === 3 && person.x < 800) || PEOPLE[0]

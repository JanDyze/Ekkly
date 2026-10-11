// What Events' story puts on the calendar, and whose birthday falls in it.
// Made up, as People's roll is: a story is shown to anyone who holds the app,
// so it never shows the church's own calendar.
//
// The month is October 2026, seen from Sunday the 11th: the 1st falls on a
// Thursday, so the grid is five weeks exactly.

export const CAST = [
  { id: 'joy', first: 'Joy', last: 'Bautista', tone: 'orange' },
  { id: 'nestor', first: 'Nestor', last: 'Ilagan', tone: 'sky' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

// The kinds of gathering, in the colours the church's calendar gives them by
// default (utils/eventColors.js).
export const KINDS = {
  worship: { label: 'Worship', dot: 'bg-blue-500', chip: 'bg-blue-500 text-white' },
  prayer: { label: 'Prayer', dot: 'bg-purple-500', chip: 'bg-purple-500 text-white' },
  fellowship: { label: 'Fellowship', dot: 'bg-teal-500', chip: 'bg-teal-500 text-white' },
  outreach: { label: 'Outreach', dot: 'bg-orange-500', chip: 'bg-orange-500 text-white' },
  special: { label: 'Special', dot: 'bg-amber-500', chip: 'bg-amber-500 text-white' },
}

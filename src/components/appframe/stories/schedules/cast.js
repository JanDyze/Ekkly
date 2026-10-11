// The people Schedules' story puts on its Sundays. Made up, as People's are:
// a story is shown to anyone who holds the app, so it never shows who really
// serves. Mica is the one watching: the song leader whose turns these are.

export const CAST = [
  { id: 'mica', first: 'Mica', last: 'Santos', tone: 'rose' },
  { id: 'joel', first: 'Joel', last: 'Ramirez', tone: 'violet' },
  { id: 'paolo', first: 'Paolo', last: 'Cruz', tone: 'sky' },
  { id: 'lea', first: 'Lea', last: 'Navarro', tone: 'emerald' },
  { id: 'rey', first: 'Rey', last: 'Domingo', tone: 'amber' },
  { id: 'grace', first: 'Grace', last: 'Tan', tone: 'teal' },
  { id: 'nonoy', first: 'Nonoy', last: 'Sison', tone: 'orange' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

// The people the Minutes story names. Made up, as every story's are: a story
// is shown to anyone who holds the app, so it never shows a church's own
// meetings, whatever the person holding it may see.

export const CAST = [
  { id: 'ben', first: 'Ben', last: 'Santos', tone: 'sky' },
  { id: 'bea', first: 'Bea', last: 'Ramos', tone: 'rose' },
  { id: 'carla', first: 'Carla', last: 'Mendoza', tone: 'emerald' },
  { id: 'mark', first: 'Mark', last: 'Villanueva', tone: 'violet' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

// The meeting every scene is about.
export const MEETING = { title: 'Church council', date: 'Oct 4, 2026' }

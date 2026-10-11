// The people People's story is about. Made up, as the front door's scenes
// are: a story is shown to anyone who holds the app, so it never shows the
// church's own roll, whatever the person holding it may see.

export const CAST = [
  { id: 'ana', first: 'Ana', last: 'Reyes', tone: 'amber', ministry: 'Worship', member: true },
  { id: 'ben', first: 'Ben', last: 'Santos', tone: 'sky', ministry: 'Ushers', member: true },
  { id: 'carla', first: 'Carla', last: 'Mendoza', tone: 'emerald', ministry: 'Kids', member: true },
  { id: 'daniel', first: 'Daniel', last: 'Cruz', tone: 'violet', ministry: 'Media', member: false },
  { id: 'ella', first: 'Ella', last: 'Garcia', tone: 'rose', ministry: 'Worship', member: true },
  { id: 'joy', first: 'Joy', last: 'Bautista', tone: 'orange', ministry: 'Welcome', member: true },
  { id: 'mark', first: 'Mark', last: 'Villanueva', tone: 'teal', ministry: 'Youth', member: false },
  { id: 'grace', first: 'Grace', last: 'Lim', tone: 'sky', ministry: 'Prayer', member: true },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

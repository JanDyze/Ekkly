// The people YUNIT's story talks about. Made up, as every story's are: a
// story is shown to anyone who holds the app, so YUNIT never answers it from
// the church's own records, whatever the person holding it may see.

export const CAST = [
  { id: 'joy', first: 'Joy', last: 'Bautista', tone: 'orange' },
  { id: 'ben', first: 'Ben', last: 'Santos', tone: 'sky' },
  { id: 'grace', first: 'Grace', last: 'Lim', tone: 'emerald' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

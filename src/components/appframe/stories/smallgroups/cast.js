// The people Small groups' story is about. Made up, as People's are: a story
// is shown to anyone who holds the app, so it never shows the church's own
// groups or who is in them.

export const CAST = [
  { id: 'ramon', first: 'Ramon', last: 'Dizon', tone: 'sky' },
  { id: 'liza', first: 'Liza', last: 'Aquino', tone: 'rose' },
  { id: 'paolo', first: 'Paolo', last: 'Navarro', tone: 'violet' },
  { id: 'nina', first: 'Nina', last: 'Flores', tone: 'emerald' },
  { id: 'tess', first: 'Tess', last: 'Ramos', tone: 'amber' },
  { id: 'jun', first: 'Jun', last: 'Castillo', tone: 'teal' },
  { id: 'marites', first: 'Marites', last: 'Gomez', tone: 'orange' },
  { id: 'bong', first: 'Bong', last: 'Salazar', tone: 'sky' },
  { id: 'ellen', first: 'Ellen', last: 'Torres', tone: 'violet' },
  { id: 'carlo', first: 'Carlo', last: 'Mercado', tone: 'emerald' },
  { id: 'joan', first: 'Joan', last: 'Villareal', tone: 'rose' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

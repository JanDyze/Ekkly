// The people Attendance's story counts. Made up, as People's are: a story is
// shown to anyone who holds the app, so it never shows who really came.

export const CAST = [
  { id: 'andres', first: 'Andres', last: 'Bautista', nickname: 'Andoy', tone: 'sky' },
  { id: 'rosario', first: 'Rosario', last: 'Lim', nickname: 'Charing', tone: 'rose' },
  { id: 'danilo', first: 'Danilo', last: 'Cruz', nickname: 'Danny', tone: 'amber' },
  { id: 'kristine', first: 'Kristine', last: 'Flores', nickname: 'Tin', tone: 'violet' },
  { id: 'miguel', first: 'Miguel', last: 'Reyes', nickname: '', tone: 'emerald' },
  { id: 'josefina', first: 'Josefina', last: 'Garcia', nickname: 'Pinang', tone: 'orange' },
  { id: 'rodel', first: 'Rodel', last: 'Manalo', nickname: '', tone: 'teal' },
  { id: 'angelica', first: 'Angelica', last: 'Yap', nickname: 'Gel', tone: 'rose' },
  { id: 'enrico', first: 'Enrico', last: 'Pascual', nickname: 'Ricky', tone: 'sky' },
  { id: 'lorna', first: 'Lorna', last: 'Dela Paz', nickname: '', tone: 'violet' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

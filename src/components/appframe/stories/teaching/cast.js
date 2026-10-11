// The people and classes Teaching's story is about. Made up, as the front
// door's scenes are: a story is shown to anyone who holds the app, so it never
// shows the church's own roll or its lessons.

export const CAST = [
  { id: 'ben', first: 'Ben', last: 'Santos', tone: 'sky' },
  { id: 'carla', first: 'Carla', last: 'Mendoza', tone: 'emerald' },
  { id: 'joy', first: 'Joy', last: 'Bautista', tone: 'orange' },
  { id: 'mark', first: 'Mark', last: 'Villanueva', tone: 'teal' },
  { id: 'grace', first: 'Grace', last: 'Lim', tone: 'rose' },
]

export const CLASSES = [
  { id: 'lambs', name: 'Little Lambs', ages: 'Ages 4 to 6', teacher: 'carla' },
  { id: 'explorers', name: 'Explorers', ages: 'Ages 7 to 11', teacher: 'joy' },
  { id: 'youth', name: 'Youth', ages: 'Ages 12 to 17', teacher: 'mark' },
]

// Scripture as the story quotes it: the King James Version, in the public
// domain, word for word.
export const MEMORY_VERSE = {
  reference: 'Luke 19:10',
  text: 'For the Son of man is come to seek and to save that which was lost.',
}

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

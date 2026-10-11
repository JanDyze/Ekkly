import choir from '../../../../assets/mock-photos/choir.svg'
import sundayService from '../../../../assets/mock-photos/sunday-service.svg'
import youthCamp from '../../../../assets/mock-photos/youth-camp.svg'
import baptism from '../../../../assets/mock-photos/baptism.svg'
import fellowship from '../../../../assets/mock-photos/fellowship-meal.svg'

// The song leaders and the songbook Songs' story is about. Made up, as
// People's roll is: a story is shown to anyone who holds the app, so it never
// shows the church's own list. The pictures stand in for each recording's
// thumbnail. The only words quoted are from hymns long out of copyright.

export const CAST = [
  { id: 'mica', first: 'Mica', last: 'Santos', tone: 'rose' },
  { id: 'jerome', first: 'Jerome', last: 'Aquino', tone: 'sky' },
  { id: 'bea', first: 'Bea', last: 'Lopez', tone: 'amber' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

export const SONGS = [
  { id: 'waymaker', title: 'Way Maker', category: 'Worship', thumb: choir, lyrics: true, keys: 'Mica Santos: E, Jerome Aquino: C' },
  { id: 'goodness', title: 'Goodness of God', category: 'Worship', thumb: sundayService, lyrics: true, keys: 'Mica Santos: A, Bea Lopez: G' },
  { id: 'ikaw', title: 'Ikaw Lamang', category: 'Worship', thumb: youthCamp, lyrics: false, keys: 'Jerome Aquino: D' },
  { id: 'itiswell', title: 'It Is Well With My Soul', category: 'Hymnal', thumb: baptism, lyrics: true, keys: 'Bea Lopez: C' },
  { id: 'grace', title: 'Amazing Grace', category: 'Hymnal', thumb: fellowship, lyrics: true, keys: 'Mica Santos: G' },
  { id: 'hosanna', title: 'Hosanna', category: 'Praise', thumb: fellowship, lyrics: false, keys: 'Jerome Aquino: E' },
]

export const song = (id) => SONGS.find((s) => s.id === id)

// The category chips' colours, as the song list gives them (utils/categoryStyle.js).
export const CATEGORY = {
  Praise: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
  Worship: 'text-primary bg-primary/10 dark:text-primary-light',
  Hymnal: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10',
}

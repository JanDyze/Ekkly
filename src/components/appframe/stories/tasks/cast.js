// The people and tasks Tasks' story is about. Made up, as every story's are:
// a story is shown to anyone who holds the app, so it never shows the
// church's own list, whatever the person holding it may see.

export const CAST = [
  { id: 'ben', first: 'Ben', last: 'Santos', tone: 'sky' },
  { id: 'joy', first: 'Joy', last: 'Bautista', tone: 'orange' },
  { id: 'carla', first: 'Carla', last: 'Mendoza', tone: 'emerald' },
  { id: 'jonathan', first: 'Jonathan', last: 'Ramos', tone: 'violet' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

// Each task as a row shows it: who has it, when it is due as the list words
// it ("3 days late", "Today", "Friday"), how pressing that is, and where it
// is filed.
export const TASKS = {
  bulletins: { title: 'Print the bulletins', who: 'Ben Santos', due: 'Today', when: 'today', ministry: 'Media' },
  lola: { title: 'Call Lola Rosa after her surgery', who: 'Joy Bautista', due: 'Today', when: 'today', ministry: 'Care' },
  cable: { title: 'Fix the sound desk cable', who: 'Unassigned', due: '', when: '', ministry: 'Media' },
  chairs: { title: 'Set up chairs for youth night', who: 'Ben Santos', due: 'Friday', when: '', ministry: 'Ushers' },
  projector: { title: 'Return the projector to Kuya Jun', who: 'Ben Santos', due: 'Oct 20', when: '', ministry: 'Media' },
  water: { title: 'Pay the water bill', who: 'Joy Bautista', due: '3 days late', when: 'late', ministry: 'Admin', priority: 'urgent' },
  minutes: { title: 'Send the minutes to the board', who: 'Carla Mendoza', due: '1 day late', when: 'late', ministry: 'Admin' },
}

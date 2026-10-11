// The people and the requests the Prayer story shows. Made up, as every
// story's are, and written gently: a story is shown to anyone who holds the
// app, so it never shows a church's own concerns, which are pastoral records,
// whatever the person holding it may see.

export const CAST = [
  { id: 'nena', first: 'Nena', last: 'Cruz', tone: 'amber' },
  { id: 'nestor', first: 'Nestor', last: 'Garcia', tone: 'orange' },
  { id: 'daniel', first: 'Daniel', last: 'Cruz', tone: 'violet' },
  { id: 'ben', first: 'Ben', last: 'Santos', tone: 'sky' },
]

export const person = (id) => CAST.find((p) => p.id === id)
export const nameOf = (p) => `${p.first} ${p.last}`

// Each concern: what to pray for, who it is for (someone on the roll, or
// nobody for a family or a whole place), when it was raised as the list says
// it, and its status and priority as the app keeps them.
export const CONCERNS = {
  surgery: {
    id: 'surgery',
    title: 'Her eye surgery',
    asked: 'Her operation is on Tuesday.',
    who: 'nena',
    when: 'Today',
    status: 'active',
    priority: 'high',
  },
  travel: {
    id: 'travel',
    title: 'Safe trip to Iloilo',
    who: 'daniel',
    when: 'Sunday',
    status: 'active',
    priority: 'normal',
  },
  work: {
    id: 'work',
    title: 'His job interview',
    who: 'ben',
    when: 'Oct 2',
    status: 'active',
    priority: 'normal',
  },
  baby: {
    id: 'baby',
    title: 'Ella’s safe delivery',
    who: null,
    when: 'Sep 28',
    status: 'ongoing',
    priority: 'normal',
  },
  flood: {
    id: 'flood',
    title: 'Flood-hit families',
    who: null,
    when: 'Sep 12',
    status: 'ongoing',
    priority: 'normal',
  },
}

/** The row's quiet line, as PrayerConcernListItem writes it. */
export const lineOf = (concern, { showStatus = false } = {}) =>
  [
    concern.who ? `For ${nameOf(person(concern.who))}` : '',
    concern.status === 'answered' ? `Answered ${concern.when.toLowerCase()}` : concern.when,
    showStatus && concern.status === 'ongoing' ? 'Ongoing' : '',
  ]
    .filter(Boolean)
    .join(' · ')

// Made-up Today cards, for seeing the home of all apps with a full day on it
// while working on it locally: open the home with `?cards=10` under
// `npm run dev` (Apps.vue adds them only in a dev build, never in the app a
// church uses). Every kind the home draws is here once, as the home builds a
// real day, with made-up people only, so the phone's deck and the desktop's
// sections can be looked at without putting pretend records into a real
// church's data. Where a card has a photo, and for every face, it is a
// real-looking one from assets/mock-photos/home
// (scripts/fetch-home-mock-photos.mjs: Pixabay for the gatherings,
// randomuser.me for the faces), and the week beside Today gets a few made-up
// events of its own (sampleWeekEvents).

import sundayService from '../assets/mock-photos/home/sunday-service.webp'
import youthCamp from '../assets/mock-photos/home/youth-night.webp'
import bibleStudy from '../assets/mock-photos/home/bible-study.webp'
import choir from '../assets/mock-photos/home/choir.webp'
import fellowshipMeal from '../assets/mock-photos/home/prayer-meeting.webp'
import outreach from '../assets/mock-photos/home/outreach.webp'
import leadersMeeting from '../assets/mock-photos/home/leaders-meeting.webp'
import faceAna from '../assets/mock-photos/home/face-ana.webp'
import faceBen from '../assets/mock-photos/home/face-ben.webp'
import faceMaria from '../assets/mock-photos/home/face-maria.webp'
import faceJoy from '../assets/mock-photos/home/face-joy.webp'
import facePaolo from '../assets/mock-photos/home/face-paolo.webp'
import faceCarla from '../assets/mock-photos/home/face-carla.webp'
import faceDavid from '../assets/mock-photos/home/face-david.webp'

// `image` is a member's photo, which every face on the home draws (MemberAvatar).
const person = (firstName, lastName, image) => ({ id: `sample-${firstName}-${lastName}`.toLowerCase(), firstName, lastName, image })

const ANA = person('Ana', 'Reyes', faceAna)
const BEN = person('Ben', 'Cruz', faceBen)
const MARIA = person('Maria', 'Santos', faceMaria)
const JOY = person('Joy', 'Lim', faceJoy)
const PAOLO = person('Paolo', 'Garcia', facePaolo)
const CARLA = person('Carla', 'Mendoza', faceCarla)
const DAVID = person('David', 'Tan', faceDavid)
const PEOPLE = [ANA, BEN, MARIA, JOY, PAOLO, CARLA, DAVID]

const TASKS = [
  'Print the bulletins',
  'Book the hall for youth night',
  'Order communion cups',
  'Send the prayer list',
  'Call the sound tech',
  'Pay the electric bill',
  'Fix the projector cable',
  'Plan the outreach route',
]
const GATHERINGS = ['Sunday Service', 'Prayer meeting', 'Bible study', 'Youth night']

const dayOf = (offset) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date
}
const tile = (offset) => {
  const date = dayOf(offset)
  return { month: date.toLocaleDateString(undefined, { month: 'short' }), day: date.getDate() }
}
const weekday = (offset) => dayOf(offset).toLocaleDateString(undefined, { weekday: 'long' })
const keyOfDay = (offset) => {
  const date = dayOf(offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const namesOf = (people) =>
  people.length <= 2
    ? people.map((p) => p.firstName).join(' and ')
    : `${people.slice(0, 2).map((p) => p.firstName).join(', ')} and ${people.length - 2} more`

/**
 * A made-up day, built the way the home builds a real one (Apps.vue): each
 * issue once — the accounts waiting are one card however many there are, the
 * gatherings not counted one card, the overdue tasks one card — with the
 * records it covers inside it. `count` is how busy a day to make: the same
 * cards with more in them (at 20, twice the accounts, tasks and gatherings of
 * 10). It used to make `count` cards by going round its kinds again, which drew
 * every one of them twice and read as the home repeating itself.
 *
 * `wide` is whether the home is laid out for a desktop, where birthdays are one
 * card naming everyone rather than a card each, and coming events are left to
 * the week beside Today. `icons` are the home's own, by name.
 */
export function sampleTodayCards(count, { wide, icons }) {
  const k = Math.max(1, Math.ceil(count / 10))

  const claimed = PEOPLE.slice(0, Math.min(2 * k, PEOPLE.length))
  const late = TASKS.slice(0, Math.min(3 * k, 5)).map((title, i) => ({ id: `sample-late-${i}`, title }))
  const due = TASKS.slice(5, 5 + Math.min(2 * k, 3)).map((title, i) => ({ id: `sample-due-${i}`, title }))
  const owed = Array.from({ length: 2 * k + 1 }, (_, i) => {
    const offset = -(1 + i * 3)
    return { key: `sample-owed-${i}`, date: tile(offset), title: GATHERINGS[i % GATHERINGS.length] }
  })
  const birthdays = [MARIA, JOY, PAOLO]
  const visitors = k > 1 ? [CARLA, DAVID] : [CARLA]

  const list = [
    {
      kind: 'plain',
      key: 'sample:claims',
      tone: 'warn',
      icon: icons.KeyRound,
      kicker: 'Waiting on you',
      art: 'today-claims',
      title: `${plural(claimed.length, 'account', 'accounts')} to link`,
      detail: 'Someone signed in and says a record on the roll is theirs.',
      to: '/accounts',
      dest: 'accounts',
      destLabel: 'Accounts',
      faces: { members: claimed, empty: 0, caption: `For ${namesOf(claimed)}` },
      severity: 'pending',
      action: 'Review',
      records: claimed.map((p) => ({ key: p.id, label: `${p.firstName} ${p.lastName}`, to: '/accounts' })),
    },
    wide
      ? {
          kind: 'birthdays',
          key: 'sample:birthdays',
          tone: 'celebrate',
          icon: icons.Cake,
          kicker: 'Birthday today',
          title: `${birthdays.length} birthdays today`,
          detail: namesOf(birthdays),
          to: '/members',
          dest: 'members',
          destLabel: 'Birthdays, in People',
          members: birthdays,
          faces: { members: birthdays, empty: 0, caption: namesOf(birthdays) },
          records: birthdays.map((p) => ({ key: p.id, label: `${p.firstName} ${p.lastName}`, to: '/members' })),
        }
      : {
          kind: 'birthday',
          key: 'sample:birthday',
          tone: 'celebrate',
          kicker: 'Birthday today',
          detail: 'Maria Santos',
          to: '/members',
          dest: 'members',
          destLabel: 'their record in People',
          member: MARIA,
          name: 'Maria',
          turning: 40,
        },
    {
      kind: 'dated',
      key: 'sample:serving',
      tone: 'plain',
      icon: icons.MicrophoneStage,
      kicker: 'You are serving',
      title: `You're on ${weekday(5)}`,
      detail: 'Keys · Vocals',
      photo: sundayService,
      to: '/schedules',
      dest: 'lineups',
      destLabel: 'that Sunday in Schedules',
      date: tile(5),
      faces: { members: [JOY, DAVID, CARLA], empty: 0, caption: 'With Joy, David and 1 other' },
    },
    {
      kind: 'tasks',
      key: 'sample:late',
      tone: 'warn',
      icon: icons.ListChecks,
      kicker: 'Overdue',
      art: 'today-overdue',
      title: `${plural(late.length, 'task', 'tasks')} of yours overdue`,
      to: { name: 'TasksMine' },
      dest: 'tasks',
      destLabel: 'Tasks',
      tasks: late,
      severity: 'urgent',
      action: 'Open tasks',
      records: late.map((task) => ({ key: task.id, label: task.title, to: { name: 'TasksMine', query: { q: task.title } } })),
    },
    {
      kind: 'plain',
      key: 'sample:owed',
      tone: 'warn',
      icon: icons.ClipboardCheck,
      kicker: 'Still to count',
      art: 'today-count',
      title: `${plural(owed.length, 'gathering', 'gatherings')} with no attendance`,
      detail: 'They stay on the list until someone records or dismisses them.',
      to: { name: 'AttendanceOwed' },
      dest: 'attendance',
      destLabel: 'To record, in Attendance',
      chips: owed.map((row) => ({ key: row.key, label: `${row.date.month} ${row.date.day}` })),
      severity: 'pending',
      action: 'Record',
      // Made-up gatherings have no occurrence to open, so each goes to the list.
      records: owed.map((row) => ({ key: row.key, label: `${row.date.month} ${row.date.day} · ${row.title}`, to: { name: 'AttendanceOwed' } })),
    },
    // Coming events are a card each on a phone; on a desktop the week shows them.
    ...(wide
      ? []
      : [
          {
            kind: 'dated',
            key: 'sample:youth-night',
            tone: 'plain',
            icon: icons.CalendarDots,
            kicker: 'Coming up',
            title: 'Youth night',
            detail: `${weekday(3)} · 7:00 PM`,
            photo: youthCamp,
            to: '/events',
            dest: 'events',
            destLabel: 'the day in Events',
            date: tile(3),
          },
        ]),
    {
      kind: 'plain',
      key: 'sample:visitors',
      tone: 'plain',
      icon: icons.UserPlus,
      kicker: 'New this week',
      title: visitors.length === 1 ? `${visitors[0].firstName} came for the first time` : `${visitors.length} first-time visitors`,
      detail: visitors.length === 1 ? 'Added to the roll on Sunday' : namesOf(visitors),
      to: '/members',
      dest: 'members',
      destLabel: 'People',
      faces: { members: visitors, empty: 0, caption: namesOf(visitors) },
    },
    {
      kind: 'tasks',
      key: 'sample:due',
      tone: 'plain',
      icon: icons.ListChecks,
      kicker: 'Due today',
      art: 'today-due',
      title: `${plural(due.length, 'task', 'tasks')} of yours due today`,
      to: { name: 'TasksMine' },
      dest: 'tasks',
      destLabel: 'Tasks',
      tasks: due,
    },
    {
      kind: 'plain',
      key: 'sample:songs',
      tone: 'warn',
      icon: icons.MicrophoneStage,
      kicker: 'Waiting on you',
      art: 'today-songs',
      title: 'Sunday’s songs are not chosen yet',
      detail: 'The worship team practises on Thursday.',
      to: '/schedules',
      dest: 'lineups',
      destLabel: 'Schedules',
      severity: 'pending',
      action: 'Choose songs',
    },
  ]

  return list.map((card) => ({ ...card, dismissible: true }))
}

/** Made-up events for the coming week, with photos, for the week view. */
export const sampleWeekEvents = () => [
  { id: 'sample-e1', title: 'Prayer meeting', date: keyOfDay(0), time: '19:00', photo: fellowshipMeal },
  { id: 'sample-e2', title: 'Bible study', date: keyOfDay(2), time: '18:30', photo: bibleStudy },
  { id: 'sample-e3', title: 'Choir practice', date: keyOfDay(4), time: '17:00', photo: choir },
  { id: 'sample-e4', title: 'Community outreach', date: keyOfDay(5), time: '09:00', photo: outreach },
  { id: 'sample-e5', title: 'Sunday worship service', date: keyOfDay(5), time: '10:00', photo: sundayService },
  { id: 'sample-e6', title: 'Youth fellowship and games night', date: keyOfDay(5), time: '16:00', photo: youthCamp },
  { id: 'sample-e7', title: 'Leaders’ meeting', date: keyOfDay(5), time: '18:00', photo: leadersMeeting },
]

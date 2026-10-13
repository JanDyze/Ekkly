// Made-up Today cards, for seeing the home of all apps with a full day on it
// while working on it locally: open the home with `?cards=10` under
// `npm run dev` (Apps.vue adds them only in a dev build, never in the app a
// church uses). Every kind the home draws is here at least once, with made-up
// people only, so the deck, the desktop list and its two columns can all be
// looked at without putting pretend records into a real church's data. Where a
// card has a photo, and for every face, it is a real-looking one from
// assets/mock-photos/home (scripts/fetch-home-mock-photos.mjs: Pixabay for the
// gatherings, randomuser.me for the faces), and the week beside Today gets a
// few made-up events of its own (sampleWeekEvents).

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

/**
 * `count` cards, the kinds in turn and round again. `wide` is whether the home
 * is laid out for a desktop, where birthdays are one card naming everyone
 * rather than a card each. `icons` are the home's own, by name.
 */
export function sampleTodayCards(count, { wide, icons }) {
  const kinds = [
    () => ({
      kind: 'plain',
      tone: 'warn',
      icon: icons.KeyRound,
      kicker: 'Waiting on you',
      art: 'today-claims',
      title: '2 accounts to link',
      detail: 'Someone signed in and says a record on the roll is theirs.',
      to: '/accounts',
      dest: 'accounts',
      destLabel: 'Accounts',
      faces: { members: [ANA, BEN], empty: 0, caption: 'For Ana and Ben' },
    }),
    () =>
      wide
        ? {
            kind: 'birthdays',
            tone: 'celebrate',
            icon: icons.Cake,
            kicker: 'Birthday today',
            title: '3 birthdays today',
            detail: 'Maria, Joy and Paolo',
            to: '/members',
            dest: 'members',
            destLabel: 'Birthdays, in People',
            members: [MARIA, JOY, PAOLO],
            faces: { members: [MARIA, JOY, PAOLO], empty: 0, caption: 'Maria, Joy and Paolo' },
          }
        : {
            kind: 'birthday',
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
    () => ({
      kind: 'dated',
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
    }),
    () => ({
      kind: 'tasks',
      tone: 'warn',
      icon: icons.ListChecks,
      kicker: 'Overdue',
      art: 'today-overdue',
      title: '3 tasks of yours overdue',
      to: '/tasks',
      dest: 'tasks',
      destLabel: 'Tasks',
      tasks: [
        { id: 'sample-t1', title: 'Print the bulletins' },
        { id: 'sample-t2', title: 'Book the hall for youth night' },
        { id: 'sample-t3', title: 'Order communion cups' },
      ],
    }),
    () => ({
      kind: 'plain',
      tone: 'warn',
      icon: icons.ClipboardCheck,
      kicker: 'Still to count',
      art: 'today-count',
      title: '2 gatherings with no attendance',
      detail: 'They stay on the list until someone records or dismisses them.',
      to: '/attendance',
      dest: 'attendance',
      destLabel: 'To record, in Attendance',
      chips: [
        { key: 'sample-c1', label: tile(-8).month + ' ' + tile(-8).day },
        { key: 'sample-c2', label: tile(-1).month + ' ' + tile(-1).day },
      ],
    }),
    () => ({
      kind: 'dated',
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
    }),
    () => ({
      kind: 'plain',
      tone: 'plain',
      icon: icons.KeyRound,
      kicker: 'New this week',
      title: 'Carla came for the first time',
      detail: 'Added to the roll on Sunday',
      to: '/members',
      dest: 'members',
      destLabel: 'People',
      faces: { members: [CARLA], empty: 0, caption: 'Carla Mendoza' },
    }),
    () => ({
      kind: 'dated',
      tone: 'plain',
      icon: icons.CalendarDots,
      kicker: 'Coming up',
      title: "Leaders' meeting",
      detail: `${weekday(2)} · 6:30 PM`,
      to: '/events',
      dest: 'events',
      destLabel: 'the day in Events',
      date: tile(2),
    }),
    () => ({
      kind: 'tasks',
      tone: 'plain',
      icon: icons.ListChecks,
      kicker: 'Due today',
      art: 'today-due',
      title: '2 tasks of yours due today',
      to: '/tasks',
      dest: 'tasks',
      destLabel: 'Tasks',
      tasks: [
        { id: 'sample-t4', title: 'Send the prayer list' },
        { id: 'sample-t5', title: 'Call the sound tech' },
      ],
    }),
    () => ({
      kind: 'plain',
      tone: 'warn',
      icon: icons.MicrophoneStage,
      kicker: 'Waiting on you',
      art: 'today-songs',
      title: "Sunday's songs are not chosen yet",
      detail: 'The worship team practises on Thursday',
      to: '/schedules',
      dest: 'lineups',
      destLabel: 'Schedules',
    }),
  ]

  return Array.from({ length: count }, (_, i) => ({
    ...kinds[i % kinds.length](),
    key: `sample:${i}`,
    dismissible: true,
  }))
}

const keyOfDay = (offset) => {
  const date = dayOf(offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

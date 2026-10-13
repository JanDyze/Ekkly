// Made-up Today cards, for seeing the home of all apps with a full day on it
// while working on it locally: open the home with `?cards=10` under
// `npm run dev` (Apps.vue adds them only in a dev build, never in the app a
// church uses). Every kind the home draws is here at least once, with made-up
// people only, so the deck, the desktop list and its two columns can all be
// looked at without putting pretend records into a real church's data.

const person = (firstName, lastName) => ({ id: `sample-${firstName}-${lastName}`.toLowerCase(), firstName, lastName })

const ANA = person('Ana', 'Reyes')
const BEN = person('Ben', 'Cruz')
const MARIA = person('Maria', 'Santos')
const JOY = person('Joy', 'Lim')
const PAOLO = person('Paolo', 'Garcia')
const CARLA = person('Carla', 'Mendoza')
const DAVID = person('David', 'Tan')

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

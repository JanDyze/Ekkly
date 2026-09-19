import {
  Alarm,
  BellRinging,
  BookmarkSimple,
  CalendarX,
  Cake,
  ChatCircleText,
  ChatsCircle,
  CheckCircle,
  CheckSquare,
  ClipboardText,
  Coins,
  Copy,
  DeviceMobileCamera,
  Export,
  Files,
  Globe,
  HandTap,
  HandsPraying,
  IdentificationBadge,
  Images,
  Keyboard,
  LinkSimple,
  ListHeart,
  MagnifyingGlass,
  MusicNotes,
  NotePencil,
  Phone,
  Printer,
  ProjectorScreen,
  Repeat,
  Scroll,
  ShareNetwork,
  Slideshow,
  TrendUp,
  UserFocus,
  UsersFour,
  UsersThree,
} from '../../icons'

// What a church gets from an app, for "What's inside" once a visitor opens it.
//
// Kept to what someone will actually read on a landing page: one line saying
// what changes for the church, and three practical wins, each a few words with
// an icon. Anything longer went unread. Every win is something the app does
// today, so a church that asks for it finds what it was promised.

export const APP_DETAILS = {
  members: {
    headline: 'Everyone’s details, one tap away',
    wins: [
      { icon: Phone, text: 'Find anyone’s number in seconds' },
      { icon: UsersThree, text: 'See who serves where' },
      { icon: Cake, text: 'Never miss a birthday' },
    ],
  },
  smallgroups: {
    headline: 'Leaders stay on top of their group',
    wins: [
      { icon: UsersFour, text: 'Know who is in each group' },
      { icon: NotePencil, text: 'Log a session from a phone' },
      { icon: Printer, text: 'Print a form for paper-first leaders' },
    ],
  },
  attendance: {
    headline: 'Know whether your church is growing',
    wins: [
      { icon: HandTap, text: 'Count a service in a few taps' },
      { icon: TrendUp, text: 'See the trend week to week' },
      { icon: ClipboardText, text: 'No more tally sheets' },
    ],
  },
  events: {
    headline: 'Everyone knows what’s on',
    wins: [
      { icon: Repeat, text: 'Set up Sunday service once' },
      { icon: CalendarX, text: 'Call off one date in a tap' },
      { icon: BellRinging, text: 'The right people get notified' },
    ],
  },
  songs: {
    headline: 'Plan worship from songs you know',
    wins: [
      { icon: MagnifyingGlass, text: 'Find a song by any line' },
      { icon: MusicNotes, text: 'Key and lyrics always at hand' },
      { icon: Files, text: 'No more lost song sheets' },
    ],
  },
  lineups: {
    headline: 'Sunday without the scramble',
    wins: [
      { icon: IdentificationBadge, text: 'Everyone knows their role' },
      { icon: ProjectorScreen, text: 'Songs go straight to the screen' },
      { icon: ChatsCircle, text: 'No more rosters in group chats' },
    ],
  },
  bible: {
    headline: 'Tagalog and English, always open',
    wins: [
      { icon: MagnifyingGlass, text: 'Find a verse by a word you remember' },
      { icon: BookmarkSimple, text: 'Pick up where you left off' },
      { icon: ProjectorScreen, text: 'Show a passage on the screen' },
    ],
  },
  minutes: {
    headline: 'Minutes done before you get home',
    wins: [
      { icon: Keyboard, text: 'Just type notes in the meeting' },
      { icon: NotePencil, text: 'Written up for you by EKRIS' },
      { icon: Printer, text: 'Print or export to file' },
    ],
  },
  prayer: {
    headline: 'No prayer request forgotten',
    wins: [
      { icon: ListHeart, text: 'Every request in one list' },
      { icon: CheckCircle, text: 'Mark prayers answered' },
      { icon: HandsPraying, text: 'Celebrate answers together' },
    ],
  },
  gallery: {
    headline: 'Every service’s photos in one place',
    wins: [
      { icon: Images, text: 'An album for each gathering' },
      { icon: DeviceMobileCamera, text: 'Upload straight from a phone' },
      { icon: Globe, text: 'Show the best on your public page' },
    ],
  },
  links: {
    headline: 'Stop re-sending the same links',
    wins: [
      { icon: LinkSimple, text: 'Forms, giving and livestream together' },
      { icon: Copy, text: 'Copy a link in one tap' },
      { icon: ShareNetwork, text: 'One place your people can always find' },
    ],
  },
  finances: {
    headline: 'The treasurer’s report, done',
    wins: [
      { icon: Coins, text: 'Know what’s in hand on any day' },
      { icon: Scroll, text: 'A monthly statement made for you' },
      { icon: Export, text: 'Export it for the council' },
    ],
  },
  tasks: {
    headline: 'Nothing from the meeting slips',
    wins: [
      { icon: UserFocus, text: 'Give each job to a person' },
      { icon: Alarm, text: 'See what’s overdue' },
      { icon: CheckSquare, text: 'Tick it off when it’s done' },
    ],
  },
  ai: {
    headline: 'Hours of typing, done for you',
    wins: [
      { icon: NotePencil, text: 'Minutes from rough notes' },
      { icon: Slideshow, text: 'Lyrics laid out for slides' },
      { icon: ChatCircleText, text: 'Ask about your church in plain words' },
    ],
  },
}

/** What one app gives a church, falling back to its own one-line description. */
export const appDetail = (app) => APP_DETAILS[app.key] || { headline: app.description, wins: [] }

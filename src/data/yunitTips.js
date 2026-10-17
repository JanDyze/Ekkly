import { CalendarBlank, CheckSquare, ClipboardText, MusicNotes, User } from '../icons'
import { YUNIT_LINES } from './yunitVoice'

// Things YUNIT can be asked, for someone who does not know where to start.
// Each is a real question he answers from the records (lib/yunit.js).
//
// `label` is short enough for two across on a phone; pressing it asks him
// `ask`. `line` is how he puts it himself, in his speech bubble on the home,
// where he offers one at a time, and aloud when he pipes up there (the words
// are kept in data/yunitVoice.js, so the bubble and the voice never
// disagree). He answers as the person asking, so each is
// offered only to whoever can see that part of the church (`area`, as in
// lib/capabilities.js): a question he would only refuse is no way to start.
//
// None of it is pastoral (BRAND.md, "What Ekkly is for"): he finds and keeps
// records, and says so.
export const YUNIT_TIPS = [
  {
    key: 'sunday',
    area: 'events',
    icon: CalendarBlank,
    label: 'This Sunday',
    ask: 'What’s on this Sunday?',
    line: YUNIT_LINES.sunday,
  },
  {
    key: 'birthdays',
    area: 'members',
    icon: User,
    label: 'Birthdays this week',
    ask: 'Who has a birthday this week?',
    line: YUNIT_LINES.birthdays,
  },
  {
    key: 'overdue',
    area: 'tasks',
    icon: CheckSquare,
    label: 'Overdue tasks',
    ask: 'What tasks are overdue?',
    line: YUNIT_LINES.overdue,
  },
  {
    key: 'attendance',
    area: 'attendance',
    icon: ClipboardText,
    label: 'Last month’s attendance',
    ask: 'How was attendance last month?',
    line: YUNIT_LINES.attendance,
  },
  {
    key: 'song',
    area: 'songs',
    icon: MusicNotes,
    label: 'Find a song',
    ask: 'Help me find a song.',
    line: YUNIT_LINES.song,
  },
]

/** The tips this person may be offered, given `canView(area)`. */
export const tipsFor = (canView) => YUNIT_TIPS.filter((tip) => !tip.area || canView(tip.area))

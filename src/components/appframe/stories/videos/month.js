import { CalendarDots, Church, FlagBanner, HandWaving, MicrophoneStage, UsersRound } from '../../../../icons'
import youthCamp from '../../../../assets/mock-photos/youth-camp.svg'
import sundayService from '../../../../assets/mock-photos/sunday-service.svg'
import smallGroup from '../../../../assets/mock-photos/small-group.svg'

// The month Videos' story announces: a made-up October, as every story's data
// is made up, since a story plays for anyone who holds the tile. The cards are
// the kinds the studio really makes from a calendar (utils/video/scenes.js):
// an opening, the events in date order, the Sundays, the small groups and a
// closing, each up for a few seconds. The photos are illustrations, standing
// in for the church's own.

export const CARDS = [
  { id: 'intro', icon: FlagBanner, title: 'October 2026', detail: 'Opening', seconds: 5 },
  {
    id: 'camp',
    icon: CalendarDots,
    eyebrow: 'Coming up',
    title: 'Youth Camp 2026',
    detail: 'Fri, Oct 24 · 6:00 PM · Tagaytay',
    when: 'Fri, Oct 24 · 6:00 PM',
    where: 'Tagaytay Retreat House',
    seconds: 8,
    photo: youthCamp,
  },
  {
    id: 'thanks',
    icon: Church,
    eyebrow: 'Special Sunday',
    title: 'Thanksgiving Sunday',
    detail: 'Sun, Oct 26 · 9:00 AM',
    when: 'Sun, Oct 26 · 9:00 AM',
    where: 'One service, then lunch together',
    seconds: 8,
    photo: sundayService,
  },
  {
    id: 'groups',
    icon: UsersRound,
    eyebrow: 'Small groups',
    title: 'Find a group this month',
    detail: 'Small groups · 5 rows',
    when: 'Five groups, every week',
    where: 'Ask at the welcome desk',
    seconds: 9,
    photo: smallGroup,
  },
  { id: 'sundays', icon: MicrophoneStage, title: 'Sundays in October', detail: 'Sundays · 4 rows', seconds: 10 },
  { id: 'outro', icon: HandWaving, title: 'See you on Sunday', detail: 'Closing', seconds: 6 },
]

export const card = (id) => CARDS.find((c) => c.id === id)

/** Seconds as the studio writes a length: 0:52. */
export const length = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export const TOTAL = CARDS.reduce((sum, c) => sum + c.seconds, 0)

import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  Heart,
  Image,
  Link2,
  ListChecks,
  ListMusic,
  Mic2,
  Sparkles,
  Users,
  UsersRound,
  Wallet,
} from '../../icons'
import membersArt from '../../assets/app-icons/members.svg'
import smallgroupsArt from '../../assets/app-icons/smallgroups.svg'
import attendanceArt from '../../assets/app-icons/attendance.svg'
import eventsArt from '../../assets/app-icons/events.svg'
import songsArt from '../../assets/app-icons/songs.svg'
import lineupsArt from '../../assets/app-icons/lineups.svg'
import bibleArt from '../../assets/app-icons/bible.svg'
import minutesArt from '../../assets/app-icons/minutes.svg'
import prayerArt from '../../assets/app-icons/prayer.svg'
import galleryArt from '../../assets/app-icons/gallery.svg'
import linksArt from '../../assets/app-icons/links.svg'
import financesArt from '../../assets/app-icons/finances.svg'
import tasksArt from '../../assets/app-icons/tasks.svg'
import aiArt from '../../assets/app-icons/ai.svg'

// The icon each app wears on the front door: the same one its page wears in
// the app's own navigation (src/data/navigation.js), so the two agree.
const ICONS = {
  members: Users,
  smallgroups: UsersRound,
  attendance: ClipboardCheck,
  events: Calendar,
  songs: ListMusic,
  lineups: Mic2,
  bible: BookOpen,
  minutes: FileText,
  prayer: Heart,
  gallery: Image,
  links: Link2,
  finances: Wallet,
  tasks: ListChecks,
  ai: Sparkles,
}

export const appIcon = (key) => ICONS[key] || Sparkles

// The app's picture on the front door: Ekkly's own glossy artwork in the mark's
// orange and blue (made by brand/ekkly/make-app-icons.mjs), where a line icon
// would be too plain to sell it. Imported, so Vite fingerprints each file. It
// keeps Ekkly's colours rather than the accent: these are the platform's
// pictures of its apps, not a church's page.
const ART = {
  members: membersArt,
  smallgroups: smallgroupsArt,
  attendance: attendanceArt,
  events: eventsArt,
  songs: songsArt,
  lineups: lineupsArt,
  bible: bibleArt,
  minutes: minutesArt,
  prayer: prayerArt,
  gallery: galleryArt,
  links: linksArt,
  finances: financesArt,
  tasks: tasksArt,
  ai: aiArt,
}

export const appArt = (key) => ART[key] || aiArt

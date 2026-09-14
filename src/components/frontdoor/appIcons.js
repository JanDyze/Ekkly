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

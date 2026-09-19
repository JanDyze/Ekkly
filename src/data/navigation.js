import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  Heart,
  Home,
  Image,
  Link2,
  ListChecks,
  ListMusic,
  Mic2,
  NotebookPen,
  ProjectorScreen,
  Settings,
  UserCog,
  History,
  Users,
  UsersRound,
  Wallet,
} from '../icons'
import { isAppEnabled } from '../composables/useChurchApps'

// Ekkly's own artwork for each page, from src/assets/app-icons — the same
// drawing the page wears on the front door, so a church sees the picture it
// was sold. Imported rather than referenced by URL so Vite fingerprints them
// and they cache properly.
//
// The artwork is Ekkly's and keeps its orange and blue (BRAND.md): it is not a
// token, so it does not follow the church's accent, and both colours are
// saturated enough to hold their own against a light page and a dark one.
//
// `icon` stays beside it, the line icon anything without a drawing falls back
// to. Every page has one today; the pair is what lets a new one arrive before
// its drawing does.
import accountsArt from '../assets/app-icons/accounts.svg'
import attendanceArt from '../assets/app-icons/attendance.svg'
import auditArt from '../assets/app-icons/audit.svg'
import bibleArt from '../assets/app-icons/bible.svg'
import dashboardArt from '../assets/app-icons/dashboard.svg'
import eventsArt from '../assets/app-icons/events.svg'
import financesArt from '../assets/app-icons/finances.svg'
import galleryArt from '../assets/app-icons/gallery.svg'
import lineupsArt from '../assets/app-icons/lineups.svg'
import linksArt from '../assets/app-icons/links.svg'
import minutesArt from '../assets/app-icons/minutes.svg'
import peopleArt from '../assets/app-icons/members.svg'
import prayerArt from '../assets/app-icons/prayer.svg'
import presentationArt from '../assets/app-icons/presentation.svg'
import settingsArt from '../assets/app-icons/settings.svg'
import smallGroupsArt from '../assets/app-icons/smallgroups.svg'
import songsArt from '../assets/app-icons/songs.svg'
import tasksArt from '../assets/app-icons/tasks.svg'
import todosArt from '../assets/app-icons/todos.svg'

/**
 * Every place in the app you can go, in one list.
 *
 * The sidebar, the bottom bar and the home catalogue all read from here. They
 * used to each keep their own copy, and the copies drifted — Presentation was
 * in the sidebar and missing from the bottom bar, so on a phone the tech team
 * could not reach the projector from the navigation at all.
 *
 * `short` is only for the bottom bar, where a tab is about 65px wide and a
 * name like "Prayer Concerns" would be cut off. Everywhere with room uses
 * `name`; anything without a `short` has a name that already fits.
 *
 * `description` is a plain sentence saying what you would open the thing to do.
 * It is what makes the home page worth having: a grid of names tells you no
 * more than the sidebar already does.
 *
 * Access is per item, never per group — `capability`, or `adminOnly` for the
 * few that no role can be granted. A group whose items are all filtered out
 * disappears with them, so nobody sees an empty heading.
 */
export const NAV_GROUPS = [
  {
    key: 'overview',
    label: '',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        image: dashboardArt,
        art: 'dashboard',
        icon: Home,
        capability: 'dashboard.view',
        description: 'The week at a glance — who is serving, what is coming, what needs attention.',
      },
      {
        name: 'Tasks',
        path: '/tasks',
        image: tasksArt,
        art: 'tasks',
        icon: ListChecks,
        capability: 'tasks.view',
        description: 'Jobs the church has to get done, and who agreed to do them.',
      },
    ],
  },
  {
    key: 'people',
    label: 'People',
    items: [
      {
        name: 'People',
        path: '/members',
        image: peopleArt,
        art: 'members',
        icon: Users,
        capability: 'members.view',
        description: 'Everyone the church knows, their details and the ministries they serve in.',
      },
      {
        name: 'Small Groups',
        path: '/small-groups',
        short: 'Groups',
        image: smallGroupsArt,
        art: 'smallgroups',
        icon: UsersRound,
        capability: 'smallgroups.view',
        description: 'The groups that meet through the week, who is in them and how each session went.',
      },
      {
        name: 'Attendance',
        path: '/attendance',
        image: attendanceArt,
        art: 'attendance',
        icon: ClipboardCheck,
        capability: 'attendance.view',
        description: 'Who came on a Sunday, and whether that is holding up over the weeks.',
      },
    ],
  },
  {
    key: 'gatherings',
    label: 'Gatherings',
    items: [
      {
        name: 'Events',
        path: '/events',
        image: eventsArt,
        art: 'events',
        icon: Calendar,
        capability: 'events.view',
        description: 'The church calendar — services, meetings and everything else that is on.',
      },
      {
        name: 'Song List',
        path: '/songs',
        short: 'Songs',
        image: songsArt,
        art: 'songs',
        icon: ListMusic,
        capability: 'songs.view',
        description: 'Every song the church sings, with its key, its words and who leads it.',
      },
      {
        name: 'Schedules',
        path: '/schedules',
        image: lineupsArt,
        art: 'lineups',
        icon: Mic2,
        capability: 'lineups.view',
        description: 'Who is serving each Sunday — worship, ushers, teachers, preaching — and the songs.',
      },
      // Its own entry rather than a corner of Schedules: the tech team goes
      // straight here on a Sunday and should not reach it through the worship
      // team's page.
      {
        name: 'Presentation',
        path: '/present',
        short: 'Present',
        image: presentationArt,
        art: 'presentation',
        icon: ProjectorScreen,
        capability: 'lineups.view',
        description: 'Put the songs and readings on the screen while the service runs.',
      },
      // No capability: every signed-in account may read Scripture, so this is
      // the one entry the ministry tags have nothing to say about.
      {
        name: 'Bible',
        path: '/bible',
        // Its own app, so a church can leave it out; with no capability to
        // carry that, it is named here.
        app: 'bible',
        image: bibleArt,
        art: 'bible',
        icon: BookOpen,
        description:
          'Read the Bible in Tagalog or English, and find a verse by reference or by what it says.',
      },
      {
        name: 'Minutes',
        path: '/minutes',
        image: minutesArt,
        art: 'minutes',
        icon: FileText,
        capability: 'minutes.view',
        description: 'Notes typed during a meeting, written up into minutes the church can file.',
      },
      {
        name: 'Prayer Concerns',
        path: '/prayer-concerns',
        short: 'Prayer',
        image: prayerArt,
        art: 'prayer',
        icon: Heart,
        capability: 'prayer.view',
        description: 'What the church is praying for, and who asked for it.',
      },
    ],
  },
  {
    key: 'media',
    label: 'Media',
    items: [
      {
        name: 'Gallery',
        path: '/gallery',
        image: galleryArt,
        art: 'gallery',
        icon: Image,
        capability: 'gallery.view',
        description: 'Photos from services and events.',
      },
      {
        name: 'Links',
        path: '/links',
        image: linksArt,
        art: 'links',
        icon: Link2,
        capability: 'links.view',
        description: 'The links the church hands out — forms, giving, and where to find it online.',
      },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      {
        name: 'Finances',
        path: '/finances',
        image: financesArt,
        art: 'finances',
        icon: Wallet,
        capability: 'finances.view',
        description: 'What comes in and goes out, and the statement for the month.',
      },
      {
        name: 'To-do',
        path: '/todo',
        image: todosArt,
        art: 'todos',
        icon: NotebookPen,
        adminOnly: true,
        description: 'The backlog for building this app — bugs, features and chores.',
      },
      {
        name: 'Accounts',
        path: '/accounts',
        image: accountsArt,
        art: 'accounts',
        icon: UserCog,
        adminOnly: true,
        description: 'Who can sign in, and which member each account belongs to.',
      },
      {
        name: 'Audit log',
        path: '/audit',
        image: auditArt,
        art: 'audit',
        icon: History,
        adminOnly: true,
        description: 'Every change made in the app, who made it, and when.',
      },
      {
        name: 'Settings',
        path: '/settings',
        image: settingsArt,
        art: 'settings',
        icon: Settings,
        adminOnly: true,
        description: 'Church details, ministries, roles, and what the public page shows.',
      },
    ],
  },
]

/** Flat, for anything that wants to look an item up by path. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

/**
 * The four the bottom bar puts on the bar itself; everything else lives behind
 * More. Named by path so the definitions above stay the only place an item is
 * described.
 */
export const PRIMARY_PATHS = ['/dashboard', '/members', '/events', '/attendance']

/**
 * @param item one of the entries above
 * @param can  usePermissions().can
 * @param isAdmin  usePermissions().isAdmin, unwrapped
 */
export const navItemAllowed = (item, can, isAdmin) => {
  // An app the church has switched off. Items with a capability are already
  // covered by can(); this is for the ones without, like the Bible.
  if (item.app && !isAppEnabled(item.app)) return false
  return item.adminOnly ? isAdmin : can(item.capability)
}

/** Groups with their forbidden items removed, and empty groups dropped. */
export const allowedGroups = (can, isAdmin, groups = NAV_GROUPS) =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => navItemAllowed(item, can, isAdmin)),
    }))
    .filter((group) => group.items.length > 0)

import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  Heart,
  FilmSlate,
  Image,
  Link2,
  ListChecks,
  ListMusic,
  Mic2,
  NotebookPen,
  ProjectorScreen,
  Robot,
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
import aiArt from '../assets/app-icons/ai.svg'
import attendanceArt from '../assets/app-icons/attendance.svg'
import auditArt from '../assets/app-icons/audit.svg'
import bibleArt from '../assets/app-icons/bible.svg'
import eventsArt from '../assets/app-icons/events.svg'
import financesArt from '../assets/app-icons/finances.svg'
import galleryArt from '../assets/app-icons/gallery.svg'
import lineupsArt from '../assets/app-icons/lineups.svg'
import presentationArt from '../assets/app-icons/presentation.svg'
import linksArt from '../assets/app-icons/links.svg'
import minutesArt from '../assets/app-icons/minutes.svg'
import peopleArt from '../assets/app-icons/members.svg'
import prayerArt from '../assets/app-icons/prayer.svg'
import settingsArt from '../assets/app-icons/settings.svg'
import smallGroupsArt from '../assets/app-icons/smallgroups.svg'
import songsArt from '../assets/app-icons/songs.svg'
import tasksArt from '../assets/app-icons/tasks.svg'
import todosArt from '../assets/app-icons/todos.svg'
import videosArt from '../assets/app-icons/videos.svg'

/**
 * Every place in the app you can go, in one list.
 *
 * The home of all apps (src/views/Apps.vue) lays its tiles out from here, in
 * these groups, and the top bar names the app you are in from here. There
 * was a sidebar and a bottom bar reading it too; every app is a screen of its
 * own now, and the home is the way between them.
 *
 * `tagline` is a few words on what the app is for, under its name on the
 * home's card styles that have room for one (src/data/homeCards.js).
 *
 * `short` is a name for anywhere narrow, where "Prayer Concerns" would be cut
 * off. Everywhere with room uses `name`.
 *
 * `description` is a plain sentence saying what you would open the thing to do.
 * It is what makes the home page worth having: a grid of names tells you no
 * more than the sidebar already does.
 *
 * Access is per item, never per group — `capability`, or `adminOnly` for the
 * few that no role can be granted. A group whose items are all filtered out
 * disappears with them, so nobody sees an empty heading.
 *
 * `account` marks a page that is not an app. Settings is where the church is
 * looked after rather than where its work is done, so it opens from the
 * drawer behind the avatar. It stays listed here so the top bar can still name
 * it, and allowedGroups leaves it out of the home and the All apps drawer.
 */
export const NAV_GROUPS = [
  {
    key: 'overview',
    label: '',
    items: [
      {
        name: 'Tasks',
        tagline: 'What is on you',
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
        tagline: 'Our church family',
        path: '/members',
        image: peopleArt,
        art: 'members',
        icon: Users,
        capability: 'members.view',
        description: 'Everyone the church knows, their details and the ministries they serve in.',
      },
      {
        name: 'Small Groups',
        tagline: 'Groups that meet',
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
        tagline: 'Who came, and when',
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
        tagline: 'What is on',
        path: '/events',
        image: eventsArt,
        art: 'events',
        icon: Calendar,
        capability: 'events.view',
        description: 'The church calendar — services, meetings and everything else that is on.',
      },
      {
        name: 'Song List',
        tagline: 'Worship together',
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
        tagline: 'Sundays and teams',
        path: '/schedules',
        image: lineupsArt,
        art: 'lineups',
        icon: Mic2,
        capability: 'lineups.view',
        description: 'Who is serving each Sunday — worship, ushers, teachers, preaching — and the songs.',
      },
      // Its own app rather than a corner of Schedules: the tech team goes
      // straight here on a Sunday, and running a service is their job, not the
      // worship team's. Both are the one lineups app as far as a church's plan
      // is concerned.
      {
        name: 'Presentation',
        tagline: 'Words on the screen',
        path: '/presentation',
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
        tagline: 'Read and search',
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
        tagline: 'What was decided',
        path: '/minutes',
        image: minutesArt,
        art: 'minutes',
        icon: FileText,
        capability: 'minutes.view',
        description: 'Notes typed during a meeting, written up into minutes the church can file.',
      },
      {
        name: 'Prayer Concerns',
        tagline: 'Praying for each other',
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
        tagline: 'Photos and moments',
        path: '/gallery',
        image: galleryArt,
        art: 'gallery',
        icon: Image,
        capability: 'gallery.view',
        description: 'Photos from services and events.',
      },
      // Part of the Events app (its capability says so): the videos are made
      // from the calendar, and live beside the photos as the church's media.
      {
        name: 'Videos',
        tagline: 'Announcements to play',
        path: '/videos',
        image: videosArt,
        art: 'videos',
        icon: FilmSlate,
        capability: 'events.view',
        description: 'This month’s announcement video, made from the calendar, ready to play or post.',
      },
      {
        name: 'Links',
        tagline: 'Pages worth keeping',
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
    key: 'extras',
    label: 'Extras',
    items: [
      // YUNIT, the assistant. Named by its app rather than a capability, the
      // way the Bible is: every account may meet him where the church has him.
      {
        name: 'YUNIT',
        tagline: 'Help with anything',
        path: '/yunit',
        app: 'ai',
        image: aiArt,
        art: 'ai',
        icon: Robot,
        description: 'The church’s assistant: he writes up minutes, finds songs and lays out lyrics.',
      },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      {
        name: 'Finances',
        tagline: 'Tithes and funds',
        path: '/finances',
        image: financesArt,
        art: 'finances',
        icon: Wallet,
        capability: 'finances.view',
        description: 'What comes in and goes out, and the statement for the month.',
      },
      {
        name: 'To-do',
        tagline: 'Building this app',
        path: '/todo',
        image: todosArt,
        art: 'todos',
        icon: NotebookPen,
        adminOnly: true,
        description: 'The backlog for building this app — bugs, features and chores.',
      },
      {
        name: 'Accounts',
        tagline: 'Who signs in',
        path: '/accounts',
        image: accountsArt,
        art: 'accounts',
        icon: UserCog,
        adminOnly: true,
        description: 'Who can sign in, and which member each account belongs to.',
      },
      {
        name: 'Audit log',
        tagline: 'Every change made',
        path: '/audit',
        image: auditArt,
        art: 'audit',
        icon: History,
        adminOnly: true,
        description: 'Every change made in the app, who made it, and when.',
      },
      {
        name: 'Settings',
        tagline: 'Looking after the church',
        path: '/settings',
        image: settingsArt,
        art: 'settings',
        icon: Settings,
        adminOnly: true,
        account: true,
        description: 'Church details, ministries, roles, and what the public page shows.',
      },
    ],
  },
]

/** Flat, for anything that wants to look an item up by path. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

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

/**
 * Groups with their forbidden items removed, and empty groups dropped. Account
 * pages are left out too: these are the app lists, and those are not apps.
 */
export const allowedGroups = (can, isAdmin, groups = NAV_GROUPS) =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.account && navItemAllowed(item, can, isAdmin)),
    }))
    .filter((group) => group.items.length > 0)

<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cake, CalendarDots, CalendarPlus, ClipboardCheck, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, KeyRound, ListChecks, MicrophoneStage, Moon, NotePencil, Sun, UserPlus } from '../icons'
import AppHeroDeck from '../components/appframe/AppHeroDeck.vue'
import CardPanes from '../components/appframe/CardPanes.vue'
import DeckCard from '../components/appframe/DeckCard.vue'
import DeckFaces from '../components/appframe/DeckFaces.vue'
import DeckChips from '../components/appframe/DeckChips.vue'
import DeckWeek from '../components/appframe/DeckWeek.vue'
import AppPeek from '../components/appframe/AppPeek.vue'
import HomeScene from '../components/home/HomeScene.vue'
import HomeAppCards from '../components/home/HomeAppCards.vue'
import HomeWeek from '../components/home/HomeWeek.vue'
import HomeAttention from '../components/home/HomeAttention.vue'
import HomeCommunity from '../components/home/HomeCommunity.vue'
import { useHomeCards } from '../composables/useHomeCards'
import { useLiveSky } from '../composables/useLiveSky'
import { useAppOrder } from '../composables/useAppOrder'
import { usePressAndHold } from '../composables/usePressAndHold'
import BirthdayCard from '../components/members/BirthdayCard.vue'
import { usePermissions } from '../composables/usePermissions'
import { useAuth } from '../composables/useAuth'
import { useAppSettings } from '../composables/useAppSettings'
import { useToast } from '../composables/useToast'
import { useToday } from '../composables/useToday'
import { useHomeVerse } from '../composables/useHomeVerse'
import { useMediaQuery } from '../composables/useMediaQuery'
import { allowedGroups } from '../data/navigation'
import { APPS } from '../../lib/apps'
import { getDisplayName, getFullName, listPhrase } from '../utils/memberUtils'
import { findRosterMember, formatShortDate } from '../utils/lineupUtils'
import { peopleOnService } from '../data/scheduleRoles'

// The home of all apps: where Ekkly opens, and where every app's back arrow
// leads. Each app is a screen of its own now (src/apps/), with its own home
// and its own way between its sections, so this is the one place to go
// between them — there is no bottom bar or sidebar any more.
//
// Two things on it:
//
//   1. Today, as a deck of cards (AppHeroDeck) drawn from every app: an
//      account waiting to be linked, whose birthday it is, when you are next
//      serving, the tasks you owe, gatherings nobody has counted, what is on.
//      Under them all, the card that is always true: the day, and the church.
//      This is what the dashboard was, asked as a deck rather than a page of
//      tiles.
//   2. The apps this person keeps on their home — five, as cards that are
//      their artwork and their name, nothing more — and More apps, which
//      opens every app (/apps, AllApps.vue), where they can open any of them
//      or choose which five are here. The bottom bar's mark opens the same
//      page; the four it keeps on the bar are the first four kept here.
//      Holding one of the five shows what that app is, full screen, until
//      the finger lifts (AppPeek) — for People, a short story of what it
//      does — and sliding up keeps it open; a tap still just opens it.
//
// Everything is gated on the capability of the app it comes from (useToday,
// allowedGroups), so nobody sees a card or a tile for something they cannot
// open.
//
// On a desktop (lg) the same page has the room to show everything at once,
// and like a phone's it keeps to one screen and never scrolls. The apps are a
// sidebar down the left, drawn in the style chosen and laid out as on a
// phone, over the church on its hill; beside them, the greeting in the
// church's colour with the quick actions, and under it Today: what needs
// attention, the widest (HomeAttention), the week (HomeWeek), and the
// community's news (HomeCommunity) beside the week, or under the work where
// the screen is wide enough. Each list shows the rows that fit whole
// (useFitCount) and counts the rest, which open in a sheet or their own page.
// An issue that covers several records is one row with its records under it,
// never a row each, and what is on goes in the week and nowhere else, so
// nothing is said twice.

const route = useRoute()
const router = useRouter()
const toast = useToast()

// The router sends anyone without access to a page back here. Say so, rather
// than leaving them wondering why the tap did nothing.
onMounted(() => {
  if (!route.query.denied) return
  toast.warning(`You do not have access to ${route.query.denied}. Ask an administrator for the right ministry tag.`, 5000)
  router.replace({ query: {} })
})

const { can, canManage, isAdmin, myMember } = usePermissions()
const wide = useMediaQuery('(min-width: 1024px)')
// A desktop with room for the community under the work rather than beside the
// week: past about 1700px the middle column is wide enough to share.
const roomy = useMediaQuery('(min-width: 1700px)')
const { displayName } = useAuth()
const { church, logoUrl } = useAppSettings()
const today = useToday()
const { verse } = useHomeVerse()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/** A `YYYY-MM-DD` key read as a local date, never as UTC midnight. */
const dateOf = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const weekday = (key) => dateOf(key).toLocaleDateString(undefined, { weekday: 'long' })
const timeLabel = (time) => {
  if (!time) return ''
  const [h, m] = String(time).split(':')
  const hour = Number(h)
  if (!Number.isFinite(hour)) return ''
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m ?? '00'} ${hour >= 12 ? 'PM' : 'AM'}`
}
const tileDate = (key) => {
  const date = dateOf(key)
  return { month: date.toLocaleDateString(undefined, { month: 'short' }), day: date.getDate() }
}

/** "Ana, Ben and 3 others": who a card is about, the first two by name. */
const namesOf = (people) => {
  const names = people.slice(0, 2).map(getDisplayName)
  if (people.length > 2) names.push(plural(people.length - 2, 'other', 'others'))
  return listPhrase(names)
}
const name = computed(() => getDisplayName(myMember.value) || displayName.value)
const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return name.value ? `${part}, ${name.value}` : part
})

const memberOf = (id) => findRosterMember(today.people.members.value, id)
const keyOf = (member) => member.firestoreId || member.id

/* ---------------------------------------------------- made-up cards (dev) */

// The made-up cards' module (sampleTodayCards), loaded only in a dev build:
// imported plainly, its photos were copied into a church's build even though
// nothing there used them.
const sampleModule = shallowRef(null)
if (import.meta.env.DEV) import('../data/sampleTodayCards').then((module) => (sampleModule.value = module))

// How many made-up cards to add (sampleTodayCards), from `?cards=N` and kept
// for the tab once set: a sign-in, the church picker or any redirect rebuilds
// the address without it, and the preview went with it. `?cards=0` ends it.
// In a dev build only; everywhere else this is 0 and nothing is read.
const SAMPLE_STORE = 'ekkly:sample-cards'
const sampleCount = computed(() => {
  if (!import.meta.env.DEV) return 0
  const asked = route.query.cards
  if (asked !== undefined) {
    const n = Math.min(Math.max(Number(asked) || 0, 0), 30)
    try {
      sessionStorage.setItem(SAMPLE_STORE, String(n))
    } catch {
      // Not kept past this page; it still shows on it.
    }
    return n
  }
  try {
    return Number(sessionStorage.getItem(SAMPLE_STORE)) || 0
  } catch {
    return 0
  }
})

/* -------------------------------------------------------------- the deck */

// Unlike an app's own deck, these cards each lead into a different app, so
// each names where it goes (`dest`): the artwork of the app the tap opens —
// the app's own, never a section's, so it matches the tile below — shown small
// by the card's chevron.

const cards = computed(() => {
  const list = []

  // Someone waiting to be let in properly leads: they cannot do anything
  // until it is done.
  if (isAdmin.value && today.claimsWaiting.value) {
    const n = today.claimsWaiting.value
    const claimed = today.claims.value.map((claim) => memberOf(claim.memberId)).filter(Boolean)
    list.push({
      kind: 'plain',
      key: `claims:${n}`,
      tone: 'warn',
      icon: KeyRound,
      dismissible: true,
      kicker: 'Waiting on you',
      art: 'today-claims',
      title: `${plural(n, 'account', 'accounts')} to link`,
      detail: 'Someone signed in and says a record on the roll is theirs.',
      to: '/accounts',
      dest: 'accounts',
      destLabel: 'Accounts',
      faces: { members: claimed, empty: n - claimed.length, caption: claimed.length ? `For ${namesOf(claimed)}` : '' },
      // For the desktop's action centre (HomeAttention): how pressing it is,
      // what to do, and each request it covers, one link each.
      severity: 'pending',
      action: 'Review',
      records: today.claims.value.map((claim, i) => {
        const member = memberOf(claim.memberId)
        return { key: String(claim.id || claim.memberId || i), label: member ? getDisplayName(member) : 'A record on the roll', to: '/accounts' }
      }),
    })
  }

  // On a desktop every card is a row, and a row each would let a busy day's
  // birthdays crowd out everything else: they are one row there, naming
  // everyone, and it opens the day's birthdays in People.
  const birthdays = today.birthdaysToday.value
  if (wide.value && birthdays.length) {
    const one = birthdays.length === 1 ? birthdays[0] : null
    const people = birthdays.map(({ member }) => member)
    list.push({
      kind: 'birthdays',
      key: `birthdays:${people.map(keyOf).join(',')}:${today.today}`,
      tone: 'celebrate',
      icon: Cake,
      dismissible: true,
      kicker: 'Birthday today',
      title: one ? `${getDisplayName(one.member)}'s birthday` : `${plural(birthdays.length, 'birthday', 'birthdays')} today`,
      detail: one ? (one.turning ? `Turns ${one.turning}` : getFullName(one.member)) : namesOf(people),
      to: one ? { name: 'MemberDetails', params: { id: one.member.id || one.member.firestoreId } } : { name: 'PeopleBirthdays' },
      dest: 'members',
      destLabel: one ? 'their record in People' : 'Birthdays, in People',
      members: people,
      records: people.map((member) => ({
        key: String(keyOf(member)),
        label: getDisplayName(member),
        to: { name: 'MemberDetails', params: { id: member.id || member.firestoreId } },
      })),
      // Its faces, for the phone's card it shows as when rested on.
      faces: { members: people, empty: 0, caption: namesOf(people) },
    })
  } else birthdays.forEach(({ member, turning }) => {
    list.push({
      kind: 'birthday',
      key: `birthday:${member.firestoreId || member.id}:${today.today}`,
      tone: 'celebrate',
      dismissible: true,
      kicker: 'Birthday today',
      detail: getFullName(member),
      to: { name: 'MemberDetails', params: { id: member.id || member.firestoreId } },
      dest: 'members',
      destLabel: 'their record in People',
      member,
      name: getDisplayName(member),
      turning,
    })
  })

  const turn = today.myNextTurn.value
  if (turn) {
    const isToday = turn.date === today.today
    list.push({
      kind: 'dated',
      key: `turn:${turn.date}`,
      tone: 'plain',
      icon: MicrophoneStage,
      dismissible: true,
      kicker: 'You are serving',
      title: isToday ? "You're on today" : `You're on ${weekday(turn.date)}`,
      detail: turn.roles.map((role) => role.name).join(' · '),
      to: { name: 'SchedulesSunday', params: { date: turn.date } },
      dest: 'lineups',
      destLabel: 'that Sunday in Schedules',
      date: tileDate(turn.date),
      // Who else is on with you.
      faces: (() => {
        const mine = myMember.value ? keyOf(myMember.value) : null
        const others = peopleOnService(turn.sunday).map(memberOf).filter((member) => member && keyOf(member) !== mine)
        return { members: others, empty: 0, caption: others.length ? `With ${namesOf(others)}` : '' }
      })(),
    })
  }

  // Late first, then due today, never both: two cards about one list. On a
  // desktop both are on show, in their own places: what is late is work
  // waiting (the action centre, red), and what is due today is the day's
  // (Community), so neither hides the other. Each task is a record of its
  // card, opening Tasks searched to it.
  const late = today.myOverdue.value
  const due = today.myDueToday.value
  const taskRecords = (tasks) =>
    tasks.map((task) => ({ key: String(task.id), label: task.title || 'A task', to: { name: 'TasksMine', query: { q: task.title || '' } } }))
  if (wide.value && (late.length || due.length)) {
    if (late.length) {
      list.push({
        kind: 'tasks',
        key: `tasks:late:${late.length}`,
        tone: 'warn',
        icon: ListChecks,
        dismissible: true,
        kicker: 'Overdue',
        art: 'today-overdue',
        title: `${plural(late.length, 'task', 'tasks')} of yours overdue`,
        to: { name: 'TasksMine' },
        dest: 'tasks',
        destLabel: 'Tasks',
        tasks: late,
        severity: 'urgent',
        action: 'Open tasks',
        records: taskRecords(late),
      })
    }
    if (due.length) {
      list.push({
        kind: 'tasks',
        key: `tasks:today:${due.length}`,
        tone: 'plain',
        icon: ListChecks,
        dismissible: true,
        kicker: 'Due today',
        art: 'today-due',
        title: `${plural(due.length, 'task', 'tasks')} of yours due today`,
        to: { name: 'TasksMine' },
        dest: 'tasks',
        destLabel: 'Tasks',
        tasks: due,
      })
    }
  } else if (late.length || due.length) {
    const tasks = late.length ? late : due
    list.push({
      kind: 'tasks',
      key: `tasks:${late.length ? 'late' : 'today'}:${tasks.length}`,
      tone: late.length ? 'warn' : 'plain',
      icon: ListChecks,
      dismissible: true,
      kicker: late.length ? 'Overdue' : 'Due today',
      art: late.length ? 'today-overdue' : 'today-due',
      title: `${plural(tasks.length, 'task', 'tasks')} of yours ${late.length ? 'overdue' : 'due today'}`,
      to: { name: 'TasksMine' },
      dest: 'tasks',
      destLabel: 'Tasks',
      tasks,
    })
  }

  if (today.unrecorded.value) {
    const n = today.unrecorded.value
    list.push({
      kind: 'plain',
      key: `unrecorded:${n}`,
      tone: 'warn',
      icon: ClipboardCheck,
      dismissible: true,
      kicker: 'Still to count',
      art: 'today-count',
      title: `${plural(n, 'gathering', 'gatherings')} with no attendance`,
      detail: 'They stay on the list until someone records or dismisses them.',
      to: { name: 'AttendanceOwed' },
      dest: 'attendance',
      destLabel: 'To record, in Attendance',
      chips: today.unrecordedRows.value.map((row) => ({
        key: String(row.occurrenceKey || row.id),
        label: formatShortDate(row.date),
      })),
      // One issue, every gathering it covers as a record: the date and what
      // it was, each opening the recorder on it (as Attendance's To record).
      severity: 'pending',
      action: 'Record',
      records: today.unrecordedRows.value.map((row) => {
        const key = String(row.occurrenceKey || row.id)
        return {
          key,
          label: [formatShortDate(row.date), row.eventTitle].filter(Boolean).join(' · '),
          to: { name: 'RecordAttendance', query: { key } },
        }
      }),
    })
  }

  // What is on: today's, or the next thing this week. Not on a desktop, where
  // the week ahead stands beside Today and already says it (HomeWeek).
  const on = today.eventsToday.value
  if (wide.value) {
    // The week beside Today has it.
  } else if (on.length) {
    list.push({
      kind: 'dated',
      key: `on:${today.today}`,
      tone: 'plain',
      icon: CalendarDots,
      dismissible: true,
      kicker: 'On today',
      title: on.length === 1 ? on[0].title || 'A gathering' : `${on.length} things on today`,
      detail: on.slice(0, 3).map((e) => [on.length > 1 ? e.title : '', timeLabel(e.time)].filter(Boolean).join(' ')).join(' · '),
      to: { name: 'Events', query: { date: today.today } },
      dest: 'events',
      destLabel: 'the day in Events',
      date: tileDate(today.today),
      day: today.today,
    })
  } else if (today.nextEvent.value) {
    const next = today.nextEvent.value
    list.push({
      kind: 'dated',
      key: `next:${next.date}:${next.title}`,
      tone: 'plain',
      icon: CalendarDots,
      dismissible: true,
      kicker: 'Coming up',
      title: next.title || 'A gathering',
      detail: [weekday(next.date), timeLabel(next.time)].filter(Boolean).join(' · '),
      to: { name: 'Events', query: { date: next.date } },
      dest: 'events',
      destLabel: 'the day in Events',
      date: tileDate(next.date),
      day: next.date,
    })
  }

  // Made-up cards to see a full day with, while working locally: `?cards=10`.
  // Only in a dev build, so a church's home never shows one.
  const samples = import.meta.env.DEV ? sampleCount.value : 0
  if (samples > 0 && sampleModule.value) {
    const made = sampleModule.value.sampleTodayCards(samples, {
      wide: wide.value,
      icons: { Cake, CalendarDots, ClipboardCheck, KeyRound, ListChecks, MicrophoneStage, UserPlus },
    })
    // As with the real ones, what is on is the week's to show on a desktop.
    list.push(...made.filter((card) => !(wide.value && card.dest === 'events')))
  }

  // The card that is always there: the person greeted by name, the day, and
  // whose church this is. The day's verse used to run along its foot; it has
  // the foot of the page now, under the church (verseTo, below).
  // The person is greeted first, large; the date is the label over it; the
  // church sits at the foot by its logo; and the weather over the church
  // (live sky), when there is a report, in the corner.
  const now = new Date()
  list.push({
    kind: 'day',
    key: 'day',
    tone: 'accent',
    kicker: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    title: greeting.value,
    // The greeting in its two halves, for its two lines.
    greetingTime: greeting.value.split(", ")[0],
    greetingName: greeting.value.split(", ").slice(1).join(", "),
    churchName: church.value?.shortName || church.value?.fullName || '',
    to: null,
  })

  return list
})

/* -------------------------------------------- a card in the community */

// On a desktop a community item (HomeCommunity) has one line under its
// headline, and it should be the most telling thing the card holds: the
// tasks' names, the days, who an account is for.
const rowDetail = (card) => {
  if (card.chips) return card.chips.map((chip) => chip.label).join(', ')
  if (card.tasks) {
    const names = card.tasks.slice(0, 2).map((task) => task.title)
    if (card.tasks.length > 2) names.push(`${card.tasks.length - 2} more`)
    return names.join(' · ')
  }
  // Who an account claim is for says more than what a claim is.
  if (card.faces?.caption && !card.date) return card.faces.caption
  return card.detail
}

/* ------------------------------------------------------ the desktop page */

// What someone who runs things most often comes to the home to start, on a
// desktop, in the church's banner: each only for whoever may do it, each
// opening the place it is done with its form already open (`?add=` in People,
// Tasks and Events; Attendance's list of gatherings still to count).
const quickActions = computed(() =>
  [
    canManage('members') && { key: 'person', label: 'Add a person', icon: UserPlus, to: { name: 'Members', query: { add: 'true' } } },
    canManage('attendance') && { key: 'count', label: 'Record attendance', icon: ClipboardCheck, to: { name: 'AttendanceOwed' } },
    canManage('events') && { key: 'event', label: 'New event', icon: CalendarPlus, to: { name: 'Events', query: { add: '1' } } },
    canManage('tasks') && { key: 'task', label: 'New task', icon: NotePencil, to: { name: 'TasksMine', query: { add: '1' } } },
  ].filter(Boolean)
)

// The greeting's line on a desktop: the day, and whose church this is.
const todayLong = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const churchName = computed(() => church.value?.shortName || church.value?.fullName || '')

/* -------------------------------------------------------------- the week */

// The coming seven days under the apps, on a desktop, for whoever has Events
// (HomeWeek). Someone without it would see a week of "Nothing on" that is
// only nothing because they cannot see it.
// The week's events, with made-up ones beside them while previewing locally
// (`?cards=`, a dev build only), so the week shows its pictures too.
const weekEvents = computed(() =>
  import.meta.env.DEV && sampleCount.value > 0 && sampleModule.value
    ? [...today.eventsThisWeek.value, ...sampleModule.value.sampleWeekEvents()].sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)))
    : today.eventsThisWeek.value
)
const showWeek = computed(() => wide.value && allApps.value.some((item) => item.path === '/events'))

/* ------------------------------------------------------------- the verse */

// The verse opens its chapter in the Bible, for whoever has the Bible app.
// Until it has loaded, or where it cannot (offline, before the book was ever
// fetched), the church stands alone.
const verseTo = computed(() => {
  const v = verse.value
  const canRead = allApps.value.some((item) => item.path === '/bible')
  // The verse itself is named too, so the reader opens on it, lit.
  return v && canRead
    ? { name: 'Bible', params: { slug: v.slug, chapter: v.chapter }, query: v.verses ? { v: v.verses } : {} }
    : null
})

/* -------------------------------------------------------------- the apps */

// Every app this person may open, in the navigation's order; the five on
// the home are whichever they keep first (useAppOrder).
const allApps = computed(() => allowedGroups(can, isAdmin.value).flatMap((group) => group.items))
const { ordered, primary } = useAppOrder(allApps)
const others = computed(() => ordered.value.slice(primary.value.length))

// Holding an app's tile shows what it is; letting go puts it away, unless
// the finger slid up to keep it open, when Close does.
const { held, drag, start: startHold, holdStill, swallowClick, keep, release } = usePressAndHold()
const hold = { start: startHold, still: holdStill, swallow: swallowClick }

// Open, from a preview kept open: into the app it was showing.
const openHeld = () => {
  const path = held.value?.item?.path
  release()
  if (path) router.push(path)
}

const { style: cardStyle } = useHomeCards()

// Compact cards leave room under the apps, so the verse is set on the picture
// itself, whole if it fits, rather than in a card (the verse, below).
const openVerse = computed(() => cardStyle.value === "compact")

// The time and weather over the church, for the picture (live sky).
const { sky, weather } = useLiveSky()

// Day or night, the weather over the church as one small picture.
const weatherIcon = computed(() => {
  const w = weather.value
  if (!w) return null
  if (w.kind === 'storm') return CloudLightning
  if (w.kind === 'rain') return CloudRain
  if (w.kind === 'fog') return CloudFog
  if (w.kind === 'cloudy') return w.night ? CloudMoon : CloudSun
  return w.night ? Moon : Sun
})

const APP_LINES = Object.fromEntries(APPS.map((app) => [app.key, app.description]))

// One line of what is true inside each app, where the home already knows it;
// otherwise what the app is for, in the words the church bought it under.
const lineOf = (item) => {
  switch (item.path) {
    case '/members':
      return today.people.loading.value ? '' : plural(today.people.counts.value.total, 'person', 'people')
    case '/tasks': {
      const n = today.myTasks.value.length
      return myMember.value ? (n ? `${n} of yours open` : 'Nothing on you') : APP_LINES.tasks
    }
    case '/events': {
      const n = today.eventsThisWeek.value.length
      return n ? `${n} this week` : 'Nothing this week'
    }
    case '/schedules': {
      const turn = today.myNextTurn.value
      return turn ? `You're on ${formatShortDate(turn.date)}` : APP_LINES.lineups
    }
    case '/attendance': {
      const last = today.lastCount.value
      return last ? `${last.totalAttendees || 0} on ${formatShortDate(last.date)}` : APP_LINES.attendance
    }
    case '/prayer-concerns':
      return today.openPrayers.value ? `${today.openPrayers.value} open` : APP_LINES.prayer
    default:
      return APP_LINES[item.art] || item.description
  }
}
</script>

<template>
  <!-- The home is laid out to fit one screen, so it does not scroll: its
       bottom padding alone used to tip it over and let the page slide. On a
       desktop each list shows what fits and opens the rest (useFitCount). -->
  <!-- The page stands in a picture (HomeScene): its sky behind everything,
       and its church on the hill in the room the apps leave at the foot. -->
  <!-- With the bottom bar on, the bar takes the foot of the screen, so the
       home grows to fit rather than leave its apps under the bar: it still
       fits one screen wherever there is room, and scrolls only where there is
       not. -->
  <div class="home-scene relative h-full overflow-hidden bg-(--scene-sky-3) with-bar:overflow-y-auto with-bar:overscroll-contain" v-bind="sky">
    <HomeScene part="sky" class="pointer-events-none absolute inset-0 size-full" />

    <main class="relative mx-auto flex h-full w-full max-w-2xl flex-col gap-6 px-4 pt-4 sm:pt-6 with-bar:h-auto with-bar:min-h-full lg:grid lg:h-full lg:max-w-[112rem] lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-5 lg:px-6 lg:py-5 2xl:grid-cols-[19rem_minmax(0,1fr)]">
      <!-- On a desktop, the greeting is words on the sky, in the sky's own ink
           (HomeScene): the day, the weather over the church, and the church.
           Search is the top bar's (its magnifying glass, and Ctrl K): a second
           search field here said the same thing twice. -->
      <!-- On a desktop the page leads with one card in the church's colour,
           as the phone's deck ends on its day card and as every sketch of a
           desktop home did (a hero in that colour): without it the eye had
           nowhere to land first. Its logo, the day and the weather in pills,
           the greeting large, and the day's verse across from it, over
           Ekkly's panes of light as on the phone's day card. -->
      <header v-if="wide" class="@container lg:col-start-2 lg:row-start-1">
        <div class="home-hero relative isolate flex items-center justify-between gap-8 overflow-hidden rounded-[28px] border border-black/15 px-6 py-4 text-white dark:border-black/40">
          <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
            <CardPanes />
          </div>
          <!-- The church, the day and the greeting, and the day's verse in a
               line under them: one block, so the quick actions beside it never
               squeeze the greeting. -->
          <div class="flex min-w-0 flex-1 items-center gap-4">
            <span v-if="logoUrl" class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 ring-1 ring-black/10">
              <img :src="logoUrl" alt="" class="size-full object-contain" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="flex min-w-0 items-center gap-2 overflow-hidden text-[13px] font-semibold whitespace-nowrap">
                <span class="rounded-full bg-white/18 px-2.5 py-0.5">{{ todayLong }}</span>
                <span v-if="weather" class="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-0.5">
                  <component :is="weatherIcon" class="size-4" />
                  {{ weather.label }}
                </span>
                <!-- The logo says whose church it is; the name joins it where
                     there is room for it whole. -->
                <span v-if="churchName && roomy" class="min-w-0 truncate text-white/85">{{ churchName }}</span>
              </p>
              <h1 class="mt-0.5 truncate text-[26px] font-bold leading-tight tracking-tight">{{ greeting }}</h1>
              <component
                :is="verseTo ? 'RouterLink' : 'div'"
                v-if="verse"
                v-bind="verseTo ? { to: verseTo } : {}"
                :class="['mt-0.5 flex min-w-0 items-baseline gap-2 text-[13px]', verseTo ? 'group' : '']"
                :title="`${verse.text} — ${verse.reference}`"
              >
                <span class="min-w-0 truncate italic text-white/85">{{ verse.text }}</span>
                <span class="shrink-0 font-semibold text-white group-hover:underline">{{ verse.reference }}</span>
              </component>
            </div>
          </div>

          <!-- The things most often started from here, two by two; where the
               banner is narrow (beside the sidebar on a small screen), as
               their icons alone, named on hover and to a screen reader, so
               the greeting keeps its room. -->
          <nav v-if="quickActions.length" aria-label="Quick actions" class="grid shrink-0 grid-cols-2 gap-2">
            <RouterLink
              v-for="action in quickActions"
              :key="action.key"
              :to="action.to"
              :title="action.label"
              class="flex h-9 items-center justify-center gap-2 rounded-full bg-white/15 px-2.5 text-[13px] font-semibold whitespace-nowrap text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white @[46rem]:justify-start @[46rem]:px-3.5"
            >
              <component :is="action.icon" class="size-4 shrink-0" />
              <span class="sr-only @[46rem]:not-sr-only">{{ action.label }}</span>
            </RouterLink>
          </nav>
        </div>
      </header>

      <!-- 1. Today, most important on top: on a phone, the deck. On a desktop,
           under the greeting and beside the apps: what needs attention, with
           the community under it, beside the week. All of it in the one
           screen: each list shows the rows that fit whole and counts the
           rest, which open in a sheet (HomeSheet) or their own page, so
           nothing scrolls, the page or a box on it. The community takes at
           most a little under half the column, so the work above it always
           has the room. -->
      <div class="lg:col-start-2 lg:row-start-2 lg:min-h-0">
      <AppHeroDeck :cards="cards" scope="home" label="Today" :spread="wide">
        <template #spread="{ urgent, rest, dismiss, leaving }">
          <!-- Where the middle is narrow, the work has it to itself and the
               community shares the week's column; where it is wide, the
               community sits under the work. Either way a column holding two
               lists gives each its share by what it holds (flex 0 1 auto). -->
          <div :class="['grid h-full min-h-0 gap-5', showWeek ? 'grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] 2xl:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1']">
            <div class="flex min-h-0 min-w-0 flex-col gap-5">
              <HomeAttention class="flex-[0_1_auto]" :cards="urgent" :dismiss="dismiss" :leaving="leaving" />
              <HomeCommunity v-if="roomy || !showWeek" class="flex-[0_1_auto]" :cards="rest" :dismiss="dismiss" :leaving="leaving" :detail-of="rowDetail" />
            </div>
            <div v-if="showWeek" class="flex min-h-0 min-w-0 flex-col gap-5">
              <HomeWeek class="flex-[0_1_auto]" :days="today.week.value" :events="weekEvents" />
              <HomeCommunity v-if="!roomy" class="flex-[0_1_auto]" :cards="rest" :dismiss="dismiss" :leaving="leaving" :detail-of="rowDetail" />
            </div>
          </div>
        </template>

        <template #card="{ card }">
          <BirthdayCard v-if="card.kind === 'birthday'" :card="card" />

          <!-- Something on a day: its date, the way a calendar shows it. -->
          <DeckCard
            v-else-if="card.kind === 'dated'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :dest="card.dest"
            :dest-label="card.destLabel"
            :inset="card.dismissible"
          >
            <template #leading>
              <span class="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light">
                <span class="text-[11px] font-bold uppercase">{{ card.date.month }}</span>
                <span class="mt-0.5 text-xl font-bold tabular-nums">{{ card.date.day }}</span>
              </span>
            </template>
            <DeckFaces v-if="card.faces" :tone="card.tone" v-bind="card.faces" />
            <DeckWeek v-else-if="card.day" :days="today.week.value" :mark="card.day" />
          </DeckCard>

          <!-- Tasks you owe: the first of them, as a list to tick. -->
          <DeckCard
            v-else-if="card.kind === 'tasks'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :to="card.to"
            :dest="card.dest"
            :dest-label="card.destLabel"
            :inset="card.dismissible"
          >
            <ul class="flex flex-col gap-1.5">
              <li v-for="task in card.tasks.slice(0, 2)" :key="task.id" class="flex min-w-0 items-center gap-2 text-sm">
                <span class="size-4 shrink-0 rounded-full border-2 border-current opacity-35" aria-hidden="true" />
                <span class="truncate">{{ task.title }}</span>
              </li>
            </ul>
            <p v-if="card.tasks.length > 2" class="mt-1.5 truncate text-xs opacity-60">and {{ card.tasks.length - 2 }} more</p>
          </DeckCard>

          <!-- The day, and the church: always at the bottom of the deck. -->
          <DeckCard
            v-else-if="card.kind === 'day'"
            tone="accent"
            :kicker="card.kicker"
            :title="card.title"
            :to="card.to"
          >
            <template #art>
              <!-- Ekkly's panes of light in the corner, the same shapes as the
                   home's sky and the hold preview: not the arch that stood
                   here, which ran off the card's foot and read as a door. -->
              <CardPanes />
            </template>

            <!-- The greeting is this card's headline, a size up from the rest of
                 the deck and on two lines: the time of day, then the name. -->
            <template #title>
              <span class="block text-[28px] leading-[1.1]">
                {{ card.greetingTime }}<template v-if="card.greetingName">,<br />{{ card.greetingName }}</template>
              </span>
            </template>

            <!-- The weather over the church right now (live sky), when there
                 is a report: a glance out of the window before the day. The
                 sky in a word, not the temperature: nobody plans a Sunday by
                 the degree, and the number only crowded the card. -->
            <template v-if="weather" #trailing>
              <span class="flex shrink-0 items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">
                <component :is="weatherIcon" class="size-4" />
                <span>{{ weather.label }}</span>
              </span>
            </template>

            <!-- Whose church this is: its own logo, on white so any logo reads
                 on any church colour, and its name. -->
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-gray-200 dark:ring-gray-700">
                <img :src="logoUrl" alt="" class="size-full object-contain" />
              </span>
              <span class="min-w-0 truncate text-[15px] font-semibold text-white/90">{{ card.churchName }}</span>
            </div>
          </DeckCard>

          <DeckCard
            v-else
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :dest="card.dest"
            :dest-label="card.destLabel"
            :inset="card.dismissible"
          >
            <DeckFaces v-if="card.faces" :tone="card.tone" v-bind="card.faces" />
            <DeckChips v-else-if="card.chips" :tone="card.tone" :items="card.chips" />
          </DeckCard>
        </template>
      </AppHeroDeck>
      </div>

      <!-- 2. The apps kept on the home, and the way to all of them, over the
           church on its hill. On a desktop the two are a sidebar down the
           left, the apps drawn as on a phone in the style chosen; on a phone
           the wrapper is not there (display: contents) and they stand in the
           page as they always have. -->
      <div class="contents lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:min-h-0 lg:flex-col lg:gap-4">
      <div
        v-if="!allApps.length"
        class="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Nothing has been shared with this account yet.</p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">An administrator grants access by ministry in Settings.</p>
      </div>

      <!-- Drawn in the style the church chose, or the one this person chose for
           themselves (HomeAppCards, useHomeCards). -->
      <HomeAppCards
        v-else
        class="lg:shrink-0"
        :variant="cardStyle"
        :column="wide"
        :apps="primary"
        :others="others"
        :hold="hold"
      />

      <!-- 3. The church on its hill, and the day's verse on a card beside
           it, in whatever room the apps leave at the foot of the screen. The
           home never scrolls, so the room decides: the verse steps aside
           before it would be cut off, and the church goes too where there is
           no room at all (the container queries below).
           With the bottom bar on, the hill runs on behind the bar - the room
           is never shorter than the bar's space, which is what keeps the apps
           above it - while the verse keeps to the part of the room above the
           bar (verse-space), and steps aside by that part's height. -->
      <!-- On a desktop the hill stands at the foot of the sidebar under the
           apps, about as tall as a phone gives it (a taller room only blew the
           church up), giving way where there is less (the container queries
           below); the verse is in the greeting. -->
      <section class="verse-room relative -mx-4 -mt-2 min-h-0 flex-1 with-bar:min-h-(--bottom-bar-space) lg:-mb-5 lg:-ml-6 lg:mr-0 lg:mt-auto lg:flex-[0_1_16rem]" aria-label="A verse for today">
        <HomeScene part="land" class="scene pointer-events-none absolute inset-0 size-full" />

        <div class="verse-space pointer-events-none absolute inset-x-0 top-0 bottom-(--bottom-bar-space)">
          <!-- With compact cards there is room under the apps, so the verse
               needs no card: it is set on the picture itself, in the open sky
               to the left of the church, whole if it fits (eight lines at
               most), with a soft halo so it reads over cloud. With the other
               styles the room is tighter and the verse keeps its frosted card
               at the foot, three lines at most.
               Either way the reference, then the translation under it,
               smaller: the reference is what someone would look up.
               The card stays clear of the home indicator without a bar; with
               one, the bar's space has cleared it already, so the second term
               goes negative and the card keeps a plain margin above the bar. -->
          <component
            :is="verseTo ? 'RouterLink' : 'div'"
            v-if="verse"
            v-bind="verseTo ? { to: verseTo } : {}"
            :class="[
              'verse pointer-events-auto absolute left-4 block text-left lg:hidden',
              openVerse
                ? 'verse-open top-3 max-w-[62%]'
                : 'bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)-var(--bottom-bar-space)))] max-w-[58%] rounded-2xl bg-white/80 px-3.5 py-3 ring-1 ring-white/70 backdrop-blur-md dark:bg-gray-900/70 dark:ring-white/10',
            ]"
          >
            <blockquote
              :class="[
                'italic leading-snug',
                openVerse ? 'line-clamp-8 text-[15px] text-(--scene-ink)' : 'line-clamp-3 text-[13px] text-gray-700 dark:text-gray-200',
              ]"
            >
              {{ verse.text }}
            </blockquote>
            <!-- On the picture, the sky's ink (HomeScene): the verse follows
                 the sky it is written on, not the app's theme. In its card,
                 the theme's, because the card is its own ground. -->
            <p
              :class="[
                'mt-1.5 truncate text-[10px] font-bold uppercase tracking-[0.18em]',
                openVerse ? 'text-(--scene-ink-accent)' : 'text-primary dark:text-primary-light',
              ]"
            >
              {{ verse.reference }}
            </p>
            <p
              :class="[
                'truncate text-[9px] font-medium tracking-wide',
                openVerse ? 'text-(--scene-ink-soft)' : 'text-gray-500 dark:text-gray-300/80',
              ]"
            >
              {{ verse.version }}
            </p>
          </component>
        </div>
      </section>
      </div>
    </main>

    <AppPeek
      :app="held?.item"
      :from="held?.el"
      :line="held ? lineOf(held.item) : ''"
      :drag="drag"
      @keep="keep"
      @close="release"
      @open="openHeld"
    />
  </div>
</template>

<style scoped>
/* The verse set on the picture: a soft halo of the sky behind its letters, so
   it reads over a cloud or a hill without a card behind it. Light on a light
   sky and dark on a night one (HomeScene's --scene-ink-halo), whatever the
   app's theme: it used to follow the theme, and dark mode under a noon sky
   put white letters in a dark glow on pale blue. */
.verse-open {
  text-shadow:
    0 0 10px var(--scene-ink-halo),
    0 0 2px var(--scene-ink-halo);
}

/* The desktop's hero, in the church's colour (the primary token) as the
   phone's day card is, and as that card does, a deeper shade of it on a dark
   page, where the token is the lighter one made for text. */
.home-hero {
  background-color: var(--color-primary);
}
.dark .home-hero {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

/* The room under the apps measures itself, so what it holds can step aside
   rather than be cut off on a short screen. */
.verse-room {
  container-type: size;
}

/* The verse's own measure: the room above the bottom bar, or the whole room
   without one. A query answers to the nearest container, so the verse asks
   this and the church still asks the whole room. */
.verse-space {
  container-type: size;
}

@container (max-height: 7.5rem) {
  .verse {
    display: none;
  }
}

@container (max-height: 3.5rem) {
  .scene {
    display: none;
  }
}
</style>

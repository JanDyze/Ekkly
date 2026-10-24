<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cake, CalendarDots, CaretDown, ClipboardCheck, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, KeyRound, ListChecks, MicrophoneStage, Moon, Sun, Swap, UserPlus } from '../icons'
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
import QuickActionsMenu from '../components/home/QuickActionsMenu.vue'
import QuickActionsBack from '../components/home/QuickActionsBack.vue'
import HomeBoard from '../components/home/HomeBoard.vue'
import HomeVerse from '../components/home/HomeVerse.vue'
import HomeSunday from '../components/home/HomeSunday.vue'
import HomePrayer from '../components/home/HomePrayer.vue'
import HomePhotos from '../components/home/HomePhotos.vue'
import HomeGroups from '../components/home/HomeGroups.vue'
import HomeBirthdays from '../components/home/HomeBirthdays.vue'
import HomeLinks from '../components/home/HomeLinks.vue'
import HomeYunit from '../components/home/HomeYunit.vue'
import HomeSimple from '../components/home/HomeSimple.vue'
import { useSimpleView } from '../composables/useSimpleView'
import HomeModeShutter from '../components/home/HomeModeShutter.vue'
import { HOME_COLUMNS, HOME_PANELS, OPTIONAL_PANELS, homeArranging, useHomeLayout } from '../composables/useHomeLayout'
import { useHomeCards } from '../composables/useHomeCards'
import { useHomeChurch } from '../composables/useHomeChurch'
import { useLiveSky } from '../composables/useLiveSky'
import { feel } from '../utils/yunitFeedback'
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
// Three things on it:
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
//   3. YUNIT, wherever the church has him (HomeYunit): a character standing
//      large beside a button to talk to him — on a phone at the foot of the
//      screen, left of the church; on a desktop at the foot of the last
//      column, beside the people rail, which shoves him when it opens. He
//      says hello as the home opens, and written to, his conversation rises
//      from him over the dimmed home. The quick actions are the "+" on the
//      day's card, a phone's as a desktop's (QuickActionsMenu).
//
// Everything is gated on the capability of the app it comes from (useToday,
// allowedGroups), so nobody sees a card or a tile for something they cannot
// open.
//
// On a desktop (lg) the same page has the room to show everything at once,
// and like a phone's it keeps to one screen and never scrolls. It is three
// columns, a quarter, a half and a quarter, whose panels anyone can drag into
// their own arrangement (HomeBoard, useHomeLayout); to begin with, this. The
// sidebar reads as a phone does, top to bottom: the day's card in the
// church's colour (the quick actions behind its "+"), the apps in the style
// chosen, and the church on its hill. The middle is the work: what needs
// attention (HomeAttention). The last is the week (HomeWeek). Each list shows
// the rows that fit its card, whole, and how many more (useRowsThatFit),
// never a row cut off or a list scrolling inside its card. An issue that covers
// several records is one row with its records under it, never a row each,
// and what is on goes in the week and nowhere else, so nothing is said twice.

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

const { can, isAdmin, myMember } = usePermissions()
const wide = useMediaQuery('(min-width: 1024px)')
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


// The day's card on a desktop: the day, whose church this is, and the
// greeting on two lines, as on the phone's day card.
const todayLong = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const churchName = computed(() => church.value?.shortName || church.value?.fullName || '')
const greetingTime = computed(() => greeting.value.split(', ')[0])
const greetingName = computed(() => greeting.value.split(', ').slice(1).join(', '))
// The day's card turned over, to its quick actions (QuickActionsBack): by
// its button, or by a click anywhere on it — on the back, anywhere but an
// action or its own buttons.
const dayFlipped = ref(false)
const onDayBack = (event) => {
  if (!event.target.closest('a, button')) dayFlipped.value = false
}

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
// The desktop's panels where this person has put them (useHomeLayout), less
// any whose app is not theirs to open: the week goes with Events, YUNIT with
// his app.
// Less any this person has off ("Show on my home", in the account menu;
// useHomeLayout's hiddenPanels — the panels from the apps are off until
// turned on), and any whose app they may not open (OPTIONAL_PANELS'
// capability), as the menu itself offers only those.
const { layout: homeLayout, moveBefore: movePanelBefore, swap: swapPanels, place: placeFoot, hiddenPanels, setShown, reset: resetLayout, isDefault: layoutIsDefault, showOnBoard } = useHomeLayout()
// The board holds still until someone asks to rearrange it from the account
// menu (homeArranging, HomeBoard's locked); leaving the home puts it back.
const stopArranging = () => (homeArranging.value = false)

// A move from the board (HomeBoard: a panel dropped, YUNIT set down, a full
// column tidied), whose place is counted among the panels the board shows,
// and counted before the panel is taken out of its own column. Saved by the
// shown panel it lands before, not by that count: the arrangement keeps the
// hidden panels too, and a count put a panel among them (useHomeLayout's
// moveBefore).
const movePanel = (key, column, index) => {
  const shown = boardColumns.value.find((each) => each.id === column)?.panels || []
  const at = shown.indexOf(key)
  const others = shown.filter((each) => each !== key)
  const place = at >= 0 && index > at ? index - 1 : index
  return movePanelBefore(key, column, others[place] || null)
}
onBeforeUnmount(stopArranging)
const mayOpen = (key) => {
  const capability = OPTIONAL_PANELS.find((panel) => panel.key === key)?.capability
  return !capability || can(capability)
}
const onBoard = (key) =>
  !hiddenPanels.value.includes(key) &&
  mayOpen(key) &&
  (key !== 'week' || showWeek.value) &&
  (key !== 'verse' || verse.value) &&
  (key !== 'yunit' || hasYunit.value)
const boardColumns = computed(() =>
  HOME_COLUMNS.map((column) => ({
    ...column,
    panels: homeLayout.value[column.id].filter(onBoard),
  }))
)
// The church on its hill stands at the foot of whichever column this person
// has put it in (useHomeLayout's `church`; the left to begin with), and
// always at the foot: it is dragged from column to column, never up one.
const footColumn = computed(() => homeLayout.value.church)
// The columns on the page: any with a panel in it, and the church's.
// The church can be turned off in Preferences (useHomeChurch): it is a picture
// and nothing more. Off, a desktop has no church at any column's foot, and a
// phone keeps the room under its apps, for the verse and YUNIT, on plain sky.
const { homeChurch, setHomeChurch } = useHomeChurch()
const standingColumns = computed(() => boardColumns.value.filter((column) => column.panels.length || (homeChurch.value && column.id === footColumn.value)))

// The church in front of the apps. Where the apps stand right above it and
// scroll — every app on a phone, or the apps panel last in the church's
// column on a desktop — they run on behind the hill rather than stopping
// short of it: the list keeps the hill's height free at its foot, so at rest
// nothing is hidden, and scrolled, the tiles go down into the hillside. As
// they do, the hill rises a little, as if walking toward the church. On a
// desktop the whole panel reaches down to the column's foot, solid, the
// church's land drawn in front of it (the footer's front copy): it used to
// fade out there (.apps-fade, still a phone's), which let the sky, rainbow
// and all, show through the card.
const churchOverApps = computed(() => {
  if (!homeChurch.value) return false
  if (!wide.value) return showAllApps.value
  return !yunitOverChurch.value && boardColumns.value.find((column) => column.id === footColumn.value)?.panels.at(-1) === 'apps'
})
// YUNIT standing just above the church, last in its column on a desktop:
// then the apps end above him, not behind the hill, and he keeps the foot of
// the column the church would otherwise be pushed down to.
const yunitOverChurch = computed(() => wide.value && homeChurch.value && yunitColumn.value?.id === footColumn.value && yunitLast.value)
const appsLift = ref(0)
const onAppsScroll = (event) => {
  appsLift.value = Math.min(event.target.scrollTop / 160, 1)
}
// How each panel shares its column: the day keeps its height; the apps and
// the lists share out the rest of the screen, as tall as what they hold where
// there is room, giving way where there is not, what needs attention least
// of all (it gives way half as fast), and none below a header and a couple of
// rows (9rem). However little room a list is left, it shows only the rows
// that fit, whole, and how many more (useRowsThatFit): squeezed lists used to
// cut a row off part way, or scroll inside their card, which nobody found.
const PANEL_FIT = computed(() => ({
  // Over the church, the apps panel reaches down behind it to the column's foot.
  apps: churchOverApps.value ? 'flex-1 min-h-[9rem]' : 'flex-[0_1_auto] min-h-[9rem]',
  attention: 'flex-[1_0.5_auto] min-h-[9rem]',
  community: 'flex-[1_1_auto] min-h-[9rem]',
  verse: 'flex-[0_0.6_auto] min-h-[8.5rem]',
  week: 'flex-[1_1_auto] min-h-[9rem]',
  sunday: 'flex-[1_1_auto] min-h-[9rem]',
  prayer: 'flex-[1_1_auto] min-h-[9rem]',
  // The photos size themselves to the panel (HomePhotos), so it takes its
  // share of the column like the lists rather than asking for a height.
  photos: 'flex-[1_1_auto] min-h-[9rem]',
  groups: 'flex-[1_1_auto] min-h-[9rem]',
  birthdays: 'flex-[1_1_auto] min-h-[9rem]',
  links: 'flex-[1_1_auto] min-h-[9rem]',
  // YUNIT's place keeps his height, and last in a column it is pushed down
  // to the column's foot, so he stands on the bottom of the screen however
  // short the panels above him are, rather than under them part way up.
  // His height is his and his bubble's (HomeYunit), never less than his own.
  yunit: yunitLast.value ? 'mt-auto shrink-0' : 'shrink-0',
}))
const showWeek = computed(() => wide.value && allApps.value.some((item) => item.path === '/events'))

/* ------------------------------------------------------------------ YUNIT */

// YUNIT on the home (HomeYunit), wherever the church has him. On a phone he
// stands at the foot of the church's room, left of the church; the room keeps
// his height free (--foot-space, below), as it does the bottom bar's, so no
// app goes behind him, and the home grows a scroll for it where there is no
// room, as it does for the bar. On a desktop he has a place among the panels
// like any of them (useHomeLayout; under the week to begin with, at the foot
// of the right-hand column, beside the people rail), anywhere in any column:
// a place his and his bubble's height (yunitSpot), which he stands in. Last in a column he
// stands at its foot, and last in the church's column, just above the
// church, which always keeps the very bottom. He is carried to another
// place himself (HomeYunit), the board showing where he would land as it does
// for a panel (board.aimAt, movePanel). Only in the last column, the one the
// people rail opens into, does it bowl him over.
const hasYunit = computed(() => allApps.value.some((item) => item.path === '/yunit'))
const yunitDocked = computed(() => !wide.value && hasYunit.value)
const yunitSpot = ref(null)
// Where he stands on the church's hill when his place is just above it.
const yunitPerch = ref(null)
const yunitOnHill = computed(() => yunitOverChurch.value && homeChurch.value)

/* ---------------------------------------------------------- the footer */

// On a desktop the church's land is a footer the width of the page, not a
// picture in one column: the hills run from edge to edge, so nothing ends in
// a square cut, and the church rises from them under whichever column it has
// been put in (footColumn). Under the other columns there are only the low
// hills, and their panels end just above them (--hill-band). The church's
// column keeps the church's height free at its foot (the room, below).
//
// The drawing is 534 high and 25800 across (HomeScene's `footer`), the
// church's middle at x 650 of it; it is drawn at the footer's height and
// slid along so that middle is under the middle of the church's column,
// measured from the board itself and again whenever the column changes size
// or place (the rail opening, a column emptying, the church moved). With
// YUNIT standing on the hill beside it, the church is set a little right of
// the middle, so the two of them are.
const footerOn = computed(() => wide.value && homeChurch.value)
const footer = ref(null)
const footerAt = ref(null)
const LAND = { high: 534, wide: 25800, left: -12000, middle: 650, withYunit: 520 }
let footerWatch = null
const measureFooter = () => {
  const box = footer.value?.getBoundingClientRect()
  const column = document.querySelector('[data-foot-body]')?.closest('[data-column]')
  if (!box || !column) return
  const r = column.getBoundingClientRect()
  footerAt.value = { high: box.height, middle: r.left + r.width / 2 - box.left, left: r.left - box.left, right: box.right - r.right }
}
// The church's column, as a cut of the footer's width (the land in front).
const churchClip = computed(() => (footerAt.value ? `inset(-50% ${footerAt.value.right}px 0 ${footerAt.value.left}px)` : 'inset(0 100% 0 0)'))
// Where the church itself is in its room, to take hold of it by: its width,
// about its middle (the drawing's 489 to 866, its middle 650, or 520 with
// YUNIT beside it), as a share of the room's height (534 of the drawing).
const churchGrip = computed(() => {
  const middle = yunitOnHill.value ? LAND.withYunit : LAND.middle
  return {
    left: `calc(50% + var(--church-room) * ${489 - middle} / 534)`,
    width: 'calc(var(--church-room) * 377 / 534)',
  }
})
const watchFooter = () => {
  footerWatch?.disconnect()
  footerWatch = null
  if (!footerOn.value || !footer.value) return
  const column = document.querySelector('[data-foot-body]')?.closest('[data-column]')
  footerWatch = new ResizeObserver(measureFooter)
  footerWatch.observe(footer.value)
  if (column) footerWatch.observe(column)
  measureFooter()
}
// Started once the home is mounted: the board's columns are read from what is
// set up further down (the apps the person has), and a watcher reads its
// sources the moment it is made.
onMounted(() => {
  watch([footerOn, footer, footColumn, () => boardColumns.value.map((column) => column.panels.length).join()], () => nextTick(watchFooter))
  nextTick(watchFooter)
})
onBeforeUnmount(() => footerWatch?.disconnect())
const landStyle = computed(() => {
  const at = footerAt.value
  if (!at) return { visibility: 'hidden' }
  const scale = at.high / LAND.high
  const middle = yunitOnHill.value ? LAND.withYunit : LAND.middle
  return {
    width: `${LAND.wide * scale}px`,
    height: `${at.high}px`,
    left: `${at.middle - (middle - LAND.left) * scale}px`,
    // The hill's lift (scene-lift) grows from under the church.
    transformOrigin: `${(middle - LAND.left) * scale}px 100%`,
  }
})
// YUNIT on the hill, left of the church: his middle at x 282 of the drawing
// and his feet at y 1690, on the ground rising to the church's mound and
// clear of its wing (x 494); never in front of the church.
const perchStyle = computed(() => {
  const at = footerAt.value
  if (!at) return { display: 'none' }
  const scale = at.high / LAND.high
  const him = Math.min(96, at.high * 0.55)
  return {
    width: `${him}px`,
    height: `${him}px`,
    left: `${at.middle + (282 - LAND.withYunit) * scale - him / 2}px`,
    bottom: `${(1774 - 1690) * scale - him * 0.04}px`,
  }
})
const board = ref(null)

// A column holding more than three cards (from before columns had a limit)
// is tidied: its last card goes to the column with the fewest (HomeBoard's
// tidy), one at a time until it has three, or nothing would take it. Looked
// at as the home opens and after any change to the layout.
let tidyTimer = null
const tidyBoard = () => {
  clearTimeout(tidyTimer)
  tidyTimer = setTimeout(() => {
    if (!wide.value) return
    const move = board.value?.tidy()
    if (move) movePanel(move.key, move.column, move.index)
  }, 400)
}
onMounted(() => {
  watch(() => boardColumns.value.map((column) => `${column.id}:${column.panels.join()}`).join('|') + homeLayout.value.church, tidyBoard)
  tidyBoard()
})
onBeforeUnmount(() => {
  clearTimeout(tidyTimer)
})
const yunitColumn = computed(() => boardColumns.value.find((column) => column.panels.includes('yunit')) || null)
const yunitLast = computed(() => yunitColumn.value?.panels.at(-1) === 'yunit')
const yunitBesideRail = computed(() => !!yunitColumn.value && standingColumns.value.at(-1)?.id === yunitColumn.value.id)
const yunitAnchor = computed(() => (wide.value ? yunitSpot.value : null))

// YUNIT in hand: the board leaves his place as an outline, offers every
// column, and shows the line he would land on; let go, he moves there.
//
// Only while the home is being rearranged (homeArranging), as for every
// panel: the rest of the time he cannot be picked up at all (HomeYunit's
// movable). And never off the home by being put down: the remove place shows at the
// foot of the screen, where he stands, so setting him down near his own spot
// took him off. The × in his corner while rearranging is the way off.
const onYunitDrag = ({ x, y }) => {
  if (!homeArranging.value) return
  board.value?.hold('yunit')
  board.value?.aimAt(x, y)
}
const onYunitPlace = ({ x, y }) => {
  if (!homeArranging.value) return
  // Put down where he will not fit, he goes back, and says so.
  if (board.value?.aimAt(x, y)?.full) feel('refuse')
  const at = board.value?.drop()
  // Over a full column he trades places with the panel he is put on, as a
  // panel does.
  if (at?.swap) swapPanels('yunit', at.swap)
  else if (at && !at.remove) movePanel('yunit', at.id, at.index)
}

// What may be dropped on the board's remove place while carried (HomeBoard's
// `removable`): the panels someone may have or not, and the church, while it
// stands there. The day, the apps and what needs attention are not among
// them, so the place never shows for those.
const removable = computed(() => [...OPTIONAL_PANELS.map((panel) => panel.key), ...(homeChurch.value ? ['church'] : [])])
const removeLabel = (key) => (key === 'church' ? 'The church picture' : OPTIONAL_PANELS.find((panel) => panel.key === key)?.label || 'That panel')

// Dropped there: off the home, as its switch under "Show on my home" turns it
// off, and said where to find it again.
const removePanel = (key) => {
  if (key === 'church') setHomeChurch(false)
  else setShown(key, false)
  toast.success(`${removeLabel(key)} is off your home. Bring it back from Show on my home.`)
}

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
// The board's usual arrangement is made from exactly what it shows
// (useHomeLayout's arrangeHome), so a panel this person may not open never
// takes a place another would have had. Here, once everything the board's
// panels depend on is defined.
watch(() => HOME_PANELS.filter(onBoard), showOnBoard, { immediate: true })
const { ordered, primary } = useAppOrder(allApps)
const others = computed(() => ordered.value.slice(primary.value.length))
// Or every app, for whoever asked for them all (useHomeCards' `showAll`).
const homeApps = computed(() => (showAllApps.value ? ordered.value : primary.value))
const homeOthers = computed(() => (showAllApps.value ? [] : others.value))

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

const { style: cardStyle, showAll: showAllApps } = useHomeCards()

// Simple view (Preferences): the quiet home instead of this one, handed the
// same Today cards and apps so the two never disagree (HomeSimple).
const { simpleView, shutter, homeShowing } = useSimpleView()
// The window plays only while the home is on screen to be closed.
onMounted(() => (homeShowing.value = true))
onBeforeUnmount(() => (homeShowing.value = false))
const simpleCards = computed(() => cards.value.filter((card) => card.kind !== 'day'))
// Simple view's figures, one for each of these apps this person may open,
// each opening its app.
const opens = (path) => allApps.value.some((item) => item.path === path)
const simpleStats = computed(() => {
  const overdue = today.myOverdue.value.length
  return [
    opens('/people') && {
      key: 'people',
      label: 'People',
      value: today.people.counts.value.total,
      to: '/people',
      note: plural(today.people.counts.value.members, 'member', 'members'),
    },
    opens('/events') && { key: 'events', label: 'Events this week', value: today.eventsThisWeek.value.length, to: '/events' },
    opens('/tasks') && {
      key: 'tasks',
      label: 'Your open tasks',
      value: today.myTasks.value.length,
      to: '/tasks',
      warn: overdue > 0,
      note: overdue ? `${overdue} overdue` : '',
    },
    opens('/prayer-concerns') && { key: 'prayer', label: 'Open prayer requests', value: today.openPrayers.value, to: '/prayer-concerns' },
  ].filter(Boolean)
})

// The desktop's apps panel, and whether its list has more below than shows:
// measured as it scrolls, as it or its tiles change size, and as the apps on
// it change.
const appsList = ref(null)
const appsMore = ref(false)
const measureApps = () => {
  const el = appsList.value?.$el
  appsMore.value = !!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4
}
// Its scroll also lifts the hill, where the panel runs on behind the church.
const onDeskAppsScroll = (event) => {
  measureApps()
  if (churchOverApps.value) onAppsScroll(event)
}
const scrollAppsDown = () => {
  const el = appsList.value?.$el
  el?.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' })
}
let appsObserver = null
watch(appsList, (list) => {
  appsObserver?.disconnect()
  const el = list?.$el
  // A component's $el is the comment Vue leaves while it renders nothing
  // (simple view, or on the way out), which ResizeObserver refuses.
  if (el instanceof Element && typeof ResizeObserver !== 'undefined') {
    appsObserver = new ResizeObserver(measureApps)
    appsObserver.observe(el)
    ;[...el.children].forEach((child) => appsObserver.observe(child))
  }
  measureApps()
})
watch(homeApps, () => nextTick(measureApps))
onBeforeUnmount(() => appsObserver?.disconnect())

// Compact cards leave room under the apps, so the verse is set on the picture
// itself, whole if it fits, rather than in a card (the verse, below).
const openVerse = computed(() => cardStyle.value === "compact")

// The time and weather over the church, for the picture (live sky).
const { sky, weather } = useLiveSky()

// With the sky live, every page is lit as the sky is (AdminLayout).

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
    case '/people':
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
       desktop each list shows the rows that fit, whole, and how many more. -->
  <!-- The page stands in a picture (HomeScene): its sky behind everything,
       and its church on the hill in the room the apps leave at the foot. -->
  <!-- With the bottom bar on, the bar takes the foot of the screen, so the
       home grows to fit rather than leave its apps under the bar: it still
       fits one screen wherever there is room, and scrolls only where there is
       not. -->
  <!-- YUNIT at the foot of a phone's home takes room there as the bar does,
       so the home grows a scroll the same way where it has to. -->
  <!-- Simple view (useSimpleView) instead of all of what follows, the
       switch between them closing and opening like a church window
       (HomeModeShutter) with the home changed while it is shut. -->
  <div class="relative h-full">
  <HomeModeShutter :phase="shutter" />
  <HomeSimple v-if="simpleView" key="simple" :greeting="greeting" :stats="simpleStats" :cards="simpleCards" />
  <div
    v-else
    key="full"
    :class="[
      'home-scene relative h-full bg-(--scene-sky-3) with-bar:overflow-y-auto with-bar:overscroll-contain',
      hasYunit ? 'with-yunit' : '',
      yunitDocked ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
    ]"
    v-bind="sky"
    :style="footerOn ? { '--hill-band': 'calc(var(--church-room) * 0.34)' } : null"
  >
    <HomeScene part="sky" class="pointer-events-none absolute inset-0 size-full" />

    <!-- On a desktop, the church's land as a footer the width of the page
         (the footer, above), behind the panels as the sky is, so the hills
         never run over a panel. YUNIT, standing on the hill, stands in it;
         nothing of the board is over him there (the church's room lets
         touches through, but for the church itself). -->
    <div
      v-if="footerOn"
      ref="footer"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-(--church-room) overflow-x-clip"
      :style="{ '--lift': churchOverApps ? appsLift : 0 }"
      aria-hidden="true"
    >
      <HomeScene part="land" footer class="scene-lift land-slide absolute bottom-0 max-w-none" :style="landStyle" />
      <div v-if="yunitOnHill" ref="yunitPerch" class="land-slide pointer-events-none absolute z-20" :style="perchStyle" />
    </div>

    <!-- Its foot keeps the footer's low hills clear on a desktop (--hill-band),
         so a panel ends above them rather than over them. -->
    <main
      :class="[yunitDocked ? 'h-auto min-h-full' : 'h-full', footerOn ? 'lg:pb-(--hill-band)' : 'lg:pb-5']"
      class="relative mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-4 sm:pt-6 with-bar:h-auto with-bar:min-h-full lg:grid lg:h-full lg:max-w-[112rem] lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pt-5">
      <!-- 1. Today, most important on top: on a phone, the deck. On a desktop,
           under the greeting and beside the apps: what needs attention
           beside the week. All of it in the one screen: the page never
           scrolls, and each list shows the rows that fit, whole, and how
           many more. -->
      <div class="lg:col-start-1 lg:row-start-1 lg:min-h-0">
      <AppHeroDeck :cards="cards" scope="home" label="Today" :spread="wide">
        <template #spread="{ urgent, rest, dismiss, leaving }">
          <!-- The panels, in the arrangement this person chose (HomeBoard,
               useHomeLayout): three columns, a quarter, a half and a quarter,
               and any panel dragged to another place. To begin with: the day
               and the apps down the left, the work in the middle, and the
               week on the right. The panels share out their column's
               height; each list shows the rows that fit, whole, never one cut
               off or scrolling inside, and says how many more. -->
          <HomeBoard
            ref="board"
            :locked="!homeArranging"
            :columns="boardColumns"
            :foot="homeChurch ? footColumn : null"
            :fit="PANEL_FIT"
            :removable="removable"
            @remove="({ key }) => removePanel(key)"
            @move="({ key, column, index }) => movePanel(key, column, index)"
            @swap="({ key, with: other }) => swapPanels(key, other)"
            @place="({ key, column }) => placeFoot(key, column)"
          >
            <template #panel="{ panel }">
              <!-- The day, as the phone's deck ends on it: one card in the
                   church's colour over Ekkly's panes of light, with the logo,
                   the day and the weather, and the greeting large on two lines
                   (the time of day, then the name). Beside the greeting, one
                   round button turns the card over to its quick actions
                   (QuickActionsBack): four buttons on the card made it busy. Search stays the top bar's;
                   the day's verse is a panel of its own (HomeVerse). -->
              <!-- Two-sided: the day on the front, and turned over by the button
                   in its corner (a card-flip, not a menu hanging off it), its
                   quick actions on the back, the same size and colour. Only
                   the side showing takes a touch or the keyboard. -->
              <header v-if="panel === 'day'" class="day-flip relative">
                <div :class="['day-flip-inner relative', dayFlipped && 'is-flipped']">
                <div class="day-face home-hero relative isolate cursor-pointer overflow-hidden rounded-[24px] border border-black/15 p-4 text-white dark:border-black/40" :inert="dayFlipped || undefined" @click="dayFlipped = true">
                  <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
                    <CardPanes />
                  </div>
                  <div class="flex min-w-0 items-center gap-3">
                    <span v-if="logoUrl" class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-black/10">
                      <img :src="logoUrl" alt="" class="size-full object-contain" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-[13px] font-semibold">{{ todayLong }}</p>
                      <p class="flex min-w-0 items-center gap-1.5 text-xs text-white/85">
                        <template v-if="weather">
                          <component :is="weatherIcon" class="size-3.5 shrink-0" />
                          <span class="shrink-0">{{ weather.label }}</span>
                          <span v-if="churchName" aria-hidden="true">·</span>
                        </template>
                        <span v-if="churchName" class="min-w-0 truncate">{{ churchName }}</span>
                      </p>
                    </div>
                  </div>
                  <h1 class="mt-3 pr-11 text-[24px] font-bold leading-[1.15] tracking-tight">
                    {{ greetingTime }}<template v-if="greetingName">,<br /><span class="block truncate">{{ greetingName }}</span></template>
                  </h1>
                </div>
                <div class="day-face day-back home-hero relative isolate cursor-pointer overflow-hidden rounded-[24px] border border-black/15 p-4 dark:border-black/40" :inert="!dayFlipped || undefined" @click="onDayBack">
                  <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
                    <CardPanes />
                  </div>
                  <QuickActionsBack />
                </div>
                </div>
                <!-- In the card's corner, on whichever side shows, turning it: by
                     the greeting on the front, at the top of the back, clear of
                     its actions. -->
                <button
                  type="button"
                  :class="dayFlipped ? 'top-3 right-3' : 'right-4 bottom-4'"
                  class="absolute z-10 flex size-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  :aria-label="dayFlipped ? 'Back to the day' : 'Quick actions'"
                  :title="dayFlipped ? 'Back to the day' : 'Quick actions'"
                  :aria-pressed="dayFlipped"
                  @click="dayFlipped = !dayFlipped"
                >
                  <Swap class="size-5" />
                </button>
              </header>

              <!-- The apps, drawn as on a phone in the style chosen
                   (HomeAppCards' `column`, useHomeCards). -->
              <template v-else-if="panel === 'apps'">
                <div v-if="!allApps.length" class="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                  <p class="text-sm text-gray-500 dark:text-gray-400">Nothing has been shared with this account yet.</p>
                  <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">An administrator grants access by ministry in Settings.</p>
                </div>
                <!-- In a panel of their own, headed as the board's other
                     panels are, the tiles scrolling inside it where there are
                     more than fit. While there are more below, a chevron at
                     its foot says so, and takes the list down a screen. -->
                <section
                  v-else
                  aria-labelledby="home-apps"
                  class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
                >
                  <!-- "See all" opens the All apps page, every app in a grid
                       with room to find one, as "Open calendar" opens the
                       month from the week. -->
                  <header class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 pt-2.5 pb-2 dark:border-white/10">
                    <h2 id="home-apps" class="text-sm font-semibold text-gray-900 dark:text-white">Apps</h2>
                    <RouterLink :to="{ name: 'AllApps' }" class="text-xs font-semibold whitespace-nowrap text-primary hover:underline dark:text-primary-light">
                      See all
                    </RouterLink>
                  </header>
                  <HomeAppCards
                    ref="appsList"
                    :class="['min-h-0 auto-rows-max overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin] *:shrink-0', churchOverApps ? 'pb-(--church-room)' : '']"
                    :variant="cardStyle"
                    column
                    :apps="homeApps"
                    :others="homeOthers"
                    :hold="hold"
                    @scroll.passive="onDeskAppsScroll"
                  />
                  <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150">
                    <div
                      v-if="appsMore"
                      :class="['pointer-events-none absolute inset-x-0 flex h-14 items-end justify-center pb-2', churchOverApps ? 'apps-more-over' : 'apps-more bottom-0']"
                    >
                      <button
                        type="button"
                        class="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200 transition-colors hover:text-gray-900 hover:ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-white/15 dark:hover:text-white"
                        aria-label="More apps below"
                        title="More apps below"
                        @click="scrollAppsDown"
                      >
                        <CaretDown class="size-4" />
                      </button>
                    </div>
                  </Transition>
                </section>
              </template>

              <HomeAttention v-else-if="panel === 'attention'" :cards="urgent" :dismiss="dismiss" :leaving="leaving" />
              <HomeCommunity v-else-if="panel === 'community'" :cards="rest" :dismiss="dismiss" :leaving="leaving" :detail-of="rowDetail" />
              <HomeWeek v-else-if="panel === 'week'" :days="today.week.value" :events="weekEvents" />
              <!-- The day's verse, a panel of its own on a desktop (on a phone
                   it is on the church's picture). -->
              <HomeVerse v-else-if="panel === 'verse'" :verse="verse" :to="verseTo" />
              <!-- The panels from the apps, each reading its own app only
                   while it is on the home. -->
              <HomeSunday v-else-if="panel === 'sunday'" />
              <HomePrayer v-else-if="panel === 'prayer'" />
              <HomePhotos v-else-if="panel === 'photos'" />
              <HomeGroups v-else-if="panel === 'groups'" />
              <HomeBirthdays v-else-if="panel === 'birthdays'" />
              <HomeLinks v-else-if="panel === 'links'" />
              <!-- YUNIT's place: at rest he stands in it (HomeYunit), and it
                   is as tall as he and his bubble are; lifted out, it keeps
                   that height until he is back. Not hidden from screen
                   readers, since his bubble's buttons are in it. -->
              <div v-else-if="panel === 'yunit'" ref="yunitSpot" class="@container flex h-full min-h-26 flex-col justify-end" />
            </template>

            <!-- The church on its hill, at the foot of the leftmost column: the
                 room is teleported here from the phone's layout, below. (The
                 way back to the first arrangement is in Preferences, where the
                 other choices about the home are.) -->
            <template #foot>
              <div id="home-left-foot" class="contents" />
            </template>
          </HomeBoard>
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
                 on any church colour, and its name; and at its end the "+"
                 for the quick actions, as the desktop's day card has,
                 opening as a sheet from the foot of the screen. -->
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-gray-200 dark:ring-gray-700">
                <img :src="logoUrl" alt="" class="size-full object-contain" />
              </span>
              <span class="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/90">{{ card.churchName }}</span>
              <QuickActionsMenu sheet class="shrink-0" />
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

      <!-- Rearranging the board, on a desktop, once asked for from the account
           menu ("Rearrange home"): a bar over the hills at the foot of the
           screen, where it covers no panel, saying how, with the way back to
           the usual arrangement and Done. Nothing shows the rest of the time. -->
      <div v-if="wide && homeArranging" class="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2">
        <div
          role="status"
          class="flex items-center gap-3 rounded-full bg-gray-900 py-1.5 pl-5 pr-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
        >
          Drag the panels where you want them
          <button
            v-if="!layoutIsDefault"
            type="button"
            class="rounded-full px-3 py-1.5 font-semibold text-white/80 hover:bg-white/10 hover:text-white dark:text-gray-700 dark:hover:bg-gray-900/10"
            @click="resetLayout"
          >
            Put back the usual
          </button>
          <button
            type="button"
            class="rounded-full bg-primary px-4 py-1.5 font-semibold text-white hover:bg-primary-hover"
            @click="stopArranging"
          >
            Done
          </button>
        </div>
      </div>

      <!-- 2. The apps kept on the home, and the way to all of them, over the
           church on its hill. On a desktop the two are a sidebar down the
           left, the apps drawn as on a phone in the style chosen; on a phone
           the wrapper is not there (display: contents) and they stand in the
           page as they always have. -->
      <div class="contents">

      <template v-if="!wide">
      <div
        v-if="!allApps.length"
        class="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Nothing has been shared with this account yet.</p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">An administrator grants access by ministry in Settings.</p>
      </div>

      <!-- Drawn in the style the church chose, or the one this person chose for
           themselves (HomeAppCards, useHomeCards). -->
      <!-- With every app on the home (CardStyleSheet), they scroll in their
           own place and the church keeps a little room under them. The rows
           keep the tiles' own height (auto-rows-max, shrink-0): a tile clips
           what it holds, so it would otherwise be squeezed flat, not scrolled. -->
      <HomeAppCards
        v-else
        :class="showAllApps ? ['-mx-0.5 -mt-0.5 min-h-0 shrink auto-rows-max overflow-y-auto overscroll-contain p-0.5 *:shrink-0', churchOverApps ? 'pb-(--church-room) apps-fade' : ''] : ''"
        :variant="cardStyle"
        :apps="homeApps"
        :others="homeOthers"
        :hold="hold"
        @scroll.passive="onAppsScroll"
      />
      </template>

      <!-- 3. The church on its hill, and the day's verse on a card beside
           it, in whatever room the apps leave at the foot of the screen. The
           home never scrolls, so the room decides: the verse steps aside
           before it would be cut off, and the church goes too where there is
           no room at all (the container queries below).
           With the bottom bar on, the hill runs on behind the bar - the room
           is never shorter than the bar's space, which is what keeps the apps
           above it - while the verse keeps to the part of the room above the
           bar (verse-space), and steps aside by that part's height. -->
      <!-- On a desktop the hill stands at the foot of the leftmost column,
           about as tall as a phone gives it (a taller room only blew the
           church up), giving way where there is less room (the container
           queries below). The verse is not on it there but a panel of its
           own (HomeVerse), to be put wherever someone likes it. -->
      <!-- Keyed by its column, so it moves when the column does: a Teleport
           does not follow its target to a new place by itself. -->
      <Teleport v-if="!wide || homeChurch" :key="footColumn" defer to="#home-left-foot" :disabled="!wide">
      <!-- In front of the apps (churchOverApps) the room is drawn over the
           foot of their list rather than under it: as tall as the list keeps
           free (--church-room), pulled up over it by that and the gap, and
           letting the pointer through to the tiles behind but for the verse.
           The hill lifts with the list's scroll (--lift). -->
      <!-- On a desktop the church is moved by taking hold of it (HomeBoard,
           data-foot-grab: the church and its mound, not the sky). Where YUNIT
           shares its column he stands just above it, the one pushed down to
           the foot (his place's mt-auto) and the church under him, so it no
           longer takes the room above itself. -->
      <section
        data-foot-body
        :class="[
          'verse-room relative -mx-4 -mt-2 min-h-(--foot-space) flex-1 lg:pointer-events-none lg:-mb-(--hill-band)',
          churchOverApps
            ? 'pointer-events-none z-10 flex-none h-(--church-room) max-lg:-mt-[calc(var(--church-room)+1.5rem)] lg:-mt-[calc(var(--church-room)+1rem)]'
            : // On a desktop the room only keeps the church's height free at
              // the foot of its column; the church is drawn in the footer. It
              // gives way when the column's panels need the room (the church
              // is not counted toward a column's limit): they go on down over
              // it, the church staying the background behind them, never over
              // them. Not with YUNIT standing on the hill there, though: then
              // the room is his too, and giving way slid his bubble and its
              // buttons down over him.
              yunitOverChurch
              ? 'lg:-mt-3 lg:flex-none lg:h-(--church-room)'
              : 'lg:mt-auto lg:min-h-0 lg:flex-[0_1_var(--church-room)]',
        ]"
        :style="{ '--lift': churchOverApps ? appsLift : 0 }"
        aria-label="A verse for today"
      >
        <!-- On a phone, the church on its hill here; a desktop draws it in
             the footer, the width of the page. -->
        <HomeScene v-if="homeChurch && !wide" part="land" class="scene scene-lift pointer-events-none absolute inset-0 size-full" />
        <div
          v-if="wide"
          data-foot-grab
          class="pointer-events-auto absolute bottom-0 z-10 h-[85%] cursor-grab"
          :style="churchGrip"
          title="Drag the church to another column"
          aria-hidden="true"
        />

        <div class="verse-space pointer-events-none absolute inset-x-0 top-0 bottom-(--foot-space)">
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
                : 'bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)-var(--foot-space)))] max-w-[58%] rounded-2xl bg-white/80 px-3.5 py-3 ring-1 ring-white/70 backdrop-blur-md dark:bg-gray-900/70 dark:ring-white/10',
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
      </Teleport>
      </div>
    </main>

    <!-- Where the apps reach down behind the church (churchOverApps), the
         same land again in front of them, cut to the church's own column, so
         the church stands before the apps there and nowhere else covers a
         panel. Drawn the same as the footer behind it, so no edge shows. -->
    <div
      v-if="footerOn && churchOverApps"
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-(--church-room) overflow-x-clip"
      :style="{ '--lift': appsLift, clipPath: churchClip }"
      aria-hidden="true"
    >
      <HomeScene part="land" footer class="scene-lift land-slide absolute bottom-0 max-w-none" :style="landStyle" />
    </div>

    <!-- YUNIT: on a phone at the foot of the church's room, left of the
         church; on a desktop told where his place on the board is: at the
         right-hand end of his own, or left of the church in the church's
         column. -->
    <HomeYunit
      v-if="hasYunit && !(wide && hiddenPanels.includes('yunit'))"
      :name="name"
      :anchor="yunitAnchor"
      :perch="yunitOnHill ? yunitPerch : null"
      :side="wide ? 'right' : 'left'"
      :beside-rail="wide && yunitBesideRail"
      :sky="sky['data-sky'] ? { phase: sky['data-sky'], weather: sky['data-weather'], rainbow: sky['data-rainbow'] !== undefined } : null"
      :movable="wide && homeArranging"
      @drag="onYunitDrag"
      @place="onYunitPlace"
    />

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
/* The day's card, two-sided: turned over about its upright middle, its
   back facing away until it is. */
.day-flip {
  perspective: 1400px;
}
/* Both sides in the one place, the card as tall as the taller. */
.day-flip-inner {
  display: grid;
  transform-style: preserve-3d;
  transition: transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.day-flip-inner.is-flipped {
  transform: rotateY(180deg);
}
.day-face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
}
.day-back {
  transform: rotateY(180deg);
}
@media (prefers-reduced-motion: reduce) {
  .day-flip-inner {
    transition: none;
  }
}

.home-hero {
  background-color: var(--color-primary);
}
.dark .home-hero {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

/* How tall the church's room is where it stands in front of the apps
   (churchOverApps): a phone's, and on a desktop a share of the screen. */
.home-scene {
  --church-room: 8rem;
  /* What the foot of a phone's home keeps free under the apps: the bottom
     bar's room when it is on, and YUNIT's when he is there (HomeYunit). */
  --foot-space: var(--bottom-bar-space);
}
/* YUNIT's place on a phone: clear of the home indicator, or above the bottom
   bar when it is on (--yunit-foot, which HomeYunit stands on), and his own
   height, the mascot beside the button to talk to him, with a little air
   above him. A desktop gives him a place of his own on the board instead. */
@media (width < 64rem) {
  .home-scene.with-yunit {
    --yunit-foot: max(0.75rem, env(safe-area-inset-bottom), calc(var(--bottom-bar-space) + 0.5rem));
    --foot-space: calc(var(--yunit-foot) + 5.5rem);
  }
}
@media (min-width: 1024px) {
  .home-scene {
    --church-room: clamp(9rem, 24vh, 15rem);
  }
}

/* The apps fading out as they go down behind the church: whole above the
   room it stands in, gone by the time they reach the church itself, so only
   the sky is seen behind the hill. The tiles fade, not a veil over them, so
   it is the real sky, whatever the time of day, and no tile's edge stands
   behind the church like a cliff. */
.apps-fade {
  mask-image: linear-gradient(
    to bottom,
    #000 calc(100% - var(--church-room) * 1.15),
    transparent calc(100% - var(--church-room) * 0.6)
  );
}

/* The foot of the apps panel while there are more apps below: the tiles
   fading under the chevron that says so, into the panel's own white. */
.apps-more {
  background: linear-gradient(to bottom, transparent, var(--color-white) 70%);
}
.dark .apps-more {
  background: linear-gradient(to bottom, transparent, var(--color-gray-900) 70%);
}
/* Where the panel fades out behind the church, the chevron stands just above
   the fade (.apps-fade), where it can still be seen and pressed. */
.apps-more-over {
  bottom: calc(var(--church-room) * 1.15);
}

/* The footer's land and YUNIT on it slide along with the church's column
   when it moves (the rail opening, the church carried to another). */
.land-slide,
.scene-lift.land-slide {
  transition:
    left 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
    scale 180ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .land-slide {
    transition: none;
  }
}

/* The hill rising a little as the apps scroll down behind it (--lift, 0 to
   1): it grows from its foot rather than moving up, so nothing behind it
   shows underneath. */
.scene-lift {
  scale: calc(1 + var(--lift, 0) * 0.06);
  transform-origin: 70% 100%;
  transition: scale 180ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .scene-lift {
    scale: none;
  }
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

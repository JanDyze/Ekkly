<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDots, ClipboardCheck, KeyRound, ListChecks, MicrophoneStage } from '../icons'
import AppHeroDeck from '../components/appframe/AppHeroDeck.vue'
import DeckCard from '../components/appframe/DeckCard.vue'
import AppShortcut from '../components/appframe/AppShortcut.vue'
import DeckFaces from '../components/appframe/DeckFaces.vue'
import DeckChips from '../components/appframe/DeckChips.vue'
import DeckWeek from '../components/appframe/DeckWeek.vue'
import AppsDrawer from '../components/appframe/AppsDrawer.vue'
import AppPeek from '../components/appframe/AppPeek.vue'
import AppArt from '../components/common/AppArt.vue'
import { useAppOrder } from '../composables/useAppOrder'
import { usePressAndHold } from '../composables/usePressAndHold'
import BirthdayCard from '../components/members/BirthdayCard.vue'
import { usePermissions } from '../composables/usePermissions'
import { useAuth } from '../composables/useAuth'
import { useAppSettings } from '../composables/useAppSettings'
import { useToast } from '../composables/useToast'
import { useToday } from '../composables/useToday'
import { useHomeVerse } from '../composables/useHomeVerse'
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
//   2. The apps this person keeps on their home — five, as tiles with their
//      artwork and one line of what is true inside each — and More apps, which
//      opens every app (AppsDrawer), where they can open any of them or press
//      and hold to choose which five are here. The bottom bar's drawer did
//      the same; the five it kept on the bar are the five kept here.
//      Holding one of the five shows what that app is, full screen, until
//      the finger lifts (AppPeek); a tap still just opens it.
//
// Everything is gated on the capability of the app it comes from (useToday,
// allowedGroups), so nobody sees a card or a tile for something they cannot
// open.

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
      title: `${plural(n, 'account', 'accounts')} to link`,
      detail: 'Someone signed in and says a record on the roll is theirs.',
      to: '/accounts',
      dest: 'accounts',
      destLabel: 'Accounts',
      faces: { members: claimed, empty: n - claimed.length, caption: claimed.length ? `For ${namesOf(claimed)}` : '' },
    })
  }

  today.birthdaysToday.value.forEach(({ member, turning }) => {
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

  // Late first, then due today, never both: two cards about one list.
  const late = today.myOverdue.value
  const due = today.myDueToday.value
  if (late.length || due.length) {
    const tasks = late.length ? late : due
    list.push({
      kind: 'tasks',
      key: `tasks:${late.length ? 'late' : 'today'}:${tasks.length}`,
      tone: late.length ? 'warn' : 'plain',
      icon: ListChecks,
      dismissible: true,
      kicker: late.length ? 'Overdue' : 'Due today',
      title: `${plural(tasks.length, 'task', 'tasks')} of yours ${late.length ? 'overdue' : 'due today'}`,
      to: '/tasks',
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
      title: `${plural(n, 'gathering', 'gatherings')} with no attendance`,
      detail: 'They stay on the list until someone records or dismisses them.',
      to: { name: 'AttendanceOwed' },
      dest: 'attendance',
      destLabel: 'To record, in Attendance',
      chips: today.unrecordedRows.value.map((row) => ({
        key: String(row.occurrenceKey || row.id),
        label: formatShortDate(row.date),
      })),
    })
  }

  // What is on: today's, or the next thing this week.
  const on = today.eventsToday.value
  if (on.length) {
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

  // The card that is always there: the person greeted by name, the day, and
  // whose church this is — with a short verse to start the day along its
  // foot. The verse opens its chapter in the Bible, for whoever has the Bible
  // app; until it has loaded, or where it cannot (offline, before the book
  // was ever fetched), the foot is simply empty.
  const now = new Date()
  const v = verse.value
  const canRead = allApps.value.some((item) => item.path === '/bible')
  list.push({
    kind: 'day',
    key: 'day',
    tone: 'accent',
    kicker: greeting.value,
    title: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    detail: church.value?.shortName || church.value?.fullName || '',
    to: v && canRead ? { name: 'Bible', params: { slug: v.slug, chapter: v.chapter } } : null,
    dest: 'bible',
    destLabel: 'the chapter in the Bible',
    verse: v,
  })

  return list
})

/* -------------------------------------------------------------- the apps */

// Every app this person may open, in the navigation's order; the five on
// the home are whichever they keep first (useAppOrder).
const allApps = computed(() => allowedGroups(can, isAdmin.value).flatMap((group) => group.items))
const { ordered, primary } = useAppOrder(allApps)
const others = computed(() => ordered.value.slice(primary.value.length))

const showDrawer = ref(false)

// Holding an app's tile shows what it is; letting go puts it away.
const { held, start: startHold, holdStill, swallowClick } = usePressAndHold()

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
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
    <main class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-4 sm:pt-6">
      <!-- 1. Today, most important on top -->
      <AppHeroDeck :cards="cards" scope="home" label="Today">
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
            :detail="card.detail"
            :to="card.to"
            :dest="card.dest"
            :dest-label="card.destLabel"
          >
            <template #art>
              <!-- An arched window in outline, the shape of Ekkly's mark
                   (BRAND.md: the window is the motif), drawn as lines on the
                   colour rather than as light glowing through it. -->
              <svg class="absolute -bottom-10 right-5 h-60 w-36" viewBox="0 0 144 240" fill="none">
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.3" stroke-width="1.5" />
                <path d="M20 72a52 52 0 0 1 104 0V240H20Z" stroke="white" stroke-opacity="0.15" stroke-width="1.5" />
              </svg>
            </template>
            <!-- The church's own logo, on white so any logo reads on any
                 church colour. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg shadow-black/10">
                <img :src="logoUrl" alt="" class="size-full object-contain" />
              </span>
            </template>
            <!-- A verse for the day, small, under the day itself: three lines at
                 most, and its reference under it. Three still fits the
                 deck's shortest card (216px) beside a one-line date. -->
            <figure v-if="card.verse" class="border-l-2 border-white/40 pl-3">
              <blockquote class="line-clamp-3 text-sm leading-snug text-white/90">{{ card.verse.text }}</blockquote>
              <figcaption class="mt-1 truncate text-xs font-medium text-white/70">
                {{ card.verse.reference }} · {{ card.verse.version }}
              </figcaption>
            </figure>
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

      <!-- 2. The apps kept on the home, and the way to all of them -->
      <div
        v-if="!allApps.length"
        class="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Nothing has been shared with this account yet.</p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">An administrator grants access by ministry in Settings.</p>
      </div>

      <nav v-else class="grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Your apps">
        <AppShortcut
          v-for="(item, index) in primary"
          :key="item.path"
          :to="item.path"
          :title="item.name"
          :art="item.art"
          level="app"
          :detail="lineOf(item)"
          :delay="120 + index * 30"
          @pointerdown="startHold($event, item)"
          @touchmove="holdStill"
          @click.capture="swallowClick"
        />

        <!-- More apps: a peek at four of the rest, the way a phone shows a
             folder, so it reads as more of the same rather than a setting. -->
        <button
          v-if="others.length"
          type="button"
          :style="{ animationDelay: `${120 + primary.length * 30}ms` }"
          class="animate-rise group flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-gray-200/80 transition duration-200 ease-out hover:ring-gray-300 pressed:scale-[0.97] dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
          @click="showDrawer = true"
        >
          <span class="grid size-12 grid-cols-2 gap-0.5 rounded-[14px] bg-linear-to-b from-white to-gray-50 p-1.5 shadow-md shadow-gray-900/10 ring-1 ring-gray-200/90 dark:from-gray-600 dark:to-gray-700 dark:shadow-black/30 dark:ring-gray-500/40">
            <AppArt v-for="item in others.slice(0, 4)" :key="item.path" :app-key="item.art" class="size-full" />
          </span>
          <span class="mt-auto min-w-0">
            <span class="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">More apps</span>
            <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ others.length }} more · arrange yours</span>
          </span>
        </button>
      </nav>
    </main>

    <AppsDrawer :show="showDrawer" :apps="allApps" @close="showDrawer = false" />
    <AppPeek :app="held?.item" :from="held?.el" :line="held ? lineOf(held.item) : ''" />
  </div>
</template>

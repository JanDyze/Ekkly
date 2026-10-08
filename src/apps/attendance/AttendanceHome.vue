<script setup>
import { computed } from 'vue'
import { ClipboardCheck, HandWaving } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import AppShortcut from '../../components/appframe/AppShortcut.vue'
import AppArt from '../../components/common/AppArt.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import TurnoutRing from '../../components/attendance/TurnoutRing.vue'
import { useAttendanceOverview } from '../../composables/useAttendanceOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'

// The Attendance app's home, built the way People's and Schedules' are. One
// screen, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top: the oldest
//      gathering nobody has counted, for whoever counts them, and the people
//      not seen in three weeks. Under them, the card that is always there:
//      how many different people the church saw this month — the one number
//      that is about the whole church rather than one service — with the last
//      few turnouts drawn along its foot.
//   2. The doors: every gathering, what is still to count, who has gone
//      quiet, and the months side by side, each with a line and a picture of
//      what is in it.
//
// It used to be the list of gatherings itself, with the backlog on the plus
// button. The list is a section now; what it could not say — reach, and who
// has stopped coming — leads.

const { loading, canRecord, stats, recentBars, months, quietPeople, awaiting, latest } = useAttendanceOverview()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const keyOf = (member) => member.firestoreId || member.id
const shortDate = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/* -------------------------------------------------------------- the deck */

const reach = computed(() => stats.value.reach)

/** How this month compares with the last one counted, in people. */
const delta = computed(() => {
  const r = reach.value
  if (!r || r.priorCount === null) return ''
  const by = r.count - r.priorCount
  if (!by) return `the same as ${r.priorLabel}`
  return `${Math.abs(by)} ${by > 0 ? 'more' : 'fewer'} than ${r.priorLabel}`
})

const cards = computed(() => {
  const list = []

  // The oldest gathering still owed: one card, the rest behind To record.
  const owed = awaiting.value[0]
  if (canRecord.value && owed) {
    const more = awaiting.value.length - 1
    list.push({
      kind: 'dated',
      key: `owed:${owed.occurrenceKey || owed.id}`,
      tone: 'warn',
      icon: ClipboardCheck,
      dismissible: true,
      kicker: 'Still to count',
      title: `Record ${owed.eventTitle || 'a gathering'}`,
      detail: more ? `${shortDate(owed.date)} · ${more} more waiting` : shortDate(owed.date),
      to: { name: 'RecordAttendance', query: { key: String(owed.occurrenceKey || owed.id) } },
      date: owed.date,
    })
  }

  // People who used to come and have stopped: the pastoral card. Said as an
  // invitation — "Tara!" — with their faces at full strength, never faded or
  // ringed like someone taken off the roll.
  if (quietPeople.value.length) {
    const people = quietPeople.value
    const names = people.slice(0, 2).map((row) => getDisplayName(row.member))
    if (people.length > 2) names.push(plural(people.length - 2, 'other', 'others'))
    list.push({
      kind: 'quiet',
      key: `quiet:${people.length}:${people.slice(0, 2).map((row) => row.id).join(',')}`,
      tone: 'plain',
      icon: HandWaving,
      dismissible: true,
      kicker: 'Invite them back',
      title: `${plural(people.length, 'person', 'people')} not seen in three weeks`,
      detail: listPhrase(names),
      to: { name: 'AttendanceQuiet' },
      members: people.map((row) => row.member),
    })
  }

  // The card that is always there: how many the church saw this month.
  list.push({
    kind: 'reach',
    key: 'reach',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Attendance' : reach.value ? plural(reach.value.count, 'person', 'people') : 'Nothing counted yet',
    detail: loading.value
      ? ''
      : reach.value
        ? `Seen in ${reach.value.monthLabel}${delta.value ? `, ${delta.value}` : ''}`
        : 'Once a gathering is counted, who came shows here.',
    to: reach.value ? { name: 'AttendanceMonths' } : null,
  })

  return list
})

/* -------------------------------------------------------------- the doors */

const doors = computed(() => {
  const ready = !loading.value
  const last = latest.value
  const owedCount = awaiting.value.length
  return [
    {
      key: 'gatherings',
      title: 'Gatherings',
      art: 'attendance-gatherings',
      to: { name: 'Attendance' },
      detail: !ready ? '' : last ? `Last: ${last.count} on ${shortDate(last.row.date)}` : 'Every gathering, by month',
    },
    ...(canRecord.value
      ? [
          {
            key: 'owed',
            title: 'To record',
            art: 'attendance-record',
            to: { name: 'AttendanceOwed' },
            detail: !ready ? '' : owedCount ? `${owedCount} waiting` : 'All counted',
          },
        ]
      : []),
    {
      key: 'quiet',
      title: 'Not seen lately',
      art: 'attendance-quiet',
      to: { name: 'AttendanceQuiet' },
      detail: !ready ? '' : quietPeople.value.length ? plural(quietPeople.value.length, 'person', 'people') : 'Everyone has been',
    },
    {
      key: 'months',
      title: 'By month',
      art: 'attendance-months',
      to: { name: 'AttendanceMonths' },
      detail: !ready ? '' : reach.value ? `${reach.value.count} in ${reach.value.monthLabel}` : 'People seen, month by month',
    },
  ]
})

/** The last four months' reach, oldest first, as the tile's little columns. */
const monthBars = computed(() => {
  const shown = months.value.slice(0, 4).reverse()
  const largest = Math.max(...shown.map((m) => m.count), 1)
  return shown.map((m) => ({ key: m.key, height: Math.max(15, Math.round((m.count / largest) * 100)) }))
})

const FACES = 6
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What matters about attendance, most important on top -->
      <AppHeroDeck :cards="cards" scope="attendance" label="Attendance today" class="animate-rise">
        <template #card="{ card }">
          <!-- A gathering still to count: its date, the way a calendar shows it. -->
          <DeckCard
            v-if="card.kind === 'dated'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <template #leading>
              <DateTile :date="card.date" class="size-14! rounded-2xl!" />
            </template>
          </DeckCard>

          <!-- People gone quiet: their faces. -->
          <DeckCard
            v-else-if="card.kind === 'quiet'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <div class="flex items-center">
              <div class="flex -space-x-2.5">
                <MemberAvatar
                  v-for="member in card.members.slice(0, FACES)"
                  :key="keyOf(member)"
                  :member="member"
                  alt=""
                  size="h-9 w-9"
                  plain-class="ring-2 ring-white dark:ring-gray-800"
                />
              </div>
              <span v-if="card.members.length > FACES" class="ml-2 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                +{{ card.members.length - FACES }}
              </span>
            </div>
          </DeckCard>

          <!-- How many the church saw: its number, large, and the last few
               gatherings drawn along the foot. -->
          <DeckCard
            v-else
            tone="accent"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
          >
            <template #art>
              <!-- Light through an arched window, the outline of Ekkly's mark
                   (BRAND.md: the window is the motif). -->
              <svg class="absolute -bottom-10 right-5 h-60 w-36" viewBox="0 0 144 240" fill="none">
                <defs>
                  <linearGradient id="attendance-arch-light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="white" stop-opacity="0.2" />
                    <stop offset="0.75" stop-color="white" stop-opacity="0.03" />
                    <stop offset="1" stop-color="white" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" fill="url(#attendance-arch-light)" />
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.14" stroke-width="1.5" />
              </svg>
            </template>
            <!-- The Attendance artwork, on white because its orange and blue
                 are Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10">
                <AppArt app-key="attendance" :play="1" class="size-10" />
              </span>
            </template>
            <template v-if="reach" #title>
              <span class="text-5xl font-bold tabular-nums tracking-tight">{{ reach.count.toLocaleString() }}</span>
              <span class="ml-2 text-lg font-semibold text-white/80">{{ reach.count === 1 ? 'person' : 'people' }}</span>
            </template>
            <!-- The last few turnouts, oldest on the left, the latest solid. -->
            <template v-if="recentBars.length" #default>
              <div class="flex h-12 items-end gap-1.5" aria-hidden="true">
                <span
                  v-for="bar in [...recentBars].reverse()"
                  :key="bar.key"
                  :class="['flex-1 rounded-t-md', bar.isLatest ? 'bg-white' : 'bg-white/35']"
                  :style="{ height: `${bar.width}%` }"
                />
              </div>
              <p class="mt-1.5 truncate text-xs text-white/80">
                Last: {{ recentBars[0].title }} · {{ recentBars[0].count }} on {{ recentBars[0].dateLabel }}
              </p>
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <nav class="grid grid-cols-2 gap-2.5" aria-label="Attendance">
        <AppShortcut
          v-for="(door, index) in doors"
          :key="door.key"
          :to="door.to"
          :title="door.title"
          :detail="door.detail"
          :art="door.art"
          :delay="120 + index * 30"
        >
          <template #aside>
            <!-- Gatherings: how full the last one was. -->
            <TurnoutRing
              v-if="door.key === 'gatherings' && latest"
              :share="latest.share"
              size="h-9 w-9"
              text-class="text-[9px]"
            />

            <!-- To record: how many are owed, in amber while any are. -->
            <span
              v-else-if="door.key === 'owed' && awaiting.length"
              class="flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-bold tabular-nums text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            >
              {{ awaiting.length }}
            </span>

            <!-- Not seen lately: a few of their faces. -->
            <span v-else-if="door.key === 'quiet' && quietPeople.length" class="flex -space-x-2">
              <MemberAvatar
                v-for="row in quietPeople.slice(0, 3)"
                :key="row.id"
                :member="row.member"
                alt=""
                size="h-7 w-7"
                plain-class="ring-2 ring-white dark:ring-gray-800"
              />
            </span>

            <!-- By month: the last few months' reach, side by side. -->
            <span v-else-if="door.key === 'months' && monthBars.length" class="flex h-8 items-end gap-1" aria-hidden="true">
              <span
                v-for="(bar, i) in monthBars"
                :key="bar.key"
                :class="['w-2 rounded-t-sm', i === monthBars.length - 1 ? 'bg-primary dark:bg-primary-light' : 'bg-primary/30 dark:bg-primary-light/30']"
                :style="{ height: `${bar.height}%` }"
              />
            </span>
          </template>
        </AppShortcut>
      </nav>
    </div>
  </AppScreen>
</template>

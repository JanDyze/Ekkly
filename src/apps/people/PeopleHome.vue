<script setup>
import { computed } from 'vue'
import { Cake, ClipboardText, HandHeart, KeyRound } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import BirthdayCard from '../../components/members/BirthdayCard.vue'
import AppShortcut from '../../components/appframe/AppShortcut.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import AppArt from '../../components/common/AppArt.vue'
import { usePeopleOverview, whenOfBirthday } from '../../composables/usePeopleOverview'
import { useMemberStats } from '../../composables/useMemberStats'
import { getDisplayName, getFullName } from '../../utils/memberUtils'
import { todayIso } from '../../utils/lineupUtils'

// The People app's home. One screen, no scrolling, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top: an account
//      waiting to be linked to its record, each birthday today, the
//      birthdays coming this week, the records still to fill in, the people
//      in no ministry, and under them all the card that is always true — how
//      many people the church has. Anything that matters gets the main card
//      rather than a line in a list behind a button; each of those can be
//      dismissed until the app is next opened, and the roll cannot.
//
//      Each kind of card looks like what it is about (DeckCard): a birthday
//      is the person's face in confetti, a coming birthday is its date, the
//      records to fill in are a bar filling up, the roll is its number.
//   2. The doors: the whole roll, birthdays, ministries, the roll at a glance,
//      the records still to fill in, and your own.

const {
  members,
  loading,
  canEdit,
  myMember,
  counts,
  birthdays,
  birthdaysToday,
  birthdaysThisWeek,
  incomplete,
  unplaced,
  claimsWaiting,
} = usePeopleOverview()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
const keyOf = (member) => member.firestoreId || member.id

/** The date a birthday `days` from now falls on, as the tile shows it. */
const dateParts = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return { month: date.toLocaleDateString(undefined, { month: 'short' }), day: date.getDate() }
}

/* -------------------------------------------------------------- the deck */

const today = todayIso()

const cards = computed(() => {
  const list = []

  // Someone is waiting on an administrator to let them in properly, so it
  // leads. Keyed by the count, so a new request brings a dismissed card back.
  if (claimsWaiting.value) {
    list.push({
      kind: 'claims',
      key: `claims:${claimsWaiting.value}`,
      tone: 'warn',
      dismissible: true,
      kicker: 'Waiting on you',
      title: `${plural(claimsWaiting.value, 'account', 'accounts')} to link`,
      detail: 'Someone signed in and says a record on the roll is theirs.',
      to: { path: '/settings', query: { section: 'accounts' } },
    })
  }

  // One card each, because a birthday is about one person.
  birthdaysToday.value.forEach(({ member, turning }) => {
    list.push({
      kind: 'birthday',
      key: `birthday:${keyOf(member)}:${today}`,
      tone: 'celebrate',
      dismissible: true,
      kicker: 'Birthday today',
      title: turning ? `${getDisplayName(member)} turns ${turning}` : `It's ${getDisplayName(member)}'s day`,
      detail: getFullName(member),
      to: recordOf(member),
      member,
      name: getDisplayName(member),
      turning,
    })
  })

  // The birthdays still to come: this week's together, or when there are
  // none this week, the next one this month — a card to buy ahead of. Keyed
  // by who, so a different set of names is news again.
  const ahead = birthdays.value.filter((row) => row.days >= 1 && row.days <= 6)
  const soon = ahead.length ? ahead : birthdays.value.filter((row) => row.days >= 7).slice(0, 1)
  if (soon.length) {
    const first = soon[0]
    const on = first.days === 1 ? 'tomorrow' : `on ${whenOfBirthday(first.days)}`
    list.push({
      kind: 'upcoming',
      key: `upcoming:${soon.map((row) => keyOf(row.member)).join(',')}`,
      tone: 'plain',
      dismissible: true,
      kicker: ahead.length ? 'Birthdays this week' : 'Next birthday',
      title:
        soon.length === 1
          ? first.turning
            ? `${getDisplayName(first.member)} turns ${first.turning} ${on}`
            : `${getDisplayName(first.member)}'s birthday is ${on}`
          : `${soon.length} birthdays this week`,
      detail: soon.length === 1 ? getFullName(first.member) : '',
      to: soon.length === 1 ? recordOf(first.member) : { name: 'PeopleBirthdays' },
      date: dateParts(first.days),
      rows: soon,
    })
  }

  if (canEdit.value && incomplete.value.length) {
    const complete = counts.value.total - incomplete.value.length
    list.push({
      kind: 'missing',
      key: 'missing',
      tone: 'plain',
      dismissible: true,
      kicker: 'Still to do',
      // Said as what goes wrong, not which fields are empty: a record without
      // a birthday is a greeting nobody sends and a person in no age group.
      title: `${plural(incomplete.value.length, 'record', 'records')} to complete`,
      detail: 'Finish them so nobody is missed on their birthday or left out of the counts.',
      to: { name: 'PeopleMissing' },
      complete,
      share: counts.value.total ? complete / counts.value.total : 0,
    })
  }

  // Somebody on the roll and in no ministry is somebody nobody has asked yet.
  if (canEdit.value && counts.value.total && unplaced.value.length) {
    list.push({
      kind: 'unplaced',
      key: `unplaced:${unplaced.value.length}`,
      tone: 'plain',
      dismissible: true,
      kicker: 'Not serving yet',
      title: `${plural(unplaced.value.length, 'person', 'people')} in no ministry`,
      detail: 'Worth asking each of them where they would like to help.',
      to: { name: 'PeopleUnplaced' },
      members: unplaced.value,
    })
  }

  // The card that is always there, at the bottom of the deck.
  const { total, members: memberCount, attendees } = counts.value
  list.push({
    kind: 'roll',
    key: 'roll',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'People' : total ? plural(total, 'person', 'people') : 'Nobody on the roll yet',
    detail: loading.value
      ? ''
      : total
        ? `${plural(memberCount, 'member', 'members')} · ${plural(attendees, 'attendee', 'attendees')}`
        : canEdit.value
          ? 'Add the first person and the rest of Ekkly can start counting them.'
          : 'People show here once they are added.',
    to: total ? { name: 'Members' } : null,
    total,
    memberCount,
    attendees,
    ready: !loading.value && total > 0,
  })

  return list
})

/* -------------------------------------------------------------- the doors */

// Each door says what is true behind it, in a few words, so the grid is
// worth reading as well as tapping.
const birthdaysLine = computed(() => {
  const today = birthdaysToday.value
  if (today.length === 1) return `${getDisplayName(today[0].member)} today`
  if (today.length > 1) return `${today.length} today`
  if (birthdaysThisWeek.value.length) return `${birthdaysThisWeek.value.length} this week`
  const next = birthdays.value[0]
  return next ? `Next: ${getDisplayName(next.member)}, ${whenOfBirthday(next.days)}` : 'None this month'
})

// What each tile shows of its own section, so no two tiles look alike and
// each is worth a glance before it is tapped.
const { stats, agedTotal } = useMemberStats(members)

// People with a photo first: a face reads, a generated avatar is a pattern.
const withPhotosFirst = computed(() =>
  [...members.value].sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)))
)

/** A few faces for the roll's tile. */
const rollFaces = computed(() => withPhotosFirst.value.slice(0, 3))

/** More of them, larger, for the main card: the roll is its people. */
const HERO_FACES = 6
const heroFaces = computed(() => withPhotosFirst.value.slice(0, HERO_FACES))

const nextBirthday = computed(() => birthdays.value.find((row) => row.days >= 1) || null)
const servingShare = computed(() => (counts.value.total ? (counts.value.total - unplaced.value.length) / counts.value.total : 0))
const completeShare = computed(() =>
  counts.value.total ? (counts.value.total - incomplete.value.length) / counts.value.total : 1
)

const doors = computed(() => {
  const ready = !loading.value
  const serving = counts.value.total - unplaced.value.length
  return [
    { key: 'everyone', title: 'Everyone', art: 'people-everyone', to: { name: 'Members' }, detail: ready ? plural(counts.value.total, 'person', 'people') : '' },
    { key: 'birthdays', title: 'Birthdays', art: 'people-birthdays', to: { name: 'PeopleBirthdays' }, detail: ready ? birthdaysLine.value : '' },
    { key: 'ministries', title: 'Ministries', art: 'people-ministries', to: { name: 'PeopleMinistries' }, detail: ready ? `${serving.toLocaleString()} serving` : '' },
    { key: 'glance', title: 'Overview', art: 'people-glance', to: { name: 'PeopleGlance' }, detail: 'Ages, men and women' },
    ...(canEdit.value
      ? [
          {
            key: 'missing',
            title: 'Missing info',
            art: 'people-missing',
            to: { name: 'PeopleMissing' },
            detail: ready ? (incomplete.value.length ? `${incomplete.value.length} to complete` : 'All complete') : '',
          },
        ]
      : []),
    ...(myMember.value ? [{ key: 'me', title: 'My record', art: 'people-me', to: recordOf(myMember.value), detail: 'Your own details' }] : []),
  ]
})

// The ring on the records tile: how much of the roll is complete.
const RING = 2 * Math.PI * 15
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What matters today, most important on top -->
      <AppHeroDeck :cards="cards" scope="people" label="People today" class="animate-rise">
        <template #card="{ card }">
          <!-- Someone waiting on you: the key they are asking for, in amber. -->
          <DeckCard
            v-if="card.kind === 'claims'"
            tone="warn"
            :icon="KeyRound"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <template #leading>
              <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <KeyRound class="size-6" />
              </span>
            </template>
          </DeckCard>

          <!-- Somebody's birthday: the day itself is the headline. -->
          <BirthdayCard v-else-if="card.kind === 'birthday'" :card="card" />

          <!-- A birthday coming: its date, the way a calendar shows it. -->
          <DeckCard
            v-else-if="card.kind === 'upcoming'"
            tone="plain"
            :icon="Cake"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <template #leading>
              <span class="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light">
                <span class="text-[11px] font-bold uppercase">{{ card.date.month }}</span>
                <span class="mt-0.5 text-xl font-bold tabular-nums">{{ card.date.day }}</span>
              </span>
            </template>
            <div v-if="card.rows.length > 1" class="flex flex-wrap gap-x-3 gap-y-1.5">
              <span v-for="row in card.rows.slice(0, 4)" :key="keyOf(row.member)" class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <MemberAvatar :member="row.member" alt="" size="h-6 w-6" />
                {{ getDisplayName(row.member) }}
                <span class="text-gray-400 dark:text-gray-500">{{ whenOfBirthday(row.days) }}</span>
              </span>
            </div>
          </DeckCard>

          <!-- Records to fill in: how much of the roll is complete. -->
          <DeckCard
            v-else-if="card.kind === 'missing'"
            tone="plain"
            :icon="ClipboardText"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div class="h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${Math.round(card.share * 100)}%` }" />
            </div>
            <p class="mt-1.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {{ card.complete.toLocaleString() }} of {{ counts.total.toLocaleString() }} complete
            </p>
          </DeckCard>

          <!-- People in no ministry: their faces, a few of them. -->
          <DeckCard
            v-else-if="card.kind === 'unplaced'"
            tone="plain"
            :icon="HandHeart"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <div class="flex items-center">
              <div class="flex -space-x-2.5">
                <MemberAvatar
                  v-for="member in card.members.slice(0, 6)"
                  :key="keyOf(member)"
                  :member="member"
                  alt=""
                  size="h-9 w-9"
                  plain-class="ring-2 ring-white dark:ring-gray-800"
                />
              </div>
              <span
                v-if="card.members.length > 6"
                class="ml-2 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400"
              >
                +{{ card.members.length - 6 }}
              </span>
            </div>
          </DeckCard>

          <!-- The roll: its number, large, and what it is made of. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <!-- Light through an arched window: the outline of Ekkly's mark
                   (BRAND.md — the window is the motif), as the light falling
                   in rather than the mark itself, fading as it reaches the
                   foot of the card. -->
              <svg class="absolute -bottom-10 right-5 h-60 w-36" viewBox="0 0 144 240" fill="none">
                <defs>
                  <linearGradient id="deck-arch-light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="white" stop-opacity="0.2" />
                    <stop offset="0.75" stop-color="white" stop-opacity="0.03" />
                    <stop offset="1" stop-color="white" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" fill="url(#deck-arch-light)" />
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.14" stroke-width="1.5" />
              </svg>
            </template>
            <template v-if="card.ready" #title>
              <span class="text-5xl font-bold tabular-nums tracking-tight">{{ card.total.toLocaleString() }}</span>
              <span class="ml-2 text-lg font-semibold text-white/80">{{ card.total === 1 ? 'person' : 'people' }}</span>
            </template>
            <!-- The People app's own artwork, on a white tile because its
                 orange and blue are Ekkly's and need a white ground on a
                 coloured card (BRAND.md). -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10">
                <AppArt app-key="members" :play="1" class="size-10" />
              </span>
            </template>
            <!-- The people themselves, along the foot. -->
            <template v-if="card.ready" #default>
              <div class="flex items-center">
                <div class="flex -space-x-2.5">
                  <MemberAvatar
                    v-for="member in heroFaces"
                    :key="keyOf(member)"
                    :member="member"
                    alt=""
                    size="h-10 w-10"
                    plain-class="ring-2 ring-white/70"
                  />
                </div>
                <span
                  v-if="card.total > HERO_FACES"
                  class="ml-2 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
                >
                  +{{ (card.total - HERO_FACES).toLocaleString() }}
                </span>
              </div>
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <nav class="grid grid-cols-2 gap-2.5" aria-label="People">
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
            <!-- The roll: a few of its faces. -->
            <span v-if="door.key === 'everyone' && !loading" class="flex -space-x-2">
              <MemberAvatar
                v-for="member in rollFaces"
                :key="keyOf(member)"
                :member="member"
                alt=""
                size="h-7 w-7"
                plain-class="ring-2 ring-white dark:ring-gray-800"
              />
            </span>

            <!-- Birthdays: today's face, or the next one's date. -->
            <MemberAvatar
              v-else-if="door.key === 'birthdays' && birthdaysToday.length"
              :member="birthdaysToday[0].member"
              alt=""
              size="h-8 w-8"
              plain-class="ring-2 ring-primary/30"
            />
            <span
              v-else-if="door.key === 'birthdays' && nextBirthday"
              class="flex h-9 w-8 flex-col items-center justify-center rounded-lg bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light"
            >
              <span class="text-[9px] font-bold uppercase">{{ dateParts(nextBirthday.days).month }}</span>
              <span class="mt-0.5 text-sm font-bold tabular-nums">{{ dateParts(nextBirthday.days).day }}</span>
            </span>

            <!-- Records: how much of the roll is complete, as a ring. -->
            <span v-else-if="door.key === 'missing' && !loading" class="relative flex size-9 items-center justify-center">
              <svg class="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15" fill="none" stroke-width="3.5" class="stroke-gray-100 dark:stroke-gray-700" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  :stroke-dasharray="`${RING * completeShare} ${RING}`"
                  class="stroke-primary dark:stroke-primary-light"
                />
              </svg>
              <span class="text-[10px] font-bold tabular-nums text-gray-700 dark:text-gray-200">{{ Math.round(completeShare * 100) }}%</span>
            </span>

            <!-- Your own record: you. -->
            <MemberAvatar
              v-else-if="door.key === 'me'"
              :member="myMember"
              alt=""
              size="h-8 w-8"
              plain-class="ring-2 ring-white dark:ring-gray-800"
            />
          </template>

          <!-- Ministries: how much of the church serves. -->
          <span v-if="door.key === 'ministries' && !loading && counts.total" class="block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden="true">
            <span class="block h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${Math.round(servingShare * 100)}%` }" />
          </span>

          <!-- Overview: the church's shape by age, the roll's own bands. -->
          <span v-else-if="door.key === 'glance' && !loading && agedTotal" class="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            <span
              v-for="band in stats.bands.filter((b) => b.count)"
              :key="band.key"
              :class="['rounded-full', band.barClass]"
              :style="{ flexGrow: band.count }"
            />
          </span>
        </AppShortcut>
      </nav>
    </div>
  </AppScreen>
</template>


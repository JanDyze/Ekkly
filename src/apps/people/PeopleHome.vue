<script setup>
import { computed } from 'vue'
import { Cake, ClipboardText, HandHeart, Hourglass, KeyRound, UserCircleCheck, UsersThree } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import BirthdayCard from '../../components/members/BirthdayCard.vue'
import AppShortcut from '../../components/appframe/AppShortcut.vue'
import DeckFaces from '../../components/appframe/DeckFaces.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import AppArt from '../../components/common/AppArt.vue'
import { usePeopleOverview, whenOfBirthday } from '../../composables/usePeopleOverview'
import { usePeopleGroups } from '../../composables/usePeopleGroups'
import { getDisplayName, getFullName, listPhrase } from '../../utils/memberUtils'
import { findRosterMember, todayIso } from '../../utils/lineupUtils'
import { suggestMembers } from '../../utils/memberMatch'
import { useClaimFlow } from '../../composables/useClaimFlow'
import { useAuth } from '../../composables/useAuth'

// The People app's home. One screen, no scrolling, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top: an account
//      waiting to be linked to its record, your own record still to find,
//      each birthday today, the birthdays coming this week, the records still
//      to fill in, the members in no ministry, and under them all the card
//      that is always true — how many people the church has. Anything that
//      matters gets the main card rather than a line in a list behind a
//      button; each of those can be dismissed until the app is next opened
//      (the two standing chores until there are more of them), and the roll
//      cannot.
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
  incomplete,
  unplaced,
  unplacedToAsk,
  claims,
  claimsWaiting,
} = usePeopleOverview()

// Your own side of linking: whether you have asked to be linked to a record,
// and the sheet that asks (drawn once, by the top bar, which this home has).
const { myPendingClaim, openClaimSheet } = useClaimFlow()
const { displayName } = useAuth()

// Members in no small group, for whoever may see the groups (usePeopleGroups).
const { canSee: seesGroups, loading: groupsLoading, ungrouped } = usePeopleGroups()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Ana, Ben and 3 others": who a card is about, the first two by name. */
const namesOf = (people) => {
  const names = people.slice(0, 2).map(getDisplayName)
  if (people.length > 2) names.push(plural(people.length - 2, 'other', 'others'))
  return listPhrase(names)
}

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
    // The records being claimed, so whoever links them sees who before opening it.
    const claimed = claims.value.map((claim) => findRosterMember(members.value, claim.memberId)).filter(Boolean)
    list.push({
      kind: 'claims',
      key: `claims:${claimsWaiting.value}`,
      tone: 'warn',
      dismissible: true,
      kicker: 'Waiting on you',
      title: `${plural(claimsWaiting.value, 'account', 'accounts')} to link`,
      detail: 'Someone signed in and says a record on the roll is theirs.',
      to: { path: '/settings', query: { section: 'accounts' } },
      members: claimed,
      unmatched: claimsWaiting.value - claimed.length,
      caption: claimed.length ? `For ${namesOf(claimed)}` : '',
    })
  }

  // You, not yet on the roll as far as Ekkly knows. Until this account is
  // linked to a record there is no My record, no "you are serving", no tasks
  // of yours, so it leads everything but someone else's waiting request.
  // Asking was only in the avatar's menu, where nobody looks for it.
  if (!loading.value && !myMember.value && counts.value.total) {
    const asked = myPendingClaim.value
    if (asked) {
      list.push({
        kind: 'self-asked',
        key: `self-asked:${asked.firestoreId || asked.memberId}`,
        tone: 'plain',
        dismissible: true,
        kicker: 'Waiting for approval',
        title: `You asked to be ${asked.memberName || 'linked to a record'}`,
        detail: 'An administrator will confirm it. Nothing else to do.',
      })
    } else {
      const likely = suggestMembers(displayName.value, members.value).slice(0, 3)
      list.push({
        kind: 'self',
        key: 'self',
        tone: 'plain',
        dismissible: true,
        kicker: 'Is this you?',
        title: 'Find yourself on the roll',
        detail: 'Link this account to your record, so Ekkly knows it is you.',
        members: likely,
        caption: likely.length ? `Maybe ${listPhrase(likely.map(getFullName))}?` : '',
      })
    }
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

  // The birthdays still to come this week, together — near enough to buy a
  // card or plan a greeting. Not the next one when there are none this week:
  // three weeks off is nothing to do yet, and Birthdays opens on who is
  // next. Keyed by who, so a different set of names is news again.
  const soon = birthdays.value.filter((row) => row.days >= 1 && row.days <= 6)
  if (soon.length) {
    const first = soon[0]
    const on = first.days === 1 ? 'tomorrow' : `on ${whenOfBirthday(first.days)}`
    list.push({
      kind: 'upcoming',
      key: `upcoming:${soon.map((row) => keyOf(row.member)).join(',')}`,
      tone: 'plain',
      dismissible: true,
      kicker: soon.length === 1 ? 'Birthday this week' : 'Birthdays this week',
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
      countdown: `${plural(first.days, 'day', 'days')} to go`,
    })
  }

  // A standing chore, so put away it stays away until the pile grows
  // (AppHeroDeck's `remember`): passed in even when empty, so the deck can
  // follow the pile down. Not while loading, when it would read as empty.
  if (canEdit.value && !loading.value) {
    const complete = counts.value.total - incomplete.value.length
    list.push({
      kind: 'missing',
      key: 'missing',
      tone: 'plain',
      dismissible: true,
      remember: true,
      level: incomplete.value.length,
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

  // A member in no ministry is somebody nobody has asked yet. Members past
  // the Kids band only (unplacedToAsk): children and visitors are not
  // expected to serve, and counting them made a number that never went
  // down. A standing chore too, so it is remembered the same way.
  if (canEdit.value && !loading.value) {
    list.push({
      kind: 'unplaced',
      key: 'unplaced',
      tone: 'plain',
      dismissible: true,
      remember: true,
      level: unplacedToAsk.value.length,
      kicker: 'Not serving yet',
      title: `${plural(unplacedToAsk.value.length, 'member', 'members')} in no ministry`,
      detail: 'Worth asking each of them where they would like to help.',
      to: { name: 'PeopleUnplaced', query: { ask: '1' } },
      members: unplacedToAsk.value,
    })
  }

  // A member in no small group, asked the same way: members past the Kids
  // band, a standing chore remembered until the number goes up.
  if (canEdit.value && seesGroups.value && !loading.value && !groupsLoading.value) {
    list.push({
      kind: 'unplaced',
      key: 'ungrouped',
      tone: 'plain',
      icon: UsersThree,
      dismissible: true,
      remember: true,
      level: ungrouped.value.length,
      kicker: 'No small group yet',
      title: `${plural(ungrouped.value.length, 'member', 'members')} in no small group`,
      detail: 'Worth inviting each of them to one near them.',
      to: { name: 'PeopleUngrouped' },
      members: ungrouped.value,
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
    // An empty roll's card says to add the first person, so it leads there.
    to: total ? { name: 'Members' } : canEdit.value ? { name: 'PeopleAdd' } : null,
    total,
    memberCount,
    attendees,
    ready: !loading.value && total > 0,
  })

  return list
})

/* -------------------------------------------------------------- the doors */

// People with a photo first: a face reads, a generated avatar is a pattern.
const withPhotosFirst = computed(() =>
  [...members.value].sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)))
)

/** Faces for the main card: the roll is its people. */
const HERO_FACES = 6
const heroFaces = computed(() => withPhotosFirst.value.slice(0, HERO_FACES))

// A door is its name and nothing more, unless something behind it is waiting
// on you: then a badge says how many. Totals, faces and charts are what the
// section itself shows the moment it opens, and today's birthdays already
// have a card of their own above, so repeating them here only made the grid
// harder to read.
const doors = computed(() => {
  const ready = !loading.value
  return [
    { key: 'everyone', title: 'Everyone', art: 'people-everyone', to: { name: 'Members' } },
    { key: 'birthdays', title: 'Birthdays', art: 'people-birthdays', to: { name: 'PeopleBirthdays' } },
    { key: 'ministries', title: 'Ministries', art: 'people-ministries', to: { name: 'PeopleMinistries' } },
    { key: 'glance', title: 'Overview', art: 'people-glance', to: { name: 'PeopleGlance' } },
    ...(canEdit.value
      ? [
          {
            key: 'missing',
            title: 'Missing info',
            art: 'people-missing',
            to: { name: 'PeopleMissing' },
            badge: ready ? incomplete.value.length : 0,
          },
        ]
      : []),
    // Six at most, three rows of two, so the home fits a phone without
    // scrolling. Adding people is not a tile: it is something you do, not a
    // place you go, and it is already on Everyone's + button ("Add several
    // people") and on the roll's card while the roll is empty.
    ...(myMember.value ? [{ key: 'me', title: 'My record', art: 'people-me', to: recordOf(myMember.value) }] : []),
  ]
})
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
            <DeckFaces tone="warn" :members="card.members" :empty="card.unmatched" :caption="card.caption" />
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
            <!-- Three at most on the one line, each name giving up width to
                 the others and ending in an ellipsis when squeezed. -->
            <div v-if="card.rows.length > 1" class="flex min-w-0 gap-x-3">
              <span v-for="row in card.rows.slice(0, 3)" :key="keyOf(row.member)" class="flex min-w-0 items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <MemberAvatar :member="row.member" alt="" size="h-6 w-6" class="shrink-0" />
                <span class="min-w-0 truncate">
                  {{ getDisplayName(row.member) }}
                  <span class="text-gray-400 dark:text-gray-500">{{ whenOfBirthday(row.days) }}</span>
                </span>
              </span>
            </div>
            <DeckFaces v-else :members="[card.rows[0].member]" :caption="card.countdown" />
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
            :icon="card.icon || HandHeart"
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

          <!-- You, not yet linked: the likeliest records by your account's
               name, and a tap that opens the sheet to choose yours. -->
          <DeckCard
            v-else-if="card.kind === 'self'"
            tone="plain"
            :icon="UserCircleCheck"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            action
            inset
            @click="openClaimSheet"
          >
            <DeckFaces v-if="card.members.length" :members="card.members" :caption="card.caption" />
          </DeckCard>

          <!-- Asked already: said once, so nobody asks twice. -->
          <DeckCard
            v-else-if="card.kind === 'self-asked'"
            tone="plain"
            :icon="Hourglass"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            inset
          />

          <!-- The roll: its number, large, and what it is made of. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <!-- An arched window in outline, the shape of Ekkly's mark
                   (BRAND.md: the window is the motif), drawn as lines on the
                   colour rather than as light glowing through it. -->
              <svg class="absolute -bottom-10 right-5 h-60 w-36" viewBox="0 0 144 240" fill="none">
                <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.3" stroke-width="1.5" />
                <path d="M20 72a52 52 0 0 1 104 0V240H20Z" stroke="white" stroke-opacity="0.15" stroke-width="1.5" />
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
          :glyph="door.glyph"
          :badge="door.badge"
          :urgent="door.urgent"
          :delay="120 + index * 30"
        />
      </nav>
    </div>
  </AppScreen>
</template>


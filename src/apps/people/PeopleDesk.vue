<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  CheckCircle,
  ChevronRight,
  ClipboardText,
  HandHeart,
  Hourglass,
  IdentificationCard,
  KeyRound,
  MagnifyingGlass,
  Plus,
  UserCircleCheck,
  X,
} from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppArt from '../../components/common/AppArt.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview, whenOfBirthday } from '../../composables/usePeopleOverview'
import { usePeopleGroups } from '../../composables/usePeopleGroups'
import { useMemberSearch } from '../../composables/useMemberSearch'
import { getFullName, nicknameOf } from '../../utils/memberUtils'
import { UNKNOWN_BAND } from '../../utils/ageBands'

// The People app's home on a desktop. A phone keeps the deck and the
// sections' tiles (AppHome); a desktop has the room to show what is behind
// the tiles, so the sections show themselves instead of being doors.
//
// It is laid out for the width, not as the phone's cards spread across it,
// and not as the home of all apps (columns of white panels), which an app's
// home built the same way only repeated. Nothing on it is a card. On one
// screen that never scrolls, on plain ground, top to bottom:
//
//   1. A page header: the roll's number and what it is made of, a few of its
//      faces, and on the right finding someone, because one person is what
//      People is opened for most on a desktop, with adding one beside it.
//   2. One line of what is waiting on you: the phone's deck cards that ask
//      for something, each a link to where its card goes. Said as a line,
//      not a box: a box around three links was mostly empty.
//   3. The sections as three columns between rules, each its own content and
//      scrolling on its own: the coming birthdays, who serves where, and the
//      shape of the church. Each heading opens the section in full.
//
// What needs doing comes from the deck's own `cards` (PeopleHome), so the
// phone and the desktop cannot disagree about it.

const props = defineProps({
  // The phone's deck, as PeopleHome builds it.
  cards: { type: Array, required: true },
  // Faces for the roll, photos first.
  faces: { type: Array, default: () => [] },
  // Your own record's route, when this account is linked to one.
  myRecord: { type: Object, default: null },
})

const emit = defineEmits(['claim'])

const router = useRouter()

const { members, loading, birthdays, ministries, unplaced, counts, canEdit, stats, agedTotal } = usePeopleOverview()
const { canSee: seesGroups, loading: groupsLoading, ungrouped } = usePeopleGroups()

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
const keyOf = (member) => String(member.firestoreId || member.id)
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const share = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '')

/* --------------------------------------------------------------- the roll */

// The card that is always true, from the deck, so the greeting and the
// numbers are the phone's own.
const roll = computed(() => props.cards.find((card) => card.kind === 'roll') || {})

/* ------------------------------------------------------------- the search */

// The roll's own search (useMemberSearch), so a name, a tag or a place finds
// the same people here as on Everyone. The first few show under the box; the
// rest are Everyone's, which the last row and Enter open already searched.
const query = ref('')
const focused = ref(false)
const active = ref(0)
const { filteredMembers } = useMemberSearch(members, query)

const RESULTS = 6
const searching = computed(() => Boolean(query.value.trim()))
const results = computed(() => (searching.value ? filteredMembers.value.slice(0, RESULTS) : []))
const showResults = computed(() => focused.value && searching.value)

watch(query, () => {
  active.value = 0
})

const openEveryone = () => router.push({ name: 'Members', query: { q: query.value.trim() } })

const choose = (index = active.value) => {
  const member = results.value[index]
  if (member) router.push(recordOf(member))
  else if (searching.value) openEveryone()
}

// Up and down walk the results and the "see all" row after them, Enter opens
// the one lit, and Escape empties the box before it gives up the focus.
const onKey = (event) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (!searching.value) return
    event.preventDefault()
    const last = results.value.length
    active.value = event.key === 'ArrowDown' ? Math.min(active.value + 1, last) : Math.max(active.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    choose()
  } else if (event.key === 'Escape') {
    if (query.value) query.value = ''
    else event.target.blur()
  }
}

/* ------------------------------------------------------ what needs you */

// The deck's cards that ask something of someone. The birthdays are the
// Birthdays column's and the roll is the header, so neither is here; a
// standing chore at nothing is left out, as the deck leaves it out.
const NEED_ICONS = {
  claims: KeyRound,
  self: UserCircleCheck,
  'self-asked': Hourglass,
  missing: ClipboardText,
  unplaced: HandHeart,
}

// What the tile's button says: the thing to do, not where it goes.
const CTAS = { claims: 'Link', self: 'Find me', missing: 'Fill in', unplaced: 'Ask them', ungrouped: 'Invite' }

const needs = computed(() =>
  props.cards
    .filter((card) => !['roll', 'birthday', 'upcoming'].includes(card.kind))
    .filter((card) => !(card.remember && !card.level))
    .map((card) => ({
      key: card.key,
      title: card.title,
      hint: card.detail,
      icon: card.icon || NEED_ICONS[card.kind],
      warn: card.tone === 'warn',
      to: card.to || null,
      action: card.kind === 'self',
      cta: CTAS[card.key] || CTAS[card.kind] || 'Open',
    }))
)

/* -------------------------------------------------------------- birthdays */

// Today, the rest of the week and the weeks after, each under its heading,
// as the Birthdays section itself reads; today's in the church's colour.
const birthdayGroups = computed(() =>
  [
    { key: 'today', title: 'Today', today: true, rows: birthdays.value.filter((r) => r.days === 0) },
    { key: 'week', title: 'This week', rows: birthdays.value.filter((r) => r.days >= 1 && r.days <= 6) },
    { key: 'later', title: 'Coming up', rows: birthdays.value.filter((r) => r.days >= 7) },
  ].filter((group) => group.rows.length)
)

/* ------------------------------------------------------------- ministries */

// Biggest first, each a bar against the biggest, so where the church serves
// reads before any number does. The empty ones stay, last: somewhere people
// can still be put.
const ministryRows = computed(() => {
  const sorted = ministries.value
    .map((ministry, order) => ({ ...ministry, order }))
    .sort((a, b) => b.people.length - a.people.length || a.order - b.order)
  const most = Math.max(1, ...sorted.map((m) => m.people.length))
  return sorted.map((ministry) => ({
    name: ministry.name,
    count: ministry.people.length,
    width: `${Math.max(ministry.people.length ? 4 : 0, (ministry.people.length / most) * 100)}%`,
    to: { name: 'PeopleMinistry', params: { name: ministry.name } },
  }))
})

const serving = computed(() => counts.value.total - unplaced.value.length)

// The people left over, after the ministries: the same rows the Ministries
// section ends on, and small groups beside them for whoever may see those.
const leftOver = computed(() => [
  { key: 'unplaced', title: 'In no ministry', count: unplaced.value.length, to: { name: 'PeopleUnplaced' } },
  ...(seesGroups.value && !groupsLoading.value
    ? [{ key: 'ungrouped', title: 'Members in no small group', count: ungrouped.value.length, to: { name: 'PeopleUngrouped' } }]
    : []),
])

/* --------------------------------------------------------------- overview */

const bands = computed(() => [
  ...stats.value.bands.map((band) => ({ ...band, share: share(band.count, agedTotal.value) })),
  ...(stats.value.unknownAge ? [{ ...UNKNOWN_BAND, count: stats.value.unknownAge, share: '', muted: true }] : []),
])

const sexes = computed(() => {
  const unknown = stats.value.total - stats.value.male - stats.value.female
  return [
    { key: 'male', title: 'Men and boys', count: stats.value.male, share: share(stats.value.male, stats.value.total) },
    { key: 'female', title: 'Women and girls', count: stats.value.female, share: share(stats.value.female, stats.value.total) },
    ...(unknown ? [{ key: 'unknown', title: 'Not on file', count: unknown, share: '', muted: true }] : []),
  ]
})

// The columns' shared look: a heading that opens the section, and rows that
// light up under the pointer. Strings, so the three columns cannot drift.
// A row reaches a little past its column's edge so its highlight has room;
// its column pads by the same amount and never scrolls sideways, so that
// reach is never a sliver of sideways scroll.
const COLUMN = 'flex min-h-0 min-w-0 flex-col px-7 first:pl-0 last:pr-0'
// Padded a little past its words, and rounded, so the focus ring has room
// round "Birthdays" and "See all" rather than touching them.
const HEAD = 'group -mx-2 -mt-1 mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg px-2 py-1'
const ROW = '-mx-3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-200/50 dark:hover:bg-white/5'
</script>

<template>
  <AppScreen board plain>
    <div class="flex h-full min-h-0 flex-col">
      <!-- 1. Finding someone: a toolbar over the page, search first. -->
      <div class="flex shrink-0 items-center gap-2 pb-4">
        <div class="relative min-w-0 max-w-2xl flex-1">
          <label class="relative block">
            <span class="sr-only">Search people</span>
            <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="query"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="people-search-results"
              :aria-expanded="showResults"
              placeholder="Find someone by name, tag, ministry, place…"
              class="h-11 w-full rounded-xl border-0 bg-white pl-10 pr-10 text-sm text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white dark:ring-gray-700"
              @focus="focused = true"
              @blur="focused = false"
              @keydown="onKey"
            />
            <button
              v-if="query"
              type="button"
              class="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
              aria-label="Clear the search"
              @mousedown.prevent
              @click="query = ''"
            >
              <X class="size-4" />
            </button>
          </label>

          <!-- The first few found, under the box. Pressed, not clicked, so
               the box keeps its focus until the choice is made. -->
          <ul
            v-if="showResults"
            id="people-search-results"
            role="listbox"
            class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white py-1.5 text-gray-900 ring-1 ring-black/10 dark:bg-gray-800 dark:text-white dark:ring-white/10"
          >
            <li
              v-for="(member, index) in results"
              :key="keyOf(member)"
              role="option"
              :aria-selected="active === index"
              :class="['flex cursor-pointer items-center gap-3 px-4 py-2', active === index ? 'bg-gray-50 dark:bg-white/5' : '']"
              @mousedown.prevent="choose(index)"
              @mouseenter="active = index"
            >
              <MemberAvatar :member="member" alt="" size="h-9 w-9" class="shrink-0" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ getFullName(member) }}</span>
                <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ member.isMember === false ? 'Attendee' : 'Member' }}<template v-if="nicknameOf(member)"> · “{{ nicknameOf(member) }}”</template>
                </span>
              </span>
            </li>
            <li v-if="!results.length" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Nobody matches that.</li>
            <li
              v-else
              role="option"
              :aria-selected="active === results.length"
              :class="[
                'mt-1 flex cursor-pointer items-center justify-between gap-3 border-t border-gray-100 px-4 pt-2.5 pb-1.5 text-sm font-semibold text-primary dark:border-white/10 dark:text-primary-light',
                active === results.length ? 'bg-gray-50 dark:bg-white/5' : '',
              ]"
              @mousedown.prevent="openEveryone"
              @mouseenter="active = results.length"
            >
              {{ filteredMembers.length > results.length ? `See all ${filteredMembers.length.toLocaleString()} in Everyone` : 'Open in Everyone' }}
              <ChevronRight class="size-4" />
            </li>
          </ul>
        </div>

        <RouterLink
          v-if="myRecord"
          :to="myRecord"
          class="ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200/60 dark:text-gray-200 dark:hover:bg-white/10"
        >
          <IdentificationCard class="size-4" />
          My record
        </RouterLink>
        <RouterLink
          v-if="canEdit"
          :to="{ name: 'Members', query: { add: 'true' } }"
          :class="[
            'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover',
            myRecord ? '' : 'ml-auto',
          ]"
        >
          <Plus class="size-4" />
          Person
        </RouterLink>
      </div>

      <!-- 2. The roll, in the church's colour, and beside it what is
           waiting on you, each a tile to act on. -->
      <div class="grid shrink-0 grid-cols-3 gap-4 pb-5">
        <component
          :is="roll.to ? RouterLink : 'section'"
          :to="roll.to || undefined"
          class="people-roll relative isolate flex min-w-0 flex-col rounded-[28px] border border-black/15 px-5 pt-4 pb-4 text-white transition-colors dark:border-black/40"
          :class="roll.to ? 'hover:border-black/35 dark:hover:border-black/60' : ''"
        >
          <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
            <CardPanes />
          </div>
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <p v-if="roll.kicker" class="inline-flex max-w-full items-center rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">
                <span class="truncate">{{ roll.kicker }}</span>
              </p>
              <h2 v-if="roll.ready" class="mt-1.5 leading-none">
                <span class="text-4xl font-bold tabular-nums tracking-tight">{{ roll.total.toLocaleString() }}</span>
                <span class="ml-2 text-base font-semibold text-white/80">{{ roll.total === 1 ? 'person' : 'people' }}</span>
              </h2>
              <h2 v-else class="mt-1 line-clamp-2 text-xl font-bold leading-tight tracking-tight">{{ roll.title }}</h2>
              <p v-if="roll.detail" class="mt-1.5 truncate text-sm text-white/75">{{ roll.detail }}</p>
            </div>
            <!-- The People app's own artwork, on a white tile because its
                 orange and blue need a white ground on a coloured card. -->
            <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
              <AppArt app-key="members" :play="1" class="size-9" />
            </span>
          </div>
          <!-- The people themselves, and how many more: a face's own shape. -->
          <div v-if="roll.ready && faces.length" class="mt-auto flex -space-x-2.5 pt-4">
            <MemberAvatar v-for="member in faces" :key="keyOf(member)" :member="member" alt="" size="h-9 w-9" plain-class="ring-2 ring-white/70" />
            <span
              v-if="roll.total > faces.length"
              class="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold tabular-nums ring-2 ring-white/70"
            >
              +{{ roll.total - faces.length }}
            </span>
          </div>
        </component>

        <!-- What is waiting on you: each the phone's deck card that asks for
             something, as a tile with the way to act on it. Amber when it is
             somebody waiting on you. -->
        <section class="col-span-2 grid min-w-0 auto-rows-fr grid-cols-2 gap-3" aria-label="Needs you">
          <component
            :is="need.to ? RouterLink : need.action ? 'button' : 'div'"
            v-for="(need, index) in needs"
            :key="need.key"
            :to="need.to || undefined"
            :type="need.action && !need.to ? 'button' : undefined"
            :class="[
              'group flex min-w-0 items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-colors',
              need.warn
                ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
              need.to || need.action
                ? need.warn
                  ? 'hover:bg-amber-100 dark:hover:bg-amber-500/15'
                  : 'hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                : '',
              needs.length % 2 && index === needs.length - 1 ? 'col-span-2' : '',
            ]"
            @click="need.action ? emit('claim') : undefined"
          >
            <span
              :class="[
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                need.warn
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
              ]"
            >
              <component :is="need.icon" class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span :class="['block truncate text-[15px] font-bold', need.warn ? 'text-amber-950 dark:text-amber-100' : 'text-gray-900 dark:text-white']">
                {{ need.title }}
              </span>
              <span :class="['block truncate text-xs', need.warn ? 'text-amber-800 dark:text-amber-300/80' : 'text-gray-500 dark:text-gray-400']">
                {{ need.hint }}
              </span>
            </span>
            <span
              v-if="need.to || need.action"
              :class="[
                'inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold',
                need.warn ? 'bg-amber-200/70 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100' : 'bg-primary text-white',
              ]"
            >
              {{ need.cta }}
              <ChevronRight class="size-3.5" />
            </span>
          </component>

          <!-- Nothing waiting: said once, across the room the tiles take. -->
          <div
            v-if="!needs.length && !loading"
            class="col-span-2 row-span-2 flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white px-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <span class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <CheckCircle class="size-5" />
            </span>
            <span>
              <span class="block text-[15px] font-bold text-gray-900 dark:text-white">Nothing needs you right now</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">Records, ministries and accounts are all in order.</span>
            </span>
          </div>
        </section>
      </div>

      <!-- 3. The sections, side by side between rules, each its own content. -->
      <div class="grid min-h-0 flex-1 grid-cols-3 grid-rows-[minmax(0,1fr)] divide-x divide-gray-200 border-t border-gray-200 pt-5 dark:divide-gray-800 dark:border-gray-800">
        <!-- Birthdays -->
        <section :class="COLUMN" aria-labelledby="people-birthdays">
          <RouterLink :to="{ name: 'PeopleBirthdays' }" :class="HEAD">
            <h2 id="people-birthdays" class="text-base font-bold text-gray-900 group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">Birthdays</h2>
            <span class="flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light">See all <ChevronRight class="size-3.5" /></span>
          </RouterLink>
          <div class="-mx-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 [scrollbar-width:thin]">
            <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
              <span v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-xl bg-gray-200/60 dark:bg-white/5" />
            </div>
            <template v-else-if="birthdayGroups.length">
              <div v-for="group in birthdayGroups" :key="group.key" class="mb-3">
                <p
                  :class="[
                    'pb-1 text-[11px] font-bold uppercase tracking-wider',
                    group.today ? 'text-primary dark:text-primary-light' : 'text-gray-400 dark:text-gray-500',
                  ]"
                >
                  {{ group.title }}
                </p>
                <RouterLink v-for="row in group.rows" :key="keyOf(row.member)" :to="recordOf(row.member)" :class="ROW">
                  <MemberAvatar :member="row.member" alt="" size="h-9 w-9" class="shrink-0" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ getFullName(row.member) }}</span>
                    <span v-if="row.turning" class="block truncate text-xs text-gray-500 dark:text-gray-400">Turns {{ row.turning }}</span>
                  </span>
                  <span
                    :class="[
                      'shrink-0 text-xs font-semibold tabular-nums',
                      row.days === 0 ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
                    ]"
                  >
                    {{ whenOfBirthday(row.days) }}
                  </span>
                </RouterLink>
              </div>
            </template>
            <p v-else class="py-2 text-sm text-gray-500 dark:text-gray-400">No birthdays in the coming month.</p>
          </div>
        </section>

        <!-- Ministries -->
        <section :class="COLUMN" aria-labelledby="people-ministries">
          <RouterLink :to="{ name: 'PeopleMinistries' }" :class="HEAD">
            <h2 id="people-ministries" class="text-base font-bold text-gray-900 group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">Ministries</h2>
            <span class="flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light">See all <ChevronRight class="size-3.5" /></span>
          </RouterLink>
          <div class="-mx-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 [scrollbar-width:thin]">
            <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
              <span v-for="n in 5" :key="n" class="h-10 animate-pulse rounded-xl bg-gray-200/60 dark:bg-white/5" />
            </div>
            <template v-else>
              <p class="pb-2 text-sm text-gray-600 dark:text-gray-300">
                <span class="font-semibold tabular-nums text-gray-900 dark:text-white">{{ serving.toLocaleString() }}</span>
                of {{ plural(counts.total, 'person', 'people') }} serve somewhere
              </p>
              <RouterLink v-for="row in ministryRows" :key="row.name" :to="row.to" :class="[ROW, 'flex-col items-stretch gap-1.5']">
                <span class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="truncate font-semibold text-gray-900 dark:text-white">{{ row.name }}</span>
                  <span class="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">{{ row.count.toLocaleString() }}</span>
                </span>
                <span class="block h-1.5 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/10">
                  <span class="block h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: row.width }" />
                </span>
              </RouterLink>
              <p v-if="!ministryRows.length" class="py-2 text-sm text-gray-500 dark:text-gray-400">No ministries yet. They are kept in Settings.</p>
              <div class="mt-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                <RouterLink v-for="row in leftOver" :key="row.key" :to="row.to" :class="[ROW, 'justify-between text-sm']">
                  <span class="truncate text-gray-600 dark:text-gray-300">{{ row.title }}</span>
                  <span class="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">{{ row.count.toLocaleString() }}</span>
                </RouterLink>
              </div>
            </template>
          </div>
        </section>

        <!-- Overview -->
        <section :class="COLUMN" aria-labelledby="people-overview">
          <RouterLink :to="{ name: 'PeopleGlance' }" :class="HEAD">
            <h2 id="people-overview" class="text-base font-bold text-gray-900 group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">Overview</h2>
            <span class="flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light">See all <ChevronRight class="size-3.5" /></span>
          </RouterLink>
          <div class="-mx-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 [scrollbar-width:thin]">
            <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
              <span v-for="n in 5" :key="n" class="h-8 animate-pulse rounded-xl bg-gray-200/60 dark:bg-white/5" />
            </div>
            <template v-else>
              <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Ages</p>
              <!-- The bands side by side, so the shape of the church reads
                   before any number does. -->
              <div v-if="agedTotal" class="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                <span v-for="band in stats.bands.filter((b) => b.count)" :key="band.key" :class="band.barClass" :style="{ flexGrow: band.count }" />
              </div>
              <ul class="mt-2">
                <li v-for="band in bands" :key="band.key" class="flex items-center gap-2.5 py-1.5 text-sm">
                  <span :class="['size-2.5 shrink-0 rounded-full', band.dotClass]" aria-hidden="true" />
                  <span :class="['min-w-0 flex-1 truncate', band.muted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200']">{{ band.label }}</span>
                  <span class="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">{{ band.count.toLocaleString() }}</span>
                  <span class="w-10 shrink-0 text-right tabular-nums text-gray-500 dark:text-gray-400">{{ band.share }}</span>
                </li>
              </ul>

              <p class="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Men and women</p>
              <ul class="mt-1">
                <li v-for="row in sexes" :key="row.key" class="flex items-center gap-2.5 py-1.5 text-sm">
                  <span :class="['min-w-0 flex-1 truncate', row.muted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200']">{{ row.title }}</span>
                  <span class="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">{{ row.count.toLocaleString() }}</span>
                  <span class="w-10 shrink-0 text-right tabular-nums text-gray-500 dark:text-gray-400">{{ row.share }}</span>
                </li>
              </ul>

              <!-- The gaps under the figures, where they show, with the way
                   to fill them for whoever may. -->
              <p v-if="canEdit && (stats.unknownAge || sexes.some((row) => row.muted))" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Some records are missing an age or sex.
                <RouterLink :to="{ name: 'PeopleMissing' }" class="font-semibold text-primary hover:underline dark:text-primary-light">Fill them in</RouterLink>
              </p>
            </template>
          </div>
        </section>
      </div>
    </div>
  </AppScreen>
</template>

<style scoped>
/* The church's colour, flat, as the phone's roll card is (DeckCard's
   accent tone); on a dark page the same hue taken deeper, so white words on it
   still read. */
.people-roll {
  background-color: var(--color-primary);
}

.dark .people-roll {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertCircle,
  ArrowSquareOut,
  Camera,
  ChatCircleText,
  Copy,
  Mail,
  MapPin,
  PencilSimple,
  Phone,
  Trash2,
  Users,
} from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import YouBadge from '../../components/members/YouBadge.vue'
import LabelMark from '../../components/common/LabelMark.vue'
import { useLabelMarks } from '../../composables/useLabelMarks'
import { usePeopleGroups } from '../../composables/usePeopleGroups'
import { useToast } from '../../composables/useToast'
import { bandOf } from '../../utils/ageBands'
import { getDisplayName, getFullName, listPhrase } from '../../utils/memberUtils'
import { ATTENDANCE_STYLE, STATE_WORD, longDay } from '../../utils/attendanceGrid'
import { INSTRUMENTS } from '../../data/instruments'
import { useSimpleView } from '../../composables/useSimpleView'

// A person's record on a desktop. The phone's record (PersonRecord) is a
// column of boxes read top to bottom; spread across a desktop's width, the
// same boxes were three cards with the room between them saying nothing. So
// this is laid out for the width instead, on the plain ground of the app's
// other sections, beside its rail:
//
//   - down the left, who they are and how to reach them: the face, large,
//     and the number, the email and the address, each with what you would do
//     with it at a desk (copy it, write, find the place on a map);
//   - across the rest, what the church knows of them, as a document reads:
//     their details side by side under one heading, then their place in the
//     church (ministries, small groups, tags), then their attendance, each
//     gathering a row with the months running across and its own count at
//     the end.
//
// No section is a card. They are told apart by their headings and a rule,
// so the page reads as one record rather than a dashboard of tiles.
//
// Everything it shows is worked out by PersonRecord, which also owns the
// editor, the photo and deleting; this only lays it out and asks for them.

const props = defineProps({
  // The record, or null while it loads or when it is not on the roll.
  member: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  // Your own record: nobody rings or texts themselves.
  isMe: { type: Boolean, default: false },
  // Whether this person may see the roll at all (PersonRecord's peopleOpen).
  peopleOpen: { type: Boolean, default: true },
  intro: { type: Array, default: () => [] },
  age: { type: Number, default: null },
  birthday: { type: String, default: '' },
  birthdaySoon: { type: String, default: '' },
  gaps: { type: Array, default: () => [] },
  history: { type: Array, default: () => [] },
  grid: { type: Object, default: () => ({ columns: [], rows: [] }) },
  counted: { type: Number, default: 0 },
  present: { type: Number, default: 0 },
  unrecorded: { type: Number, default: 0 },
  rate: { type: Number, default: null },
})

// `edit` takes the editor's step: 0 name, 1 personal, 2 contact, 3 church.
const emit = defineEmits(['edit', 'photo', 'leave', 'delete'])

// Simple view puts Delete beside Edit, where most systems have it; the full
// view keeps it at the foot of the editor, out of the way.
const { simpleView } = useSimpleView()

const toast = useToast()
const { ministryMark, tagMark } = useLabelMarks()
const { canSee: seesGroups, groups } = usePeopleGroups()

const keyOf = (member) => String(member?.firestoreId || member?.id || '')

/* --------------------------------------------------------------- reaching */

/** A number a phone can actually dial: digits and a leading +, nothing else. */
const dialable = (value) => {
  const cleaned = String(value || '').replace(/[^\d+]/g, '')
  return cleaned.length >= 4 ? cleaned : ''
}

const copy = async (text, what) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  } catch {
    toast.error(`Could not copy the ${what.toLowerCase()}.`)
  }
}

// Each way of reaching them, with what a desk does with it. The step is the
// editor's Contact step, for filling one in.
const reach = computed(() => {
  const m = props.member || {}
  const tel = dialable(m.contactNumber)
  const address = String(m.address || '').trim()
  return [
    {
      key: 'phone',
      icon: Phone,
      label: 'Number',
      value: m.contactNumber,
      href: tel ? `tel:${tel}` : '',
      missing: 'No number',
      actions: [
        ...(tel && !props.isMe ? [{ key: 'text', label: 'Text', icon: ChatCircleText, href: `sms:${tel}` }] : []),
        ...(m.contactNumber ? [{ key: 'copy', label: 'Copy the number', icon: Copy, run: () => copy(m.contactNumber, 'Number') }] : []),
      ],
    },
    {
      key: 'email',
      icon: Mail,
      label: 'Email',
      value: m.email,
      href: m.email && !props.isMe ? `mailto:${m.email}` : '',
      missing: 'No email',
      actions: m.email ? [{ key: 'copy', label: 'Copy the email', icon: Copy, run: () => copy(m.email, 'Email') }] : [],
    },
    {
      key: 'address',
      icon: MapPin,
      label: 'Address',
      value: address,
      href: '',
      missing: 'No address',
      actions: address
        ? [
            {
              key: 'map',
              label: 'Find it on a map',
              icon: ArrowSquareOut,
              href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
              external: true,
            },
            { key: 'copy', label: 'Copy the address', icon: Copy, run: () => copy(address, 'Address') },
          ]
        : [],
    },
  ]
})

/* ---------------------------------------------------------------- details */

const band = computed(() => (props.member ? bandOf(props.member) : null))

// Side by side, the way a form's answers read. Each says which step of the
// editor fills it, so a blank one can be filled from where it shows.
const details = computed(() => {
  const m = props.member || {}
  return [
    { key: 'birthday', label: 'Birthday', value: props.birthday, note: props.birthdaySoon ? `Birthday ${props.birthdaySoon}` : '', step: 1 },
    { key: 'age', label: 'Age', value: props.age === null ? '' : String(props.age), band: band.value, step: 1 },
    { key: 'sex', label: 'Sex', value: m.sex, step: 1 },
    { key: 'civilStatus', label: 'Civil status', value: m.civilStatus, step: 1 },
    { key: 'occupation', label: 'Occupation', value: m.occupation, step: 1 },
    { key: 'standing', label: 'On the roll as', value: m.isMember === false ? 'Attendee' : 'Member', step: 3 },
  ]
})

/* ---------------------------------------------------------- in the church */

const ministries = computed(() => props.member?.ministries || [])
const tags = computed(() => props.member?.tags || [])
const instruments = computed(() =>
  (props.member?.instruments || [])
    .map((id) => INSTRUMENTS.find((instrument) => instrument.id === id)?.name)
    .filter(Boolean)
)

// The small groups they belong to, and the one they lead, for whoever may see
// the groups. Asked of the same reading the People app counts by
// (usePeopleGroups), so this never disagrees with "in no small group".
const myGroups = computed(() => {
  if (!seesGroups.value || !props.member) return []
  const me = keyOf(props.member)
  return groups.value
    .filter((group) => group.people.some((person) => keyOf(person) === me))
    .map((group) => ({ id: group.id, name: group.name, leads: keyOf(group.leader) === me }))
})

/* ------------------------------------------------------------- attendance */

// Hovering a square says its day (its title); choosing one says it under the
// grid too, for whoever is reading by keyboard.
const pickedDay = ref(null)
const pickDay = (item) => {
  pickedDay.value = pickedDay.value?.key === item.key ? null : item
}

// Why the gap matters, for the gaps there are.
const gapNote = computed(() => {
  const keys = props.gaps.map((gap) => gap.key)
  const notes = []
  if (keys.includes('dateOfBirth')) notes.push('Without a birthday they are missed on the birthday list and left out of the age groups.')
  if (keys.includes('sex')) notes.push('Without it they are left out of the count of men and women.')
  return notes.join(' ')
})

const subtitle = computed(() => props.intro.join(' · '))
const back = computed(() => (props.peopleOpen ? { name: 'PeopleHome' } : { path: '/home' }))
</script>

<template>
  <AppScreen
    :title="member ? getFullName(member) : loading ? '' : 'Not on the roll'"
    :subtitle="subtitle"
    :back="back"
    root="/people"
    :rail="peopleOpen"
    desk
  >
    <template v-if="member && canEdit" #action>
      <button
        v-if="simpleView"
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 dark:text-red-400 dark:ring-red-500/30 dark:hover:bg-red-500/10"
        @click="emit('delete')"
      >
        <Trash2 class="size-4" />
        Delete
      </button>
      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        @click="emit('edit', 0)"
      >
        <PencilSimple class="size-4" />
        Edit
      </button>
    </template>

    <!-- Loading: the shape of the page, so nothing jumps when it arrives. -->
    <div v-if="loading && !member" class="grid grid-cols-[17rem_minmax(0,1fr)] gap-12 pt-2" aria-hidden="true">
      <div class="flex flex-col items-center gap-4">
        <span class="size-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        <span class="h-24 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div class="flex flex-col gap-4">
        <span class="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <span class="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <span class="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>

    <!-- Not on the roll. -->
    <div v-else-if="!member" class="flex flex-col items-center justify-center py-24 text-center text-gray-500 dark:text-gray-400">
      <Users class="mb-4 size-14 opacity-50" />
      <p class="text-lg font-semibold text-gray-900 dark:text-white">This person is not on the roll</p>
      <p class="mt-1 text-sm">They may have been taken off it, or the link is old.</p>
      <button
        type="button"
        class="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        @click="emit('leave')"
      >
        {{ peopleOpen ? 'Back to People' : 'Back home' }}
      </button>
    </div>

    <div v-else class="grid grid-cols-[17rem_minmax(0,1fr)] items-start gap-12 pt-2 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-16">
      <!-- ============ Who they are, and how to reach them ============ -->
      <aside class="sticky top-[calc(var(--screen-head)+1.5rem)] flex flex-col items-center" aria-label="Contact">
        <div class="relative">
          <MemberAvatar :member="member" size="h-40 w-40" alt="" plain-class="ring-4 ring-white dark:ring-gray-800" />
          <button
            v-if="canEdit"
            type="button"
            class="absolute bottom-1 right-1 flex size-10 items-center justify-center rounded-full border-4 border-gray-50 bg-primary text-white transition-colors hover:bg-primary-hover dark:border-gray-900"
            aria-label="Change photo"
            title="Change photo"
            @click="emit('photo')"
          >
            <Camera class="size-4" />
          </button>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span
            :class="[
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              member.isMember === false
                ? 'bg-gray-200/70 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
            ]"
          >
            {{ member.isMember === false ? 'Attendee' : 'Member' }}
          </span>
          <YouBadge :member="member" />
        </div>

        <!-- Call first, where a phone can: the reason most people open a
             record. On your own record there is nobody to ring. -->
        <a
          v-if="reach[0].href && !isMe"
          :href="reach[0].href"
          class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Phone class="size-4" />
          Call {{ getDisplayName(member) }}
        </a>

        <ul class="mt-5 w-full divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          <li v-for="way in reach" :key="way.key" class="flex items-start gap-3 py-3">
            <component :is="way.icon" class="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500" />
            <div class="min-w-0 flex-1">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{{ way.label }}</p>
              <component
                :is="way.href ? 'a' : 'p'"
                v-if="way.value"
                :href="way.href || undefined"
                :class="[
                  'mt-0.5 block text-sm break-words text-gray-900 dark:text-white',
                  way.href ? 'hover:text-primary hover:underline dark:hover:text-primary-light' : '',
                ]"
              >
                {{ way.value }}
              </component>
              <p v-else class="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
                {{ way.missing }}
                <button
                  v-if="canEdit"
                  type="button"
                  class="ml-1 font-semibold text-primary hover:underline dark:text-primary-light"
                  @click="emit('edit', 2)"
                >
                  Add
                </button>
              </p>
            </div>
            <div v-if="way.actions.length" class="flex shrink-0 items-center">
              <template v-for="action in way.actions" :key="action.key">
                <a
                  v-if="action.href"
                  :href="action.href"
                  :target="action.external ? '_blank' : undefined"
                  :rel="action.external ? 'noopener' : undefined"
                  :title="action.label"
                  :aria-label="action.label"
                  class="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <component :is="action.icon" class="size-4" />
                </a>
                <button
                  v-else
                  type="button"
                  :title="action.label"
                  :aria-label="action.label"
                  class="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                  @click="action.run"
                >
                  <component :is="action.icon" class="size-4" />
                </button>
              </template>
            </div>
          </li>
        </ul>
      </aside>

      <!-- ============ What the church knows of them ============ -->
      <div class="flex min-w-0 flex-col gap-10">
        <!-- What is still missing, said once, with the way to fill it. -->
        <div
          v-if="gaps.length"
          class="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25"
        >
          <AlertCircle class="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <p class="min-w-0 flex-1">
            No {{ listPhrase(gaps.map((gap) => gap.label)) }} on file yet.
            <span class="text-amber-800/80 dark:text-amber-200/70">{{ gapNote }}</span>
          </p>
          <button
            v-if="canEdit"
            type="button"
            class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
            @click="emit('edit', 1)"
          >
            Fill in
          </button>
        </div>

        <!-- Details -->
        <section aria-labelledby="person-details">
          <h2 id="person-details" class="border-b border-gray-200 pb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
            Details
          </h2>
          <dl class="mt-5 grid grid-cols-2 gap-x-10 gap-y-6 xl:grid-cols-3">
            <div v-for="detail in details" :key="detail.key" class="min-w-0">
              <dt class="text-xs text-gray-500 dark:text-gray-400">{{ detail.label }}</dt>
              <dd class="mt-1 text-[15px] text-gray-900 dark:text-white">
                <template v-if="detail.value">
                  <span class="font-medium">{{ detail.value }}</span>
                  <span v-if="detail.band" class="ml-2 inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <span :class="['size-2 rounded-full', detail.band.dotClass]" aria-hidden="true" />
                    {{ detail.band.label }}
                  </span>
                  <span
                    v-if="detail.note"
                    class="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
                  >
                    {{ detail.note }}
                  </span>
                </template>
                <span v-else class="text-gray-400 dark:text-gray-500">
                  Not recorded
                  <button
                    v-if="canEdit"
                    type="button"
                    class="ml-1 text-sm font-semibold text-primary hover:underline dark:text-primary-light"
                    @click="emit('edit', detail.step)"
                  >
                    Add
                  </button>
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Their place in the church -->
        <section aria-labelledby="person-church">
          <div class="flex items-end justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
            <h2 id="person-church" class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">In the church</h2>
            <button
              v-if="canEdit"
              type="button"
              class="text-xs font-semibold text-primary hover:underline dark:text-primary-light"
              @click="emit('edit', 3)"
            >
              Change
            </button>
          </div>
          <div :class="['mt-5 grid gap-x-10 gap-y-6', seesGroups ? 'grid-cols-3' : 'grid-cols-2']">
            <!-- Ministries grant access; they are changed from the editor,
                 which says so. Each opens the ministry's people. -->
            <div class="min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Ministries</p>
              <div v-if="ministries.length" class="mt-2 flex flex-wrap gap-1.5">
                <component
                  :is="peopleOpen ? RouterLink : 'span'"
                  v-for="name in ministries"
                  :key="name"
                  :to="peopleOpen ? { name: 'PeopleMinistry', params: { name } } : undefined"
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary dark:bg-primary-light/15 dark:text-primary-light',
                    peopleOpen ? 'hover:bg-primary/15 dark:hover:bg-primary-light/25' : '',
                  ]"
                >
                  <LabelMark :mark="ministryMark(name)" size="h-3.5 w-3.5" />
                  {{ name }}
                </component>
              </div>
              <p v-else class="mt-1 text-[15px] text-gray-400 dark:text-gray-500">Not serving in one yet</p>
              <p v-if="instruments.length" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Plays {{ listPhrase(instruments.map((name) => name.toLowerCase())) }}
              </p>
            </div>

            <div v-if="seesGroups" class="min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Small groups</p>
              <ul v-if="myGroups.length" class="mt-1.5 flex flex-col gap-1">
                <li v-for="group in myGroups" :key="group.id">
                  <RouterLink
                    :to="{ name: 'SmallGroupDetails', params: { id: group.id } }"
                    class="text-[15px] font-medium text-gray-900 hover:text-primary hover:underline dark:text-white dark:hover:text-primary-light"
                  >
                    {{ group.name }}
                  </RouterLink>
                  <span v-if="group.leads" class="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Leads it</span>
                </li>
              </ul>
              <p v-else class="mt-1 text-[15px] text-gray-400 dark:text-gray-500">In none yet</p>
            </div>

            <div class="min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Tags</p>
              <div v-if="tags.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in tags"
                  :key="tag"
                  class="inline-flex items-center gap-1.5 rounded-full bg-gray-200/70 px-2.5 py-1 text-sm text-gray-700 dark:bg-white/10 dark:text-gray-300"
                >
                  <LabelMark :mark="tagMark(tag)" size="h-3.5 w-3.5" />
                  {{ tag }}
                </span>
              </div>
              <p v-else class="mt-1 text-[15px] text-gray-400 dark:text-gray-500">No tags</p>
            </div>
          </div>
        </section>

        <!-- Attendance: only the gatherings this person was expected at. -->
        <section aria-labelledby="person-attendance">
          <div class="flex items-end justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
            <h2 id="person-attendance" class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Attendance</h2>
            <p v-if="counted" class="text-sm tabular-nums text-gray-500 dark:text-gray-400">
              Came to <span class="font-semibold text-gray-900 dark:text-white">{{ present }}</span> of {{ counted }}
              <span class="ml-1 font-semibold text-gray-900 dark:text-white">· {{ rate }}%</span>
            </p>
          </div>

          <p v-if="!history.length" class="mt-5 text-[15px] text-gray-400 dark:text-gray-500">
            No gathering they were expected at has been recorded yet.
          </p>

          <template v-else>
            <!-- A gathering a row, its months running across under one set of
                 headings, and how often they came on its end. Scrolls
                 sideways on its own only when a long history outgrows even a
                 desktop. -->
            <div class="mt-4 overflow-x-auto">
              <table class="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th scope="col" class="sticky left-0 w-56 bg-gray-50 pb-2 text-left text-xs font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      Gathering
                    </th>
                    <th
                      v-for="month in grid.columns"
                      :key="month.key"
                      scope="col"
                      class="px-2 pb-2 text-left text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500"
                    >
                      {{ month.label }}
                    </th>
                    <th scope="col" class="pb-2 pl-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Came</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in grid.rows" :key="row.key">
                    <th scope="row" class="sticky left-0 max-w-56 border-t border-gray-200 bg-gray-50 py-2.5 pr-4 text-left font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      <span class="flex min-w-0 items-center gap-2">
                        <component :is="row.icon" class="size-4 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span class="truncate">{{ row.title }}</span>
                      </span>
                    </th>
                    <td
                      v-for="month in grid.columns"
                      :key="`${row.key}-${month.key}`"
                      class="border-t border-gray-200 px-2 py-2.5 dark:border-gray-800"
                    >
                      <span class="flex items-center gap-1">
                        <button
                          v-for="item in row.byMonth[month.key] || []"
                          :key="item.key"
                          type="button"
                          :title="`${longDay(item.date)}: ${STATE_WORD[item.state]}`"
                          :aria-label="`${item.title}, ${longDay(item.date)}: ${STATE_WORD[item.state]}`"
                          :aria-pressed="pickedDay?.key === item.key"
                          :class="[
                            'block size-3.5 rounded-[3px]',
                            ATTENDANCE_STYLE[item.state],
                            pickedDay?.key === item.key ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-50 dark:ring-primary-light dark:ring-offset-gray-900' : '',
                          ]"
                          @click="pickDay(item)"
                        />
                      </span>
                    </td>
                    <td class="border-t border-gray-200 py-2.5 pl-4 text-right tabular-nums text-gray-600 dark:border-gray-800 dark:text-gray-300">
                      <template v-if="row.counted">{{ row.present }} of {{ row.counted }}</template>
                      <span v-else class="text-gray-400 dark:text-gray-500">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5"><span :class="['size-3 rounded-[3px]', ATTENDANCE_STYLE.present]" />Came</span>
              <span class="flex items-center gap-1.5"><span :class="['size-3 rounded-[3px]', ATTENDANCE_STYLE.absent]" />Did not come</span>
              <span v-if="unrecorded" class="flex items-center gap-1.5">
                <span :class="['size-3 rounded-[3px]', ATTENDANCE_STYLE.unrecorded]" />
                A head count only, so nobody's name was written down
              </span>
              <span v-if="pickedDay" class="ml-auto font-medium text-gray-700 dark:text-gray-200">
                {{ pickedDay.title }} · {{ longDay(pickedDay.date) }} · {{ STATE_WORD[pickedDay.state] }}
              </span>
            </div>
          </template>
        </section>
      </div>
    </div>
  </AppScreen>
</template>

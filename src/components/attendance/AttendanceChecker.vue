<script setup>
import { computed, nextTick, ref } from 'vue'
import { X, ArrowLeft, Search, Check, Trash2, List, Cards, ArrowUpDown, SquaresFour } from '../../icons'
import AttendanceSwipe from './AttendanceSwipe.vue'
import { useMembers } from '../../composables/useMembers'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import {
  readExpectedAttendance,
  membersInAudience,
  membersAtMeeting,
  meetingTagOptions,
  meetingTagOf,
  audienceTagsOf,
  excludeTagsOf,
  audienceLabel,
  carriesTag
} from '../../utils/audience'
import { groupByBand, bandIndexOf } from '../../utils/ageBands'
import { ATTENDANCE_SOURCES } from '../../../lib/attendance'
import MemberAvatar from '../members/MemberAvatar.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import ActionFab from '../common/ActionFab.vue'
import TurnoutRing from './TurnoutRing.vue'
import SortSheet from '../common/SortSheet.vue'

const isMobile = useMediaQuery('(max-width: 1023px)')

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  attendanceData: {
    type: Object,
    required: true
  },
  eventData: {
    type: Object,
    default: null
  },
  // Attendance recorded against an event: the event owns the title and date,
  // so show them read-only instead of letting the two drift apart.
  detailsLocked: {
    type: Boolean,
    default: false
  },
  // 'event' | 'minute' | 'recurring' when this drawer was opened from a
  // generated "Not recorded" row, which can only be removed by deleting its
  // source — for a weekly occurrence, that means dropping this one date.
  placeholderKind: {
    type: String,
    default: null
  },
  // Whether there is a count here to wipe. Not the same question as `isEdit`:
  // a meeting keeps its register on the minute rather than in a saved record,
  // so it is marked like a placeholder and cleared like a record.
  canClear: {
    type: Boolean,
    default: false
  },
  // 'drawer' slides over the list; 'page' fills a route of its own, which is
  // what taking attendance actually wants — a hundred names and a swipe deck
  // deserve the whole screen, not half of it.
  variant: {
    type: String,
    default: 'drawer'
  }
})

const emit = defineEmits(['update:show', 'update:attendanceData', 'cancel', 'clear', 'delete-source'])

const { members } = useMembers()

// Search is a mode rather than furniture, as it is on People: a bar that is
// always there costs a row of names on every visit, and most of this screen is
// ticking down a list rather than hunting for one person.
const searchQuery = ref('')
const searchOpen = ref(false)
const searchInput = ref(null)
const openSearch = async () => {
  searchOpen.value = true
  // Opened from the button, so the keyboard should be up and ready.
  await nextTick()
  searchInput.value?.focus()
}
const closeSearch = () => {
  searchOpen.value = false
  searchQuery.value = ''
}

// Check if creating new (no event data and not editing)
const isNewAttendance = computed(() => !props.eventData && !props.isEdit)

// How many were expected, recounted from the roster as the record is written:
// the tags are what a gathering is for, the number saved on it is only a
// snapshot of them on the day.
//
// A meeting is the exception, and not by accident: it names its group as a tag
// or a ministry, because that is what the minute's own attendance drawer picks
// from. Counting it on tags alone put the CSL meeting out of the whole church.
const expectedFor = (source) => {
  const tag =
    source?.source === ATTENDANCE_SOURCES.MINUTE
      ? meetingTagOf(source, meetingTagOptions(members.value))
      : ''
  if (tag) return membersAtMeeting(members.value, tag).length
  return readExpectedAttendance(source, members.value)
}

// Initialize form data
const formData = computed({
  get: () => {
    if (props.eventData && !props.isEdit) {
      return {
        // Provenance is decided by the page that opened this drawer and must
        // survive every edit here: rebuilding the payload from eventData alone
        // would drop it the moment anyone is toggled, and the record would
        // save as an untethered one-off.
        source: props.attendanceData.source,
        sourceId: props.attendanceData.sourceId ?? null,
        occurrenceKey: props.attendanceData.occurrenceKey ?? null,
        eventId: props.eventData.firestoreId || props.eventData.id || '',
        eventType: props.eventData.eventType || props.eventData.type || '',
        eventTitle: props.eventData.eventTitle || props.eventData.title || '',
        date: props.eventData.date || '',
        time: props.eventData.time || '',
        location: props.eventData.location || '',
        attendees: props.attendanceData.attendees || [],
        notes: props.attendanceData.notes || '',
        expectedAttendees: expectedFor(props.eventData),
        // Copied off the event or schedule, so the saved record still knows
        // who it was for once that source is edited or deleted.
        audienceTags: audienceTagsOf(props.eventData),
        excludeTags: excludeTagsOf(props.eventData)
      }
    }
    return props.attendanceData
  },
  set: (value) => {
    emit('update:attendanceData', value)
  }
})

// Update form field
const updateField = (field, value) => {
  emit('update:attendanceData', { ...formData.value, [field]: value })
}

// Who this gathering is actually for. A choir practice is not attended by the
// congregation, so the roll shown is the audience named by the event's tags
// rather than the whole roster — the same tags the expected head is counted
// off, which until now the list quietly disagreed with. No tags still means
// everyone (utils/audience.js).
//
// The event is asked first and the record second: a record carries the tags
// copied off its event, but a one-off tied to nothing carries its own.
const audienceSource = computed(() => {
  const event = props.eventData
  if (audienceTagsOf(event).length || excludeTagsOf(event).length) return event
  return formData.value
})

const audienceTags = computed(() => audienceTagsOf(audienceSource.value))
const audienceExcludes = computed(() => excludeTagsOf(audienceSource.value))

/** The group, when this is a meeting — matched across tags and ministries. */
const meetingTag = computed(() =>
  audienceSource.value?.source === ATTENDANCE_SOURCES.MINUTE
    ? meetingTagOf(audienceSource.value, meetingTagOptions(members.value))
    : ''
)

/** True once the tags actually narrow the roll to fewer than everyone. */
const isNarrowed = computed(() =>
  Boolean(audienceTags.value.length || audienceExcludes.value.length || meetingTag.value)
)

const audienceRoster = computed(() => {
  const inAudience = meetingTag.value
    ? membersAtMeeting(members.value, meetingTag.value)
    : membersInAudience(members.value, audienceTags.value, audienceExcludes.value)

  // Anyone already marked present stays on the roll even if they fall outside
  // the audience — someone marked before the tags changed, or found through
  // the search below. A mark that cannot be seen is a mark that cannot be
  // taken back, and hiding it would silently strand it in the saved record.
  const shown = new Set(inAudience.map((member) => String(memberKey(member))))
  const marked = (members.value || []).filter(
    (member) =>
      !shown.has(String(memberKey(member))) && isPresent(memberKey(member))
  )

  return [...inAudience, ...marked]
})

// Filter members by search
const filteredMembers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  // Searching reaches the whole roster, not just the audience. Someone turns
  // up who was never tagged for this — a visitor at a choir practice — and
  // still has to be markable without anyone editing the event first.
  if (!query) return audienceRoster.value

  return (members.value || []).filter(member => {
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase()
    return fullName.includes(query)
  })
})

/**
 * The tag this gathering leaves somebody out by, if it does.
 *
 * "Everyone except the Sunday schoolers" is said because the Sunday schoolers
 * are counted somewhere else. Search reaches the whole roll, so a child can
 * still be found and ticked here — and then they are present twice, once on
 * each register, for the one hour they were in one room.
 */
const excludedBy = (member) =>
  meetingTag.value ? '' : audienceExcludes.value.find((tag) => carriesTag(member, tag)) || ''

// Toggle member attendance. There is no "absent" to clear: a record says who
// came, and everyone else is simply not on it.
const markPresent = (memberId) => {
  const attendees = [...(formData.value.attendees || []), memberId]
  emit('update:attendanceData', { ...formData.value, attendees })
}

const toggleAttendee = (memberId) => {
  const attendees = [...(formData.value.attendees || [])]
  const index = attendees.findIndex(id => String(id) === String(memberId) || id === memberId)
  if (index > -1) {
    attendees.splice(index, 1)
    emit('update:attendanceData', { ...formData.value, attendees })
    return
  }
  // Not refused, only asked: sometimes the Sunday schooler really did sit in
  // the service instead. Taking a mark off is never questioned.
  const member = (members.value || []).find((m) => String(memberKey(m)) === String(memberId))
  const tag = member ? excludedBy(member) : ''
  if (tag) {
    pendingExcluded.value = { memberId, name: getFullName(member), tag }
    return
  }
  markPresent(memberId)
}

const pendingExcluded = ref(null)

const excludedMessage = computed(() => {
  const pending = pendingExcluded.value
  if (!pending) return ''
  return `${pending.name} is tagged ${pending.tag}, and this gathering leaves out ${pending.tag}. They are usually recorded on their own attendance, so marking them here as well counts them twice. Mark them present anyway?`
})

const confirmExcluded = () => {
  if (pendingExcluded.value) markPresent(pendingExcluded.value.memberId)
  pendingExcluded.value = null
}

// Check if member is present
const isPresent = (memberId) => {
  return (formData.value.attendees || []).some(id => String(id) === String(memberId) || id === memberId)
}

// A room is checked group by group — the kids are sitting together, the youth
// are sitting together — so the list is divided the same way instead of running
// one long roll from the door to the back row. The bands are the ones the
// People page reports on (utils/ageBands.js); names are alphabetical inside a
// band, which is the order someone scanning for one person expects.
const byBandThenName = (a, b) =>
  bandIndexOf(a) - bandIndexOf(b) || getFullName(a).localeCompare(getFullName(b))

// How the roll is arranged while it is checked off. Age bands are the default
// because a room sits that way - the kids together, the youth together - but a
// long service wants "who is left" and a short list wants one plain A-Z.
const SORT_OPTIONS = [
  { key: 'band', label: 'Age groups', hint: 'The way the room sits' },
  { key: 'name', label: 'Name', hint: 'One list, A to Z' },
  { key: 'unmarked', label: 'Still to check', hint: 'Nobody marked yet, first' },
]
const sortBy = ref('band')
const showSort = ref(false)

const byName = (a, b) => getFullName(a).localeCompare(getFullName(b))

const countPresent = (list) => list.filter((member) => isPresent(memberKey(member))).length

/** Sections of the roll: a heading (or none) and the people under it. */
const memberGroups = computed(() => {
  const people = filteredMembers.value

  if (sortBy.value === 'name') {
    return [{ key: 'all', label: '', members: [...people].sort(byName), present: countPresent(people) }]
  }

  if (sortBy.value === 'unmarked') {
    const todo = people.filter((member) => !isPresent(memberKey(member))).sort(byName)
    const done = people.filter((member) => isPresent(memberKey(member))).sort(byName)
    return [
      { key: 'todo', label: 'Still to check', members: todo, present: 0 },
      { key: 'done', label: 'Marked present', members: done, present: done.length },
    ].filter((group) => group.members.length)
  }

  return groupByBand(people).map((group) => ({
    key: group.band.key,
    label: group.band.label,
    members: [...group.members].sort(byName),
    present: countPresent(group.members),
  }))
})

// The deck deals in the same order the list shows, so putting the phone down
// halfway through the youth and finishing in the list lands where you left off.
const orderedMembers = computed(() => [...audienceRoster.value].sort(byBandThenName))

// 'browse' to hunt for a specific name, 'swipe' to go through everyone in
// order. Swipe is the better tool while the service is filling up; browsing is
// better for fixing one person afterwards. Neither replaces the other, so both
// are on the button rather than one being a tab strip taking a row of the
// screen on every visit.
const mode = ref('browse')

// One column or a grid of cards, remembered on this device - the same choice
// People offers, for the same reason: names scan faster in a list, faces in a
// grid. A desktop has the width for cards either way.
const VIEW_KEY = 'ekkly:checker-view'
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}
const mobileView = ref(readView())
const toggleMobileView = () => {
  mobileView.value = mobileView.value === 'grid' ? 'list' : 'grid'
  try {
    localStorage.setItem(VIEW_KEY, mobileView.value)
  } catch {
    // Not remembered this time; the switch itself still happened.
  }
}
const showGrid = computed(() => !isMobile.value || mobileView.value === 'grid')

// Two across a phone in the grid; the container decides the rest, so the
// half-width drawer and the full-width page each land on a sensible number.
const rollClass = computed(() =>
  showGrid.value
    ? 'grid grid-cols-2 gap-2 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4'
    : 'grid grid-cols-1 gap-1 @md:grid-cols-2 @md:gap-2 @3xl:grid-cols-3 @5xl:grid-cols-4'
)

// A bare row on a phone, a bordered card in the grid. Two states - marked
// present, or not marked yet - picked here rather than nested three deep in
// the template.
const memberButtonClass = (member) => {
  const key = memberKey(member)
  const base =
    'w-full flex items-center gap-3 rounded-xl text-left transition-colors px-2 py-2 @md:px-3 @md:py-3 @md:border-2'
  if (isPresent(key)) {
    return `${base} bg-emerald-50 dark:bg-emerald-500/10 @md:border-emerald-400 @md:dark:border-emerald-500/40`
  }
  return `${base} hover:bg-gray-50 dark:hover:bg-gray-700/50 @md:bg-gray-50 @md:dark:bg-gray-700/50 @md:border-transparent @md:hover:bg-gray-100 @md:dark:hover:bg-gray-700`
}

const presentIds = computed({
  get: () => formData.value.attendees || [],
  set: (attendees) => emit('update:attendanceData', { ...formData.value, attendees }),
})

// props.isEdit, not isEdit — the template unwraps props for you, script setup
// does not, and the bare name is simply undefined here.
const canClearHere = computed(() => Boolean(props.isEdit) || Boolean(props.canClear))

// A meeting and an event are deleted outright; one date of a weekly service is
// dropped out of a series that carries on without it. Worth saying which, on
// the menu item itself, because the three are not the same size of decision.
const deleteSourceLabel = computed(() =>
  props.placeholderKind === 'minute'
    ? 'Delete meeting'
    : props.placeholderKind === 'recurring'
      ? 'Delete this date'
      : 'Delete event'
)

const deleteSourceHint = computed(() =>
  props.placeholderKind === 'minute'
    ? 'Removes it from Minutes too'
    : props.placeholderKind === 'recurring'
      ? 'Takes this date off the calendar'
      : 'Removes it from Events too'
)

// Everything this screen can do, on the one floating button - the way People
// carries its search and sort. Marks save themselves as they are made, so
// there is nothing here that needs a bar of its own across the foot of the
// screen.
const actions = computed(() => {
  const list = []
  if (mode.value === 'swipe') {
    list.push({ key: 'browse', label: 'Back to the list', icon: List })
  } else {
    list.push({ key: 'swipe', label: 'Swipe through', hint: 'One face at a time', icon: Cards })
    if (!searchOpen.value) list.push({ key: 'search', label: 'Search', icon: Search })
    list.push({
      key: 'sort',
      label: 'Sort',
      hint: SORT_OPTIONS.find((option) => option.key === sortBy.value)?.label,
      icon: ArrowUpDown,
    })
    if (isMobile.value) {
      const toGrid = mobileView.value === 'list'
      list.push({
        key: 'view',
        label: toGrid ? 'Show as grid' : 'Show as list',
        icon: toGrid ? SquaresFour : List,
      })
    }
  }
  // Rare and irreversible, so they sit at the bottom of the list, marked.
  if (canClearHere.value) {
    list.push({
      key: 'clear',
      label: 'Clear attendance',
      hint: 'Wipes who was marked',
      icon: Trash2,
      danger: true,
    })
  }
  if (props.placeholderKind) {
    list.push({
      key: 'delete-source',
      label: deleteSourceLabel.value,
      hint: deleteSourceHint.value,
      icon: Trash2,
      danger: true,
    })
  }
  return list
})

const runAction = (key) => {
  if (key === 'swipe' || key === 'browse') {
    mode.value = key === 'swipe' ? 'swipe' : 'browse'
    return
  }
  if (key === 'search') return openSearch()
  if (key === 'sort') {
    showSort.value = true
    return
  }
  if (key === 'view') return toggleMobileView()
  emit(key)
}

const handleCancel = () => {
  emit('cancel')
}

const presentCount = computed(() => formData.value.attendees?.length || 0)
const totalCount = computed(() => audienceRoster.value.length)
const progressPercent = computed(() =>
  totalCount.value ? Math.round((presentCount.value / totalCount.value) * 100) : 0
)

/**
 * "Sun 14 Sep · 12 of 60" — the one line under the title.
 *
 * The date, because that is the question anyone checks first: a service is
 * recorded days late as often as on the day, and two Sundays of the same
 * service look identical without it. The time and the place are on the event
 * itself, and neither changes which gathering this is. The count rides here
 * rather than in a block of its own: stacked under a big percentage it made
 * the header taller than the first screenful of names.
 *
 * Built from the parts rather than through `new Date('2026-09-14')`, which is
 * UTC midnight and reads as the day before west of Greenwich.
 */
const dateLabel = computed(() => {
  const [year, month, day] = String(formData.value.date || '').split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
})

const contextLine = computed(() =>
  [dateLabel.value, `${presentCount.value} of ${totalCount.value}`].filter(Boolean).join(' · ')
)

/* --------------------------------------------------------------- chrome */
// One component serves both presentations rather than duplicating four
// hundred lines of form and member list.
const isPage = computed(() => props.variant === 'page')

const transitionName = computed(() =>
  isPage.value ? undefined : isMobile.value ? 'modal-sheet' : 'drawer'
)

const shellClass = computed(() => {
  // relative: the floating button is positioned against this.
  if (isPage.value) return 'relative h-full w-full flex flex-col min-h-0'
  return isMobile.value
    ? 'fixed inset-0 z-80 flex flex-col justify-end'
    : 'relative bg-white dark:bg-gray-800 w-1/2 h-full flex flex-col shrink-0 border-l border-gray-200 dark:border-gray-700'
})

const panelClass = computed(() => {
  if (isPage.value) return 'flex flex-col min-h-0 h-full w-full'
  return isMobile.value
    ? 'relative z-10 w-full max-h-[92dvh] rounded-t-2xl bg-white dark:bg-gray-800 shadow-2xl border-t border-gray-200 dark:border-gray-700'
    : 'h-full w-full'
})
</script>

<template>
  <Teleport to="body" :disabled="isPage || !isMobile">
    <Transition :name="transitionName">
    <div v-if="show" :class="shellClass">
      <div
        v-if="!isPage && isMobile"
        class="absolute inset-0 bg-black/50"
        @click="handleCancel"
      />
      <div :class="panelClass">

      <!-- Header. Title and how far along — the two things worth permanent
           screen space. The date and type came off the event that created this
           record, so repeating them here only invited the two to drift apart.
           The header is also the gauge: it fills as the room does, the same
           way a row fills on the attendance list. -->
      <div
        :class="[
          // No overflow-hidden here: the actions menu hangs below this box on
          // `top-full`, and clipping the header swallows it. The fill cannot
          // overflow anyway - it is inset to this box and never exceeds 100%.
          'relative shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700',
          // On a focus route nothing sits above this, so it owns the notch.
          isPage ? 'pt-[max(0.5rem,env(safe-area-inset-top))]' : 'pt-2',
        ]"
      >
        <div
          class="pointer-events-none absolute inset-y-0 left-0 bg-linear-to-r from-primary/20 to-primary/5 transition-[width] duration-500 ease-out dark:from-primary/30 dark:to-primary/10"
          :style="{ width: `${progressPercent}%` }"
        ></div>

        <div class="relative flex items-start gap-2">
          <button
            @click="handleCancel"
            :aria-label="isPage ? 'Back to attendance' : 'Close'"
            class="shrink-0 -ml-1.5 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft v-if="isPage" class="h-5 w-5" />
            <X v-else class="h-5 w-5" />
          </button>

          <div class="min-w-0 flex-1">
            <!-- Recorded against an event: the event owns these, so they read. -->
            <template v-if="detailsLocked">
              <h3 class="text-base font-bold text-gray-900 dark:text-white leading-snug truncate">
                {{ formData.eventTitle }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {{ contextLine }}
              </p>
            </template>

            <!-- A one-off: the title field IS the heading, rather than a
                 labelled form repeating what the header already says. -->
            <template v-else>
              <input
                :value="formData.eventTitle"
                @input="updateField('eventTitle', $event.target.value)"
                type="text"
                placeholder="What is this gathering?"
                aria-label="Title"
                class="w-full bg-transparent text-base font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal border-0 p-0 focus:ring-0 focus:outline-none"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {{ contextLine }}
              </p>
            </template>
          </div>

          <!-- The running total, in the one place both modes can see it. The
               share leads: "62%" says how the room looks, "37 of 60" says how
               much typing is left. -->
          <TurnoutRing
            :share="progressPercent"
            size="h-11 w-11"
            text-class="text-[11px]"
            class="mt-0.5"
          />
        </div>
      </div>

      <!-- Swipe, when the button asked for it. -->
      <AttendanceSwipe
        v-if="mode === 'swipe'"
        v-model:presentIds="presentIds"
        :members="orderedMembers"
        @done="mode = 'browse'"
        class="flex-1 min-h-0"
      />

      <template v-else>
        <!-- No "mark all" / "clear all": one tap either way rewrote a hundred
             marks with nothing to undo it, and with autosave it was committed
             before anyone could react. Marking is per person now. -->
        <div v-if="searchOpen || (isNarrowed && !searchQuery.trim())" class="shrink-0 px-4 py-3">
          <div v-if="searchOpen" class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Search members"
              class="w-full h-9 pl-9 pr-9 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-primary text-gray-900 dark:text-white"
            />
            <button
              @click="closeSearch"
              aria-label="Close search"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <!-- Say so when the roll is not the whole church, and say that the
               search still reaches everyone — otherwise a missing name reads
               as a bug rather than as the audience doing its job. -->
          <p v-if="isNarrowed && !searchQuery.trim()" class="mt-2 px-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Showing {{ audienceLabel(audienceTags, audienceExcludes) }} · search to reach anyone else
          </p>
        </div>

        <!-- Members. One column on a phone, a card grid wherever there is
             room. The container is asked rather than the viewport, so the
             half-width desktop drawer and the full-width record page each land
             on a sensible number of columns without being told apart. -->
        <div
          class="@container flex-1 overflow-y-auto px-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] @md:px-4"
        >
          <p
            v-if="filteredMembers.length === 0"
            class="p-8 text-center text-gray-400 dark:text-gray-500 text-sm"
          >
            {{ searchQuery.trim()
              ? `No members match “${searchQuery}”`
              : 'Nobody on the roster carries this gathering’s tags yet.' }}
          </p>
          <!-- One section per age band. The heading carries that band's own
               tally, so "the kids are all in, the youth are half done" is
               readable without counting ticks. -->
          <section v-else v-for="group in memberGroups" :key="group.key" class="mb-3">
            <!-- The same grey band People puts over its groups, carrying this
                 one's own tally: "the kids are all in, the youth are half
                 done" without counting ticks. -->
            <div
              v-if="group.label"
              class="sticky top-0 z-10 -mx-2 mb-1 flex items-center gap-2 border-y border-gray-200 bg-gray-100 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900 @md:-mx-4 @md:px-4"
            >
              <span class="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                {{ group.label }}
              </span>
              <span
                class="ml-auto text-xs tabular-nums"
                :class="
                  group.present === group.members.length
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 dark:text-gray-500'
                "
              >
                {{ group.present }} of {{ group.members.length }}
              </span>
            </div>

            <ul :class="rollClass">
              <li v-for="member in group.members" :key="memberKey(member)">
                <button
                  @click="toggleAttendee(memberKey(member))"
                  :aria-pressed="isPresent(memberKey(member))"
                  :class="memberButtonClass(member)"
                >
                  <MemberAvatar :member="member" alt="" size="w-9 h-9 @md:w-11 @md:h-11" />
                  <span class="flex-1 min-w-0 text-sm">
                    <span
                      :class="[
                        'block truncate',
                        isPresent(memberKey(member))
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300',
                      ]"
                    >
                      {{ getFullName(member) }}
                    </span>
                    <!-- What they are actually called at church, which is how
                         half the room is recognised. -->
                    <span
                      v-if="member.nickname"
                      class="block truncate text-[11px] text-gray-500 dark:text-gray-400"
                    >
                      "{{ member.nickname }}"
                    </span>
                    <!-- Only reachable by searching, and worth saying why
                         before the tap rather than after it. -->
                    <span
                      v-if="excludedBy(member)"
                      class="block truncate text-[11px] font-normal text-amber-600 dark:text-amber-400"
                    >
                      {{ excludedBy(member) }} · recorded separately
                    </span>
                  </span>
                  <!-- Marked present, or not marked yet. Nobody is marked
                       absent: a register records who came. -->
                  <span
                    :class="[
                      'shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                      isPresent(memberKey(member))
                        ? 'bg-emerald-500'
                        : 'border-2 border-gray-200 dark:border-gray-600',
                    ]"
                  >
                    <Check v-if="isPresent(memberKey(member))" class="h-3.5 w-3.5 text-white" />
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </template>


      </div>

      <!-- Everything this screen does, on one button: swipe, search, sort,
           how the roll is laid out, and the rare destructive pair. -->
      <ActionFab :actions="actions" label="Attendance actions" @select="runAction" />
    </div>
    </Transition>
  </Teleport>

  <SortSheet
    :show="showSort"
    :options="SORT_OPTIONS"
    v-model="sortBy"
    title="Sort the roll by"
    hint="How the names are grouped while you check them off"
    @close="showSort = false"
  />

  <ConfirmationModal
    :show="Boolean(pendingExcluded)"
    title="Recorded separately"
    :message="excludedMessage"
    confirm-text="Mark present"
    cancel-text="Leave unmarked"
    confirm-button-class="bg-amber-600 text-white hover:bg-amber-700"
    @update:show="pendingExcluded = null"
    @confirm="confirmExcluded"
    @cancel="pendingExcluded = null"
  />
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: max-width 0.3s ease-out, opacity 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  max-width: 0;
  opacity: 0;
  overflow: hidden;
}

.modal-sheet-enter-active,
.modal-sheet-leave-active {
  transition: opacity 0.25s ease;
}

.modal-sheet-enter-active > div:last-child,
.modal-sheet-leave-active > div:last-child {
  transition: transform 0.25s ease;
}

.modal-sheet-enter-from,
.modal-sheet-leave-to {
  opacity: 0;
}

.modal-sheet-enter-from > div:last-child,
.modal-sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>


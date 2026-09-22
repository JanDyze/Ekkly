<script setup>
import { computed, ref } from 'vue'
import { getEventTypeBar, getEventTypeColor, eventTypeLabel } from '../../utils/eventColors'
import { isCalledOff, eventStatusLabel, readEventStatus } from '../../../lib/eventStatus'
import { isRecorded } from '../../../lib/attendance'
import { useLongPress } from '../../composables/useLongPress'
import TurnoutRing from './TurnoutRing.vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  },
  members: {
    type: Array,
    default: () => []
  },
  selected: {
    type: Boolean,
    default: false
  },
  // Whether this person may change the record. Passed down rather than asked
  // for here, so the list and the row cannot disagree about it.
  canManage: {
    type: Boolean,
    default: false
  },
  // The grid's card rather than the list's row: date and gauge along the
  // top, the title free to wrap to two lines under them.
  stacked: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'delete',
  'record-attendance',
  'edit-attendance',
  'mark',
  'click',
  'contextmenu',
])

const handleClick = () => {
  // The tap the browser makes up after a long press would otherwise open the
  // recorder straight behind the menu that press just opened.
  if (longPress.consumeClick()) return
  // A gathering that is off, or one nobody is counting, has nothing to record:
  // opening the marker is the only useful thing a tap can do, and it is also
  // the way back — reinstating it, or asking to be prompted again.
  if (calledOff.value || props.record.skipped) {
    emit('mark', props.record)
    return
  }
  if (props.record.rowType === 'attendance') {
    emit('edit-attendance', props.record)
  } else if (
    props.record.rowType === 'event' ||
    props.record.rowType === 'minute' ||
    props.record.rowType === 'recurring'
  ) {
    emit('record-attendance', props.record)
  } else {
    emit('click', props.record)
  }
}

const getDay = (dateString) => {
  if (!dateString) return '--'
  return new Date(dateString).getDate()
}

const getDayName = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' })
}

// The calendar's vocabulary, so a Sunday service is the same blue here as it
// is on Events and a meeting the same slate. A meeting arrives as a minute row
// rather than a typed event, so it is named rather than guessed.
const type = computed(() =>
  props.record.rowType === 'minute' ? 'meeting' : props.record.eventType || ''
)

const category = computed(() => (type.value ? eventTypeLabel(type.value) : 'Event'))

// A gathering nobody has counted yet: a prompt, not a record. Asked of
// lib/attendance.js rather than decided here, because "recorded" used to mean
// "came from the attendance collection" — and a meeting's register is written
// on its minute, so a meeting with thirty names on it read "Not recorded".
const isPlaceholder = computed(() => !isRecorded(props.record))

// Cancelled or postponed on the calendar. The row stays — a service that is
// off is a fact about that Sunday, and hiding it is how somebody ends up
// recording attendance for a gathering that never happened.
const calledOff = computed(() => isCalledOff(props.record))
const statusLabel = computed(() => eventStatusLabel(readEventStatus(props.record)))

// Deliberately not counted anywhere: a skipped gathering is not a turnout of
// zero, it is a decision not to count.
const skipped = computed(() => Boolean(props.record.skipped))

/** Off, skipped, or simply not yet done — the three things a row can be. */
const isQuiet = computed(() => calledOff.value || skipped.value)

// Only a meeting cannot be called off: minutes are not the calendar's to
// cancel, and a gathering already recorded is history rather than a plan.
const canMark = computed(
  () => props.record.rowType === 'event' || props.record.rowType === 'recurring' || isPlaceholder.value
)

// Throwing away a count somebody took. Only ever offered where there is one:
// a placeholder has nothing behind it, and a skipped gathering is undone by
// asking to be prompted again rather than by deleting the marker. A meeting
// qualifies — what goes is the register on its minute, not the minute.
const canDelete = computed(
  () => props.canManage && !isPlaceholder.value && !skipped.value
)

// Marking is offered on the menu only where a tap does not already do it: a
// gathering that is off or skipped opens the marker on a plain tap.
const menuMark = computed(() => props.canManage && canMark.value && !isQuiet.value)

// Whether a hold or a right-click opens anything. The two actions that used
// to sit on the row as small grey icons now live on a menu, as they do on
// People: a row is a record, and the row stays clear to read. Someone who
// cannot change attendance, or a row with nothing to offer, gets no menu -
// and no sinking under the thumb as though one were coming.
const holdable = computed(() => menuMark.value || canDelete.value)

const openMenu = (x, y, el = null) => {
  emit('contextmenu', {
    record: props.record,
    x,
    y,
    // Only from a long press: the row is lifted above the dimmed screen while
    // its menu is open (HoldFocus.vue). A right-click keeps the plain menu.
    el,
    canMark: menuMark.value,
    canDelete: canDelete.value,
  })
}

const handleContextMenu = (event) => {
  if (!holdable.value) return
  event.preventDefault()
  openMenu(event.clientX, event.clientY)
}

// Touch has no right-click, so a long press opens the same menu.
const rootEl = ref(null)
const longPress = useLongPress(({ x, y }) => {
  if (holdable.value) openMenu(x, y, rootEl.value)
})

// While a finger rests on the row it sinks, slowly, over the whole hold - the
// squeeze is itself the countdown to the menu - and eases back quickly when
// let go. The same give as a row on People.
const pressStyle = computed(() => {
  const held = longPress.pressing.value && holdable.value
  return {
    transform: held ? 'scale(0.97)' : 'scale(1)',
    transition: held
      ? `transform ${longPress.delay}ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms ease`
      : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease',
  }
})

const roster = computed(() => props.members.length)

const present = computed(() => props.record.totalAttendees ?? props.record.attendees?.length ?? 0)

// Who was expected, not who is on the roster. A choir practice is for the ten
// people carrying the tag, and reporting "8 of 105" called a full turnout a
// collapse. The count arrives already recounted off the gathering's tags
// (useAttendance.js); the roster only stands in for something that names no
// audience at all, where everyone genuinely is the answer.
const expected = computed(() => props.record.expectedAttendees || roster.value)

// The same denominator the recorder counts against on its own header, so the
// two screens cannot disagree about the same gathering.
const share = computed(() => {
  if (isPlaceholder.value || skipped.value || !expected.value) return null
  return Math.min(100, Math.round((present.value / expected.value) * 100))
})
</script>

<template>
  <div
    ref="rootEl"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @touchstart="longPress.onTouchStart"
    @touchmove="longPress.onTouchMove"
    @touchend="longPress.onTouchEnd"
    @touchcancel="longPress.onTouchEnd"
    :style="pressStyle"
    :class="[
      'touch-callout-none relative cursor-pointer select-none overflow-hidden',
      stacked
        ? 'flex flex-col gap-2 rounded-lg p-3'
        : 'flex items-center gap-3 py-2 pl-4 pr-3',
      selected
        ? 'bg-primary/10 dark:bg-primary/20'
        : longPress.pressing.value && holdable
          ? 'bg-gray-100 dark:bg-gray-700/50'
          : stacked
            ? 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50',
      // Still there, still readable, plainly not part of the count.
      isQuiet ? 'opacity-60' : '',
    ]"
  >
    <!-- The kind of gathering, as a stripe down the edge, so a month of
         services still reads as a month of services. Faint while nothing is
         recorded. -->
    <div
      :class="[
        'pointer-events-none absolute left-0 w-1',
        stacked ? 'inset-y-3 rounded-r' : 'inset-y-0',
        getEventTypeBar(type),
        isPlaceholder ? 'opacity-30' : '',
      ]"
    ></div>

    <!-- Date and gauge: side by side at the ends of a row; along the top of a
         card. -->
    <div :class="stacked ? 'flex items-start justify-between gap-2 pl-1' : 'contents'">
      <div :class="['shrink-0 text-center', stacked ? 'text-left' : 'w-10']">
        <div class="text-xl font-bold leading-none tabular-nums text-gray-900 dark:text-white">
          {{ getDay(record.date) }}
        </div>
        <div class="mt-0.5 text-[11px] uppercase text-gray-400 dark:text-gray-500">
          {{ getDayName(record.date) }}
        </div>
      </div>

      <TurnoutRing v-if="stacked && share !== null" :share="share" size="h-12 w-12" text-class="text-[11px]" />
    </div>

    <div :class="['min-w-0 flex-1', stacked ? 'pl-1' : '']">
      <p
        :class="[
          'text-sm font-medium',
          stacked ? 'line-clamp-2 leading-snug' : 'truncate',
          calledOff
            ? 'text-gray-500 line-through dark:text-gray-400'
            : 'text-gray-900 dark:text-white',
        ]"
      >
        {{ record.eventTitle || 'Untitled' }}
      </p>
      <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          :class="[
            'rounded px-1.5 py-0.5 text-[11px]',
            getEventTypeColor(type),
            isPlaceholder ? 'opacity-60' : '',
          ]"
        >
          {{ category }}
        </span>
        <!-- Cancelled and postponed are facts about the gathering; skipped is
             a decision about the paperwork. Three different states, so three
             different words rather than one grey badge for all of them. -->
        <span
          v-if="calledOff"
          class="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300"
        >
          {{ statusLabel }}
        </span>
        <span
          v-else-if="skipped"
          class="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-400 dark:border-gray-600 dark:text-gray-500"
        >
          Not counted
        </span>
        <span v-else-if="!isPlaceholder" class="text-xs text-gray-500 dark:text-gray-400">
          <span class="font-semibold tabular-nums text-gray-700 dark:text-gray-200">{{ present }}</span>
          <span v-if="expected"> of <span class="tabular-nums">{{ expected }}</span></span>
        </span>
        <span
          v-else
          class="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-400 dark:border-gray-600 dark:text-gray-500"
        >
          Not recorded
        </span>
      </div>

      <p
        v-if="record.statusNote || record.postponedTo"
        class="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400"
      >
        <template v-if="record.postponedTo">Moved to {{ record.postponedTo }}</template>
        <template v-if="record.postponedTo && record.statusNote"> · </template>
        {{ record.statusNote }}
      </p>
    </div>

    <!-- The row's gauge sits at its end, where a thumb scrolling down the
         list lines them all up. No buttons: calling a gathering off and
         deleting its count are on the hold menu (see holdable). -->
    <TurnoutRing v-if="!stacked && share !== null" :share="share" />
  </div>
</template>

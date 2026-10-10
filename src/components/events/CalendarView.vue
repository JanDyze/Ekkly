<script setup>
import { ref, computed } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight, List, LayoutGrid } from '../../icons'
import { getEventIcon as getIconComponent, iconForEvent } from '../../utils/eventIcons'
import {
  getEventTypeColor,
  getEventTypeDot,
  CALLED_OFF_OUTLINE,
  CALLED_OFF_TEXT,
} from '../../utils/eventColors'
import { isCalledOff, eventStatusSummary } from '../../../lib/eventStatus'
import { isRoutineOccurrence, isBirthdayEvent } from '../../utils/eventRoutine'
import CalendarAgenda from './CalendarAgenda.vue'
import EventCardSkeleton from './EventCardSkeleton.vue'
import philippineHolidays from '../../data/philippineHolidays.json'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSwipePage } from '../../composables/useSwipePage'

const props = defineProps({
  currentDate: {
    type: Date,
    required: true
  },
  currentMonth: {
    type: String,
    required: true
  },
  calendarDays: {
    type: Array,
    required: true
  },
  selectedDate: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  events: {
    type: Array,
    default: () => []
  },
  // The weekly schedules, so an edited occurrence can be told from its usual
  // self: one moved to ten o'clock is news, one with a typo fixed is not.
  schedules: {
    type: Array,
    default: () => []
  },
  calendarScrollRef: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['navigateMonth', 'dayClick', 'eventClick', 'goToToday', 'calendarWheel', 'setDate'])

// Swipe to turn the month, the way the wheel already does on a desktop. The
// arrows stay: a gesture nobody is told about cannot be the only way to do
// something.
//
// Both axes in the grid, which scrolls in neither direction. The agenda keeps
// sideways only — its up and down belong to the list it is scrolling.
const { swipeRef } = useSwipePage({
  axis: () => (showAgendaView.value ? 'horizontal' : 'both'),
  onNext: () => emit('navigateMonth', 'next'),
  onPrevious: () => emit('navigateMonth', 'prev'),
})

// The grid needs both the parent's scroll ref and the gesture's, and an
// element takes one `ref`. This hands the node to each of them.
const gridRef = (el) => {
  swipeRef(el)
  if (props.calendarScrollRef) props.calendarScrollRef.value = el
}

// On narrow phone screens, show fewer events per day so the ones shown stay readable
const isCompact = useMediaQuery('(max-width: 639px)')

// How many weeks this month actually occupies — five for most, six for a long
// month that starts late, four for a February beginning on a Sunday. The rows
// are declared from this rather than fixed at six, or a five-week month would
// leave an empty band at the bottom and squash every cell to make room for it.
const weekCount = computed(() => Math.max(1, Math.ceil(props.calendarDays.length / 7)))

// Wider screens share the height out between the weeks; a phone's rows are as
// tall as its square cells.
const gridRows = computed(() => ({
  gridTemplateRows: `repeat(${weekCount.value}, ${isCompact.value ? 'auto' : 'minmax(0, 1fr)'})`,
}))

/**
 * The grid is the default at every size, phones included.
 *
 * This used to switch itself to the agenda list below 640px, on the reasoning
 * that a six-row month is hard to scan on a phone. In practice the grid is the
 * thing people come to a calendar for — where a date falls in the week, which
 * days are free — and being given a list instead meant the grid was something
 * you had to go and find on a device where most of the looking happens.
 *
 * The toggle is still in the header, and the choice is now remembered per
 * device rather than reset on every visit, so whoever does prefer the list
 * only has to say so once.
 */
const AGENDA_KEY = 'uec.events.agendaView'
const readAgendaPreference = () => {
  try {
    return localStorage.getItem(AGENDA_KEY) === '1'
  } catch {
    return false
  }
}

const showAgendaView = ref(readAgendaPreference())
const toggleAgendaView = () => {
  showAgendaView.value = !showAgendaView.value
  try {
    localStorage.setItem(AGENDA_KEY, showAgendaView.value ? '1' : '0')
  } catch {
    /* the preference lasts the session */
  }
}

// Month/Year picker state
const showMonthYearPicker = ref(false)
const monthYearPickerRef = ref(null)
const closeMonthYearPicker = () => { showMonthYearPicker.value = false }
useFocusTrap(monthYearPickerRef, showMonthYearPicker, closeMonthYearPicker)

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const currentYear = computed(() => props.currentDate.getFullYear())
const currentMonthIndex = computed(() => props.currentDate.getMonth())

// Generate year range (10 years before and after current year)
const years = computed(() => {
  const thisYear = new Date().getFullYear()
  const range = []
  for (let y = thisYear - 10; y <= thisYear + 10; y++) {
    range.push(y)
  }
  return range
})

const selectMonth = (monthIndex) => {
  emit('setDate', new Date(currentYear.value, monthIndex, 1))
  showMonthYearPicker.value = false
}

const selectYear = (year) => {
  emit('setDate', new Date(year, currentMonthIndex.value, 1))
}

const holidays = philippineHolidays

/**
 * Events and holidays indexed by date, and every cell resolved once.
 *
 * The template used to call getEventsForDate(day) around twenty times per
 * cell — for the count, for the first event, for the second, for each of the
 * conditions in between — and each call filtered the whole events array. Over
 * a 35-cell grid that is several hundred full scans on every render, and the
 * markup that came out of it could not be read: the same expression repeated
 * so often that conditions like `(!holiday && n > 1) || (holiday && n > 1)`
 * went unnoticed for what they are, which is `n > 1`.
 *
 * One pass here, one plain object per cell, and the template only reads.
 */
const holidaysByDate = computed(() => {
  const map = new Map()
  for (const holiday of holidays) map.set(holiday.date, holiday)
  return map
})

const eventsByDate = computed(() => {
  const map = new Map()
  for (const event of props.events || []) {
    if (!event?.date) continue
    const list = map.get(event.date)
    if (list) list.push(event)
    else map.set(event.date, [event])
  }
  return map
})

/**
 * How many events a cell shows before it starts counting the rest.
 *
 * Three at both widths. On a phone they are overlapping discs, and the overlap
 * buys back more width than a third disc costs; wider they are stacked lines
 * with room for their titles.
 */
const CHIP_LIMIT = 3

/**
 * Each day's gatherings, split the way the rest of the Events app splits them
 * (utils/eventRoutine.js): news, the routine, and birthdays.
 *
 * Every gathering used to be a filled disc or chip in its type's colour, so a
 * church with six weekly services and a roll of birthdays had colour in nearly
 * every cell, and the outreach on the 17th looked exactly like the Bible Study
 * on the 15th. Now only news is filled: something typed in, a service moved,
 * an occasion, one called off. The routine and the birthdays are quiet marks —
 * on a phone, small dots beside the date; wider, plain grey lines under the
 * news — so the month reads as an ordinary shape with the exceptions standing
 * out of it.
 */
const dayCells = computed(() =>
  props.calendarDays.map((day) => {
    const dateString = formatDateString(day.fullDate)
    const dayEvents = eventsByDate.value.get(dateString) || []
    const holiday = holidaysByDate.value.get(dateString) || null

    const news = []
    const routine = []
    const birthdays = []
    for (const event of dayEvents) {
      if (isBirthdayEvent(event) && !isCalledOff(event)) birthdays.push(event)
      else if (isRoutineOccurrence(event, props.schedules)) routine.push(event)
      else news.push(event)
    }

    // A phone shows the news as discs and nothing else in the cell's body: the
    // routine and the birthdays are marks beside the date. Three discs fit;
    // with a fourth, the third becomes the counter, the way a stack of faces
    // ends in "+2".
    //
    // Wider, the news comes first and the quiet lines fill what room is left.
    // A holiday costs a line there, because its name is written out.
    const shown = isCompact.value
      ? news.slice(0, news.length <= 3 ? 3 : 2)
      : [...news, ...routine, ...birthdays].slice(0, Math.max(1, CHIP_LIMIT - (holiday ? 1 : 0)))
    const overflow = isCompact.value ? news.length - shown.length : dayEvents.length - shown.length

    return {
      day,
      dateString,
      holiday,
      events: dayEvents,
      shown,
      // Only ever the events not on screen.
      overflow: Math.max(0, overflow),
      // The quiet marks beside a phone's date: one dot per routine gathering,
      // at most three, and one for any birthdays.
      routineMarks: Math.min(routine.length, 3),
      hasBirthday: birthdays.length > 0,
      isToday: isToday(day.fullDate),
      isSelected: props.selectedDate === dateString,
    }
  })
)

/** Whether a gathering on a wider cell is drawn as a quiet line rather than a filled chip. */
const isQuiet = (event) =>
  !isCalledOff(event) && (isBirthdayEvent(event) || isRoutineOccurrence(event, props.schedules))

const formatDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isToday = (date) => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Kept for the agenda view and the aria labels, but reading the same indexes
// rather than scanning the arrays again.
const getHolidayForDate = (date) => holidaysByDate.value.get(formatDateString(date)) || undefined

const getEventsForDate = (date) => eventsByDate.value.get(formatDateString(date)) || []

// Short enough to share a strip with a count and a holiday on a phone.
const agendaHeading = (day) =>
  day.fullDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Days in the current month that have a holiday or an event, in date order, for the agenda view
const agendaDays = computed(() => {
  return props.calendarDays
    .filter((day) => day.isCurrentMonth)
    .map((day) => ({
      day,
      dateString: formatDateString(day.fullDate),
      label: agendaHeading(day),
      ariaLabel: getDayAriaLabel(day),
      holiday: getHolidayForDate(day.fullDate),
      events: getEventsForDate(day.fullDate),
      isToday: isToday(day.fullDate),
      isSelected: props.selectedDate === formatDateString(day.fullDate),
    }))
    .filter((entry) => entry.holiday || entry.events.length > 0)
})

// Under the grid on a phone, what is out of the ordinary for the month from
// today on. Square cells leave the lower part of the screen free, and what is
// still to come is what someone opening the calendar on a phone is looking
// for. Only the news, though: the weekly services and the birthdays are marked
// in the grid above and listed in full in the agenda and on each day, and
// listing them again here made the page twice as long as it had anything to
// say. A month in the past or future is shown whole.
const todayString = formatDateString(new Date())
const isNews = (event) => isCalledOff(event) || (!isBirthdayEvent(event) && !isRoutineOccurrence(event, props.schedules))
const showingThisMonth = computed(() =>
  props.calendarDays.some((day) => day.isCurrentMonth && formatDateString(day.fullDate) === todayString)
)
const daysAhead = computed(() =>
  (showingThisMonth.value ? agendaDays.value.filter((entry) => entry.dateString >= todayString) : agendaDays.value)
    .map((entry) => ({ ...entry, events: entry.events.filter(isNews) }))
    .filter((entry) => entry.holiday || entry.events.length)
)

const getDayAriaLabel = (day) => {
  const parts = [
    day.fullDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  ]
  if (isToday(day.fullDate)) parts.push('Today')
  const holiday = getHolidayForDate(day.fullDate)
  if (holiday) parts.push(holiday.name)
  const dayEvents = getEventsForDate(day.fullDate)
  if (dayEvents.length) parts.push(`${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`)
  if (props.selectedDate === formatDateString(day.fullDate)) parts.push('Selected')
  return parts.join(', ')
}

// Day cells wrap nested event buttons, so Enter/Space should only trigger
// dayClick when the cell itself (not a nested button) has focus.
const handleDayKeydown = (event, day) => {
  if (event.target !== event.currentTarget) return
  event.preventDefault()
  emit('dayClick', day)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- One slim strip, the way the People list has one: month on the left,
         the view and Today on the right. It was a 72px bar with a filled Today
         pill, which on a phone is height the grid's six weeks need more. -->
    <div class="flex shrink-0 items-center gap-1 border-b border-gray-200 px-1.5 py-1.5 dark:border-gray-700 sm:px-2">
      <div class="flex min-w-0 items-center">
        <button
          @click="emit('navigateMonth', 'prev')"
          aria-label="Previous month"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>

        <!-- A fixed width, so the arrows either side stay under the thumb
             while somebody taps through several months in a row. -->
        <div class="relative">
          <button
            @click="showMonthYearPicker = !showMonthYearPicker"
            aria-haspopup="dialog"
            :aria-expanded="showMonthYearPicker"
            class="flex h-9 w-40 items-center justify-center gap-1 rounded-lg px-1 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-100 md:w-52 md:text-lg dark:text-white dark:hover:bg-gray-700"
          >
            <span class="truncate">{{ currentMonth }}</span>
            <ChevronDown
              :class="['h-4 w-4 shrink-0 text-gray-400 transition-transform', showMonthYearPicker ? 'rotate-180' : '']"
            />
          </button>

          <!-- Month/Year Picker Dropdown -->
          <div
            v-if="showMonthYearPicker"
            ref="monthYearPickerRef"
            role="dialog"
            aria-modal="true"
            aria-label="Choose month and year"
            tabindex="-1"
            class="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 z-50 w-72 max-w-[calc(100vw-2rem)] sm:left-1/2 sm:-translate-x-1/2"
          >
            <!-- Year Selector -->
            <div class="mb-4">
              <p id="calendar-year-label" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Year</p>
              <div class="flex items-center gap-2">
                <button
                  @click="selectYear(currentYear - 1)"
                  aria-label="Previous year"
                  class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft class="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
                <select
                  :value="currentYear"
                  @change="selectYear(Number($event.target.value))"
                  aria-labelledby="calendar-year-label"
                  class="flex-1 px-3 py-2 text-center font-semibold bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                </select>
                <button
                  @click="selectYear(currentYear + 1)"
                  aria-label="Next year"
                  class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight class="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <!-- Month Grid -->
            <div>
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Month</p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="(month, index) in months"
                  :key="month"
                  @click="selectMonth(index)"
                  :aria-label="month"
                  :aria-pressed="currentMonthIndex === index"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    currentMonthIndex === index
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  ]"
                >
                  {{ month.slice(0, 3) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="emit('navigateMonth', 'next')"
          aria-label="Next month"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-0.5">
        <button
          @click="toggleAgendaView"
          :aria-pressed="showAgendaView"
          :aria-label="showAgendaView ? 'Switch to grid view' : 'Switch to agenda view'"
          :title="showAgendaView ? 'Grid view' : 'Agenda view'"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <LayoutGrid v-if="showAgendaView" class="h-5 w-5" />
          <List v-else class="h-5 w-5" />
        </button>
        <!-- Text in the primary colour rather than a filled pill: it is a
             jump, not the page's main action, and the floating button already
             holds that. -->
        <button
          @click="emit('goToToday')"
          class="inline-flex h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Today
        </button>
      </div>
    </div>

    <!-- Click outside to close picker -->
    <div
      v-if="showMonthYearPicker"
      @click="showMonthYearPicker = false"
      aria-hidden="true"
      class="fixed inset-0 z-40"
    ></div>

    <!-- Agenda View: default on narrow/short screens where a month grid is hard to scan -->
    <!-- The agenda swipes between months too. A gesture that works in one of
         two views and silently does nothing in the other reads as broken; the
         vertical-scroll guard in useSwipePage keeps this list scrolling. -->
    <div v-if="showAgendaView" :ref="swipeRef" class="flex-1 overflow-y-auto pb-20 min-h-0">
      <div v-if="loading" aria-hidden="true" class="space-y-1 p-2">
        <EventCardSkeleton v-for="i in 6" :key="`agenda-skeleton-${i}`" />
      </div>
      <Transition v-else name="calendar-month" mode="out-in">
        <CalendarAgenda
          :key="currentMonth"
          :entries="agendaDays"
          :current-month="currentMonth"
          @day-click="emit('dayClick', $event)"
          @event-click="emit('eventClick', $event)"
        />
      </Transition>
    </div>

    <!-- Calendar Grid -->
    <!-- On a phone the cells are square and the grid only as tall as they
         make it. Stretched to the screen's height, each one was a tall, thin
         strip — about 50px across and twice that down — with three dots
         floating in the middle of it, and the month read as a set of
         columns rather than as weeks. -->
    <div
      v-if="!showAgendaView"
      :ref="gridRef"
      @wheel="emit('calendarWheel', $event)"
      :class="['flex flex-col p-2 md:p-4', isCompact ? 'shrink-0' : 'min-h-0 flex-1']"
    >
      <!-- Day Headers -->
      <div class="grid grid-cols-7 gap-1 md:gap-1.5 mb-1 md:mb-2 shrink-0">
        <div
          v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
          :key="day"
          class="p-1 md:p-2 text-center text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Days with transition -->
      <Transition name="calendar-month" mode="out-in">
        <div v-if="loading" :key="`skeleton-${currentMonth}`" aria-hidden="true" :style="gridRows" :class="['grid grid-cols-7 gap-1 md:gap-1.5', isCompact ? '' : 'calendar-grid min-h-0 flex-1']">
          <div
            v-for="i in weekCount * 7"
            :key="`skeleton-day-${i}`"
            :class="['min-h-0 p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden', isCompact ? 'aspect-square' : '']"
          >
            <div class="h-4 w-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1"></div>
            <div class="h-3 w-full bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
          </div>
        </div>
        <div v-else :key="currentMonth" role="group" :aria-label="`${currentMonth} calendar`" :style="gridRows" :class="['grid grid-cols-7 gap-1 md:gap-1.5', isCompact ? '' : 'calendar-grid min-h-0 flex-1']">
            <div
              v-for="(cell, index) in dayCells"
              :key="index"
              role="button"
              tabindex="0"
              :aria-label="getDayAriaLabel(cell.day)"
              :aria-current="cell.isToday ? 'date' : undefined"
              :aria-pressed="cell.isSelected ? 'true' : undefined"
              @click="emit('dayClick', cell.day)"
              @keydown.enter="handleDayKeydown($event, cell.day)"
              @keydown.space="handleDayKeydown($event, cell.day)"
              :class="[
                'min-h-0 p-1 md:p-1.5 rounded-lg transition-colors cursor-pointer overflow-hidden flex flex-col',
                isCompact ? 'aspect-square' : '',
                // A ring rather than a 2px border on the states that mark a
                // day out: a border changes the box, so today's cell used to
                // sit a pixel off from its neighbours and the whole row looked
                // misaligned. A ring is drawn on top and costs no layout.
                //
                // Primary for both today and the selected day, the one accent
                // the People page uses for this-one: today is a tint and a
                // filled date, selected is the ring. Today was amber, and with
                // yellow holidays and amber Off badges beside it the page
                // had three warm colours meaning three unrelated things.
                // Holidays keep only their dot — a yellow edge on the cell was
                // a fourth border colour for the eye to decode.
                cell.day.isCurrentMonth
                  ? cell.isSelected
                    ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary ring-inset border border-transparent'
                    : cell.isToday
                    ? 'bg-primary/5 dark:bg-primary/10 border border-primary/30 hover:bg-primary/10'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                : 'bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50',
              ]"
            >
            <!-- Day number, with the holiday's mark beside it rather than
                 below. The holiday used to take a whole row of the cell and
                 push the events out; it is a property of the day, so it
                 belongs on the day's own line. -->
            <div class="mb-0.5 flex items-center justify-between gap-1 md:mb-1">
              <span
                :class="[
                  'text-xs font-medium leading-none md:text-sm',
                  cell.isToday && cell.day.isCurrentMonth
                    ? '-m-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-white md:h-6 md:w-6'
                    : cell.day.isCurrentMonth
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-600',
                ]"
              >
                {{ cell.day.date }}
              </span>
              <!-- Marks beside the date: a holiday, and on a phone the day's
                   routine and birthdays — a grey dot for each weekly gathering,
                   a pink one for birthdays. Small on purpose: they say the day
                   is an ordinary one with something on, and the discs below
                   are left for what is not ordinary. -->
              <span class="flex shrink-0 items-center gap-0.5" aria-hidden="true">
                <span
                  v-if="cell.holiday"
                  class="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500"
                  :title="cell.holiday.name"
                ></span>
                <template v-if="isCompact">
                  <span v-if="cell.hasBirthday" class="size-1 shrink-0 rounded-full bg-pink-400 dark:bg-pink-400/80"></span>
                  <span
                    v-for="n in cell.routineMarks"
                    :key="n"
                    :class="[
                      'size-1 shrink-0 rounded-full',
                      cell.day.isCurrentMonth ? 'bg-gray-400 dark:bg-gray-500' : 'bg-gray-300 dark:bg-gray-700',
                    ]"
                  ></span>
                </template>
              </span>
            </div>

            <!-- The holiday's name, where there is width for it. Quiet text
                 rather than a filled block: it is not something you can open,
                 so it should not look like the chips that are. -->
            <p
              v-if="cell.holiday && !isCompact"
              class="mb-0.5 truncate text-[10px] leading-tight text-yellow-700 dark:text-yellow-500"
              :title="cell.holiday.name"
            >
              {{ cell.holiday.name }}
            </p>
            <!-- Phones: overlapping dots, the way a group of faces is stacked.
                 Filled squares with a glyph inside were too much furniture at
                 16px — six of them in a week read as a row of buttons rather
                 than as a week. Overlapping costs less width than it saves, so
                 three still fit, and the cluster reads as one answer to "how
                 busy is this day" instead of three separate marks.

                 Not tappable, deliberately: a 10px disc is not a target, and
                 the whole cell already opens the day. -->
            <div
              v-if="isCompact && cell.shown.length"
              class="flex min-h-0 flex-1 items-center justify-center"
            >
              <span class="flex items-center">
                <span
                  v-for="(event, position) in cell.shown"
                  :key="event.id"
                  :title="eventStatusSummary(event) || event.title"
                  :class="[
                    // The ring is the cell showing through, which is what makes
                    // the discs read as separate where they overlap.
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800',
                    position > 0 ? '-ml-2.5' : '',
                    // Hollow, not faded. Dimming a filled disc muddies its
                    // colour against the cell and reads as a rendering fault
                    // rather than as a decision; an outline reads as absence,
                    // which is what a called-off gathering is. It drops its
                    // type colour with its fill — what kind of thing is not
                    // happening matters less than that it is not. The dashes
                    // are red, the colour a called-off gathering carries on
                    // every screen, so the disc is legible without its title.
                    isCalledOff(event)
                      ? `border-2 bg-white dark:bg-gray-800 ${CALLED_OFF_OUTLINE} ${CALLED_OFF_TEXT}`
                      : `text-white ${getEventTypeDot(event.type)}`,
                  ]"
                >
                  <!-- Back now the disc is 20px: a 12px glyph sits inside it
                       with room to breathe, where at 10px there was nothing to
                       put an icon in. The colour still carries the type, so the
                       glyph is white and only has to say which kind. -->
                  <component :is="getIconComponent(iconForEvent(event))" class="h-3 w-3" />
                </span>
                <!-- The rest, as the last disc rather than as text beside the
                     cluster: it belongs to the stack, and a loose number was
                     the untidiest thing in the cell. -->
                <span
                  v-if="cell.overflow"
                  :title="`${cell.overflow} more`"
                  class="-ml-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-400 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:bg-gray-500 dark:ring-gray-800"
                >
                  +{{ cell.overflow }}
                </span>
              </span>
            </div>

            <!-- Wider: the same events with room for their names. -->
            <div v-else-if="!isCompact && cell.events.length" class="flex min-h-0 flex-1 flex-col gap-0.5" @click.stop>
              <button
                v-for="event in cell.shown"
                :key="event.id"
                @click.stop="emit('eventClick', event)"
                :title="eventStatusSummary(event) || event.title"
                :class="[
                  'flex w-full shrink-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-opacity hover:opacity-80 sm:px-1.5 sm:text-xs',
                  // Outlined rather than dimmed, the same reasoning as the
                  // discs: a 60% chip sits between two legible states and
                  // looks like neither. Red edge, grey struck-through title:
                  // the edge says what happened, the title stays quiet.
                  //
                  // The routine and birthdays are plain grey lines with their
                  // type as a dot, so the filled chips are only the news.
                  isCalledOff(event)
                    ? `border text-gray-500 dark:text-gray-400 ${CALLED_OFF_OUTLINE}`
                    : isQuiet(event)
                      ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      : getEventTypeColor(event.type),
                ]"
              >
                <span
                  v-if="isQuiet(event)"
                  :class="['size-1.5 shrink-0 rounded-full', isBirthdayEvent(event) ? 'bg-pink-400' : getEventTypeDot(event.type)]"
                  aria-hidden="true"
                />
                <component v-else :is="getIconComponent(iconForEvent(event))" class="h-3 w-3 shrink-0" />
                <span :class="['truncate', isCalledOff(event) ? 'line-through' : '']">{{ event.title }}</span>
              </button>

              <!-- A note about the cell, not another thing to press. -->
              <span
                v-if="cell.overflow"
                class="shrink-0 px-1 text-[10px] font-semibold leading-tight text-gray-500 sm:px-1.5 dark:text-gray-400"
              >
                +{{ cell.overflow }} more
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Phones: what is still on this month, under the grid. It scrolls on
         its own, outside the grid's swipe, so up and down here move the list
         rather than the month. -->
    <div
      v-if="!showAgendaView && isCompact && !loading"
      class="min-h-0 flex-1 overflow-y-auto border-t border-gray-200 pb-20 dark:border-gray-700"
    >
      <CalendarAgenda
        :key="currentMonth"
        :entries="daysAhead"
        :current-month="currentMonth"
        :empty="showingThisMonth ? 'Just the usual for the rest of the month' : 'Just the usual this month'"
        @day-click="emit('dayClick', $event)"
        @event-click="emit('eventClick', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.calendar-grid {
  /* Ensure grid fills available space */
  height: 100%;
}

.calendar-month-enter-active,
.calendar-month-leave-active {
  transition: all 0.25s ease-out;
}

.calendar-month-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.calendar-month-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>


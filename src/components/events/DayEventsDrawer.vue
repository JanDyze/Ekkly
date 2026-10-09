<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { X, Plus, ArrowLeft, ChevronLeft, ChevronRight, MapPin, Users, Flag, Repeat, CalendarBlank, ArrowRight } from '../../icons'
import EventCardSkeleton from './EventCardSkeleton.vue'
import MemberAvatar from '../members/MemberAvatar.vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { usePermissions } from '../../composables/usePermissions'
import { getEventIcon as getIconComponent, iconForEvent } from '../../utils/eventIcons'
import { getEventTypeDot, CALLED_OFF_BADGE } from '../../utils/eventColors'
import { isCalledOff, eventStatusLabel, readEventStatus } from '../../../lib/eventStatus'
import { audienceLabel, readExpectedAttendance } from '../../utils/audience'
import { differenceFromUsual, isBirthdayEvent, isRoutineOccurrence } from '../../utils/eventRoutine'
import { clockLabel } from '../../utils/timeUtils'
import { getDisplayName } from '../../utils/memberUtils'

// One day of the calendar, opened from the grid: where it stands where the
// calendar was on a phone, and beside it on a desktop.
//
// It was a heading and a list of rows — an icon, a title, "09:00" — which said
// what was on and nothing about the day. Now it reads as the day itself:
//
//   - how far off it is ("Tomorrow", "In 8 days"), and its week as a strip to
//     step to the next day without going back to the grid;
//   - a holiday across the top, and the day's birthdays as faces, not as rows
//     dressed as gatherings;
//   - the gatherings down a timeline, time first, each with where (named only
//     when it says something), who it is for, and what is different about it:
//     called off, moved to another hour or room this once, or simply the one
//     that happens every week. Today has a line across it at the time it is
//     now, and what has finished sits back.
//   - a day with nothing on says what the next thing is, a tap away.
//
// Stepping between days slides the way the dates go, and the timeline rises
// in a beat at a time, so moving through a week reads as moving.

const props = defineProps({
  show: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  selectedDay: { type: Date, default: null },
  formattedSelectedDay: { type: String, default: '' },
  dayEvents: { type: Array, default: () => [] },
  holiday: { type: Object, default: null },
  // Everything on the calendar, for the week strip and "next" on an empty day.
  events: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  schedules: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:show', 'eventClick', 'addEvent', 'back', 'selectDay'])

// The floating button hides while this is open, so adding lives in the footer
// instead — and, like the button, only for someone who may add.
const { canManage } = usePermissions()
const canAdd = computed(() => canManage('events'))

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, () => emit('back'), { trap: false })

/* ------------------------------------------------------------------ dates */

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dateOf = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

// Kept current while the panel is open, so the "now" line moves and a day
// that passes midnight with the panel open stops calling itself today.
const now = ref(new Date())
const tick = setInterval(() => { now.value = new Date() }, 60000)
onUnmounted(() => clearInterval(tick))

const todayKey = computed(() => keyOf(now.value))
const dayKey = computed(() => (props.selectedDay ? keyOf(props.selectedDay) : ''))

/** "Today", "Tomorrow", "In 8 days", "Yesterday", "3 weeks ago". */
const relative = computed(() => {
  if (!props.selectedDay) return ''
  const days = Math.round((dateOf(dayKey.value) - dateOf(todayKey.value)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  const n = Math.abs(days)
  const span = n < 14 ? `${n} days` : n < 60 ? `${Math.round(n / 7)} weeks` : `${Math.round(n / 30)} months`
  return days > 0 ? `In ${span}` : `${span} ago`
})

const heading = computed(() =>
  props.selectedDay
    ? props.selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : props.formattedSelectedDay
)

/* ------------------------------------------------------------ the week strip */

const byDate = computed(() => {
  const map = new Map()
  for (const event of props.events) {
    if (!event?.date) continue
    const list = map.get(event.date)
    if (list) list.push(event)
    else map.set(event.date, [event])
  }
  return map
})

/** The selected day's week, Sunday first, each with a mark for what is on it. */
const week = computed(() => {
  if (!props.selectedDay) return []
  const start = addDays(props.selectedDay, -props.selectedDay.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const key = keyOf(date)
    const on = (byDate.value.get(key) || []).filter((e) => !isBirthdayEvent(e) && !isCalledOff(e))
    return {
      key,
      date,
      letter: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      day: date.getDate(),
      count: Math.min(on.length, 3),
      isToday: key === todayKey.value,
    }
  })
})

const selectedIndex = computed(() => week.value.findIndex((d) => d.key === dayKey.value))

const step = (days) => {
  if (props.selectedDay) emit('selectDay', addDays(props.selectedDay, days))
}

// Which way the day's content comes in: from the right when moving later,
// from the left when moving earlier. Read from the change itself, so the
// strip, the arrows and "next" all slide the same way.
const direction = ref('next')
watch(dayKey, (next, previous) => {
  if (next && previous) direction.value = next > previous ? 'next' : 'prev'
})

/* --------------------------------------------------------------- the day */

const birthdays = computed(() =>
  props.dayEvents
    .filter((e) => isBirthdayEvent(e) && !isCalledOff(e))
    .map((event) => {
      const member = props.members.find((m) => (m.firestoreId || m.id) === event.memberId) || null
      return { event, member, name: member ? getDisplayName(member) : String(event.title || '').replace(/'s birthday$/i, '') }
    })
)

const minutesOf = (time) => {
  const [h, m] = String(time || '').split(':').map(Number)
  return Number.isFinite(h) ? h * 60 + (m || 0) : 0
}

const gatherings = computed(() =>
  props.dayEvents
    .filter((e) => !(isBirthdayEvent(e) && !isCalledOff(e)))
    .slice()
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
    .map((event) => {
      const change = differenceFromUsual(event, props.schedules)
      const tags = event.audienceTags || []
      const excluded = event.excludeTags || []
      return {
        event,
        calledOff: isCalledOff(event),
        routine: isRoutineOccurrence(event, props.schedules),
        change,
        clock: clockLabel(event.time),
        audience: tags.length || excluded.length ? audienceLabel(tags, excluded) : '',
        expected: canAdd.value ? readExpectedAttendance(event, props.members) : 0,
        minutes: minutesOf(event.time),
      }
    })
)

// On today, where the "now" line falls: before the first gathering still to
// start. A gathering is taken to have finished two hours after it began —
// close enough to sit it back, without anybody having to say when it ends.
const isToday = computed(() => dayKey.value === todayKey.value)
const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const nowIndex = computed(() => {
  if (!isToday.value || !gatherings.value.length) return -1
  const index = gatherings.value.findIndex((g) => g.minutes > nowMinutes.value)
  return index === -1 ? gatherings.value.length : index
})
const isOver = (g) =>
  dayKey.value < todayKey.value || (isToday.value && g.minutes + 120 <= nowMinutes.value)
const nowLabel = computed(() => clockLabel(`${now.value.getHours()}:${pad(now.value.getMinutes())}`))

/** On an empty day, the next thing on after it. */
const nextAfter = computed(() => {
  if (!dayKey.value || gatherings.value.length) return null
  return (
    props.events
      .filter((e) => e.date > dayKey.value && !isBirthdayEvent(e) && !isCalledOff(e))
      .sort((a, b) => a.date.localeCompare(b.date) || minutesOf(a.time) - minutesOf(b.time))[0] || null
  )
})

const nextLabel = computed(() => {
  const e = nextAfter.value
  if (!e) return ''
  const when = dateOf(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return [when, clockLabel(e.time)].filter(Boolean).join(' · ')
})

const countLabel = computed(() => {
  const n = gatherings.value.filter((g) => !g.calledOff).length
  const b = birthdays.value.length
  const parts = []
  if (n) parts.push(`${n} ${n === 1 ? 'gathering' : 'gatherings'}`)
  if (b) parts.push(`${b} ${b === 1 ? 'birthday' : 'birthdays'}`)
  return parts.join(', ')
})

const statusOf = (event) => eventStatusLabel(readEventStatus(event))
const shortDate = (key) => dateOf(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const open = (event) => {
  emit('update:show', false)
  emit('eventClick', event)
}
</script>

<template>
  <!-- A panel, not a sheet: on a phone it stands where the calendar was, and
       beside it on a desktop. So it is dressed as the calendar is — one card,
       one slim strip across the top — rather than as a dialog. -->
  <Transition name="day-panel" appear>
    <div
      v-if="show"
      ref="dialogRef"
      role="dialog"
      aria-labelledby="day-events-drawer-title"
      tabindex="-1"
      class="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:ml-3 lg:w-[calc(50%-0.75rem)]"
    >
      <div class="flex shrink-0 items-center gap-1 px-1.5 pt-1.5 sm:px-2">
        <button
          @click="$emit('back')"
          aria-label="Back"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <div class="min-w-0 flex-1 px-1">
          <p class="text-[11px] font-bold uppercase tracking-wide text-primary dark:text-primary-light">
            {{ relative }}
          </p>
          <h2 id="day-events-drawer-title" class="truncate text-lg font-bold leading-tight text-gray-900 dark:text-white">
            {{ heading }}
          </h2>
        </div>
        <button
          @click="$emit('update:show', false)"
          aria-label="Close"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- The week, to step through without going back to the grid. The
           selected day's pill slides between days rather than jumping. -->
      <div class="flex shrink-0 items-center gap-0.5 border-b border-gray-200 px-1 pb-2 pt-1 dark:border-gray-700">
        <button
          type="button"
          aria-label="Previous day"
          class="flex h-12 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          @click="step(-1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <div class="relative grid min-w-0 flex-1 grid-cols-7">
          <span
            v-if="selectedIndex >= 0"
            aria-hidden="true"
            class="day-pill absolute inset-y-0 left-0 w-[calc(100%/7)] p-0.5 transition-transform duration-300"
            :style="{ transform: `translateX(${selectedIndex * 100}%)` }"
          >
            <span class="day-pill-fill block h-full w-full rounded-xl bg-primary" />
          </span>
          <button
            v-for="d in week"
            :key="d.key"
            type="button"
            :aria-label="d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })"
            :aria-current="d.key === dayKey ? 'date' : undefined"
            class="relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl"
            @click="$emit('selectDay', d.date)"
          >
            <span
              :class="[
                'text-[10px] font-semibold uppercase leading-none transition-colors',
                d.key === dayKey ? 'text-white/80' : 'text-gray-400 dark:text-gray-500',
              ]"
            >
              {{ d.letter }}
            </span>
            <span
              :class="[
                'text-sm font-bold leading-none tabular-nums transition-colors',
                d.key === dayKey
                  ? 'text-white'
                  : d.isToday
                    ? 'text-primary dark:text-primary-light'
                    : 'text-gray-900 dark:text-white',
              ]"
            >
              {{ d.day }}
            </span>
            <span class="flex h-1 gap-0.5">
              <span
                v-for="n in d.count"
                :key="n"
                :class="['size-1 rounded-full', d.key === dayKey ? 'bg-white/80' : 'bg-gray-300 dark:bg-gray-600']"
              />
            </span>
          </button>
        </div>
        <button
          type="button"
          aria-label="Next day"
          class="flex h-12 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          @click="step(1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div v-if="loading" class="space-y-1 p-2">
          <EventCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <!-- Keyed by day, so stepping to another one plays its arrival. -->
        <div v-else :key="dayKey" :class="['flex flex-col gap-4 p-3 pb-6', `day-in-${direction}`]">
          <p v-if="countLabel" class="-mb-2 px-1 text-xs font-semibold text-gray-400 dark:text-gray-500">{{ countLabel }}</p>

          <!-- A holiday is a fact about the whole day, so it goes across the top. -->
          <div
            v-if="holiday"
            class="flex items-center gap-2.5 rounded-xl bg-yellow-50 px-3 py-2.5 text-yellow-900 ring-1 ring-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-yellow-500/25"
          >
            <Flag class="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ holiday.name }}</span>
            <span class="shrink-0 text-xs text-yellow-700 dark:text-yellow-400">
              {{ holiday.type === 'regular' ? 'Regular holiday' : 'Special non-working day' }}
            </span>
          </div>

          <!-- Birthdays as people, not as gatherings: a face and a first name,
               and a tap opens the birthday as the grid would. -->
          <section v-if="birthdays.length" aria-label="Birthdays">
            <h3 class="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Birthdays</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="b in birthdays"
                :key="b.event.id"
                type="button"
                class="flex max-w-full items-center gap-2 rounded-full bg-pink-50 py-1 pl-1 pr-3 text-sm font-medium text-pink-900 ring-1 ring-pink-200 transition-colors hover:bg-pink-100 dark:bg-pink-500/10 dark:text-pink-200 dark:ring-pink-500/25 dark:hover:bg-pink-500/15"
                @click="open(b.event)"
              >
                <MemberAvatar :member="b.member" size="h-7 w-7" alt="" />
                <span class="truncate">{{ b.name }}</span>
              </button>
            </div>
          </section>

          <!-- The gatherings, down a line, time first. -->
          <ol v-if="gatherings.length" class="relative" aria-label="Gatherings">
            <template v-for="(g, index) in gatherings" :key="`${g.event.id}-${g.event.date}`">
              <!-- Now, on today: a line across at the point the day has reached. -->
              <li v-if="index === nowIndex" class="day-rise relative flex items-center gap-2 py-1.5 pl-[4.25rem]" :style="{ animationDelay: `${index * 50}ms` }">
                <span class="absolute left-[3.75rem] size-2.5 -translate-x-1/2 rounded-full bg-primary ring-4 ring-primary/15" aria-hidden="true" />
                <span class="h-px flex-1 bg-primary/40" aria-hidden="true" />
                <span class="shrink-0 text-[11px] font-bold uppercase tracking-wide text-primary dark:text-primary-light">Now · {{ nowLabel }}</span>
              </li>

              <li
                :class="['day-rise relative grid grid-cols-[3.25rem_1fr] gap-x-4 pb-3', isOver(g) ? 'opacity-55' : '']"
                :style="{ animationDelay: `${(index + 1) * 50}ms` }"
              >
                <!-- The rail, between the time and the card. -->
                <span
                  v-if="index < gatherings.length - 1"
                  class="absolute bottom-0 left-[3.75rem] top-5 w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
                <span
                  :class="[
                    'absolute left-[3.75rem] top-3 size-3 -translate-x-1/2 rounded-full ring-4 ring-white dark:ring-gray-800',
                    g.calledOff ? 'border-2 border-dashed border-red-400 bg-white dark:bg-gray-800' : getEventTypeDot(g.event.type),
                  ]"
                  aria-hidden="true"
                />

                <span class="pt-2 text-right leading-none">
                  <span :class="['block text-sm font-bold tabular-nums', g.calledOff ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-white']">
                    {{ g.clock.split(' ')[0] }}
                  </span>
                  <span class="mt-0.5 block text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">{{ g.clock.split(' ')[1] }}</span>
                </span>

                <button
                  type="button"
                  :class="[
                    'group min-w-0 rounded-2xl p-3 text-left ring-1 transition-all duration-200 active:scale-[0.99]',
                    g.calledOff
                      ? 'bg-white ring-red-200 dark:bg-gray-800 dark:ring-red-500/30'
                      : g.routine
                        ? 'bg-gray-50 ring-gray-200/80 hover:bg-gray-100 dark:bg-gray-900/40 dark:ring-gray-700 dark:hover:bg-gray-900/60'
                        : 'bg-white shadow-sm ring-gray-200 hover:shadow-md dark:bg-gray-700/40 dark:ring-gray-600',
                  ]"
                  @click="open(g.event)"
                >
                  <span class="flex items-start gap-2.5">
                    <span
                      :class="[
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        g.calledOff ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' : `text-white ${getEventTypeDot(g.event.type)}`,
                      ]"
                    >
                      <component :is="getIconComponent(iconForEvent(g.event))" class="h-4 w-4" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span
                        :class="[
                          'block truncate text-[15px] font-semibold leading-snug',
                          g.calledOff ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-white',
                        ]"
                      >
                        {{ g.event.title || 'Untitled' }}
                      </span>
                      <span v-if="g.event.location" class="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin class="h-3 w-3 shrink-0" />
                        <span class="truncate">{{ g.event.location }}</span>
                      </span>
                    </span>
                  </span>

                  <!-- What is worth knowing about it, as small labels: off, moved,
                       who it is for, how many to expect, or that it is every week. -->
                  <span class="mt-2 flex flex-wrap gap-1.5 empty:hidden">
                    <span v-if="g.calledOff" :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', CALLED_OFF_BADGE]">
                      {{ g.event.postponedTo ? `Moved to ${shortDate(g.event.postponedTo)}` : statusOf(g.event) }}
                    </span>
                    <span v-if="g.calledOff && g.event.statusNote" class="truncate text-[11px] text-gray-500 dark:text-gray-400">{{ g.event.statusNote }}</span>
                    <span
                      v-if="g.change"
                      class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      Usually {{ [g.change.timeMoved && clockLabel(g.change.usual.time), g.change.placeMoved && g.change.usual.location].filter(Boolean).join(', ') }}
                    </span>
                    <span
                      v-if="g.audience && !g.calledOff"
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      For {{ g.audience }}
                    </span>
                    <span
                      v-if="g.expected && !g.calledOff"
                      class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <Users class="h-3 w-3" />{{ g.expected }} expected
                    </span>
                    <span v-if="g.routine" class="inline-flex items-center gap-1 px-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      <Repeat class="h-3 w-3" />Every week
                    </span>
                  </span>
                </button>
              </li>
            </template>

            <!-- Now, after everything on today has started. -->
            <li v-if="nowIndex === gatherings.length" class="day-rise relative flex items-center gap-2 py-1.5 pl-[4.25rem]" :style="{ animationDelay: `${(gatherings.length + 1) * 50}ms` }">
              <span class="absolute left-[3.75rem] size-2.5 -translate-x-1/2 rounded-full bg-primary ring-4 ring-primary/15" aria-hidden="true" />
              <span class="h-px flex-1 bg-primary/40" aria-hidden="true" />
              <span class="shrink-0 text-[11px] font-bold uppercase tracking-wide text-primary dark:text-primary-light">Now · {{ nowLabel }}</span>
            </li>
          </ol>

          <!-- Nothing on: say so, and what is on next, a tap away. -->
          <div v-else-if="!birthdays.length || nextAfter" class="day-rise flex flex-col items-center px-4 py-8 text-center">
            <span class="flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700/60 dark:text-gray-500">
              <CalendarBlank class="h-6 w-6" />
            </span>
            <p class="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
              {{ birthdays.length ? 'No gatherings' : 'Nothing on' }} {{ isToday ? 'today' : `this ${selectedDay?.toLocaleDateString(undefined, { weekday: 'long' })}` }}
            </p>
            <button
              v-if="nextAfter"
              type="button"
              class="mt-4 flex w-full max-w-xs items-center gap-3 rounded-2xl bg-gray-50 p-3 text-left ring-1 ring-gray-200 transition-colors hover:bg-gray-100 dark:bg-gray-900/40 dark:ring-gray-700 dark:hover:bg-gray-900/60"
              @click="$emit('selectDay', dateOf(nextAfter.date))"
            >
              <span :class="['flex size-8 shrink-0 items-center justify-center rounded-lg text-white', getEventTypeDot(nextAfter.type)]">
                <component :is="getIconComponent(iconForEvent(nextAfter))" class="h-4 w-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Next</span>
                <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ nextAfter.title }}</span>
                <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ nextLabel }}</span>
              </span>
              <ArrowRight class="h-4 w-4 shrink-0 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="canAdd" class="shrink-0 border-t border-gray-200 p-2 dark:border-gray-700">
        <button
          @click="$emit('addEvent')"
          class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus class="h-5 w-5" />
          Add event
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* The panel arrives from the side it opens on, quickly; it leaves at once,
   because the calendar is already coming back in its place. */
.day-panel-enter-active {
  transition:
    opacity 180ms ease-out,
    translate 320ms cubic-bezier(0.2, 0, 0, 1);
}
.day-panel-enter-from {
  opacity: 0;
  translate: 24px 0;
}

/* A new day slides in the way the dates went: from the right going later,
   from the left going earlier. */
@keyframes day-in {
  from {
    opacity: 0;
    translate: var(--day-from) 0;
  }
}
.day-in-next,
.day-in-prev {
  animation: day-in 280ms cubic-bezier(0.2, 0, 0, 1) both;
}
.day-in-next {
  --day-from: 28px;
}
.day-in-prev {
  --day-from: -28px;
}

/* Each gathering a beat after the one above it. */
@keyframes day-rise {
  from {
    opacity: 0;
    translate: 0 8px;
  }
}
.day-rise {
  animation: day-rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

/* The pill follows the day on the same deceleration as the app's other
   movement (the page slides, the deck), so it glides and settles without a
   bounce. */
.day-pill {
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

/* White on the dark page's lighter accent all but disappears, so the pill
   goes deeper there, as DateTile's filled tile does. */
:global(.dark) .day-pill-fill {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

@media (prefers-reduced-motion: reduce) {
  .day-panel-enter-active,
  .day-pill {
    transition: none;
  }
  .day-in-next,
  .day-in-prev,
  .day-rise {
    animation: none;
  }
}
</style>

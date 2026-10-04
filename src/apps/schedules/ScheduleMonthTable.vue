<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { findRosterMember, parseIso } from '../../utils/lineupUtils'
import { BAND_ROLE, assignmentsOf } from '../../data/scheduleRoles'
import { INSTRUMENTS, instrumentName, instrumentOn } from '../../data/instruments'
import { getDisplayName } from '../../utils/memberUtils'
import InstrumentIcon from '../../components/schedules/InstrumentIcon.vue'

// The whole month in one look — the rota as a church pins it to the
// noticeboard: the Sundays across the top, first to last, and the jobs down the
// page, with who is doing each where they cross.
//
// The cards answer "what is this Sunday"; this answers "who is doing what this
// month", which is how a rota is checked before it goes out — the same name in
// a row four times, a gap in the third week.
//
// Built to be read on a phone without scrolling sideways, which is what
// decides its shape:
//   - the jobs are a label across the page above each row rather than a column
//     of their own, so the Sundays share the whole width;
//   - a name is one line, cut short rather than wrapped, so every row of a job
//     is the same height and the eye can run along it;
//   - every other Sunday is shaded, so the eye can run down one as well, and
//     the next Sunday is tinted in the accent;
//   - each job has a colour of its own — a dot by its name and a soft pill
//     round each person on it — so Preacher, Song leader and Band stand apart
//     down a whole month. The colour stays in the dots and the pills, as
//     DESIGN.md keeps a category's colour; the church's own accent is kept
//     for the next Sunday and for your own name;
//   - the theme and the song count are left to the cards: a rota is people.

const props = defineProps({
  sundays: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  // Whether an id is the person looking, to pick their own name out.
  isMe: { type: Function, default: () => false },
  canPlan: { type: Boolean, default: false },
  today: { type: String, default: '' },
})

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']

const columns = computed(() => {
  const nextDate = props.sundays.find((s) => s.date >= props.today)?.date
  return props.sundays.map((sunday, index) => {
    const date = parseIso(sunday.date)
    return {
      sunday,
      ordinal: ORDINALS[index] || `${index + 1}th`,
      day: date ? date.getDate() : '',
      month: date ? date.toLocaleDateString('en-US', { month: 'short' }) : '',
      past: sunday.date < props.today,
      next: sunday.date === nextDate,
      shaded: index % 2 === 1,
      assignments: assignmentsOf(sunday),
    }
  })
})

const grid = computed(() => ({ gridTemplateColumns: `repeat(${columns.value.length || 1}, minmax(0, 1fr))` }))

/** Who is on a role on one Sunday, by the name they go by. */
const peopleIn = (column, role) =>
  (column.assignments[role.id] || []).map((id) => {
    const member = findRosterMember(props.members, id)
    return {
      id,
      name: member ? getDisplayName(member) : 'Former member',
      instrument: role.id === BAND_ROLE ? instrumentOn(column.sunday, id, member) : '',
    }
  })

// The instruments this month's band plays, for the key under the grid: a cell
// is too narrow to name them, and an icon nobody can read is no better than
// none.
const playedThisMonth = computed(() => {
  const band = props.roles.find((role) => role.id === BAND_ROLE)
  if (!band) return []
  const used = new Set(columns.value.flatMap((column) => peopleIn(column, band).map((p) => p.instrument)))
  return INSTRUMENTS.filter((instrument) => used.has(instrument.id))
})

// A colour per job, in the order the church lists them, round again after
// eight. Whole class strings rather than built ones, so Tailwind sees them.
const TONES = [
  { dot: 'bg-violet-500', pill: 'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100' },
  { dot: 'bg-sky-500', pill: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100' },
  { dot: 'bg-pink-500', pill: 'bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-100' },
  { dot: 'bg-amber-500', pill: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100' },
  { dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100' },
  { dot: 'bg-orange-500', pill: 'bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-100' },
  { dot: 'bg-teal-500', pill: 'bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-100' },
  { dot: 'bg-indigo-500', pill: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-100' },
]

const toneOf = (index) => TONES[index % TONES.length]

/** A Sunday's own shade, carried down every row so the column reads as one. */
const columnTone = (column) => {
  if (column.next) return 'bg-primary/[0.07] dark:bg-primary-light/10'
  if (column.shaded) return 'bg-gray-50 dark:bg-gray-900/40'
  return ''
}
</script>

<template>
  <div>
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-800">
      <!-- The Sundays -->
      <div class="grid border-b border-gray-200 dark:border-gray-700" :style="grid">
        <RouterLink
          v-for="column in columns"
          :key="column.sunday.date"
          :to="{ name: 'SchedulesSunday', params: { date: column.sunday.date } }"
          :class="[
            'flex flex-col items-center px-1 py-2 text-center transition-colors hover:bg-primary/10',
            columnTone(column),
            column.past ? 'opacity-50' : '',
          ]"
        >
          <span
            :class="[
              'text-[11px] font-bold uppercase tracking-wide',
              column.next ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ column.ordinal }}
          </span>
          <span class="text-lg font-bold leading-none text-gray-900 dark:text-white">{{ column.day }}</span>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">{{ column.month }}</span>
        </RouterLink>
      </div>

      <!-- A job at a time: its name across the page, then who is on it. -->
      <section
        v-for="(role, roleIndex) in roles"
        :key="role.id"
        class="border-b border-gray-100 last:border-b-0 dark:border-gray-700/60"
      >
        <h3 class="flex items-center gap-1.5 px-3 pt-2.5 text-xs font-semibold text-gray-900 dark:text-white">
          <span :class="['size-2 shrink-0 rounded-full', toneOf(roleIndex).dot]" aria-hidden="true" />
          {{ role.name }}
        </h3>
        <div class="grid" :style="grid">
          <div
            v-for="column in columns"
            :key="column.sunday.date"
            :class="['min-w-0 px-1.5 pb-2.5 pt-1', columnTone(column), column.past ? 'opacity-50' : '']"
          >
            <ul v-if="peopleIn(column, role).length" class="space-y-1">
              <li
                v-for="person in peopleIn(column, role)"
                :key="person.id"
                :class="[
                  'flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] leading-5',
                  isMe(person.id) ? 'bg-primary font-bold text-white' : ['font-medium', toneOf(roleIndex).pill],
                ]"
                :title="person.instrument ? `${person.name} · ${instrumentName(person.instrument)}` : person.name"
              >
                <InstrumentIcon
                  v-if="person.instrument"
                  :id="person.instrument"
                  class="size-3.5 shrink-0 opacity-80"
                />
                <span class="min-w-0 truncate">{{ person.name }}</span>
              </li>
            </ul>
            <!-- An empty role is only the planner's business, and only on a
                 Sunday still to come. -->
            <span
              v-else
              :class="[
                'block text-[13px] leading-5',
                canPlan && !column.past ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-gray-300 dark:text-gray-600',
              ]"
            >
              —
            </span>
          </div>
        </div>
      </section>
    </div>

    <ul v-if="playedThisMonth.length" class="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs text-gray-500 dark:text-gray-400">
      <li v-for="instrument in playedThisMonth" :key="instrument.id" class="inline-flex items-center gap-1">
        <InstrumentIcon :id="instrument.id" class="size-3.5 text-primary dark:text-primary-light" />
        {{ instrument.name }}
      </li>
    </ul>
  </div>
</template>

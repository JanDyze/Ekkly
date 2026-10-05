<script setup>
/**
 * Every Sunday, a month at a time — the Calendar section of the Schedules app.
 *
 * Each Sunday is one row of the month's list: the date, the theme or who
 * leads, and one quiet line with the rest. Tapping one opens the
 * Sunday's own screen, which is where its roster is read, presented and
 * edited — so nothing here opens out in place, and the month reads as one
 * even list rather than one big panel and a row of thin lines.
 *
 * Months are chips across the top rather than arrows to step through: last
 * month, the next few, and any month already on file, each one tap away.
 *
 * For whoever plans, the month's state is a card at the top saying what it
 * means — a draft is theirs alone, published is everyone's — with the button
 * that changes it; empty roles are flagged on each Sunday; and a Sunday nobody
 * has planned is an outline with a Plan button, which opens it in the editor.
 *
 * Search reaches across every schedule on file, because "when am I next on"
 * and "who is preaching at Christmas" rarely stay inside the month on screen.
 *
 * The month can also be read as a table — the rota as it is pinned up, the
 * Sundays across and the jobs down the side — for checking it whole.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff, Search, SearchX, SquaresFour, Table } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import SchedulesToolbar from '../../components/schedules/SchedulesToolbar.vue'
import ScheduleSundayCard from './ScheduleSundayCard.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import ScheduleMonthTable from './ScheduleMonthTable.vue'
import { useLineup, isSundayPlanned } from '../../composables/useLineups'
import { useMembers } from '../../composables/useMembers'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useToast } from '../../composables/useToast'
import { memberKey } from '../../utils/sgUtils'
import {
  formatMonthLabel,
  isValidMonthKey,
  monthKeyOf,
  scheduleMatches,
  shiftMonth,
  todayIso,
} from '../../utils/lineupUtils'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { members } = useMembers()
// Every month on file comes with the overview: one listener for the chips,
// the search and the roles a Sunday shows you on.
const { canPlan, roles, myRolesOn, myMember, lineups: allMonths } = useScheduleOverview()

const today = todayIso()
const thisMonth = monthKeyOf()

// The month lives in the address, so a month can be linked to and shared.
const month = computed(() => (isValidMonthKey(route.params.month) ? route.params.month : thisMonth))

const goToMonth = (key) => router.replace({ name: 'SchedulesCalendar', params: { month: key } })

const { loading, sundays, isPublished, setStatus } = useLineup(month)

/* -------------------------------------------------------------- months */

const partsOf = (key) => {
  const [year, monthNumber] = String(key).split('-').map(Number)
  return { year, month: monthNumber }
}

// Last month and the next three, plus any month already on file — a plan made
// for Christmas in August is reachable without stepping through the autumn.
// Drafts are the planners' own: a month nobody else may see is not offered to
// them as a chip either.
const months = computed(() => {
  const keys = new Set([-1, 0, 1, 2, 3].map((n) => shiftMonth(thisMonth, n)))
  allMonths.value
    .filter((m) => canPlan.value || m.status === 'published')
    .forEach((m) => keys.add(m.month))
  keys.add(month.value)
  return [...keys].sort().map((key) => {
    const stored = allMonths.value.find((m) => m.month === key)
    return {
      key,
      label: new Date(partsOf(key).year, partsOf(key).month - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
      // The year only where it changes, so a strip across December reads
      // "Dec, Jan 2027" rather than repeating the year on every chip.
      year: partsOf(key).year !== partsOf(thisMonth).year ? partsOf(key).year : null,
      draft: canPlan.value && stored && stored.status !== 'published' && stored.sundays.some(isSundayPlanned),
    }
  })
})

const chipStrip = ref(null)

// The month on screen scrolled into view in the strip, so arriving on next
// March does not leave its chip out of sight.
const revealChip = () =>
  nextTick(() =>
    chipStrip.value
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  )
watch(month, revealChip)
onMounted(revealChip)

/* ----------------------------------------------------------- the month */

// Cards or the table, remembered on this device: whoever checks the rota as a
// table does it every time.
const VIEW_KEY = 'schedules.calendarView'
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}
const view = ref(readView())
const setView = (next) => {
  view.value = next
  try {
    localStorage.setItem(VIEW_KEY, next)
  } catch {
    // Private window: it holds for this visit.
  }
}

const isMe = (id) => {
  const mine = myMember.value
  return Boolean(mine) && (String(id) === memberKey(mine) || String(id) === String(mine.firestoreId))
}

const planned = computed(() => sundays.value.filter(isSundayPlanned))

// A draft is the planners' workspace; to everyone else it is not there yet.
const isHiddenDraft = computed(() => !loading.value && !isPublished.value && !canPlan.value)

// Planners see every Sunday, planned or not, because an empty one is work to
// do. Everyone else sees the Sundays that have something on them.
const shown = computed(() => (canPlan.value ? sundays.value : planned.value))

const togglePublished = async () => {
  // Read the target once: the snapshot may land before the toast is composed.
  const next = isPublished.value ? 'draft' : 'published'
  try {
    await setStatus(next)
    toast.success(next === 'published' ? 'Schedule published' : 'Schedule unpublished')
  } catch (error) {
    console.error('Error changing schedule status:', error)
    toast.error('Could not change the status.')
  }
}

const subtitle = computed(() => {
  const label = formatMonthLabel(month.value)
  if (!canPlan.value) return label
  return `${label} · ${isPublished.value ? 'published' : 'draft'}`
})

/* ----------------------------------------------------------- arriving */

// Older links arrive with ?date= (a Sunday to look at) or with ?edit=1 as
// well (a Sunday to plan). A Sunday is its own screen now, so they go there.
watch(
  () => [route.query.date, route.query.edit],
  ([date, edit]) => {
    if (!date) return
    router.replace({ name: 'SchedulesSunday', params: { date: String(date) }, query: edit ? { edit: '1' } : {} })
  },
  { immediate: true }
)

/* -------------------------------------------------------------- search */

const searchOpen = ref(false)
const searchQuery = ref('')

const openSearch = () => {
  searchOpen.value = true
}

const closeSearch = () => {
  searchOpen.value = false
  searchQuery.value = ''
  // Out of the address too, so a reload or the back button does not open it
  // again.
  if (route.query.search) {
    const { search: _drop, ...rest } = route.query
    router.replace({ query: rest })
  }
}

watch(
  () => route.query.search,
  (value) => {
    if (value) openSearch()
  },
  { immediate: true }
)

const searching = computed(() => searchOpen.value && searchQuery.value.trim().length > 0)

const results = computed(() => {
  if (!searching.value) return { upcoming: [], past: [] }
  const rows = allMonths.value
    // Drafts stay the planners' own here too.
    .filter((m) => canPlan.value || m.status === 'published')
    .flatMap((m) => m.sundays.map((sunday) => ({ sunday, month: m.month })))
    .filter(({ sunday }) => sunday.date && isSundayPlanned(sunday))
    .map((row) => ({ ...row, matches: scheduleMatches(row.sunday, searchQuery.value, roles.value, members.value) }))
    .filter((row) => row.matches)
  return {
    upcoming: rows.filter((r) => r.sunday.date >= today).sort((a, b) => a.sunday.date.localeCompare(b.sunday.date)),
    // Most recent first: last month's answer is worth more than last year's.
    past: rows.filter((r) => r.sunday.date < today).sort((a, b) => b.sunday.date.localeCompare(a.sunday.date)),
  }
})

const resultCount = computed(() => results.value.upcoming.length + results.value.past.length)

</script>

<template>
  <AppScreen title="Calendar" :subtitle="subtitle" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <template #action>
      <button
        v-if="!searchOpen"
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Search every schedule"
        @click="openSearch"
      >
        <Search class="size-5" />
      </button>
    </template>

    <SchedulesToolbar
      :search-query="searchQuery"
      :open="searchOpen"
      :result-count="resultCount"
      @update:search-query="searchQuery = $event"
      @close="closeSearch"
    />

    <!-- ===================== Search, across every month ===================== -->
    <template v-if="searching">
      <div v-if="!resultCount" class="px-6 py-16 text-center">
        <SearchX class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">No service matches that.</p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
          Try a first name, a role like &ldquo;ushers&rdquo;, or a song title.
        </p>
      </div>
      <ListGroup v-if="results.upcoming.length" class="mb-5" title="Coming up" :count="results.upcoming.length">
          <ScheduleSundayCard
            v-for="row in results.upcoming"
            :key="row.sunday.date"
            :sunday="row.sunday"
            :members="members"
            :roles="roles"
            :my-roles="myRolesOn(row.sunday)"
            :matches="row.matches"
          />
      </ListGroup>
      <ListGroup v-if="results.past.length" title="Earlier" :count="results.past.length">
          <ScheduleSundayCard
            v-for="row in results.past"
            :key="row.sunday.date"
            :sunday="row.sunday"
            :members="members"
            :roles="roles"
            :my-roles="myRolesOn(row.sunday)"
            :matches="row.matches"
            past
          />
      </ListGroup>
    </template>

    <!-- ============================ The month ============================ -->
    <template v-else>
      <!-- Months, a tap each. Bled to the screen's edges so the strip scrolls
           under the thumb rather than stopping short of it. -->
      <div
        ref="chipStrip"
        class="no-scrollbar -mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="Month"
      >
        <button
          v-for="chip in months"
          :key="chip.key"
          type="button"
          role="tab"
          :aria-current="chip.key === month ? 'true' : undefined"
          :aria-selected="chip.key === month"
          :class="[
            'relative shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition-colors',
            chip.key === month
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
          ]"
          @click="goToMonth(chip.key)"
        >
          {{ chip.label }}<span v-if="chip.year" class="ml-1 font-normal opacity-70">{{ chip.year }}</span>
          <span
            v-if="chip.draft"
            class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-gray-50 dark:ring-gray-900"
            aria-label="Draft"
          />
        </button>
      </div>

      <div v-if="loading" class="flex flex-col gap-2">
        <div v-for="n in 4" :key="n" class="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>

      <div v-else-if="isHiddenDraft" class="p-8 text-center text-gray-500 dark:text-gray-400">
        <EyeOff class="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p class="font-medium text-gray-700 dark:text-gray-300">Not published yet</p>
        <p class="mt-1 text-sm">The schedule for {{ formatMonthLabel(month) }} is still being put together.</p>
      </div>

      <template v-else>
        <!-- The month's state, for whoever can change it, saying what it means -->
        <ListGroup v-if="canPlan" class="mb-5">
          <ListRow
            :title="`${formatMonthLabel(month).split(' ')[0]} is ${isPublished ? 'published' : 'a draft'}`"
            :subtitle="isPublished ? 'Everyone can see who is on.' : 'Only planners can see it.'"
            :warn="!isPublished"
          >
            <template #leading>
              <span
                :class="[
                  'flex size-11 shrink-0 items-center justify-center rounded-xl',
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                ]"
              >
                <component :is="isPublished ? Eye : EyeOff" class="size-5" />
              </span>
            </template>
            <template #trailing>
              <button
                type="button"
                :class="[
                  'inline-flex h-9 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                  isPublished
                    ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    : 'bg-primary text-white hover:bg-primary-hover',
                ]"
                @click="togglePublished"
              >
                {{ isPublished ? 'Unpublish' : 'Publish' }}
              </button>
            </template>
          </ListRow>
        </ListGroup>

        <!-- Cards or the table -->
        <div class="mb-3 flex justify-end">
          <div class="inline-flex rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800" role="radiogroup" aria-label="View">
            <button
              v-for="option in [
                { key: 'cards', label: 'Sundays', icon: SquaresFour },
                { key: 'table', label: 'Table', icon: Table },
              ]"
              :key="option.key"
              type="button"
              role="radio"
              :aria-checked="view === option.key"
              :class="[
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors',
                view === option.key
                  ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
              ]"
              @click="setView(option.key)"
            >
              <component :is="option.icon" class="size-4" />
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="!shown.length" class="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nobody has been scheduled in {{ formatMonthLabel(month) }} yet.
        </div>

        <ScheduleMonthTable
          v-else-if="view === 'table'"
          class="animate-rise"
          :sundays="sundays"
          :roles="roles"
          :members="members"
          :is-me="isMe"
          :can-plan="canPlan"
          :today="today"
        />

        <ListGroup v-else :title="formatMonthLabel(month)" :count="shown.length">
          <ScheduleSundayCard
            v-for="sunday in shown"
            :key="sunday.date"
            :sunday="sunday"
            :members="members"
            :roles="roles"
            :my-roles="myRolesOn(sunday)"
            :can-plan="canPlan"
            :past="sunday.date < today"
          />
        </ListGroup>
      </template>
    </template>
  </AppScreen>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

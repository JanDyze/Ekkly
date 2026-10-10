<script setup>
import { computed, ref } from 'vue'
import { Check, Stack, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import { useSermons } from '../../composables/useSermons'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { saveLineup } from '../../api/lineupsService'
import { blankSunday } from '../../composables/useLineups'
import { assignmentsOf } from '../../data/scheduleRoles'
import { findRosterMember } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'
import { formatShortDate } from '../../utils/lineupUtils'

// The preaching team's section: what is being preached, Sunday by Sunday —
// who, the series, the message, its passages and whether the slides are in —
// and a way into each.
//
// A series is set here for several Sundays at once, because that is how one
// is planned: "Faithful in little" for the four Sundays of November, not typed
// four times. It is the Sunday's theme, the same one the rota, the home and the
// month's video show.

const { loading, comingSundays, canPlanTeam, lineups, myRolesOn } = useScheduleOverview()
const { members } = useMembers()
const { sermonOn } = useSermons()
const { user } = useAuth()
const toast = useToast()

const canPlan = computed(() => canPlanTeam('preaching'))

/** Who preaches a Sunday, by the name they go by. */
const preacherOf = (sunday) => {
  const member = findRosterMember(members.value, assignmentsOf(sunday).preacher?.[0])
  return member ? getDisplayName(member) : ''
}

/** The strong line: the message, else the series, else what is missing. */
const titleOf = (sunday) => sermonOn(sunday.date)?.title || sunday.theme || 'No message yet'

/** The quiet line: who, and from where in Scripture. */
const detailOf = (sunday) => {
  const sermon = sermonOn(sunday.date)
  const parts = [preacherOf(sunday) || 'Nobody preaching yet']
  if (sermon?.title && sunday.theme) parts.push(sunday.theme)
  if (sermon?.passages?.length) parts.push(sermon.passages.map((p) => p.reference).join(', '))
  return parts.join(' · ')
}

/* ---------------------------------------------------------------- series */

const seriesOpen = ref(false)
const seriesTitle = ref('')
const seriesDates = ref([])
const savingSeries = ref(false)
const dialogRef = ref(null)
useFocusTrap(dialogRef, () => seriesOpen.value, () => (seriesOpen.value = false))

const openSeries = () => {
  seriesTitle.value = ''
  seriesDates.value = []
  seriesOpen.value = true
}

const toggleDate = (date) => {
  seriesDates.value = seriesDates.value.includes(date)
    ? seriesDates.value.filter((d) => d !== date)
    : [...seriesDates.value, date]
}

/**
 * Writes the theme onto each chosen Sunday, month by month, from the months as
 * they stand right now — so the series lands without disturbing anything else
 * any team has planned on those Sundays.
 */
const applySeries = async () => {
  const title = seriesTitle.value.trim()
  if (!title || !seriesDates.value.length || savingSeries.value) return
  savingSeries.value = true
  try {
    const byMonth = {}
    seriesDates.value.forEach((date) => (byMonth[date.slice(0, 7)] ||= []).push(date))
    for (const [month, dates] of Object.entries(byMonth)) {
      const stored = lineups.value.find((m) => m.month === month)?.sundays || []
      const byDate = new Map(stored.map((s) => [s.date, s]))
      dates.forEach((date) => byDate.set(date, { ...(byDate.get(date) || blankSunday(date)), theme: title }))
      await saveLineup(month, { sundays: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) }, user.value)
    }
    toast.success(`"${title}" set for ${seriesDates.value.length} Sunday${seriesDates.value.length === 1 ? '' : 's'}`)
    seriesOpen.value = false
  } catch (error) {
    console.error('Could not set the series:', error)
    toast.error('Could not set the series. Please try again.')
  } finally {
    savingSeries.value = false
  }
}
</script>

<template>
  <AppScreen title="Preaching" subtitle="The series, each message, its passages and slides" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <template v-if="canPlan" #action>
      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
        @click="openSeries"
      >
        <Stack class="h-4 w-4" />
        Set a series
      </button>
    </template>

    <div class="flex flex-col gap-5">
      <div v-if="loading" class="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <ListGroup v-else title="Coming up" :count="comingSundays.length">
        <ListRow
          v-for="sunday in comingSundays"
          :key="sunday.date"
          :to="{ name: 'SchedulesSunday', params: { date: sunday.date } }"
          :title="titleOf(sunday)"
          :warn="!sermonOn(sunday.date) && !sunday.theme && canPlan"
          :muted="!sermonOn(sunday.date) && !sunday.theme && !canPlan"
          :subtitle="detailOf(sunday)"
        >
          <template #leading><DateTile :date="sunday.date" :highlight="myRolesOn(sunday).length > 0" /></template>
          <template #trailing>
            <span
              v-if="sermonOn(sunday.date)?.slides?.length"
              class="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {{ sermonOn(sunday.date).slides.length }} slides
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>

    <!-- Setting a series across several Sundays -->
    <Teleport to="body">
      <div
        v-if="seriesOpen"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="seriesOpen = false"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="series-title"
          tabindex="-1"
          class="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex items-center justify-between gap-3 border-b border-gray-200 bg-linear-to-r from-primary/10 to-transparent px-4 py-3.5 dark:border-gray-700 dark:from-primary-light/10">
            <div class="flex min-w-0 items-center gap-3">
              <div class="shrink-0 rounded-xl bg-primary p-2.5"><Stack class="h-5 w-5 text-white" /></div>
              <div class="min-w-0">
                <h2 id="series-title" class="truncate text-base font-bold text-gray-900 dark:text-white">Set a series</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">One theme across several Sundays</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="seriesOpen = false"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div>
              <label for="series-name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">What is the series called</label>
              <input
                id="series-name"
                v-model="seriesTitle"
                maxlength="80"
                placeholder="Faithful in little"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Which Sundays</p>
              <ul class="space-y-1">
                <li v-for="sunday in comingSundays" :key="sunday.date">
                  <button
                    type="button"
                    :aria-pressed="seriesDates.includes(sunday.date)"
                    :class="[
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      seriesDates.includes(sunday.date) ? 'bg-primary/10 dark:bg-primary-light/15' : 'hover:bg-gray-100 dark:hover:bg-gray-700/60',
                    ]"
                    @click="toggleDate(sunday.date)"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ formatShortDate(sunday.date) }}</span>
                      <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ sunday.theme || 'No theme yet' }}</span>
                    </span>
                    <Check v-if="seriesDates.includes(sunday.date)" class="h-4.5 w-4.5 shrink-0 text-primary dark:text-primary-light" />
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div class="flex justify-end gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="seriesOpen = false"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!seriesTitle.trim() || !seriesDates.length || savingSeries"
              :class="[
                'rounded-lg px-4 py-2',
                seriesTitle.trim() && seriesDates.length && !savingSeries
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
              ]"
              @click="applySeries"
            >
              Set for {{ seriesDates.length || '' }} {{ seriesDates.length === 1 ? 'Sunday' : 'Sundays' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppScreen>
</template>

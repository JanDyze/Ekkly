<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { MusicNotes } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useSongsOverview } from '../../composables/useSongsOverview'
import { formatServiceDate } from '../../utils/lineupUtils'

// The coming Sundays' songs, a block each: what is sung, in order, in which
// key, and whether its words are saved. This is the worship leader's check
// before a rehearsal and the tech team's before they build the slides.
//
// The songs are chosen in Schedules, where the rest of a Sunday is planned,
// so each block leads there; a song leads to its own page, where its words
// are typed and arranged. A gap is amber only for someone who can fill it —
// the words for whoever edits songs, the key for whoever plans the worship.

const { loading, sundaysLoading, canEdit, canPlanWorship, comingSets, setOf, leaderOf } = useSongsOverview()

// Six Sundays is a month and a half: as far ahead as anyone plans songs.
const SHOWN = 6
const sets = computed(() =>
  comingSets.value.slice(0, SHOWN).map((sunday) => ({ sunday, rows: setOf(sunday), leader: leaderOf(sunday) }))
)

const subtitle = computed(() => {
  if (loading.value || sundaysLoading.value) return ''
  const n = comingSets.value.length
  return n ? `${n} ${n === 1 ? 'Sunday' : 'Sundays'} with songs` : ''
})

const needsMe = (row) => (canEdit.value && row.noLyrics) || (canPlanWorship.value && row.noKey)

/** The quiet line under a song: what it still needs, or that it is ready. */
const lineOf = (row) => {
  const parts = []
  if (row.notOnList) parts.push('Not on the song list')
  else if (row.noLyrics) parts.push('No lyrics yet')
  if (row.noKey) parts.push('No key yet')
  if (row.entry.note) parts.push(row.entry.note)
  return parts.length ? parts.join(' · ') : row.song?.category || 'Ready'
}

const noteOf = ({ sunday, leader }) =>
  [leader ? `${leader} leads` : 'Nobody leading yet', sunday.draft ? 'Still a draft' : ''].filter(Boolean).join(' · ')
</script>

<template>
  <AppScreen title="Sundays" :subtitle="subtitle" :back="{ name: 'SongsHome' }" root="/songs" desk>
    <div class="flex flex-col gap-5">
      <!-- Loading: shaped like a Sunday's block -->
      <div v-if="loading || sundaysLoading" class="flex flex-col gap-5">
        <div v-for="n in 2" :key="n">
          <div class="mb-2 h-3 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-4 py-3">
              <div class="size-9 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-600" />
              <div class="flex-1 space-y-2">
                <div class="h-3.5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
                <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nothing chosen for any coming Sunday -->
      <div v-else-if="!sets.length" class="flex flex-col items-center justify-center px-8 py-16 text-center text-gray-500 dark:text-gray-400">
        <MusicNotes class="mb-3 size-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">No songs picked yet</p>
        <p class="text-sm">
          {{ canPlanWorship ? 'Choose them for a Sunday in Schedules, and they show here.' : 'The worship team chooses them in Schedules.' }}
        </p>
        <RouterLink
          v-if="canPlanWorship"
          :to="{ name: 'SchedulesWorship' }"
          class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Plan the worship
        </RouterLink>
      </div>

      <template v-else>
        <ListGroup
          v-for="set in sets"
          :key="set.sunday.date"
          :title="formatServiceDate(set.sunday.date)"
          :count="set.rows.length"
          :note="noteOf(set)"
        >
          <template #action>
            <RouterLink
              :to="{ name: 'SchedulesSunday', params: { date: set.sunday.date } }"
              class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-primary-light"
            >
              {{ canPlanWorship ? 'Plan' : 'Open' }}
            </RouterLink>
          </template>

          <ListRow
            v-for="(row, index) in set.rows"
            :key="row.id"
            :to="row.song ? { name: 'SongDetails', params: { id: row.song.id } } : null"
            :title="row.title"
            :subtitle="lineOf(row)"
            :warn="needsMe(row)"
          >
            <template #leading>
              <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold tabular-nums text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                {{ index + 1 }}
              </span>
            </template>
            <template #trailing>
              <span
                v-if="row.musicKey"
                class="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary dark:bg-primary-light/15 dark:text-primary-light"
              >
                {{ row.musicKey }}
              </span>
            </template>
          </ListRow>
        </ListGroup>
      </template>
    </div>
  </AppScreen>
</template>

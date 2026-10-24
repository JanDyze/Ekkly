<script setup>
import { computed } from 'vue'
import { ChartBar } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import SongThumb from './SongThumb.vue'
import { useSongsOverview } from '../../composables/useSongsOverview'
import { parseIso } from '../../utils/lineupUtils'
import { daysBetween } from '../../utils/taskUtils'

// How often each song is sung, read from every Sunday on file: the songs the
// church has sung most this year, the ones resting longest, and the ones it
// has never sung. It is the page for choosing songs — a favourite is worth
// knowing before it is picked a fifth week running, and a song nobody has
// sung in months may be one worth bringing back, or one to let go.
//
// A song already planned for a coming Sunday says so, so nobody brings back
// what is already coming back.

const { loading, sundaysLoading, mostSung, resting, neverSung, historyOf, nextPlanned, today } = useSongsOverview()

const busy = computed(() => loading.value || sundaysLoading.value)

const thisYear = new Date().getFullYear()

/** "Oct 4", with the year only when it is not this one. */
const dayLabel = (iso) => {
  const date = parseIso(iso)
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === thisYear ? {} : { year: 'numeric' }),
  })
}

/** How long a song has rested, as a person would say it. */
const restedFor = (iso) => {
  const days = daysBetween(iso, today)
  const months = Math.floor(days / 30)
  if (months >= 12) {
    const years = Math.floor(months / 12)
    return `${years} ${years === 1 ? 'year' : 'years'}`
  }
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

const plannedLine = (song) => {
  const date = nextPlanned.value.get(String(song.id))
  return date ? `Planned for ${dayLabel(date)}` : ''
}

const sungLine = (song) => {
  const { last } = historyOf(song)
  return plannedLine(song) || (last ? `Last sung ${dayLabel(last)}` : '')
}

const addedLine = (song) => {
  if (plannedLine(song)) return plannedLine(song)
  const created = song.createdAt?.toDate?.()
  return created ? `Added ${created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : song.category || ''
}

const songPage = (song) => ({ name: 'SongDetails', params: { id: song.id } })

const subtitle = computed(() => {
  if (busy.value) return ''
  const n = mostSung.value.length
  return n ? `${n} ${n === 1 ? 'song' : 'songs'} sung this year` : ''
})

const nothingSung = computed(() => !mostSung.value.length && !resting.value.length)
</script>

<template>
  <AppScreen title="Most sung" :subtitle="subtitle" :back="{ name: 'SongsHome' }" root="/songs" desk>
    <div class="flex flex-col gap-5">
      <div
        v-if="busy"
        class="rows-round divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
      >
        <div v-for="i in 8" :key="i" class="flex items-center gap-3 px-4 py-3">
          <div class="h-10 w-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-600" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Nothing on file has been sung: no Sunday with songs has passed. -->
        <div v-if="nothingSung" class="flex flex-col items-center justify-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
          <ChartBar class="mb-3 size-10 text-gray-300 dark:text-gray-600" />
          <p class="mb-1 text-lg">Nothing sung yet</p>
          <p class="text-sm">Once a Sunday with songs has passed, how often each is sung shows here.</p>
        </div>

        <ListGroup v-if="mostSung.length" title="Most sung this year" :count="mostSung.length">
          <ListRow
            v-for="song in mostSung"
            :key="song.id"
            :to="songPage(song)"
            :title="song.title"
            :subtitle="sungLine(song)"
            no-chevron
          >
            <template #leading><SongThumb :url="song.youtubeUrl" /></template>
            <template #trailing>
              <span class="shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {{ historyOf(song).count }}<span class="font-normal text-gray-400 dark:text-gray-500">×</span>
              </span>
            </template>
          </ListRow>
        </ListGroup>

        <ListGroup
          v-if="resting.length"
          title="Not sung lately"
          :count="resting.length"
          note="Three months or more, and on no Sunday to come. The longest first."
        >
          <ListRow
            v-for="song in resting"
            :key="song.id"
            :to="songPage(song)"
            :title="song.title"
            :subtitle="`Last sung ${dayLabel(historyOf(song).last)}`"
            no-chevron
          >
            <template #leading><SongThumb :url="song.youtubeUrl" /></template>
            <template #trailing>
              <span class="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">{{ restedFor(historyOf(song).last) }}</span>
            </template>
          </ListRow>
        </ListGroup>

        <ListGroup v-if="neverSung.length" title="Never sung" :count="neverSung.length" note="On the list, and on no Sunday that has happened yet. The newest first.">
          <ListRow
            v-for="song in neverSung"
            :key="song.id"
            :to="songPage(song)"
            :title="song.title"
            :subtitle="addedLine(song)"
          >
            <template #leading><SongThumb :url="song.youtubeUrl" /></template>
          </ListRow>
        </ListGroup>
      </template>
    </div>
  </AppScreen>
</template>

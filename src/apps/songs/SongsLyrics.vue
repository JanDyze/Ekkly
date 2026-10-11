<script setup>
import { computed } from 'vue'
import { CheckCircle } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import SongThumb from './SongThumb.vue'
import { useSongsOverview } from '../../composables/useSongsOverview'
import { formatShortDate } from '../../utils/lineupUtils'

// The songs whose words are not saved yet, for whoever edits songs. A song
// without them is one the tech team cannot put on the screen, so the ones a
// coming Sunday needs come first, soonest first; the rest follow by title.
// Each opens on its own page, where the words are typed or pasted in and laid
// out into slides.

const { loading, sundaysLoading, withoutLyrics, lyricsNeeded } = useSongsOverview()

const soonIds = computed(() => new Set(lyricsNeeded.value.map((row) => String(row.song.id))))

const theRest = computed(() =>
  withoutLyrics.value
    .filter((song) => !soonIds.value.has(String(song.id)))
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
)

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = withoutLyrics.value.length
  return n ? `${n} ${n === 1 ? 'song' : 'songs'} to write out` : ''
})

const songPage = (song) => ({ name: 'SongDetails', params: { id: song.id } })
</script>

<template>
  <AppScreen title="Missing lyrics" :subtitle="subtitle" :back="{ name: 'SongsHome' }" root="/songs">
    <div class="flex flex-col gap-5">
      <div
        v-if="loading"
        class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
      >
        <div v-for="i in 8" :key="i" class="flex items-center gap-3 px-4 py-3">
          <div class="h-10 w-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-600" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
          </div>
        </div>
      </div>

      <div v-else-if="!withoutLyrics.length" class="flex flex-col items-center justify-center px-8 py-16 text-center text-gray-500 dark:text-gray-400">
        <CheckCircle class="mb-3 size-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">Every song has its words</p>
        <p class="text-sm">A song added without them shows here until they are.</p>
      </div>

      <template v-else>
        <ListGroup
          v-if="lyricsNeeded.length && !sundaysLoading"
          title="Needed soon"
          :count="lyricsNeeded.length"
          note="On a coming Sunday. The soonest first."
        >
          <ListRow
            v-for="row in lyricsNeeded"
            :key="row.song.id"
            :to="songPage(row.song)"
            :title="row.song.title"
            :subtitle="`Sung ${formatShortDate(row.date)}`"
            warn
          >
            <template #leading><SongThumb :url="row.song.youtubeUrl" /></template>
          </ListRow>
        </ListGroup>

        <ListGroup v-if="theRest.length" :title="lyricsNeeded.length ? 'The rest' : 'No lyrics yet'" :count="theRest.length">
          <ListRow
            v-for="song in theRest"
            :key="song.id"
            :to="songPage(song)"
            :title="song.title"
            :subtitle="song.category || ''"
          >
            <template #leading><SongThumb :url="song.youtubeUrl" /></template>
          </ListRow>
        </ListGroup>
      </template>
    </div>
  </AppScreen>
</template>

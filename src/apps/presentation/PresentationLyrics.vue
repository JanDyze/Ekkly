<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { usePresentationOverview } from '../../composables/usePresentationOverview'
import { formatShortDate } from '../../utils/lineupUtils'

// Every song on the services still to come, once each, and whether its words
// are in. A song with none puts a blank screen up in the middle of the
// singing, and it is the one thing on a run sheet the booth cannot fix from
// the booth: the words live on the song (useServiceLyrics), so they are added
// in the song list, once, for every Sunday that sings it.
//
// The ones still to fix come first; the rest follow in the order they are
// sung, so the screen doubles as a look at what is coming up. Each opens the
// song itself.

const { loading, canFixWords, songsAhead, wordsMissing } = usePresentationOverview()

const ready = computed(() => songsAhead.value.filter((row) => !row.reason))

const subtitle = computed(() => {
  if (loading.value || !songsAhead.value.length) return ''
  const n = wordsMissing.value.length
  return n ? `${n} still without words` : 'Every song has its words'
})

/** The Sundays a song is sung on, the soonest first. */
const datesOf = (row) => row.dates.map(formatShortDate).join(', ')

// By address rather than route name: the song list keeps its addresses
// whatever its screens are called.
const songLink = (row) => (row.song ? `/songs/${row.song.id}` : null)
</script>

<template>
  <AppScreen title="Lyrics" :subtitle="subtitle" :back="{ name: 'PresentationHome' }" root="/presentation" desk>
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!songsAhead.length">
      <ListRow title="No songs coming up" subtitle="They show here once the worship team picks them." muted />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup
        v-if="wordsMissing.length"
        title="Still to add"
        :count="wordsMissing.length"
        :note="canFixWords ? 'Open one and paste its words in.' : 'Adding words is for whoever keeps the song list.'"
      >
        <ListRow
          v-for="row in wordsMissing"
          :key="row.key"
          :to="songLink(row)"
          :title="row.title"
          :subtitle="`${row.reason} · ${datesOf(row)}`"
          warn
        />
      </ListGroup>

      <ListGroup v-if="ready.length" title="Ready" :count="ready.length">
        <ListRow v-for="row in ready" :key="row.key" :to="songLink(row)" :title="row.title" :subtitle="datesOf(row)" />
      </ListGroup>
    </div>
  </AppScreen>
</template>

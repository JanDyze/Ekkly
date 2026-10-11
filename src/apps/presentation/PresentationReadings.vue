<script setup>
import { computed, ref } from 'vue'
import { MagnifyingGlass, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { usePresentationOverview } from '../../composables/usePresentationOverview'
import { formatServiceDate } from '../../utils/lineupUtils'

// Every passage put up on a Sunday, under the Sunday, newest first — the ones
// still to come at the top. The reading from three weeks ago is what an old
// run sheet is most often opened to find ("which verse did Pastor use?"), and
// it used to mean opening Sundays one by one.
//
// The search sits open, as Decisions' does: this screen is a lookup far more
// often than a scroll. The verses' words match as well as the reference, so
// half-remembered wording finds the passage. Each opens that Sunday in the
// presenter, where the reading can be shown again.

const { loading, readings } = usePresentationOverview()

const query = ref('')

// Case and accents folded away, so "isaias" finds "Isaías".
const fold = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const found = computed(() => {
  const wanted = fold(query.value).trim()
  if (!wanted) return readings.value
  return readings.value.filter((row) =>
    [row.reference, row.version, formatServiceDate(row.date), ...row.verses.map((v) => v.text)].some((field) =>
      fold(field).includes(wanted)
    )
  )
})

const bySunday = computed(() => {
  const groups = new Map()
  for (const row of found.value) {
    if (!groups.has(row.date)) groups.set(row.date, { date: row.date, past: row.past, rows: [] })
    groups.get(row.date).rows.push(row)
  }
  return [...groups.values()]
})

/** The first words of the passage, so a reading is known by its wording too. */
const opening = (row) => [row.version, row.verses[0]?.text || ''].filter(Boolean).join(' · ')

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = readings.value.length
  return n ? `${n.toLocaleString()} ${n === 1 ? 'reading' : 'readings'}` : ''
})
</script>

<template>
  <AppScreen title="Readings" :subtitle="subtitle" :back="{ name: 'PresentationHome' }" root="/presentation">
    <div class="relative mb-4">
      <MagnifyingGlass class="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="text"
        inputmode="search"
        enterkeyhint="search"
        autocomplete="off"
        aria-label="Search readings"
        placeholder="Search a passage or its words"
        class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Clear search"
        @click="query = ''"
      >
        <X class="size-4" />
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!bySunday.length">
      <ListRow
        :title="query ? `Nothing matches “${query}”` : 'No readings yet'"
        :subtitle="query ? 'Try the book, the chapter, or a few of its words.' : 'They come with the preacher’s message, or are added in the presenter.'"
        muted
      />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup
        v-for="group in bySunday"
        :key="group.date"
        :title="group.past ? formatServiceDate(group.date) : `${formatServiceDate(group.date)} · coming up`"
        :count="group.rows.length > 1 ? group.rows.length : null"
      >
        <ListRow
          v-for="row in group.rows"
          :key="row.key"
          :to="{ name: 'Present', params: { date: row.date } }"
          :title="row.reference"
          :subtitle="opening(row)"
        />
      </ListGroup>
    </div>
  </AppScreen>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { hasSermonNotes } from '../../api/sermonsService'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'
import { referencesOf } from '../../utils/teachingUtils'

// The messages, Sunday by Sunday: the ones still to come this month and next,
// each saying whether anything is written yet, then every one already
// preached, newest first — the record a church reaches for when it asks "when
// did we last preach on Ruth?". Each opens into the message.
//
// The same sermons Schedules' Preaching section lists; that one is the rota's
// view (who, the series, the slides), this one the preparation's.

const { loading, isMe, comingDates, sermonOn, themeOn, preachersOn, preacherIdsOn, canEditSermon, sermonWaiting, preached } =
  useTeachingOverview()

const search = ref('')

/** The strong line: the message, else the series, else that nothing is written. */
const titleOf = (date) => sermonOn(date)?.title || themeOn(date) || 'No message yet'

/** The quiet line: who, and from where in Scripture. */
const detailOf = (date) => {
  const sermon = sermonOn(date)
  const preachers = preachersOn(date)
  const parts = [preachers.length ? listPhrase(preachers.map(getDisplayName)) : 'Nobody preaching yet']
  if (sermon?.title && themeOn(date)) parts.push(themeOn(date))
  if (sermon?.passages?.length) parts.push(referencesOf(sermon.passages))
  return parts.join(' · ')
}

// Preached messages, found by title, series, passage or preacher.
const preachedShown = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return preached.value
  return preached.value.filter((sermon) =>
    [sermon.title, sermon.bigIdea, themeOn(sermon.date), referencesOf(sermon.passages), ...preachersOn(sermon.date).map(getDisplayName)]
      .join(' ')
      .toLowerCase()
      .includes(q)
  )
})
</script>

<template>
  <AppScreen title="Sermons" subtitle="Each message, and what is written for it" :back="{ name: 'TeachingHome' }" root="/teaching" desk>
    <div class="flex flex-col gap-5">
      <div v-if="loading" class="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <template v-else>
        <ListGroup title="Coming up" :count="comingDates.length">
          <ListRow
            v-for="date in comingDates"
            :key="date"
            :to="{ name: 'TeachingSermon', params: { date } }"
            :title="titleOf(date)"
            :subtitle="detailOf(date)"
            :warn="sermonWaiting(date) && canEditSermon(date)"
            :muted="!hasSermonNotes(sermonOn(date)) && !themeOn(date)"
          >
            <template #leading><DateTile :date="date" :highlight="preacherIdsOn(date).some(isMe)" /></template>
            <template #trailing>
              <span
                v-if="sermonOn(date)?.manuscript"
                class="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                Notes
              </span>
            </template>
          </ListRow>
        </ListGroup>

        <section>
          <div class="mb-1.5 flex items-end justify-between gap-3 px-1">
            <h2 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Preached
              <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ preached.length }}</span>
            </h2>
          </div>
          <input
            v-if="preached.length > 6"
            v-model="search"
            type="search"
            aria-label="Search the messages preached"
            placeholder="Search by title, passage or preacher"
            class="mb-2 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <ListGroup>
            <ListRow
              v-for="sermon in preachedShown"
              :key="sermon.date"
              :to="{ name: 'TeachingSermon', params: { date: sermon.date } }"
              :title="sermon.title || themeOn(sermon.date) || 'Untitled message'"
              :subtitle="detailOf(sermon.date)"
            >
              <template #leading><DateTile :date="sermon.date" past /></template>
            </ListRow>
            <ListRow
              v-if="!preachedShown.length"
              :title="search ? `Nothing matches “${search}”` : 'Nothing preached on record yet'"
              :subtitle="search ? 'Try a word from the title, a book of the Bible or a name.' : 'Each message shows here once its Sunday has passed.'"
              muted
            />
          </ListGroup>
        </section>
      </template>
    </div>
  </AppScreen>
</template>

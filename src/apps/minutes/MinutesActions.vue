<script setup>
import { computed, ref } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useMinutesOverview } from '../../composables/useMinutesOverview'
import { meetingWhen } from '../../utils/minuteSummary'

// What the meetings asked people to do, read out of each write-up's "Who does
// what" table (useMinutesOverview), under the meeting that asked, newest
// meeting first.
//
// It opens on the ones still waiting — minuted, not called done, and on
// nobody's task list — because those are the commitments nobody will be
// reminded of. Each opens its meeting, where the same row has the button that
// puts it on the list. Nothing is added from here: the meeting's own page is
// where it can be read in context first.

const { loading, actionItems, notOnList, idOf, dayOf } = useMinutesOverview()

const showAll = ref(false)
const shown = computed(() => (showAll.value ? actionItems.value : notOnList.value))

// Under the meeting that asked, newest meeting first.
const byMeeting = computed(() => {
  const groups = new Map()
  for (const item of shown.value) {
    const id = idOf(item.minute)
    if (!groups.has(id)) groups.set(id, { id, minute: item.minute, items: [] })
    groups.get(id).items.push(item)
  }
  return [...groups.values()]
})

const headingOf = (minute) => `${minute.title || 'Meeting'} · ${meetingWhen(dayOf(minute)).label}`
const lineOf = (item) => [item.servant, item.timeline].filter(Boolean).join(' · ') || 'Nobody named'
const stateOf = (item) => (item.done ? 'Done' : item.onList ? 'On the list' : '')

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = notOnList.value.length
  return n ? `${n} on nobody’s list` : 'Every one is on a list or done'
})
</script>

<template>
  <AppScreen title="Action items" :subtitle="subtitle" :back="{ name: 'MinutesHome' }" root="/minutes">
    <!-- Waiting, or every one the minutes hold. -->
    <div class="mb-4 inline-flex rounded-xl bg-gray-200/70 p-1 dark:bg-gray-800" role="tablist" aria-label="Which action items">
      <button
        v-for="option in [{ all: false, label: 'Waiting' }, { all: true, label: 'All' }]"
        :key="option.label"
        type="button"
        role="tab"
        :aria-selected="showAll === option.all"
        :class="[
          'h-9 rounded-lg px-4 text-sm font-semibold transition-colors',
          showAll === option.all ? 'bg-white text-gray-900 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-600' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
        ]"
        @click="showAll = option.all"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!byMeeting.length">
      <ListRow
        :title="showAll ? 'No action items yet' : 'Nothing waiting'"
        :subtitle="showAll ? 'They come from the “Who does what” table in a written-up meeting.' : 'Every action item is on someone’s list, or done.'"
        muted
      />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in byMeeting" :key="group.id" :title="headingOf(group.minute)" :count="group.items.length">
        <ListRow
          v-for="item in group.items"
          :key="item.key"
          :to="{ name: 'MinuteDetails', params: { id: group.id } }"
          :title="item.task"
          :subtitle="lineOf(item)"
          :muted="item.done"
        >
          <template #trailing>
            <span
              v-if="stateOf(item)"
              :class="[
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                item.done ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
              ]"
            >
              {{ stateOf(item) }}
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>

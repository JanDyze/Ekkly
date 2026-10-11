<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MinuteListItem from '../../components/minutes/MinuteListItem.vue'
import { useMinutesOverview } from '../../composables/useMinutesOverview'

// The meetings whose notes were taken and never written up, the oldest first,
// because it has waited longest and the people who were there remember it
// least. Each opens straight into the meeting, where Write it up turns the
// notes into minutes. The same rows as Meetings, so a meeting looks the same
// wherever it is listed.

const { loading, canEdit, toWriteUp, openMeeting } = useMinutesOverview()

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = toWriteUp.value.length
  return n ? `${n} ${n === 1 ? 'meeting' : 'meetings'}, the oldest first` : ''
})
</script>

<template>
  <AppScreen title="To write up" :subtitle="subtitle" :back="{ name: 'MinutesHome' }" root="/minutes">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!toWriteUp.length">
      <ListRow title="Nothing to write up" subtitle="Every meeting with notes has its minutes." muted />
    </ListGroup>

    <ListGroup v-else note="Open one, then Write it up: the notes under each agenda item become the minutes.">
      <MinuteListItem
        v-for="minute in toWriteUp"
        :key="minute.id || minute.firestoreId"
        :minute="minute"
        :can-edit="false"
        @open="openMeeting"
      />
    </ListGroup>

    <p v-if="!loading && toWriteUp.length && !canEdit" class="mt-3 px-1 text-xs text-gray-500 dark:text-gray-400">
      Writing up is for whoever manages minutes.
    </p>
  </AppScreen>
</template>

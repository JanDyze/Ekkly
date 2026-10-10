<script setup>
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useTasksOverview } from '../../composables/useTasksOverview'

// The open tasks, by the ministry each is filed under: one row a ministry,
// the most first, with how many are late in amber, and the ones filed under
// none last. Rows rather than cards, because it is a list to scan for one
// name, and a ministry with nothing open is not here at all.

const { loading, byMinistry } = useTasksOverview()

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const lineOf = (group) =>
  [plural(group.tasks.length, 'open task', 'open tasks'), group.overdue && `${group.overdue} late`].filter(Boolean).join(' · ')
</script>

<template>
  <AppScreen title="By ministry" :subtitle="loading ? '' : plural(byMinistry.filter((g) => g.name).length, 'ministry', 'ministries')" :back="{ name: 'TasksHome' }" root="/tasks">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!byMinistry.length">
      <ListRow title="Nothing open" subtitle="Every task has been ticked off." muted />
    </ListGroup>

    <ListGroup v-else>
      <ListRow
        v-for="group in byMinistry"
        :key="group.name || 'none'"
        :to="group.name ? { name: 'TasksMinistry', params: { name: group.name } } : { name: 'TasksUnfiled' }"
        :title="group.name || 'No ministry'"
        :subtitle="lineOf(group)"
        :warn="group.overdue > 0"
        :muted="!group.name"
      />
    </ListGroup>
  </AppScreen>
</template>

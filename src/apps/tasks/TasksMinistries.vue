<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DeskTable from '../../components/appframe/DeskTable.vue'
import { useTasksOverview } from '../../composables/useTasksOverview'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { dueLabel } from '../../utils/taskUtils'

// The open tasks, by the ministry each is filed under: one row a ministry,
// the most first, with how many are late in amber, and the ones filed under
// none last. Rows rather than cards, because it is a list to scan for one
// name, and a ministry with nothing open is not here at all.
//
// On a desktop the same rows are a table (DeskTable): what a phone puts in
// one quiet line — how many, how many late — gets columns of its own, with
// the two a phone has no room for: when the next one is due, and how many
// nobody has taken.

const { loading, byMinistry } = useTasksOverview()
const desk = useMediaQuery('(min-width: 1024px)')

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const lineOf = (group) =>
  [plural(group.tasks.length, 'open task', 'open tasks'), group.overdue && `${group.overdue} late`].filter(Boolean).join(' · ')

const rows = computed(() =>
  byMinistry.value.map((group) => {
    const dates = group.tasks.map((t) => t.dueDate).filter(Boolean).sort()
    return {
      ...group,
      key: group.name || 'none',
      open: group.tasks.length,
      next: dates[0] || '',
      unassigned: group.tasks.filter((t) => !(t.assigneeIds || []).length).length,
    }
  })
)

const columns = [
  { key: 'name', label: 'Ministry', width: 'minmax(12rem, 2fr)' },
  { key: 'open', label: 'Open', width: '5rem', align: 'right' },
  { key: 'overdue', label: 'Late', width: '5rem', align: 'right' },
  { key: 'unassigned', label: 'Nobody yet', width: '7rem', align: 'right', min: 720 },
  { key: 'next', label: 'Next due', width: 'minmax(8rem, 1fr)' },
]

const linkOf = (group) => (group.name ? { name: 'TasksMinistry', params: { name: group.name } } : { name: 'TasksUnfiled' })
</script>

<template>
  <AppScreen
    title="By ministry"
    :subtitle="loading ? '' : plural(byMinistry.filter((g) => g.name).length, 'ministry', 'ministries')"
    :back="{ name: 'TasksHome' }"
    root="/tasks"
    desk
    :fill="desk"
  >
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!byMinistry.length">
      <ListRow title="Nothing open" subtitle="Every task has been ticked off." muted />
    </ListGroup>

    <DeskTable v-else-if="desk" label="Open tasks by ministry" :columns="columns" :rows="rows" :row-key="(row) => row.key" :row-to="linkOf" fill>
      <template #cell-name="{ row }">
        <span :class="['block truncate font-semibold', row.name ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400']">
          {{ row.name || 'No ministry' }}
        </span>
      </template>
      <template #cell-open="{ row }">
        <span class="tabular-nums">{{ row.open }}</span>
      </template>
      <template #cell-overdue="{ row }">
        <span v-if="row.overdue" class="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{{ row.overdue }}</span>
        <span v-else class="text-gray-300 dark:text-gray-600">—</span>
      </template>
      <template #cell-unassigned="{ row }">
        <span v-if="row.unassigned" class="tabular-nums">{{ row.unassigned }}</span>
        <span v-else class="text-gray-300 dark:text-gray-600">—</span>
      </template>
      <template #cell-next="{ row }">
        <span v-if="row.next" class="truncate">{{ dueLabel(row.next) }}</span>
        <span v-else class="text-gray-400 dark:text-gray-500">No date</span>
      </template>
    </DeskTable>

    <ListGroup v-else>
      <ListRow
        v-for="group in byMinistry"
        :key="group.name || 'none'"
        :to="linkOf(group)"
        :title="group.name || 'No ministry'"
        :subtitle="lineOf(group)"
        :warn="group.overdue > 0"
        :muted="!group.name"
      />
    </ListGroup>
  </AppScreen>
</template>

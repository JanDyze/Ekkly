<script setup>
import { computed } from 'vue'
import { ArrowUpCircle, Check, Trash2 } from '../../icons'
import DeskTable from '../appframe/DeskTable.vue'
import { assigneeLabel, dueLabel, isDueToday, isFlagged, isOverdue } from '../../utils/taskUtils'

// The Tasks lists on a desktop (TasksList): a task a row, with the box to
// tick at its start and what the phone's row wraps onto a second line — who
// has it, the ministry, when it is due, how pressing it is — in columns, so a
// planner can run an eye down the due dates or the names. Grouped by when it
// is due as the phone's list is, the late group's heading in red; a click on
// a row opens it in the drawer beside the list, as a tap does on a phone.

const props = defineProps({
  // [{ key, label, tasks }], the list's own groups, and the done ones.
  groups: { type: Array, required: true },
  done: { type: Array, default: () => [] },
  showDone: { type: Boolean, default: false },
  today: { type: String, default: '' },
  selectedId: { type: [String, Number], default: null },
  canEdit: { type: Boolean, default: false },
  canComplete: { type: Function, required: true },
})

const emit = defineEmits(['open', 'toggle', 'delete'])

const columns = computed(() => [
  { key: 'tick', label: '', width: '2rem' },
  { key: 'task', label: 'Task', width: 'minmax(14rem, 2.4fr)' },
  { key: 'who', label: 'Who', width: 'minmax(9rem, 1.2fr)', min: 620 },
  { key: 'ministry', label: 'Ministry', width: 'minmax(7rem, 0.9fr)', min: 820 },
  { key: 'due', label: 'Due', width: '8rem' },
  { key: 'priority', label: 'Priority', width: '6.5rem', min: 980 },
  // Deleting a row from the table, as a phone's row can, for whoever may.
  ...(props.canEdit ? [{ key: 'actions', label: '', width: '2.25rem', align: 'right' }] : []),
])

const sections = computed(() => [
  ...props.groups.map((group) => ({
    key: group.key,
    label: group.label,
    count: group.tasks.length,
    dot: group.key === 'overdue' ? 'bg-red-500' : '',
    rows: group.tasks,
  })),
  ...(props.showDone && props.done.length ? [{ key: 'done', label: 'Done', count: props.done.length, rows: props.done }] : []),
])

const dueClass = (task) => {
  if (task.done) return 'text-gray-400 dark:text-gray-500'
  if (isOverdue(task, props.today || undefined)) return 'font-semibold text-red-600 dark:text-red-400'
  if (isDueToday(task, props.today || undefined)) return 'font-semibold text-amber-600 dark:text-amber-400'
  return 'text-gray-600 dark:text-gray-300'
}
const rowClass = (task) => (String(task.id) === String(props.selectedId) ? 'bg-primary/10 dark:bg-primary/20' : '')
</script>

<template>
  <DeskTable
    label="Tasks"
    :columns="columns"
    :groups="sections"
    :row-key="(task) => task.id"
    :row-class="rowClass"
    :clickable="canEdit"
    @row-click="(task) => canEdit && emit('open', task)"
  >
    <template #cell-tick="{ row }">
      <button
        type="button"
        :disabled="!canComplete(row)"
        :aria-pressed="row.done"
        :aria-label="row.done ? `Mark ${row.title} as not done` : `Mark ${row.title} as done`"
        :title="canComplete(row) ? (row.done ? 'Mark as not done' : 'Mark as done') : 'Only the people it is assigned to can tick this off'"
        :class="[
          'flex size-6 items-center justify-center rounded-full border-2 transition-colors',
          row.done
            ? 'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500'
            : canComplete(row)
              ? 'border-gray-300 hover:border-green-500 dark:border-gray-500'
              : 'cursor-default border-gray-200 dark:border-gray-700',
        ]"
        @click.stop="canComplete(row) && emit('toggle', row)"
      >
        <Check v-if="row.done" class="size-4" />
      </button>
    </template>
    <template #cell-task="{ row }">
      <span :class="['block truncate font-semibold', row.done ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-white']">
        {{ row.title || 'Untitled task' }}
      </span>
      <span v-if="row.details && !row.done" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.details }}</span>
    </template>
    <template #cell-who="{ row }">
      <span :class="['block truncate', (row.assigneeIds || []).length ? '' : 'italic text-gray-400 dark:text-gray-500']">{{ assigneeLabel(row) }}</span>
    </template>
    <template #cell-ministry="{ row }">
      <span v-if="row.ministry" class="inline-flex max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{{ row.ministry }}</span>
      <span v-else class="text-gray-300 dark:text-gray-600">—</span>
    </template>
    <template #cell-due="{ row }">
      <span :class="['block truncate tabular-nums', dueClass(row)]">{{ dueLabel(row.dueDate, today || undefined) || '—' }}</span>
    </template>
    <template #cell-actions="{ row }">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-lg text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover/row:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400 [@media(hover:none)]:opacity-100"
        :aria-label="`Delete ${row.title || 'this task'}`"
        title="Delete"
        @click.stop="emit('delete', row)"
      >
        <Trash2 class="size-4" />
      </button>
    </template>
    <template #cell-priority="{ row }">
      <span
        v-if="isFlagged(row) && !row.done"
        :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize text-white', row.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500']"
      >
        <ArrowUpCircle class="size-3" />
        {{ row.priority }}
      </span>
      <span v-else class="text-gray-300 dark:text-gray-600">—</span>
    </template>
  </DeskTable>
</template>

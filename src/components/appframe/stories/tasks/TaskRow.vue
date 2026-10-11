<script setup>
import { computed } from 'vue'
import { ArrowUpCircle, Check, Clock, Tag, User } from '../../../../icons'

// One task drawn the way the list draws it (components/tasks/TaskListItem):
// the round box to tick, the title, and who, when and which ministry on one
// line under it. Kept to one line here, truncated rather than wrapped, so a
// row is always the same height and a scene's list can be planned to fit.

const props = defineProps({
  task: { type: Object, required: true },
  done: { type: Boolean, default: false },
  doneBy: { type: String, default: '' },
  // A thumb landing on the box.
  tapped: { type: Boolean, default: false },
})

const dueClass = computed(() => {
  if (props.done) return 'text-gray-400 dark:text-gray-500'
  if (props.task.when === 'late') return 'font-semibold text-red-600 dark:text-red-400'
  if (props.task.when === 'today') return 'font-semibold text-amber-600 dark:text-amber-400'
  return 'text-gray-500 dark:text-gray-400'
})
</script>

<template>
  <div class="flex items-start gap-1 px-1.5 py-1.5">
    <span :class="['relative flex size-9 shrink-0 items-center justify-center rounded-full text-green-600', tapped ? 'st-tap' : '']">
      <span
        :class="[
          'flex size-5.5 items-center justify-center rounded-full border-2 transition-colors duration-300',
          done ? 'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500' : 'border-gray-300 dark:border-gray-500',
        ]"
      >
        <Check v-if="done" class="st-pop size-3.5" />
      </span>
    </span>

    <div class="min-w-0 flex-1 pt-1">
      <div class="flex items-center gap-2">
        <p :class="['min-w-0 flex-1 truncate text-sm font-medium', done ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-white']">
          {{ task.title }}
        </p>
        <span v-if="task.priority && !done" class="flex shrink-0 items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] capitalize text-white">
          <ArrowUpCircle class="size-3" />
          {{ task.priority }}
        </span>
      </div>
      <div class="mt-0.5 flex items-center gap-2.5 whitespace-nowrap text-[11px]">
        <span :class="['flex min-w-0 items-center gap-1', task.who === 'Unassigned' ? 'italic text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400']">
          <User class="size-3 shrink-0" />
          <span class="truncate">{{ task.who }}</span>
        </span>
        <span v-if="done && doneBy" class="truncate text-gray-400 dark:text-gray-500">Done by {{ doneBy }}</span>
        <template v-else>
          <span v-if="task.due" :class="['flex shrink-0 items-center gap-1', dueClass]">
            <Clock class="size-3 shrink-0" />
            {{ task.due }}
          </span>
          <span class="flex shrink-0 items-center gap-1 text-gray-500 dark:text-gray-400">
            <Tag class="size-3 shrink-0" />
            {{ task.ministry }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

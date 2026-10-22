<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle, ChevronRight, Flag, ListChecks, Plus } from '../../icons'
import SimpleRows from '../../components/simple/SimpleRows.vue'
import { useTasksOverview } from '../../composables/useTasksOverview'
import { assigneeLabel, compareTasks, dueLabel, isFlagged, isOverdue } from '../../utils/taskUtils'

// The Tasks app's home in simple view (useSimpleView): a dashboard, as most
// systems open a module on one, built as People's is (PeopleSimple). Its
// figures, each opening the list behind it; what needs you, a line each; and
// your own open tasks. Its sections are down the sidebar (SimpleSidebar), so
// they are not repeated here.
//
// Handed the same cards the full home is built from (TasksHome), and its
// figures read the same overview (useTasksOverview), so the two never
// disagree.

const props = defineProps({
  // The deck, as TasksHome builds it.
  cards: { type: Array, required: true },
})

const { loading, today, canEdit, myMemberId, open, mine, overdue, dueToday, doneThisWeek } = useTasksOverview()

const stats = computed(() => [
  { key: 'open', label: 'Open', value: open.value.length, to: { name: 'Tasks' } },
  { key: 'late', label: 'Late', value: overdue.value.length, to: { name: 'Tasks', query: { q: 'overdue' } }, warn: overdue.value.length > 0 },
  { key: 'today', label: 'Due today', value: dueToday.value.length, to: { name: 'Tasks', query: { q: 'today' } } },
  { key: 'done', label: 'Done this week', value: doneThisWeek.value.length, to: { name: 'TasksDone' } },
])

// Each card that asks for something, as a line. The open count is a figure.
const needs = computed(() =>
  props.cards
    .filter((card) => card.tone !== 'accent')
    .filter((card) => !(card.remember && !card.level))
    .map((card) => ({
      key: card.key,
      title: card.title,
      detail: card.detail || card.kicker,
      icon: card.icon,
      warn: card.tone === 'warn',
      to: card.to,
    }))
)

// Yours, soonest first; someone not on the roll sees what is open.
const list = computed(() =>
  [...(myMemberId.value ? mine.value : open.value)]
    .sort(compareTasks)
    .slice(0, 8)
    .map((task) => ({
      key: String(task.id),
      title: task.title || 'Untitled',
      detail: [dueLabel(task.dueDate, today), myMemberId.value ? '' : assigneeLabel(task), task.ministry].filter(Boolean).join(' · '),
      icon: isFlagged(task) ? Flag : ListChecks,
      warn: isOverdue(task, today),
      to: { name: myMemberId.value ? 'TasksMine' : 'Tasks', query: { q: task.title || '' } },
    }))
)
</script>

<template>
  <!-- The page never scrolls. Its title stays; on a desktop the figures stay
       too and each list scrolls in its own box, and on a phone everything
       under the title scrolls as one. -->
  <div class="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+0.75rem))] lg:px-8 lg:pt-8">
      <header class="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl dark:text-white">Tasks</h1>
        <RouterLink
          v-if="canEdit"
          :to="{ name: 'Tasks', query: { add: 'true' } }"
          class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          New task
        </RouterLink>
      </header>

      <div class="-mx-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-0.5 lg:mx-0 lg:overflow-hidden lg:px-0">
        <!-- The figures, each opening its list. -->
        <section aria-label="At a glance" class="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
          <RouterLink
            v-for="stat in stats"
            :key="stat.key"
            :to="stat.to"
            class="flex flex-col rounded-xl bg-white p-5 ring-1 ring-gray-200 transition-colors hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-gray-600"
          >
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</span>
            <span :class="['mt-2 text-3xl font-bold tabular-nums', stat.warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white']">
              {{ loading ? '–' : stat.value.toLocaleString() }}
            </span>
            <span class="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-primary dark:text-primary-light">
              View
              <ChevronRight class="size-4" />
            </span>
          </RouterLink>
        </section>

        <div class="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
          <section aria-labelledby="tasks-simple-needs" class="flex min-h-0 flex-col">
            <h2 id="tasks-simple-needs" class="mb-3 text-base font-semibold text-gray-900 dark:text-white">Needs your attention</h2>
            <SimpleRows :rows="needs" class="min-h-0 lg:overflow-y-auto">
              <template #empty>
                <p v-if="!needs.length" class="flex items-center gap-3 px-4 py-4 text-base text-gray-600 dark:text-gray-300">
                  <CheckCircle class="size-5 text-primary dark:text-primary-light" />
                  Nothing needs you right now.
                </p>
              </template>
            </SimpleRows>
          </section>

          <section aria-labelledby="tasks-simple-yours" class="flex min-h-0 flex-col">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h2 id="tasks-simple-yours" class="text-base font-semibold text-gray-900 dark:text-white">{{ myMemberId ? 'Your tasks' : 'Open tasks' }}</h2>
              <RouterLink :to="{ name: myMemberId ? 'TasksMine' : 'Tasks' }" class="text-sm font-semibold text-primary hover:underline dark:text-primary-light">See all</RouterLink>
            </div>
            <SimpleRows :rows="list" class="min-h-0 lg:overflow-y-auto">
              <template #empty>
                <p v-if="!list.length" class="px-4 py-4 text-base text-gray-600 dark:text-gray-300">
                  {{ myMemberId ? 'Nothing is on you.' : 'Nothing is open.' }}
                </p>
              </template>
            </SimpleRows>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

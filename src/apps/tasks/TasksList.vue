<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, ChevronRight, MagnifyingGlass, Plus, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import TaskTable from '../../components/tasks/TaskTable.vue'
import { useMediaQuery } from '../../composables/useMediaQuery'
import TaskQuickAdd from '../../components/tasks/TaskQuickAdd.vue'
import TaskListItem from '../../components/tasks/TaskListItem.vue'
import TaskDrawer from '../../components/tasks/TaskDrawer.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import { useTasks } from '../../composables/useTasks'
import { usePermissions } from '../../composables/usePermissions'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import {
  DUE_BUCKETS,
  compareDone,
  compareTasks,
  dueBucket,
  isAssignedTo,
  matchesTaskQuery,
  todayKey,
} from '../../utils/taskUtils'

// Every list in the Tasks app is this screen, told by its route which tasks it
// is about: yours (TasksMine), everyone's (Tasks), one ministry's
// (TasksMinistry), the ones filed under none (TasksUnfiled), and what is done
// (TasksDone).
//
// The open ones are grouped by when they are due rather than by who owns them,
// because "what is late" is the question a list is opened to answer. Who,
// which ministry and how urgent are details on the row, and the search
// reaches every one of them, including words a row only displays: "overdue",
// "unassigned", "done". Done tasks fold away at the foot, except on Done.
//
// Rows, not cards: a list of tasks is many of the same thing, ticked off one
// after another. It began as the Tasks page, and the rows, the box to add one
// and the drawer to edit one are the same components that page had.

const route = useRoute()
const { tasks, loading, addTask, updateTask, setTaskDone, removeTask } = useTasks()
const { canManage, myMember } = usePermissions()
const { user } = useAuth()
const toast = useToast()

const today = todayKey()
const canEdit = computed(() => canManage('tasks'))
const myMemberId = computed(() => (myMember.value ? memberKey(myMember.value) : null))

// Ticking a box is not editing: the person a task was handed to has to be able
// to say it is done without also being trusted to rewrite the list.
// On a desktop the list is a table (TaskTable): who, the ministry, when it
// is due and how pressing in columns, rather than wrapped under each title.
const desk = useMediaQuery('(min-width: 1024px)')

const canComplete = (task) => canEdit.value || isAssignedTo(task, myMemberId.value)

/** Who the app records as having ticked something off. */
const meAs = computed(() => ({
  uid: user.value?.uid || '',
  name: myMember.value ? getFullName(myMember.value).trim() : user.value?.displayName || user.value?.email || 'Someone',
}))

/* ----------------------------------------------------- which list this is */

const mode = computed(() => {
  switch (route.name) {
    case 'TasksMine':
      return 'mine'
    case 'TasksMinistry':
      return 'ministry'
    case 'TasksUnfiled':
      return 'unfiled'
    case 'TasksDone':
      return 'done'
    default:
      return 'all'
  }
})
const ministryName = computed(() => String(route.params.name || ''))

const title = computed(
  () =>
    ({
      mine: 'Mine',
      all: 'Everyone’s',
      ministry: ministryName.value,
      unfiled: 'No ministry',
      done: 'Done',
    })[mode.value]
)

const inScope = computed(() => {
  switch (mode.value) {
    case 'mine':
      return tasks.value.filter((t) => isAssignedTo(t, myMemberId.value))
    case 'ministry':
      return tasks.value.filter((t) => (t.ministry || '').trim().toLowerCase() === ministryName.value.toLowerCase())
    case 'unfiled':
      return tasks.value.filter((t) => !(t.ministry || '').trim())
    default:
      return tasks.value
  }
})

/* ----------------------------------------------------------------- search */

const searchQuery = ref(String(route.query.q || ''))
watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = String(q || '')
  }
)

const matching = computed(() => inScope.value.filter((t) => matchesTaskQuery(t, searchQuery.value, today)))

/** The open list, in due-date order, with empty groups dropped. */
const openGroups = computed(() => {
  if (mode.value === 'done') return []
  const open = matching.value.filter((t) => !t.done)
  return DUE_BUCKETS.map((bucket) => ({
    ...bucket,
    tasks: open.filter((t) => dueBucket(t, today) === bucket.key).sort(compareTasks),
  })).filter((bucket) => bucket.tasks.length > 0)
})

const doneTasks = computed(() => matching.value.filter((t) => t.done).sort(compareDone))
const openCount = computed(() => openGroups.value.reduce((n, g) => n + g.tasks.length, 0))
const showDone = ref(false)

// What was finished in the last 30 days is what anyone looks back for; a
// year of ticked boxes under it only buries that. The rest is one tap away,
// and a search looks through all of it.
const RECENT_DAYS = 30
const showOlder = ref(false)
const recentSince = Date.now() - RECENT_DAYS * 86_400_000
const isRecent = (task) => (task.doneAt?.getTime?.() || 0) >= recentSince
const doneShown = computed(() =>
  showOlder.value || searchQuery.value.trim() ? doneTasks.value : doneTasks.value.filter(isRecent)
)
const olderCount = computed(() => doneTasks.value.length - doneShown.value.length)

const subtitle = computed(() => {
  if (loading.value) return ''
  if (mode.value === 'done') return `${doneTasks.value.length} done`
  const n = inScope.value.filter((t) => !t.done).length
  return n ? `${n} open` : 'Nothing open'
})

const empty = computed(() => !loading.value && !openCount.value && !doneTasks.value.length)

/* --------------------------------------------------------------- editing */

const emptyTask = () => ({
  title: '',
  details: '',
  assigneeIds: [],
  assigneeNames: [],
  // A task added from a ministry's list is filed there already.
  ministry: mode.value === 'ministry' ? ministryName.value : '',
  dueDate: '',
  priority: 'normal',
  done: false,
})

// Added from your own list, it is yours: given to you, so it stays on it.
const withMe = (task) =>
  mode.value === 'mine' && myMemberId.value
    ? { ...task, assigneeIds: [myMemberId.value], assigneeNames: [meAs.value.name] }
    : task

const showAddTask = ref(false)
const showEditTask = ref(false)
const editingTask = ref(null)
const selectedTaskId = ref(null)
const taskForm = ref(emptyTask())

const closeDrawer = () => {
  showAddTask.value = false
  showEditTask.value = false
  editingTask.value = null
  selectedTaskId.value = null
  taskForm.value = emptyTask()
}

const newTask = () => {
  if (showAddTask.value) return closeDrawer()
  taskForm.value = withMe(emptyTask())
  editingTask.value = null
  selectedTaskId.value = null
  showEditTask.value = false
  showAddTask.value = true
}

// A new task asked for in the address (`?add=1`, the desktop home's quick
// actions): the form open, read once, then dropped from the address so the
// back button does not keep reopening it.
const router = useRouter()
watch(
  () => route.query.add,
  (add) => {
    if (add !== '1') return
    if (canEdit.value && !showAddTask.value) newTask()
    router.replace({ query: { ...route.query, add: undefined } })
  },
  { immediate: true }
)

const openTask = (task) => {
  if (!canEdit.value) return
  const { id, firestoreId, createdAt, updatedAt, doneAt, ...rest } = task
  taskForm.value = { ...emptyTask(), ...rest }
  editingTask.value = task
  selectedTaskId.value = task.id
  showAddTask.value = false
  showEditTask.value = true
}

// What the box read from the line (TaskQuickAdd): the title, and a date,
// people and a ministry when the line named them. Named people replace "given
// to me" on your own list; a ministry named replaces this list's own.
const quickAdd = async ({ title: taskTitle, dueDate, ministry, assigneeIds, assigneeNames }, done) => {
  const base = withMe(emptyTask())
  try {
    await addTask({
      ...base,
      title: taskTitle,
      dueDate: dueDate || base.dueDate,
      ministry: ministry || base.ministry,
      ...(assigneeIds.length ? { assigneeIds, assigneeNames } : {}),
      createdBy: meAs.value.uid,
      createdByName: meAs.value.name,
    })
    done(true)
  } catch (error) {
    console.error('Error adding task:', error)
    toast.error('Could not add that task. Please try again.')
    done(false)
  }
}

const saveTask = async () => {
  try {
    if (showEditTask.value && editingTask.value) {
      // Everything the drawer edits, and nothing it does not: the tick and who
      // made it belong to the checkbox, and writing a stale copy of them back
      // would undo whoever ticked the box while this was open.
      const { done, doneBy, doneByName, ...edits } = taskForm.value
      await updateTask(editingTask.value, edits)
    } else {
      await addTask({ ...taskForm.value, createdBy: meAs.value.uid, createdByName: meAs.value.name })
    }
    closeDrawer()
  } catch (error) {
    console.error('Error saving task:', error)
    toast.error('Could not save that task. Please try again.')
  }
}

const toggleDone = async (task) => {
  try {
    await setTaskDone(task, !task.done, meAs.value)
  } catch (error) {
    console.error('Error updating task:', error)
    toast.error('Could not update that task. Please try again.')
  }
}

/* -------------------------------------------------------------- deleting */

const showConfirmation = ref(false)
const pendingDelete = ref(null)
const deleteMessage = computed(() => `Delete "${pendingDelete.value?.title || 'this task'}"? This cannot be undone.`)

const askToDelete = (task) => {
  pendingDelete.value = task
  showConfirmation.value = true
}

const confirmDelete = async () => {
  const task = pendingDelete.value
  showConfirmation.value = false
  if (!task) return
  try {
    await removeTask(task)
    if (editingTask.value && editingTask.value.id === task.id) closeDrawer()
  } catch (error) {
    console.error('Error deleting task:', error)
    toast.error('Could not delete that task. Please try again.')
  } finally {
    pendingDelete.value = null
  }
}

const back = computed(() =>
  mode.value === 'ministry' || mode.value === 'unfiled' ? { name: 'TasksMinistries' } : { name: 'TasksHome' }
)

const emptyLine = computed(() => {
  if (searchQuery.value) return { title: `Nothing matches “${searchQuery.value}”`, detail: 'Try a name, a ministry, or a word from the task.' }
  if (mode.value === 'mine') return { title: 'Nothing is on you', detail: 'Tasks given to you will be here.' }
  if (mode.value === 'done') return { title: 'Nothing done yet', detail: 'Ticked tasks are kept here.' }
  return { title: 'Nothing on the list', detail: canEdit.value ? 'Type in the box above to add the first one.' : 'Tasks will be here as they come up.' }
})

</script>

<template>
  <AppScreen :title="title" :subtitle="subtitle" :back="back" root="/tasks" fill wide desk>
    <template #action>
      <button
        v-if="canEdit && mode !== 'done'"
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover"
        :aria-label="showAddTask ? 'Close new task' : 'New task'"
        @click="newTask"
      >
        <X v-if="showAddTask" class="size-5" />
        <Plus v-else class="size-5" />
      </button>
    </template>

    <div class="flex min-h-0 flex-1">
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
          <!-- Search, and the box to add one: above the list and outside what
               scrolls, so they are never scrolled away from; only the list
               under them moves. -->
          <div class="mx-auto flex w-full max-w-2xl shrink-0 flex-col gap-2 pb-4 lg:max-w-none lg:flex-row lg:items-start">
            <label class="relative block lg:flex-1">
              <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
              <input
                id="tasks-search"
                v-model="searchQuery"
                type="search"
                autocomplete="off"
                enterkeyhint="search"
                placeholder="Search tasks — a name, a ministry, “overdue”"
                aria-label="Search tasks"
                class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <TaskQuickAdd v-if="canEdit && mode !== 'done'" class="mb-0! lg:flex-1" @add="quickAdd" />
          </div>

      <!-- The list, scrolling on its own; the table's column names stay at
           its top (--screen-head: nothing over them in here). Room round it
           for a row's focus ring. -->
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0.5 pb-6 [--screen-head:0px]">
        <div class="mx-auto flex max-w-2xl flex-col gap-4 lg:max-w-none">

          <div v-if="loading" class="flex flex-col gap-2">
            <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          </div>

          <div v-else-if="empty" class="rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80">
            <p class="font-semibold text-gray-900 dark:text-white">{{ emptyLine.title }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ emptyLine.detail }}</p>
          </div>

          <template v-else>
            <p
              v-if="mode !== 'done' && !openCount"
              class="rounded-2xl bg-white px-6 py-6 text-center text-sm text-gray-500 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700/80"
            >
              <span class="block text-base font-semibold text-gray-900 dark:text-white">Nothing outstanding</span>
              {{ mode === 'mine' ? 'You are all caught up.' : 'Everything here has been ticked off.' }}
            </p>

            <!-- On a desktop, the whole list as one table, done ones at its
                 foot once shown. -->
            <template v-if="desk">
              <TaskTable
                v-if="openCount || mode === 'done' || showDone"
                :groups="openGroups"
                :done="doneShown"
                :show-done="mode === 'done' || showDone"
                :today="today"
                :selected-id="selectedTaskId"
                :can-edit="canEdit"
                :can-complete="canComplete"
                @open="openTask"
                @toggle="toggleDone"
                @delete="askToDelete"
              />
              <button
                v-if="mode !== 'done' && doneTasks.length"
                type="button"
                class="flex items-center gap-1.5 self-start px-1 text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                :aria-expanded="showDone"
                @click="showDone = !showDone"
              >
                <component :is="showDone ? ChevronDown : ChevronRight" class="size-4" />
                {{ showDone ? 'Hide' : 'Show' }} the {{ doneTasks.length }} done
              </button>
            </template>

            <!-- One block per due date, late first and in red. -->
            <template v-else>
            <section v-for="group in openGroups" :key="group.key">
              <h2
                :class="[
                  'mb-1.5 px-1 text-xs font-bold uppercase tracking-wide',
                  group.key === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
                ]"
              >
                {{ group.label }}
                <span class="ml-1 font-semibold tabular-nums opacity-70">{{ group.tasks.length }}</span>
              </h2>
              <div
                :class="[
                  'rows-round divide-y overflow-hidden rounded-2xl bg-white ring-1 dark:bg-gray-800',
                  group.key === 'overdue'
                    ? 'divide-red-100 ring-red-200 dark:divide-red-900/40 dark:ring-red-900/50'
                    : 'divide-gray-100 ring-gray-200/70 dark:divide-gray-700/60 dark:ring-gray-700/70',
                ]"
              >
                <TaskListItem
                  v-for="task in group.tasks"
                  :key="task.id"
                  :task="task"
                  :today="today"
                  :selected="selectedTaskId === task.id"
                  :can-complete="canComplete(task)"
                  :can-edit="canEdit"
                  @click="openTask"
                  @toggle="toggleDone"
                  @delete="askToDelete"
                />
              </div>
            </section>

            <!-- What is finished: folded away at the foot of a list, the whole
                 of the Done list. -->
            <section v-if="doneTasks.length">
              <button
                v-if="mode !== 'done'"
                type="button"
                class="mb-1.5 flex w-full items-center gap-1.5 px-1 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                :aria-expanded="showDone"
                @click="showDone = !showDone"
              >
                <component :is="showDone ? ChevronDown : ChevronRight" class="size-4" />
                Done
                <span class="font-semibold tabular-nums opacity-70">{{ doneTasks.length }}</span>
              </button>
              <div
                v-if="mode === 'done' || showDone"
                class="rows-round divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
              >
                <TaskListItem
                  v-for="task in doneShown"
                  :key="task.id"
                  :task="task"
                  :today="today"
                  :selected="selectedTaskId === task.id"
                  :can-complete="canComplete(task)"
                  :can-edit="canEdit"
                  @click="openTask"
                  @toggle="toggleDone"
                  @delete="askToDelete"
                />
              </div>
            </section>
            </template>

            <button
              v-if="(mode === 'done' || showDone) && olderCount"
              type="button"
              class="self-center rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-primary-light dark:hover:bg-primary/15"
              @click="showOlder = true"
            >
              Show {{ olderCount }} done before the last {{ RECENT_DAYS }} days
            </button>
          </template>
        </div>
      </div>
      </div>

      <!-- Beside the list on a computer, a sheet on a phone (TaskDrawer). -->
      <TaskDrawer
        :show="showAddTask || showEditTask"
        :is-edit="showEditTask"
        :task-data="taskForm"
        :can-delete="canEdit"
        @update:show="(open) => { if (!open) closeDrawer() }"
        @update:task-data="taskForm = $event"
        @save="saveTask"
        @cancel="closeDrawer"
        @delete="askToDelete(editingTask)"
      />
    </div>

    <ConfirmationModal
      :show="showConfirmation"
      title="Delete task"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="showConfirmation = $event"
      @confirm="confirmDelete"
      @cancel="showConfirmation = false"
    />
  </AppScreen>
</template>

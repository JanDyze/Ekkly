<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Check, CheckCircle, ChevronRight, MagnifyingGlass } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppArt from '../../components/common/AppArt.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import TaskQuickAdd from '../../components/tasks/TaskQuickAdd.vue'
import { useTasks } from '../../composables/useTasks'
import { useTasksOverview } from '../../composables/useTasksOverview'
import { usePermissions } from '../../composables/usePermissions'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { getFullName } from '../../utils/memberUtils'
import { assigneeLabel, compareTasks, dueLabel, isAssignedTo, isDueToday, isOverdue } from '../../utils/taskUtils'

// The Tasks app's home on a desktop, built the way People's is (PeopleDesk):
// laid out for the width rather than the phone's deck spread across it, on
// one screen that never scrolls. A phone keeps the deck and the tiles
// (AppHome); a desktop has the room to show what is behind them.
//
//   1. A toolbar: the box to add one, because adding is what a to-do list is
//      opened for most, and finding one beside it.
//   2. What is open across the church, in its colour, and beside it what is
//      waiting on you — the phone's deck cards that ask for something.
//   3. Three columns between rules: yours, ticked off right here; the rest of
//      the church's, soonest first; and how it falls across the ministries.
//
// What needs doing comes from the deck's own `cards` (TasksHome), so the
// phone and the desktop cannot disagree about it.

const props = defineProps({
  // The phone's deck, as TasksHome builds it.
  cards: { type: Array, required: true },
})

const router = useRouter()
const toast = useToast()
const { addTask, setTaskDone } = useTasks()
const { loading, today, canEdit, myMemberId, open, mine, byMinistry } = useTasksOverview()
const { myMember } = usePermissions()
const { user } = useAuth()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/** Who the app records as having added or ticked something. */
const meAs = computed(() => ({
  uid: user.value?.uid || '',
  name: myMember.value ? getFullName(myMember.value).trim() : user.value?.displayName || user.value?.email || 'Someone',
}))

/* ----------------------------------------------------------- the toolbar */

// Added here, a task is given to whoever the line names (TaskQuickAdd), and
// otherwise to nobody: from the home it is the church's list, not yours.
const quickAdd = async ({ title, dueDate, ministry, assigneeIds, assigneeNames }, done) => {
  try {
    await addTask({
      title,
      details: '',
      assigneeIds,
      assigneeNames,
      ministry,
      dueDate,
      priority: 'normal',
      done: false,
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

const query = ref('')
const search = () => router.push({ name: 'Tasks', query: query.value.trim() ? { q: query.value.trim() } : {} })

/* ---------------------------------------------------------- the headline */

const always = computed(() => props.cards.find((card) => card.tone === 'accent') || {})

// The deck's cards that ask something of someone, as tiles to act on.
const CTAS = { 'my-late': 'Catch up', late: 'See them', today: 'Open', week: 'Open', unassigned: 'Hand out' }
const needs = computed(() =>
  props.cards
    .filter((card) => card.tone !== 'accent')
    .filter((card) => !(card.remember && !card.level))
    .map((card) => ({
      key: card.key,
      title: card.title,
      hint: card.detail || card.kicker,
      icon: card.icon,
      warn: card.tone === 'warn',
      to: card.to,
      cta: CTAS[card.key.split(':')[0]] || 'Open',
    }))
)

/* ------------------------------------------------------------ the columns */

const rowOf = (task, withWho) => ({
  task,
  key: String(task.id),
  title: task.title || 'Untitled',
  line: [withWho ? assigneeLabel(task) : '', task.ministry].filter(Boolean).join(' · '),
  due: dueLabel(task.dueDate, today),
  tone: isOverdue(task, today) ? 'late' : isDueToday(task, today) ? 'today' : '',
  canTick: canEdit.value || isAssignedTo(task, myMemberId.value),
})

const yours = computed(() => [...mine.value].sort(compareTasks).map((task) => rowOf(task, false)))
const others = computed(() =>
  open.value
    .filter((task) => !mine.value.includes(task))
    .sort(compareTasks)
    .map((task) => rowOf(task, true))
)

// Ticked here, a task goes from its column straight away: the list is live.
const ticking = ref(new Set())
const tick = async (row) => {
  if (!row.canTick || ticking.value.has(row.key)) return
  ticking.value = new Set(ticking.value).add(row.key)
  try {
    await setTaskDone(row.task, true, meAs.value)
    toast.success(`Done: ${row.title}`)
  } catch (error) {
    console.error('Error ticking task:', error)
    toast.error('Could not tick that off. Please try again.')
  } finally {
    const next = new Set(ticking.value)
    next.delete(row.key)
    ticking.value = next
  }
}

const openRow = (row, mineList) => ({ name: mineList ? 'TasksMine' : 'Tasks', query: { q: row.title } })

// Biggest first, each a bar against the biggest, late in amber at its end.
const ministryRows = computed(() => {
  const most = Math.max(1, ...byMinistry.value.map((group) => group.tasks.length))
  return byMinistry.value.map((group) => ({
    key: group.name || 'none',
    name: group.name || 'No ministry',
    muted: !group.name,
    count: group.tasks.length,
    overdue: group.overdue,
    width: `${Math.max(4, (group.tasks.length / most) * 100)}%`,
    to: group.name ? { name: 'TasksMinistry', params: { name: group.name } } : { name: 'TasksUnfiled' },
  }))
})

// The columns' shared look, as People's desk has it.
const COLUMN = 'flex min-h-0 min-w-0 flex-col px-7 first:pl-0 last:pr-0'
const HEAD = 'group flex shrink-0 items-center justify-between gap-3 pb-3'
const ROW = '-mx-3 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-200/50 dark:hover:bg-white/5'
const SCROLL = '-mx-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-0.5 [scrollbar-width:thin]'
</script>

<template>
  <AppScreen board plain>
    <div class="flex h-full min-h-0 flex-col">
      <!-- 1. Adding one, and finding one. -->
      <div class="flex shrink-0 items-start gap-3 pb-4">
        <TaskQuickAdd v-if="canEdit" class="mb-0! min-w-0 flex-1" @add="quickAdd" />
        <form :class="['relative shrink-0', canEdit ? 'w-72' : 'w-full max-w-2xl']" role="search" @submit.prevent="search">
          <label class="relative block">
            <span class="sr-only">Search tasks</span>
            <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="query"
              type="search"
              enterkeyhint="search"
              placeholder="Find a task…"
              class="h-[2.875rem] w-full rounded-xl border-0 bg-white pl-10 pr-3 text-sm text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white dark:ring-gray-700"
            />
          </label>
        </form>
      </div>

      <!-- 2. What is open, in the church's colour, and what is waiting on
           you beside it. -->
      <div class="grid shrink-0 grid-cols-3 gap-4 pb-5">
        <RouterLink
          :to="always.to || { name: 'Tasks' }"
          class="tasks-open relative isolate flex min-w-0 flex-col rounded-[28px] border border-black/15 px-5 pt-4 pb-4 text-white transition-colors hover:border-black/35 dark:border-black/40 dark:hover:border-black/60"
        >
          <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
            <CardPanes />
          </div>
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <p v-if="always.kicker" class="inline-flex max-w-full items-center rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">
                <span class="truncate">{{ always.kicker }}</span>
              </p>
              <h2 v-if="!loading" class="mt-1.5 leading-none">
                <span class="text-4xl font-bold tabular-nums tracking-tight">{{ open.length.toLocaleString() }}</span>
                <span class="ml-2 text-base font-semibold text-white/80">open</span>
              </h2>
              <h2 v-else class="mt-1 text-xl font-bold leading-tight tracking-tight">Tasks</h2>
              <p v-if="always.detail" class="mt-1.5 truncate text-sm text-white/75">{{ always.detail }}</p>
            </div>
            <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
              <AppArt app-key="tasks" :play="1" class="size-9" />
            </span>
          </div>
        </RouterLink>

        <section class="col-span-2 grid min-w-0 auto-rows-fr grid-cols-2 gap-3" aria-label="Needs you">
          <RouterLink
            v-for="(need, index) in needs"
            :key="need.key"
            :to="need.to"
            :class="[
              'flex min-w-0 items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-colors',
              need.warn
                ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:bg-amber-500/15'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/60',
              needs.length % 2 && index === needs.length - 1 ? 'col-span-2' : '',
            ]"
          >
            <span
              :class="[
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                need.warn
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
              ]"
            >
              <component :is="need.icon" class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span :class="['block truncate text-[15px] font-bold', need.warn ? 'text-amber-950 dark:text-amber-100' : 'text-gray-900 dark:text-white']">
                {{ need.title }}
              </span>
              <span :class="['block truncate text-xs', need.warn ? 'text-amber-800 dark:text-amber-300/80' : 'text-gray-500 dark:text-gray-400']">
                {{ need.hint }}
              </span>
            </span>
            <span
              :class="[
                'inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold',
                need.warn ? 'bg-amber-200/70 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100' : 'bg-primary text-white',
              ]"
            >
              {{ need.cta }}
              <ChevronRight class="size-3.5" />
            </span>
          </RouterLink>

          <div
            v-if="!needs.length && !loading"
            class="col-span-2 row-span-2 flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white px-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <span class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <CheckCircle class="size-5" />
            </span>
            <span>
              <span class="block text-[15px] font-bold text-gray-900 dark:text-white">Nothing needs you right now</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">Nothing late, nothing due today, nothing left without someone.</span>
            </span>
          </div>
        </section>
      </div>

      <!-- 3. Yours, everyone else's, and by ministry. -->
      <div :class="['grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] divide-x divide-gray-200 border-t border-gray-200 pt-5 dark:divide-gray-800 dark:border-gray-800', myMemberId ? 'grid-cols-3' : 'grid-cols-2']">
        <section v-for="column in [
            { key: 'yours', title: myMemberId ? 'Yours' : 'Open', rows: myMemberId ? yours : others, to: { name: myMemberId ? 'TasksMine' : 'Tasks' }, mine: Boolean(myMemberId), empty: myMemberId ? 'Nothing is on you.' : 'Nothing open.' },
            ...(myMemberId ? [{ key: 'others', title: 'Everyone else’s', rows: others, to: { name: 'Tasks' }, mine: false, empty: 'Nothing open for anyone else.' }] : []),
          ]"
          :key="column.key"
          :class="COLUMN"
          :aria-labelledby="`tasks-${column.key}`"
        >
          <RouterLink :to="column.to" :class="HEAD">
            <h2 :id="`tasks-${column.key}`" class="text-base font-bold text-gray-900 group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">
              {{ column.title }}
              <span v-if="!loading" class="ml-1 text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ column.rows.length }}</span>
            </h2>
            <span class="flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light">See all <ChevronRight class="size-3.5" /></span>
          </RouterLink>
          <div :class="SCROLL">
            <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
              <span v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-xl bg-gray-200/60 dark:bg-white/5" />
            </div>
            <template v-else-if="column.rows.length">
              <div v-for="row in column.rows" :key="row.key" :class="ROW">
                <button
                  v-if="row.canTick"
                  type="button"
                  :disabled="ticking.has(row.key)"
                  class="group/tick flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-transparent transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:border-gray-600 dark:hover:border-primary-light dark:hover:text-primary-light"
                  :aria-label="`Mark ${row.title} done`"
                  @click="tick(row)"
                >
                  <Check class="size-3.5" />
                </button>
                <span v-else class="size-6 shrink-0" aria-hidden="true" />
                <RouterLink :to="openRow(row, column.mine)" class="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.title }}</span>
                    <span v-if="row.line" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.line }}</span>
                  </span>
                  <span
                    v-if="row.due"
                    :class="[
                      'shrink-0 text-xs font-semibold',
                      row.tone === 'late' ? 'text-red-600 dark:text-red-400' : row.tone === 'today' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400',
                    ]"
                  >
                    {{ row.due }}
                  </span>
                </RouterLink>
              </div>
            </template>
            <p v-else class="py-2 text-sm text-gray-500 dark:text-gray-400">{{ column.empty }}</p>
          </div>
        </section>

        <!-- By ministry -->
        <section :class="COLUMN" aria-labelledby="tasks-ministries">
          <RouterLink :to="{ name: 'TasksMinistries' }" :class="HEAD">
            <h2 id="tasks-ministries" class="text-base font-bold text-gray-900 group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">By ministry</h2>
            <span class="flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light">See all <ChevronRight class="size-3.5" /></span>
          </RouterLink>
          <div :class="SCROLL">
            <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
              <span v-for="n in 5" :key="n" class="h-10 animate-pulse rounded-xl bg-gray-200/60 dark:bg-white/5" />
            </div>
            <template v-else-if="ministryRows.length">
              <RouterLink v-for="row in ministryRows" :key="row.key" :to="row.to" :class="[ROW, 'flex-col items-stretch gap-1.5']">
                <span class="flex items-baseline justify-between gap-3 text-sm">
                  <span :class="['truncate font-semibold', row.muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white']">{{ row.name }}</span>
                  <span class="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                    <span v-if="row.overdue" class="font-semibold text-amber-600 dark:text-amber-400">{{ row.overdue }} late · </span>{{ row.count }}
                  </span>
                </span>
                <span class="block h-1.5 overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/10">
                  <span class="block h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: row.width }" />
                </span>
              </RouterLink>
            </template>
            <p v-else class="py-2 text-sm text-gray-500 dark:text-gray-400">Nothing open in any ministry.</p>
            <RouterLink :to="{ name: 'TasksDone' }" :class="[ROW, 'mt-2 justify-between border-t border-gray-200 pt-3 text-sm dark:border-gray-800']">
              <span class="text-gray-600 dark:text-gray-300">Done</span>
              <ChevronRight class="size-4 text-gray-400" />
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </AppScreen>
</template>

<style scoped>
/* The church's colour, flat, as People's roll is on its desk. */
.tasks-open {
  background-color: var(--color-primary);
}

.dark .tasks-open {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

<script setup>
import { computed } from 'vue'
import { CalendarCheck, Flag, Hourglass, ListChecks, UserCircleDashed } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import { assigneeLabel, compareTasks, dueLabel, isDueToday, isFlagged, isOverdue } from '../../utils/taskUtils'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useTasksOverview } from '../../composables/useTasksOverview'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { useSimpleView } from '../../composables/useSimpleView'
import TasksDesk from './TasksDesk.vue'
import TasksSimple from './TasksSimple.vue'

// The Tasks app's home, built the way People's and Finances' are. One screen,
// and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useTasksOverview explains: what is late (yours first), what is due
//      today, yours for the rest of the week, and — for whoever runs the list
//      — what nobody has been given. Under them, the card that is always
//      there: how much is open across the church, and how much was done this
//      week.
//   2. The doors: yours, everyone's, by ministry, and what is done, each its
//      name alone, with a count on the corner only for what is on you.
//
// It used to be the whole list on one page, with a Mine/Everyone switch at the
// top. The lists are its sections now (TasksList), so "what is on me" is one
// tap from the home rather than a switch to find.

const {
  loading,
  canEdit,
  myMemberId,
  open,
  mine,
  overdue,
  myOverdue,
  dueToday,
  myThisWeek,
  unassigned,
  doneThisWeek,
} = useTasksOverview()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const chipsOf = (list) => list.map((t) => ({ key: t.id, label: t.title || 'Untitled' }))

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/* -------------------------------------------------------------- the deck */

const wide = useMediaQuery('(min-width: 1024px)')
// On a desktop the same cards go to TasksDesk, laid out for the width; in
// simple view (Preferences), to a plain dashboard (TasksSimple).
const { simpleView } = useSimpleView()

const cards = computed(() => {
  const list = []
  if (loading.value) return [alwaysCard.value]

  // Late: yours first, because yours is the one you can do something about.
  // Keyed by what is late, so a new one brings a dismissed card back.
  if (myOverdue.value.length) {
    list.push({
      key: `my-late:${myOverdue.value.map((t) => t.id).join(',')}`,
      tone: 'warn',
      icon: Hourglass,
      dismissible: true,
      kicker: 'Late',
      title: `${plural(myOverdue.value.length, 'of yours is', 'of yours are')} past due`,
      detail: 'The oldest first.',
      to: { name: 'TasksMine' },
      chips: chipsOf(myOverdue.value),
    })
  } else if (overdue.value.length) {
    list.push({
      key: `late:${overdue.value.map((t) => t.id).join(',')}`,
      tone: 'warn',
      icon: Hourglass,
      dismissible: true,
      kicker: 'Late',
      title: `${plural(overdue.value.length, 'task is', 'tasks are')} past due`,
      detail: 'None of them are yours.',
      to: { name: 'Tasks', query: { q: 'overdue' } },
      chips: chipsOf(overdue.value),
    })
  }

  if (dueToday.value.length) {
    list.push({
      key: `today:${dueToday.value.map((t) => t.id).join(',')}`,
      tone: 'plain',
      icon: CalendarCheck,
      dismissible: true,
      kicker: 'Due today',
      title: plural(dueToday.value.length, 'task', 'tasks'),
      detail: dueToday.value.some((t) => mine.value.includes(t)) ? 'Some of them are yours.' : '',
      to: { name: 'Tasks', query: { q: 'today' } },
      chips: chipsOf(dueToday.value),
    })
  }

  // Not on a desktop, where every task of yours is listed beside the cards.
  if (myMemberId.value && myThisWeek.value.length && !wide.value) {
    list.push({
      key: `week:${myThisWeek.value.map((t) => t.id).join(',')}`,
      tone: 'plain',
      icon: ListChecks,
      dismissible: true,
      kicker: 'Yours this week',
      title: plural(myThisWeek.value.length, 'task', 'tasks'),
      detail: 'Due in the next seven days.',
      to: { name: 'TasksMine' },
      chips: chipsOf(myThisWeek.value),
    })
  }

  // A task with nobody on it is a task nobody will do. For whoever can hand
  // it to someone; a standing chore, remembered until there are more.
  if (canEdit.value) {
    list.push({
      key: 'unassigned',
      tone: 'plain',
      icon: UserCircleDashed,
      dismissible: true,
      remember: true,
      level: unassigned.value.length,
      kicker: 'Nobody on it',
      title: `${plural(unassigned.value.length, 'task has', 'tasks have')} nobody given`,
      detail: 'Worth handing each to someone.',
      to: { name: 'Tasks', query: { q: 'unassigned' } },
      chips: chipsOf(unassigned.value),
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: what is open, and what got done. */
const alwaysCard = computed(() => ({
  key: 'open',
  tone: 'accent',
  kicker: greeting.value,
  title: loading.value ? 'Tasks' : open.value.length ? plural(open.value.length, 'task open', 'tasks open') : 'Nothing open',
  detail: loading.value
    ? ''
    : doneThisWeek.value.length
      ? `${plural(doneThisWeek.value.length, 'task', 'tasks')} done this week`
      : 'Across the church',
  to: { name: 'Tasks' },
}))

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): every task of yours still
// open, the soonest due first, each with when it is due (red when late), so
// the week's list is on the screen rather than a tap away. Someone not on the
// roll has nothing of their own, and sees what is open across the church.
const sideTasks = computed(() => {
  const list = myMemberId.value ? mine.value : open.value
  return [...list].sort(compareTasks).map((task) => ({
    key: String(task.id),
    to: { name: myMemberId.value ? 'TasksMine' : 'Tasks', query: { q: task.title || '' } },
    icon: isFlagged(task) ? Flag : ListChecks,
    title: task.title || 'Untitled',
    line: myMemberId.value ? task.ministry || '' : [assigneeLabel(task), task.ministry].filter(Boolean).join(' · '),
    aside: dueLabel(task.dueDate),
    tone: isOverdue(task) ? 'urgent' : isDueToday(task) ? 'warn' : '',
  }))
})

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what is on you —
// amber when some of it is late.
const doors = computed(() => [
  ...(myMemberId.value
    ? [{ key: 'mine', title: 'Mine', art: 'tasks-mine', to: { name: 'TasksMine' }, badge: loading.value ? 0 : mine.value.length, urgent: myOverdue.value.length > 0 }]
    : []),
  { key: 'all', title: 'Everyone’s', art: 'tasks-everyone', to: { name: 'Tasks' } },
  { key: 'ministries', title: 'By ministry', art: 'tasks-ministries', to: { name: 'TasksMinistries' } },
  { key: 'done', title: 'Done', art: 'tasks-done', to: { name: 'TasksDone' } },
])
</script>

<template>
  <TasksSimple v-if="simpleView" :cards="cards" />

  <TasksDesk v-else-if="wide" :cards="cards" />

  <AppHome v-else :cards="cards" scope="tasks" label="Tasks today" :doors="doors" name="Tasks">
    <!-- 1. What needs doing, most important on top -->
    <template #card="{ card }">
      <DeckCard
        v-if="card.tone !== 'accent'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <DeckChips v-if="card.chips?.length" :tone="card.tone" :items="card.chips" :max="3" />
      </DeckCard>

      <!-- What is open across the church, and what got done. -->
      <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
        <template #art>
          <!-- Ekkly's panes of light in the corner, as on the home's day
               card. -->
          <CardPanes />
        </template>
        <!-- The Tasks artwork, on white because its orange and blue are
             Ekkly's and need a white ground on a coloured card. -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="tasks" :play="1" class="size-10" />
          </span>
        </template>
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        :title="myMemberId ? 'Yours' : 'Open'"
        :rows="sideTasks"
        :loading="loading"
        :link="{ to: { name: myMemberId ? 'TasksMine' : 'Tasks' }, label: 'See all' }"
        doodle="tea"
        few="Nothing else on you."
        :empty="myMemberId ? { title: 'Nothing on you', line: 'No task of yours is open.' } : { title: 'Nothing open', line: 'Every task is done.' }"
      />
    </template>
  </AppHome>
</template>

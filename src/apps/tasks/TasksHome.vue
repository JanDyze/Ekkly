<script setup>
import { computed } from 'vue'
import { CalendarCheck, Hourglass, ListChecks, UserCircleDashed } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useTasksOverview } from '../../composables/useTasksOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'

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

  if (myMemberId.value && myThisWeek.value.length) {
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
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What needs doing, most important on top -->
      <AppHeroDeck :cards="cards" scope="tasks" label="Tasks today" class="animate-rise">
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
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Tasks" />
    </div>
  </AppScreen>
</template>

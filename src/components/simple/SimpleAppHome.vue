<script setup>
import { computed, provide } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle, ChevronRight, Info, Plus, WarningCircle } from '../../icons'
import SimpleRows from './SimpleRows.vue'

// An app's home in simple view (useSimpleView), for every app built on
// AppHome: a dashboard, as most systems open a module on one, laid out the
// way People's and Tasks' own are (PeopleSimple, TasksSimple). The app's
// name and its one main action; its figures, each opening what it counts;
// what needs you, a line each; what is good to know; and the app's live list
// (AppHome's `side`), which draws itself plainly here (AppSidePanel reads
// `simpleHome`). On a phone its sections follow, since the sidebar there is
// a drawer; on a desktop they are already down the sidebar.
//
// It is handed exactly what the full home is (the deck's cards, the doors,
// the side list), so the two views of an app can never disagree, and an app
// is in simple view the moment it is on AppHome.

const props = defineProps({
  name: { type: String, required: true },
  cards: { type: Array, required: true },
  doors: { type: Array, default: () => [] },
  // [{ key, label, value, to, warn?, note? }], the figures across the top.
  stats: { type: Array, default: () => [] },
  // The app's main action, { label, to }, beside its name.
  action: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

provide('simpleHome', true)

// A card the deck would not show (a remembered one with nothing in it) is
// left out here too.
const shown = computed(() => props.cards.filter((card) => !(card.remember && !card.level)))

const rowOf = (card) => ({
  key: card.key,
  title: card.title,
  detail: card.detail || '',
  icon: card.icon || (card.tone === 'warn' ? WarningCircle : Info),
  warn: card.tone === 'warn',
  to: card.to || null,
})

// The card that is always true (the deck's last) leads what is good to know.
const needs = computed(() => shown.value.filter((card) => card.tone === 'warn').map(rowOf))
const good = computed(() => {
  const rest = shown.value.filter((card) => card.tone !== 'warn')
  const hero = shown.value.at(-1)
  const ordered = hero && hero.tone !== 'warn' ? [hero, ...rest.filter((card) => card !== hero)] : rest
  return ordered.map(rowOf)
})

const sections = computed(() =>
  props.doors.map((door) => ({
    key: door.key,
    title: door.title,
    detail: door.detail || '',
    to: door.to,
    badge: door.badge || 0,
    warn: Boolean(door.urgent),
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
        <h1 class="text-xl font-bold tracking-tight text-gray-900 lg:text-2xl dark:text-white">{{ name }}</h1>
        <RouterLink
          v-if="action"
          :to="action.to"
          class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          {{ action.label }}
        </RouterLink>
      </header>

      <div class="-mx-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-0.5 lg:mx-0 lg:overflow-hidden lg:px-0">
        <!-- The figures, each opening what it counts. -->
        <section
          v-if="stats.length"
          aria-label="At a glance"
          :class="['grid shrink-0 grid-cols-2 gap-4', stats.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3']"
        >
          <RouterLink
            v-for="stat in stats"
            :key="stat.key"
            :to="stat.to"
            class="flex min-w-0 flex-col rounded-xl bg-white p-5 border border-gray-200 transition-colors hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600"
          >
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</span>
            <span :class="['mt-2 truncate text-xl font-bold tabular-nums sm:text-2xl', stat.warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white']">
              {{ loading ? '–' : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value }}
            </span>
            <span v-if="stat.note" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ stat.note }}</span>
            <span class="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-primary dark:text-primary-light">
              View
              <ChevronRight class="size-4" />
            </span>
          </RouterLink>
        </section>

        <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
          <!-- What needs you, and what is good to know. With no live list
               beside them they take a column each. -->
          <div :class="['flex min-h-0 min-w-0 flex-col gap-6', $slots.side ? '' : 'lg:contents']">
            <section aria-labelledby="simple-app-needs" class="flex min-h-0 flex-[0_1_auto] flex-col">
              <h2 id="simple-app-needs" class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Needs your attention</h2>
              <SimpleRows :rows="needs" class="min-h-0 lg:overflow-y-auto">
                <template #empty>
                  <p v-if="!needs.length" class="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle class="size-5 text-primary dark:text-primary-light" />
                    Nothing needs you right now.
                  </p>
                </template>
              </SimpleRows>
            </section>

            <section v-if="good.length" aria-labelledby="simple-app-good" class="flex min-h-0 flex-[0_1_auto] flex-col">
              <h2 id="simple-app-good" class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Good to know</h2>
              <SimpleRows :rows="good" class="min-h-0 lg:overflow-y-auto" />
            </section>
          </div>

          <div v-if="$slots.side" class="flex min-h-0 min-w-0 flex-col">
            <slot name="side" />
          </div>
        </div>

        <!-- On a phone the sidebar is a drawer, so the sections are here too. -->
        <section v-if="sections.length" aria-labelledby="simple-app-sections" class="flex flex-col lg:hidden">
          <h2 id="simple-app-sections" class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Sections</h2>
          <SimpleRows :rows="sections" />
        </section>
      </div>
    </div>
  </div>
</template>

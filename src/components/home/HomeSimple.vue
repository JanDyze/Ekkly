<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Cake, CalendarDots, CheckCircle, ChevronRight, ListChecks } from '../../icons'
import SimpleRows from '../simple/SimpleRows.vue'
import { useSimpleView } from '../../composables/useSimpleView'

// The home in simple view (useSimpleView): a dashboard, as most systems open
// on one. A welcome, a row of figures that each open their app, and what
// needs you, a line each. The apps themselves are down the sidebar
// (SimpleSidebar), so they are not repeated here. No YUNIT, no church, no
// sky, no verse, no panels to arrange.
//
// It is handed what the full home already worked out (Apps.vue): its Today
// cards and the figures behind them, so the two homes never disagree.

const props = defineProps({
  greeting: { type: String, default: '' },
  // [{ key, label, value, to, warn?, note? }], one for each app this person may open.
  stats: { type: Array, default: () => [] },
  // The deck's cards, the day's own card left out (it is the greeting here).
  cards: { type: Array, default: () => [] },
})

const { setSimpleView } = useSimpleView()

const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

// Each card as one line: its own icon where it has one, else one for its kind.
const ICONS = { birthday: Cake, birthdays: Cake, tasks: ListChecks, dated: CalendarDots }
const rows = computed(() =>
  props.cards.map((card) => ({
    key: card.key,
    to: card.to || null,
    icon: card.icon || ICONS[card.kind] || CalendarDots,
    warn: card.tone === 'warn',
    title: card.title,
    detail: card.detail || card.kicker || '',
  }))
)
</script>

<template>
  <!-- The page never scrolls. Its welcome stays; on a desktop the figures
       stay too and what needs you scrolls in its own box, and on a phone
       everything under the welcome scrolls as one. -->
  <div class="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+0.75rem))] lg:px-8 lg:pt-8">
      <header class="shrink-0">
        <h1 class="text-xl font-bold tracking-tight text-gray-900 lg:text-2xl dark:text-white">{{ greeting }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ today }}</p>
      </header>

      <div class="-mx-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 lg:mx-0 lg:overflow-hidden lg:px-0">
      <!-- The figures, each opening its app. -->
      <section v-if="stats.length" aria-label="At a glance" class="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <RouterLink
          v-for="stat in stats"
          :key="stat.key"
          :to="stat.to"
          class="group flex flex-col rounded-xl bg-white p-5 border border-gray-200 transition-colors hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600"
        >
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</span>
          <span class="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ stat.value.toLocaleString() }}</span>
          <span :class="['mt-1 text-xs', stat.warn ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500']">
            {{ stat.note || '' }}
          </span>
          <span class="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-primary dark:text-primary-light">
            View
            <ChevronRight class="size-4" />
          </span>
        </RouterLink>
      </section>

      <!-- What needs you, a line each. -->
      <section aria-labelledby="simple-today" class="flex min-h-0 flex-col lg:flex-1">
        <h2 id="simple-today" class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Needs your attention</h2>
        <SimpleRows :rows="rows" class="min-h-0 lg:overflow-y-auto">
          <template #empty>
            <p v-if="!rows.length" class="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle class="size-5 text-primary dark:text-primary-light" />
              Nothing needs you today.
            </p>
          </template>
        </SimpleRows>
      </section>

      </div>

      <!-- The way back to the full home, where it is easy to find. -->
      <p class="shrink-0 text-center text-sm text-gray-500 dark:text-gray-400">
        Simple view is on.
        <button type="button" class="font-semibold text-primary hover:underline dark:text-primary-light" @click="setSimpleView(false)">
          Show the full home
        </button>
      </p>
    </div>
  </div>
</template>

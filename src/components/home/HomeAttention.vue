<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle, X } from '../../icons'
import TodayPicture from './TodayPicture.vue'

// The desktop home's action centre: what is waiting on this person, and only
// that (the deck's `warn` cards; AppHeroDeck's `spread`). One panel of rows,
// not a card each, so it reads as one list of work.
//
// Each row says how pressing it is — red for something late, amber for
// something waiting or missing (DESIGN.md: red is overdue, amber needs
// attention) — what it is, a line on it, and the one thing to do about it.
// Where one issue covers several records (gatherings not counted, accounts
// asking to be linked, tasks overdue), the row is that issue once, with its
// count, and its records under it as links, the first few shown and the rest
// a tap away; nothing is repeated as a card of its own. The most pressing come
// first; five show, and the rest open in the page rather than in a box that
// scrolls.

const props = defineProps({
  cards: { type: Array, required: true },
  // The deck's own putting-away (AppHeroDeck), and the card fading on its way.
  dismiss: { type: Function, required: true },
  leaving: { type: String, default: null },
  limit: { type: Number, default: 5 },
})

const RANK = { urgent: 0, pending: 1 }
const sorted = computed(() =>
  props.cards
    .map((card, i) => ({ card, i }))
    .sort((a, b) => (RANK[a.card.severity] ?? 1) - (RANK[b.card.severity] ?? 1) || a.i - b.i)
    .map(({ card }) => card)
)

const all = ref(false)
const shown = computed(() => (all.value ? sorted.value : sorted.value.slice(0, props.limit)))

// A row's records: the first three, or all of them once opened.
const RECORDS = 3
const opened = ref(new Set())
const toggle = (key) => {
  const next = new Set(opened.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  opened.value = next
}
const recordsOf = (card) => (opened.value.has(card.key) ? card.records : card.records.slice(0, RECORDS))
const moreOf = (card) => Math.max((card.records?.length || 0) - RECORDS, 0)

const STATUS = {
  urgent: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
}
</script>

<template>
  <section aria-labelledby="home-attention" class="overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
    <header class="flex items-center gap-2.5 px-5 pt-4 pb-3">
      <h2 id="home-attention" class="text-base font-semibold text-gray-900 dark:text-white">Needs attention</h2>
      <span
        v-if="cards.length"
        class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      >
        {{ cards.length }}
      </span>
    </header>

    <p v-if="!cards.length" class="flex items-center gap-2.5 border-t border-gray-100 px-5 py-5 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
      <CheckCircle class="size-5 text-emerald-600 dark:text-emerald-400" />
      Nothing needs you today.
    </p>

    <ul v-else class="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/10 dark:border-white/10">
      <li
        v-for="card in shown"
        :key="card.key"
        class="flex items-start gap-4 px-5 py-4 transition-opacity duration-200"
        :class="card.key === leaving ? 'opacity-0' : ''"
      >
        <TodayPicture :card="card" />

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', STATUS[card.severity] || STATUS.pending]">
              {{ card.kicker }}
            </span>
            <h3 class="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ card.title }}</h3>
          </div>
          <p v-if="card.detail" class="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{{ card.detail }}</p>

          <!-- The records it covers, each a way to the one record. -->
          <ul v-if="card.records?.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <li v-for="record in recordsOf(card)" :key="record.key">
              <RouterLink
                :to="record.to"
                class="inline-flex max-w-60 items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
              >
                <span class="truncate">{{ record.label }}</span>
              </RouterLink>
            </li>
            <li v-if="moreOf(card)">
              <button
                type="button"
                class="rounded-full px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
                :aria-expanded="opened.has(card.key)"
                @click="toggle(card.key)"
              >
                {{ opened.has(card.key) ? 'Show fewer' : `+${moreOf(card)} more` }}
              </button>
            </li>
          </ul>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <RouterLink
            :to="card.to"
            class="rounded-full px-3.5 py-2 text-[13px] font-semibold text-gray-900 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:text-white dark:ring-white/20 dark:hover:bg-white/10"
          >
            {{ card.action || 'Open' }}
            <span v-if="card.destLabel" class="sr-only">, in {{ card.destLabel }}</span>
          </RouterLink>
          <button
            v-if="card.dismissible"
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
            :aria-label="card.remember ? `Put away “${card.title}” until there are more` : `Put away “${card.title}” until the app is opened again`"
            @click="dismiss(card)"
          >
            <X class="size-4" />
          </button>
        </div>
      </li>
    </ul>

    <div v-if="cards.length > limit" class="border-t border-gray-100 px-5 py-3 dark:border-white/10">
      <button
        type="button"
        class="text-sm font-semibold text-primary hover:underline dark:text-primary-light"
        :aria-expanded="all"
        @click="all = !all"
      >
        {{ all ? 'Show fewer' : `Show all ${cards.length}` }}
      </button>
    </div>
  </section>
</template>

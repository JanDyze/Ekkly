<script setup>
import { computed } from 'vue'
import { CheckCircle } from '../../icons'
import AttentionRow from './AttentionRow.vue'

// The desktop home's action centre: what is waiting on this person, and only
// that (the deck's `warn` cards; AppHeroDeck's `spread`). One panel of rows
// (AttentionRow), not a card each, so it reads as one list of work, the most
// pressing first: what is late, then what is waiting.
//
// The home keeps to one screen, so the panel takes the height it is given and
// its rows scroll inside it, every one of them, rather than the page.

const props = defineProps({
  cards: { type: Array, required: true },
  // The deck's own putting-away (AppHeroDeck), and the card fading on its way.
  dismiss: { type: Function, required: true },
  leaving: { type: String, default: null },
})

const RANK = { urgent: 0, pending: 1 }
const sorted = computed(() =>
  props.cards
    .map((card, i) => ({ card, i }))
    .sort((a, b) => (RANK[a.card.severity] ?? 1) - (RANK[b.card.severity] ?? 1) || a.i - b.i)
    .map(({ card }) => card)
)
</script>

<template>
  <section aria-labelledby="home-attention" class="@container flex min-h-0 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
    <header class="flex shrink-0 items-center gap-2.5 border-b border-gray-100 px-5 pt-4 pb-3 dark:border-white/10">
      <h2 id="home-attention" class="text-base font-semibold text-gray-900 dark:text-white">Needs attention</h2>
      <span
        v-if="cards.length"
        class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      >
        {{ cards.length }}
      </span>
    </header>

    <p v-if="!cards.length" class="flex items-center gap-2.5 px-5 py-5 text-sm text-gray-600 dark:text-gray-300">
      <CheckCircle class="size-5 text-emerald-600 dark:text-emerald-400" />
      Nothing needs you today.
    </p>

    <ul v-else class="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain [scrollbar-width:thin] dark:divide-white/10">
      <AttentionRow v-for="card in sorted" :key="card.key" :card="card" :dismiss="dismiss" :leaving="card.key === leaving" />
    </ul>

  </section>
</template>

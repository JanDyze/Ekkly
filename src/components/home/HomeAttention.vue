<script setup>
import { computed, ref, watch } from 'vue'
import { X } from '../../icons'
import AttentionRow from './AttentionRow.vue'
import PanelRest from './PanelRest.vue'
import { useOverColumn } from '../../composables/useOverColumn'
import { useRowsThatFit } from '../../composables/useRowsThatFit'

// The desktop home's action centre: what is waiting on this person, and only
// that (the deck's `warn` cards; AppHeroDeck's `spread`). One panel of rows
// (AttentionRow), not a card each, so it reads as one list of work, the most
// pressing first: what is late, then what is waiting.
//
// The home keeps to one screen, so the panel is the height its column gives
// it (the most of any panel there, as the reason to open the home). The rows
// that fit show whole (useRowsThatFit), never one cut off part way, and under
// them how many more are waiting: pressed, every row opens over the whole
// column (useOverColumn), scrolling there only if the screen is too short
// for them all. With few, it keeps its height, the room left saying so
// (PanelRest).

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

const rowsBox = ref(null)
const { shown } = useRowsThatFit(rowsBox)
const more = computed(() => props.cards.length - shown.value)

const all = ref(false)
const sheet = ref(null)
const opener = ref(null)
const { style: sheetStyle, shown: sheetShown, close } = useOverColumn(sheet, all, opener)
// Closed once there is nothing more to see.
watch(more, (now) => {
  if (now <= 0) close()
})
</script>

<template>
  <section aria-labelledby="home-attention" class="@container flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
    <header class="flex shrink-0 items-center gap-2.5 border-b border-gray-100 px-5 pt-2.5 pb-2 dark:border-white/10">
      <h2 id="home-attention" class="text-sm font-semibold text-gray-900 dark:text-white">Needs attention</h2>
      <span
        v-if="cards.length"
        class="rounded-full bg-amber-100 px-1.5 py-px text-[11px] font-bold tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      >
        {{ cards.length }}
      </span>
    </header>

    <PanelRest v-if="!cards.length" doodle="tea" title="All clear!" line="Nothing needs you today. Time for the people, not the paperwork." />

    <template v-else>
      <ul ref="rowsBox" class="min-h-0 divide-y divide-gray-100 overflow-hidden dark:divide-white/10">
        <AttentionRow v-for="card in sorted" :key="card.key" :card="card" :dismiss="dismiss" :leaving="card.key === leaving" />
      </ul>
      <button
        v-if="more > 0"
        ref="opener"
        type="button"
        class="mt-auto shrink-0 border-t border-gray-100 px-5 py-2 text-left text-xs font-semibold text-primary hover:underline dark:border-white/10 dark:text-primary-light"
        :aria-expanded="all"
        @click="all = !all"
      >
        {{ more }} more
      </button>
      <PanelRest v-if="cards.length <= 3 && !more" few doodle="tea" :title="cards.length === 1 ? 'Just this one.' : 'That’s all that’s waiting.'" />
    </template>

  </section>

  <!-- Every row, over the whole column, the panels under it covered rather
       than moved (useOverColumn). -->
  <section
    v-if="sheetShown"
    ref="sheet"
    tabindex="-1"
    role="dialog"
    aria-labelledby="home-attention-all"
    :style="sheetStyle"
    :class="[
      'absolute inset-x-0 z-40 flex flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/10 outline-none dark:bg-gray-900 dark:ring-white/15',
      sheetStyle ? '' : 'invisible',
    ]"
  >
    <header class="flex shrink-0 items-center gap-2.5 border-b border-gray-100 py-2 pr-2 pl-5 dark:border-white/10">
      <h2 id="home-attention-all" class="text-sm font-semibold text-gray-900 dark:text-white">Needs attention</h2>
      <span class="rounded-full bg-amber-100 px-1.5 py-px text-[11px] font-bold tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
        {{ cards.length }}
      </span>
      <button
        type="button"
        class="ml-auto flex size-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Show fewer"
        title="Show fewer"
        @click="close"
      >
        <X class="size-4" />
      </button>
    </header>
    <ul class="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain [scrollbar-width:thin] dark:divide-white/10">
      <AttentionRow v-for="card in sorted" :key="card.key" :card="card" :dismiss="dismiss" :leaving="card.key === leaving" />
    </ul>
  </section>
</template>

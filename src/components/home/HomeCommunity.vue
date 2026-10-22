<script setup>
import { computed, ref, watch } from 'vue'
import { X } from '../../icons'
import CommunityRow from './CommunityRow.vue'
import PanelRest from './PanelRest.vue'
import { useOverColumn } from '../../composables/useOverColumn'
import { useRowsThatFit } from '../../composables/useRowsThatFit'

// The desktop home's community: what is good to know rather than waiting on
// anyone — whose birthday it is, when you are serving, who came for the first
// time, the tasks due today (the deck's cards that are not `warn`;
// AppHeroDeck's `spread`). Set under the action centre and quieter than it:
// one light panel of compact items, two across where there is room, the
// church's colour only in the line naming a celebration, so none of it reads
// as urgent. The items that fit its share of the column show whole
// (useRowsThatFit), and under them how many more, which opens every item over
// the whole column (useOverColumn), as Needs attention does; with little in
// it, it keeps its height, the room left saying so (PanelRest).

const props = defineProps({
  cards: { type: Array, required: true },
  dismiss: { type: Function, required: true },
  leaving: { type: String, default: null },
  // The line under a card's headline, as the home words it (Apps.vue).
  detailOf: { type: Function, default: (card) => card.detail },
})

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
  <section aria-labelledby="home-community" class="@container flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white/95 p-2 ring-1 ring-black/5 dark:bg-gray-900/90 dark:ring-white/10">
    <header class="flex shrink-0 items-center gap-2.5 px-3 pt-2 pb-1.5">
      <h2 id="home-community" class="text-sm font-semibold text-gray-900 dark:text-white">Community</h2>
      <span v-if="cards.length" class="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">
        {{ cards.length }}
      </span>
    </header>

    <PanelRest v-if="!cards.length" doodle="bench" title="A quiet day" line="No birthdays, first visits or serving today." />

    <ul v-else ref="rowsBox" class="grid min-h-0 grid-cols-1 content-start gap-0.5 overflow-hidden @2xl:grid-cols-2">
      <CommunityRow v-for="card in cards" :key="card.key" :card="card" :dismiss="dismiss" :leaving="leaving" :detail-of="detailOf" />
    </ul>
    <button
      v-if="cards.length && more > 0"
      ref="opener"
      type="button"
      class="mt-auto shrink-0 px-3 pt-1.5 pb-1 text-left text-xs font-semibold text-primary hover:underline dark:text-primary-light"
      :aria-expanded="all"
      @click="all = !all"
    >
      {{ more }} more
    </button>
    <PanelRest v-if="cards.length && cards.length <= 3 && !more" few doodle="bench" title="That’s all for today." />
  </section>

  <!-- Every item, over the whole column, the panels under it covered rather
       than moved (useOverColumn). -->
  <section
    v-if="sheetShown"
    ref="sheet"
    tabindex="-1"
    role="dialog"
    aria-labelledby="home-community-all"
    :style="sheetStyle"
    :class="[
      '@container absolute inset-x-0 z-40 flex flex-col overflow-hidden rounded-[24px] bg-white p-2 ring-1 ring-black/10 outline-none dark:bg-gray-900 dark:ring-white/15',
      sheetStyle ? '' : 'invisible',
    ]"
  >
    <header class="flex shrink-0 items-center gap-2.5 pt-1 pr-0 pb-1 pl-3">
      <h2 id="home-community-all" class="text-sm font-semibold text-gray-900 dark:text-white">Community</h2>
      <span class="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">
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
    <ul class="grid min-h-0 flex-1 grid-cols-1 content-start gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:thin] @2xl:grid-cols-2">
      <CommunityRow v-for="card in cards" :key="card.key" :card="card" :dismiss="dismiss" :leaving="leaving" :detail-of="detailOf" />
    </ul>
  </section>
</template>

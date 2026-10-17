<script setup>
import { RouterLink } from 'vue-router'
import { X } from '../../icons'
import PanelRest from './PanelRest.vue'
import TodayPicture from './TodayPicture.vue'

// The desktop home's community: what is good to know rather than waiting on
// anyone — whose birthday it is, when you are serving, who came for the first
// time, the tasks due today (the deck's cards that are not `warn`;
// AppHeroDeck's `spread`). Set under the action centre and quieter than it:
// one light panel of compact items, two across where there is room, the
// church's colour only in the line naming a celebration, so none of it reads
// as urgent. Where there is more than the panel's share of the column, it
// scrolls inside the panel, never the page; with little in it, it keeps its
// height, the room left saying so (PanelRest).

const props = defineProps({
  cards: { type: Array, required: true },
  dismiss: { type: Function, required: true },
  leaving: { type: String, default: null },
  // The line under a card's headline, as the home words it (Apps.vue).
  detailOf: { type: Function, default: (card) => card.detail },
})
</script>

<template>
  <section aria-labelledby="home-community" class="@container flex min-h-0 flex-1 flex-col rounded-[24px] bg-white/95 p-2 ring-1 ring-black/5 dark:bg-gray-900/90 dark:ring-white/10">
    <header class="flex shrink-0 items-center gap-2.5 px-3 pt-2 pb-1.5">
      <h2 id="home-community" class="text-base font-semibold text-gray-900 dark:text-white">Community</h2>
      <span v-if="cards.length" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">
        {{ cards.length }}
      </span>
    </header>

    <PanelRest v-if="!cards.length" doodle="bench" title="A quiet day" line="No birthdays, first visits or serving today." />

    <ul v-else :class="['grid min-h-0 grid-cols-1 content-start gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:thin] @2xl:grid-cols-2', cards.length <= 3 ? 'shrink-0' : 'flex-1']">
      <li
        v-for="card in cards"
        :key="card.key"
        class="group/row relative min-w-0 transition-opacity duration-200"
        :class="card.key === leaving ? 'opacity-0' : ''"
      >
        <component
          :is="card.to ? RouterLink : 'div'"
          :to="card.to || undefined"
          class="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-gray-900/[0.04] dark:hover:bg-white/[0.06]"
          :class="card.dismissible ? 'pr-10' : ''"
        >
          <TodayPicture :card="card" size="sm" />
          <span class="min-w-0 flex-1">
            <span
              :class="[
                'block truncate text-xs font-semibold',
                card.tone === 'celebrate' ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
              ]"
            >
              {{ card.kicker }}
            </span>
            <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ card.title }}</span>
            <span v-if="detailOf(card)" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ detailOf(card) }}</span>
          </span>
          <span v-if="card.to && card.destLabel" class="sr-only">Opens {{ card.destLabel }}</span>
        </component>
        <button
          v-if="card.dismissible"
          type="button"
          class="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-900/5 hover:text-gray-700 focus-visible:opacity-100 group-hover/row:opacity-100 dark:hover:bg-white/10 dark:hover:text-gray-200 [@media(hover:hover)]:opacity-0"
          :aria-label="`Put away “${card.title}” until the app is opened again`"
          @click="dismiss(card)"
        >
          <X class="size-3.5" />
        </button>
      </li>
    </ul>
    <PanelRest v-if="cards.length && cards.length <= 3" few doodle="bench" title="That’s all for today." />
  </section>
</template>

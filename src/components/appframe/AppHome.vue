<script setup>
import { X } from '../../icons'
import AppScreen from './AppScreen.vue'
import AppHeroDeck from './AppHeroDeck.vue'
import AppShortcuts from './AppShortcuts.vue'
import PanelRest from '../home/PanelRest.vue'
import { useMediaQuery } from '../../composables/useMediaQuery'

// An app's home: on a phone, its deck over its sections (the standard every
// app keeps, CLAUDE.md "Adding an app"); on a desktop, a board laid out the
// way the home of all apps is (Apps.vue), so going into an app looks like
// going one room further into the same building.
//
// On a desktop nothing has to hide behind a swipe, and like the home it keeps
// to one screen: the page never scrolls, and a panel with more than it holds
// scrolls inside itself. To begin with, as the home's left column reads:
//
//   1. The sidebar: the card that is always true (the roll, the next Sunday,
//      the month's books) in the church's colour at its top, as the home's
//      day card is, and the app's sections under it in a white panel, in the
//      style chosen (AppShortcuts' `column`), as the home's apps are.
//   2. The work: what is waiting on someone (the deck's `warn` cards) in
//      Needs attention, and everything else worth knowing under it. Each is
//      the phone's own card, not a plainer line: the faces, the bars and the
//      dates are what make them read (the cards' pictures are the point), so
//      a desktop keeps them, two or three across where there is room.
//   3. Where the app has something it would show beside the work (the week's
//      events, the next Sunday's line-up), a third column of its own (`side`).
//
// The cards are the app's own, drawn by its `card` slot as the deck draws
// them, so an app moves to this by handing over what it handed the deck.

defineProps({
  cards: { type: Array, required: true },
  // Which app's dismissals these are (AppHeroDeck's `scope`).
  scope: { type: String, required: true },
  // The deck's name for a screen reader, "People today".
  label: { type: String, required: true },
  // The sections (AppShortcuts' `doors`), and the app's name for them.
  doors: { type: Array, required: true },
  name: { type: String, required: true },
})

const wide = useMediaQuery('(min-width: 1024px)')

// The tones the dismiss button sits on in white (as the deck's does).
const DISMISS_LIGHT = ['accent', 'celebrate']
</script>

<template>
  <AppScreen :board="wide">
    <div v-if="!wide" class="flex flex-col gap-4">
      <AppHeroDeck :cards="cards" :scope="scope" :label="label" >
        <template #card="slot">
          <slot name="card" v-bind="slot" />
        </template>
      </AppHeroDeck>
      <AppShortcuts :doors="doors" :label="name" />
    </div>

    <AppHeroDeck v-else :cards="cards" :scope="scope" :label="label" spread>
      <template #spread="{ urgent, rest, hero, dismiss, leaving }">
        <div
          :class="[
            'grid h-full min-h-0 gap-5',
            $slots.side
              ? 'grid-cols-[minmax(17rem,1fr)_minmax(0,2fr)_minmax(16rem,1fr)]'
              : 'grid-cols-[minmax(17rem,1fr)_minmax(0,3fr)]',
          ]"
        >
          <!-- 1. The sidebar: the card that is always true, then the doors. -->
          <aside class="flex min-h-0 flex-col gap-5" :aria-label="name">
            <div v-if="hero" class="shrink-0">
              <slot name="card" :card="hero" :top="true" />
            </div>
            <section
              :aria-labelledby="`${scope}-sections`"
              class="flex min-h-[9rem] flex-1 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-800/70 dark:ring-white/10"
            >
              <header class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 pt-2.5 pb-2 dark:border-white/10">
                <h2 :id="`${scope}-sections`" class="text-sm font-semibold text-gray-900 dark:text-white">Sections</h2>
              </header>
              <div class="min-h-0 overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin]">
                <AppShortcuts :doors="doors" :label="name" column />
              </div>
            </section>
          </aside>

          <!-- 2. The work: what is waiting on someone, then what is good to
               know, each the phone's own card. -->
          <div class="flex min-h-0 flex-col gap-5">
            <section
              v-for="panel in [
                { id: 'attention', title: 'Needs attention', cards: urgent, doodle: 'tea', fit: 'flex-[1_0.5_auto]' },
                { id: 'rest', title: 'Good to know', cards: rest, doodle: 'bench', fit: 'flex-[1_1_auto]' },
              ]"
              :key="panel.id"
              :aria-labelledby="`${scope}-${panel.id}`"
              :class="[
                '@container flex min-h-[9rem] flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-800/70 dark:ring-white/10',
                panel.fit,
              ]"
            >
              <header class="flex shrink-0 items-center gap-2.5 border-b border-gray-100 px-5 pt-2.5 pb-2 dark:border-white/10">
                <h2 :id="`${scope}-${panel.id}`" class="text-sm font-semibold text-gray-900 dark:text-white">{{ panel.title }}</h2>
                <span
                  v-if="panel.cards.length"
                  :class="[
                    'rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums',
                    panel.id === 'attention'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
                  ]"
                >
                  {{ panel.cards.length }}
                </span>
              </header>

              <PanelRest
                v-if="!panel.cards.length"
                :doodle="panel.doodle"
                :title="panel.id === 'attention' ? 'All clear!' : 'A quiet day'"
                :line="panel.id === 'attention' ? `Nothing in ${name} needs you today.` : `Nothing new in ${name} today.`"
              />

              <template v-else>
                <!-- As tall as its cards, giving way to a scroll where the
                     column is short; the room under a few is the doodle's. -->
                <ul
                  class="grid min-h-0 flex-[0_1_auto] grid-cols-1 content-start gap-3 overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin] @xl:grid-cols-2 @6xl:grid-cols-3"
                >
                  <li
                    v-for="card in panel.cards"
                    :key="card.key"
                    class="relative min-w-0 transition-opacity duration-200"
                    :class="card.key === leaving ? 'opacity-0' : ''"
                  >
                    <slot name="card" :card="card" :top="true" />
                    <button
                      v-if="card.dismissible"
                      type="button"
                      :class="[
                        'absolute right-3 top-3 flex size-8 items-center justify-center rounded-full transition-colors',
                        DISMISS_LIGHT.includes(card.tone)
                          ? 'bg-white/15 text-white hover:bg-white/25'
                          : 'bg-gray-900/5 text-gray-500 hover:bg-gray-900/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15',
                      ]"
                      :aria-label="card.remember ? `Put away “${card.title}” until there are more` : `Put away “${card.title}” until the app is opened again`"
                      @click="dismiss(card)"
                    >
                      <X class="size-4" />
                    </button>
                  </li>
                </ul>
                <PanelRest
                  few
                  :doodle="panel.doodle"
                  :title="panel.cards.length === 1 ? 'Just this one.' : 'That’s all for now.'"
                />
              </template>
            </section>
          </div>

          <!-- 3. Whatever the app shows beside the work. -->
          <div v-if="$slots.side" class="flex min-h-0 flex-col gap-5">
            <slot name="side" />
          </div>
        </div>
      </template>
    </AppHeroDeck>
  </AppScreen>
</template>

<script setup>
import { RouterLink } from 'vue-router'

// One card of a deck as a small card of its own, for the columns a deck
// becomes on a desktop (AppHeroDeck's `spread`): every card is on show at
// once, stacked in its column, and each is the phone's card made small rather
// than a plain line, so the desktop is not a lesser version of the phone. The
// same tones (DeckCard's): pale amber with an amber edge for something waiting
// on you, the church's colour for somebody's day, white for the rest; the same
// label in a pill over a bold headline and a line under it; and on the left
// the card's picture (`leading`: the faces or the photo it is about, the date,
// or failing those its icon).
//
// A column a third of a screen wide cuts a long headline or detail short, so
// resting on a card grows it, where it stands, into the phone's full card
// (AppHeroDeck's `full`), pushing the cards under it down.

defineProps({
  tone: { type: String, default: 'plain' },
  icon: { type: [Object, Function], default: null },
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  // Room at the top right for the dismiss button.
  inset: { type: Boolean, default: false },
  // Where the click goes, for a screen reader (as DeckCard's).
  dest: { type: String, default: '' },
  destLabel: { type: String, default: '' },
})

// DeckCard's tones, card for card, so a card here is the phone's in small.
const SURFACES = {
  accent: 'deck-filled text-white border-black/15 dark:border-black/40',
  celebrate: 'deck-filled text-white border-black/15 dark:border-black/40',
  warn: 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-gray-800 dark:text-white dark:border-amber-500/50',
  plain: 'bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700',
}

const HOVERS = {
  accent: 'hover:border-black/35 dark:hover:border-black/60',
  celebrate: 'hover:border-black/35 dark:hover:border-black/60',
  warn: 'hover:bg-amber-100 dark:hover:bg-gray-700',
  plain: 'hover:bg-gray-50 dark:hover:bg-gray-700',
}

const KICKERS = {
  accent: 'bg-white/18 text-white',
  celebrate: 'bg-white/18 text-white',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  plain: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
}

const DETAILS = {
  accent: 'text-white/75',
  celebrate: 'text-white/80',
  warn: 'text-amber-800 dark:text-gray-400',
  plain: 'text-gray-500 dark:text-gray-400',
}

const CHIPS = {
  accent: 'bg-white/18 text-white',
  celebrate: 'bg-white/18 text-white',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  plain: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
}

</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    draggable="false"
    :class="[
      'group flex min-w-0 items-center gap-3 rounded-[20px] border px-3.5 py-2.5 transition-colors duration-200 ease-out',
      SURFACES[tone] || SURFACES.plain,
      to ? HOVERS[tone] || HOVERS.plain : '',
      inset ? 'pr-10' : '',
    ]"
  >
    <slot name="leading">
      <span :class="['flex size-11 shrink-0 items-center justify-center rounded-2xl', CHIPS[tone] || CHIPS.plain]">
        <component :is="icon" v-if="icon" class="size-5" />
      </span>
    </slot>

    <span class="block min-w-0 flex-1">
      <span
        v-if="kicker"
        :class="['inline-flex max-w-full rounded-full px-2 py-0.5 text-[11px] font-semibold', KICKERS[tone] || KICKERS.plain]"
      >
        <span class="truncate">{{ kicker }}</span>
      </span>
      <span class="mt-1 block truncate text-[15px] font-bold leading-snug tracking-tight">{{ title }}</span>
      <span v-if="detail" :class="['mt-0.5 block truncate text-[13px]', DETAILS[tone] || DETAILS.plain]">{{ detail }}</span>
    </span>

    <slot name="trailing" />

    <span v-if="to && destLabel" class="sr-only">Opens {{ destLabel }}</span>
  </component>
</template>

<style scoped>
.deck-filled {
  background-color: var(--color-primary);
}

/* On a dark page the accent token is its lighter shade, made to be read as
   text on dark, and white words on it all but disappear: the card goes deeper
   instead, as DeckCard's does. */
.dark .deck-filled {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

<script setup>
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import AppArt from '../common/AppArt.vue'

// One card of a deck told as a row, for the list a deck becomes on a desktop
// (AppHeroDeck's `spread`): however many cards there are, every one is on show
// at once, in the deck's order. The deck card's parts, kept to one line at
// least 64px tall — its icon (or the date, through `leading`), its headline,
// its label and the line under it, the small picture it is about at the right
// (faces, through `trailing`), and the app the click opens. As tall as its
// place in the list, which shares out the height beside the day's card.
//
// Tones as DeckCard's, quieter, because a list of them sits beside the one
// card in the church's colour: warn is pale amber, celebrate wears that colour
// in its icon alone, and plain is white.

defineProps({
  tone: { type: String, default: 'plain' },
  icon: { type: [Object, Function], default: null },
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  // Room at the right for the list's dismiss button.
  inset: { type: Boolean, default: false },
  // Where the click goes: that place's artwork, and its name for a screen
  // reader (as DeckCard's).
  dest: { type: String, default: '' },
  destLabel: { type: String, default: '' },
})

const TONES = {
  warn: 'bg-amber-50 ring-amber-200 dark:bg-gray-800 dark:ring-amber-500/40',
  plain: 'bg-white ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
}

// Only a row that goes somewhere answers the pointer.
const HOVERS = {
  warn: 'hover:bg-amber-100 dark:hover:bg-gray-700',
  plain: 'hover:bg-gray-50 dark:hover:bg-gray-700',
}

const CHIPS = {
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  celebrate: 'bg-primary text-white dark:bg-primary-light dark:text-gray-900',
  plain: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
}

const KICKERS = {
  warn: 'text-amber-800 dark:text-amber-300',
  plain: 'text-primary dark:text-primary-light',
}
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    draggable="false"
    :class="[
      'group flex h-full min-h-16 min-w-0 items-center gap-3 rounded-2xl px-3 ring-1 transition-colors duration-200',
      TONES[tone] || TONES.plain,
      to ? HOVERS[tone] || HOVERS.plain : '',
      inset ? 'pr-12' : '',
    ]"
  >
    <slot name="leading">
      <span :class="['flex size-10 shrink-0 items-center justify-center rounded-xl', CHIPS[tone] || CHIPS.plain]">
        <component :is="icon" v-if="icon" class="size-5" />
      </span>
    </slot>

    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ title }}</span>
      <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
        <span v-if="kicker" :class="['font-semibold', KICKERS[tone] || KICKERS.plain]">{{ kicker }}</span>
        <template v-if="kicker && detail"> · </template>{{ detail }}
      </span>
    </span>

    <slot name="trailing" />

    <span v-if="to" class="flex shrink-0 items-center gap-1">
      <AppArt v-if="dest" :app-key="dest" class="size-5" />
      <span v-if="destLabel" class="sr-only">Opens {{ destLabel }}</span>
      <ChevronRight
        aria-hidden="true"
        class="size-4 text-gray-300 transition-transform duration-300 group-hover:translate-x-0.5 dark:text-gray-600"
      />
    </span>
  </component>
</template>

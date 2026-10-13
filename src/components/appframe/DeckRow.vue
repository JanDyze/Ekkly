<script setup>
import { RouterLink } from 'vue-router'

// One card of a deck told as a line, for the list a deck becomes on a desktop
// (AppHeroDeck's `spread`): however many cards there are, every one is on show
// at once, in the deck's order, without ten boxes competing. The deck card's
// parts, kept to one line — its icon (or the date, through `leading`), its
// headline, the line under it with its label, the faces it is about small at
// the right (through `trailing`), and the app the click opens.
//
// The lines share one panel, so a line is not a box of its own: no fill and
// no ring, only a shade on hover, which is all that says it is a link. Its
// tone is in its icon alone: amber for something waiting on you, the church's
// colour for somebody's day, quiet grey for the rest, so the few that need you
// are the ones that stand out. It had the app it opens drawn small at its
// right as well: two pictures a line, sixteen in eight lines, and the second
// told nobody anything they needed to choose, so where it goes is said only
// to a screen reader.

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

const CHIPS = {
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  celebrate: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  plain: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300',
}

const KICKERS = {
  warn: 'text-amber-700 dark:text-amber-300',
  plain: 'text-gray-500 dark:text-gray-400',
}
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    draggable="false"
    :class="[
      'group flex min-h-15 min-w-0 items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors duration-150',
      to ? 'hover:bg-gray-900/[0.04] focus-visible:bg-gray-900/[0.04] dark:hover:bg-white/[0.06]' : '',
      inset ? 'pr-10' : '',
    ]"
  >
    <slot name="leading">
      <span :class="['flex size-9 shrink-0 items-center justify-center rounded-xl', CHIPS[tone] || CHIPS.plain]">
        <component :is="icon" v-if="icon" class="size-[18px]" />
      </span>
    </slot>

    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ title }}</span>
      <span class="mt-0.5 block truncate text-[13px] text-gray-500 dark:text-gray-400">
        <span v-if="kicker" :class="['font-medium', KICKERS[tone] || KICKERS.plain]">{{ kicker }}</span>
        <template v-if="kicker && detail"> · </template>{{ detail }}
      </span>
    </span>

    <slot name="trailing" />

    <span v-if="to && destLabel" class="sr-only">Opens {{ destLabel }}</span>
  </component>
</template>

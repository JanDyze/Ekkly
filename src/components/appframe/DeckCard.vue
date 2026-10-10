<script setup>
import { Comment, computed, useSlots } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import AppArt from '../common/AppArt.vue'

// One card of an app's deck (AppHeroDeck): the shell every kind of card shares
// — a small label with its icon, one sentence large, a quieter line under it,
// and room at the foot for the one picture that card is about (faces, a bar,
// a date). What makes the cards different from one another is that picture
// and the tone, never the type or the spacing, so a deck of six still reads as
// one thing.
//
// Tones, from loudest to quietest:
//   accent    — the church's colour, flat. The card that is always there,
//               and the one a deck ends on.
//   celebrate — the same colour, with confetti inside a dashed frame, like
//               an invitation. Somebody's day.
//   warn      — pale amber. Someone is waiting on you.
//   plain     — white. Worth knowing, no hurry.
// Accent and celebrate are both the primary token, so a church that changes
// its colours changes them with it.

const props = defineProps({
  tone: { type: String, default: 'plain' },
  icon: { type: [Object, Function], default: null },
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  // A card whose tap does something here rather than going somewhere (opens a
  // sheet): a button, with the click passed straight through to it.
  action: { type: Boolean, default: false },
  // Room at the top right for the deck's dismiss button.
  inset: { type: Boolean, default: false },
  // Where the card leads, for a deck whose cards lead into different apps (the
  // home of all apps): the artwork of the app or section it opens, by name,
  // and that place's name for a screen reader.
  dest: { type: String, default: '' },
  destLabel: { type: String, default: '' },
})

// A foot whose only content is switched off by a `v-if` still arrives as a
// slot, and would leave an empty band at the bottom of the card; it counts
// only when something in it renders.
const slots = useSlots()
const tappable = computed(() => Boolean(props.to || props.action))
const hasFoot = () => (slots.default?.() || []).some((node) => node.type !== Comment)

// Every card is the same height, a share of the screen it is on, so a deck
// does not change size as it turns and a short card is never a tall card with
// a hole in it. Nothing in a card is ever cut off to make it fit: the height
// is chosen to hold the fullest card there is (the Attendance and Schedules
// cards, a two-line headline over a picture and its caption, come to 212px),
// and the only give is in the words — the headline stops at two lines and the
// line under it at one, each with an ellipsis. A new kind of card has to fit
// in 216px the same way, by what it puts in, not by being clipped.
const HEIGHT = 'h-[26dvh] min-h-54 max-h-64'

// Every card is a rounded card in a hand of them (AppHeroDeck fans the ones
// underneath out to either side): a fine edge in a deeper shade of its own
// colour, and nothing under it: no shadow, so the deck stays flat and the
// edge alone sets the top card off from the ones behind. On the church's colour the edge is black laid thin over it,
// which is a deeper shade of whatever colour the church chose. The edge used
// to be 4px along the foot; at 1px all round the card keeps that room.
const TONES = {
  accent: 'deck-filled text-white border-black/15 dark:border-black/40',
  celebrate: 'deck-filled text-white border-black/15 dark:border-black/40',
  warn: 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-gray-800 dark:text-white dark:border-amber-500/50',
  plain: 'bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700',
}

// The label is a pill in the card's own tone: the church's colour on a white
// card, white on the church's colour, amber on amber.
const KICKERS = {
  accent: 'bg-white/18 text-white',
  celebrate: 'bg-white/18 text-white',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  plain: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
}

// The destination's artwork, beside the chevron, in its own colours: it is
// the same app as the tile it opens, and should be recognised as that at a
// glance. A flat, faint copy in the card's ink read as decoration instead.
//
// On the church's colour it sits on a small white chip. The orange and blue
// muddy against any church's colour, and these cards already carry artwork
// that way (the cake on a birthday, the church's logo).
const FILLED = ['accent', 'celebrate']

// A tappable card answers a pointer or a finger with its colour, a shade
// deeper, rather than by shrinking or lifting. Every shade is solid: the
// cards are stacked, and a see-through hover shows the card behind it.
const HOVERS = {
  accent: 'hover:border-black/35 dark:hover:border-black/60',
  celebrate: 'hover:border-black/35 dark:hover:border-black/60',
  warn: 'hover:bg-amber-100 dark:hover:bg-gray-700',
  plain: 'hover:bg-gray-50 dark:hover:bg-gray-700',
}

const DETAILS = {
  accent: 'text-white/75',
  celebrate: 'text-white/80',
  warn: 'text-amber-800 dark:text-gray-400',
  plain: 'text-gray-500 dark:text-gray-400',
}
</script>

<template>
  <component
    :is="to ? RouterLink : action ? 'button' : 'section'"
    :to="to || undefined"
    :type="action && !to ? 'button' : undefined"
    draggable="false"
    :class="[
      'group relative isolate flex flex-col rounded-[28px] border px-4 pb-3 pt-[15px]',
      HEIGHT,
      TONES[tone] || TONES.plain,
      tappable ? ['transition-colors duration-200 ease-out', HOVERS[tone] || HOVERS.plain] : '',
      action && !to ? 'w-full text-left' : '',
    ]"
  >
    <!-- Whatever the card draws behind its words: confetti, rings. Only this
         is trimmed to the card's corners; the words never are. -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <slot name="art" />
    </div>

    <div :class="['flex items-start gap-4', inset ? 'pr-9' : '']">
      <slot name="leading" />
      <div class="min-w-0 flex-1">
        <p v-if="kicker" :class="['inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold', KICKERS[tone] || KICKERS.plain]">
          <component :is="icon" v-if="icon" class="size-4 shrink-0" />
          <span class="truncate">{{ kicker }}</span>
        </p>
        <h2 class="mt-1 line-clamp-2 text-[22px] font-bold leading-tight tracking-tight">
          <slot name="title">{{ title }}</slot>
        </h2>
        <p v-if="detail" :class="['mt-1 truncate text-sm', DETAILS[tone] || DETAILS.plain]">{{ detail }}</p>
      </div>
      <slot name="trailing" />
    </div>

    <!-- The card's own picture, kept to the foot so every card's words start
         in the same place however tall the deck is. -->
    <div v-if="hasFoot()" :class="['mt-auto pt-3', tappable ? (dest ? 'pr-19' : 'pr-7') : '']">
      <slot />
    </div>

    <!-- Where the tap goes, before it is made: the place's own artwork, then
         the chevron that says it goes. -->
    <span v-if="tappable" class="absolute bottom-4 right-4 flex h-5 items-center gap-1.5">
      <span
        v-if="dest && FILLED.includes(tone)"
        class="flex size-8 items-center justify-center rounded-[10px] bg-white ring-1 ring-black/10"
      >
        <AppArt :app-key="dest" class="size-6" />
      </span>
      <AppArt
        v-else-if="dest"
        :app-key="dest"
        class="size-6"
      />
      <span v-if="destLabel" class="sr-only">Opens {{ destLabel }}</span>
      <ChevronRight
        aria-hidden="true"
        :class="[
          'size-5 transition-transform duration-300 group-engaged:translate-x-1',
          tone === 'accent' || tone === 'celebrate' ? 'text-white/60' : 'text-gray-300 dark:text-gray-600',
        ]"
      />
    </span>
  </component>
</template>

<style scoped>
.deck-filled {
  background-color: var(--color-primary);
}

/* On a dark page the accent token is its lighter shade, made to be read as
   text on dark, and white words on it all but disappear. The card goes deeper
   instead: the same hue, mixed down toward black (as AppHero does). */
.dark .deck-filled {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

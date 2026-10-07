<script setup>
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'

// One card of an app's deck (AppHeroDeck): the shell every kind of card shares
// — a small label with its icon, one sentence large, a quieter line under it,
// and room at the foot for the one picture that card is about (faces, a bar,
// a date). What makes the cards different from one another is that picture
// and the tone, never the type or the spacing, so a deck of six still reads as
// one thing.
//
// Tones, from loudest to quietest:
//   accent    — the church's colour, with a soft light across it. The card
//               that is always there, and the one a deck ends on.
//   celebrate — the same colour, with confetti. Somebody's day.
//   warn      — pale amber. Someone is waiting on you.
//   plain     — white. Worth knowing, no hurry.
// Accent and celebrate are both the primary token, so a church that changes
// its colours changes them with it.

defineProps({
  tone: { type: String, default: 'plain' },
  icon: { type: [Object, Function], default: null },
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  // Room at the top right for the deck's dismiss button.
  inset: { type: Boolean, default: false },
})

const TONES = {
  // The filled cards stand up off the page on a shadow of their own colour,
  // so the deck is the first thing on the home and the tiles under it second.
  accent: 'deck-filled deck-glow text-white shadow-xl shadow-primary/30',
  celebrate: 'deck-filled text-white shadow-xl shadow-primary/30',
  warn: 'bg-amber-50 text-amber-950 ring-1 ring-amber-200 dark:bg-gray-800 dark:text-white dark:ring-amber-500/40',
  plain: 'bg-white text-gray-900 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:text-white dark:ring-gray-700/80',
}

const KICKERS = {
  accent: 'text-white/75',
  celebrate: 'text-white/80',
  warn: 'text-amber-700 dark:text-amber-400',
  plain: 'text-primary dark:text-primary-light',
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
    :is="to ? RouterLink : 'section'"
    :to="to || undefined"
    draggable="false"
    :class="[
      'group relative isolate flex h-full min-h-48 flex-col overflow-hidden rounded-3xl p-5',
      TONES[tone] || TONES.plain,
      to ? 'transition-transform duration-200 ease-out pressed:scale-[0.99]' : '',
    ]"
  >
    <!-- Whatever the card draws behind its words: confetti, rings. -->
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <slot name="art" />
    </div>

    <div :class="['flex items-start gap-4', inset ? 'pr-9' : '']">
      <slot name="leading" />
      <div class="min-w-0 flex-1">
        <p v-if="kicker" :class="['flex items-center gap-1.5 text-[13px] font-semibold', KICKERS[tone] || KICKERS.plain]">
          <component :is="icon" v-if="icon" class="size-4 shrink-0" />
          <span class="truncate">{{ kicker }}</span>
        </p>
        <h2 class="mt-1 text-[22px] font-bold leading-tight tracking-tight">
          <slot name="title">{{ title }}</slot>
        </h2>
        <p v-if="detail" :class="['mt-1 text-sm', DETAILS[tone] || DETAILS.plain]">{{ detail }}</p>
      </div>
      <slot name="trailing" />
    </div>

    <!-- The card's own picture, kept to the foot so every card's words start
         in the same place however tall the deck is. -->
    <div v-if="$slots.default" :class="['mt-auto pt-4', to ? 'pr-7' : '']">
      <slot />
    </div>

    <ChevronRight
      v-if="to"
      aria-hidden="true"
      :class="[
        'absolute bottom-5 right-4 size-5 transition-transform duration-300 group-engaged:translate-x-1',
        tone === 'accent' || tone === 'celebrate' ? 'text-white/60' : 'text-gray-300 dark:text-gray-600',
      ]"
    />
  </component>
</template>

<style scoped>
.deck-filled {
  background-color: var(--color-primary);
}

/* Light falling across the card from its top corner, and the far corner a
   shade deeper: enough that the colour has depth rather than being a flat
   swatch, and quiet enough that white words on it stay easy to read. */
.deck-glow {
  background-image:
    radial-gradient(110% 130% at 100% 0%, color-mix(in oklab, white 24%, transparent), transparent 55%),
    radial-gradient(90% 110% at 0% 100%, color-mix(in oklab, black 22%, transparent), transparent 60%);
}

/* On a dark page the accent token is its lighter shade, made to be read as
   text on dark, and white words on it all but disappear. The card goes deeper
   instead: the same hue, mixed down toward black (as AppHero does). */
:global(.dark) .deck-filled {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

<script setup>
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import AppArt from '../common/AppArt.vue'

// The first card of an app's home, and its header.
//
// It greets whoever opened it and leads with one
// sentence that is true today — "You're ushering this Sunday", not "Schedules"
// — so the screen answers the question most visits are before anything is
// tapped. A row of segments under it shows progress where an app has some to
// show, and the app's own artwork sits faint and oversized in the corner.
//
// Where the sentence is about one thing — this Sunday — the card is that
// thing: given `to`, the whole card opens it, and the default slot carries
// what is worth knowing about it before it is opened, so the first card on
// the screen is never just a caption for the one below it.
//
// It does not name the app or carry the way out: Ekkly's top bar stays above
// every app and does both, so the card can start with the person.
//
// The church's own colour, from the primary token, so a church that changes
// its colours changes every app's hero with them.

defineProps({
  // The app's artwork (src/assets/app-icons), by name, for the watermark.
  art: { type: String, required: true },
  greeting: { type: String, default: '' },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  // A short word in the top corner — "Tomorrow", "In 3 days".
  badge: { type: String, default: '' },
  // Where tapping the card goes. Without it the card is not a link.
  to: { type: [String, Object], default: null },
  // One per step of whatever the app counts — Sundays planned, in Schedules.
  // true is done, false is not.
  segments: { type: Array, default: () => [] },
  segmentsLabel: { type: String, default: '' },
})
</script>

<template>
  <component
    :is="to ? RouterLink : 'section'"
    :to="to || undefined"
    :class="[
      'app-hero animate-rise group relative isolate block overflow-hidden rounded-2xl bg-primary p-5 text-white',
      to ? 'transition-transform duration-200 ease-out pressed:scale-[0.99]' : '',
    ]"
  >
    <!-- The app's mark, faint and bleeding off the corner. Flattened to white
         so it reads as a watermark on any church's colour. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -bottom-14 -right-10 -z-10 size-[190px] rotate-12 opacity-[0.13] brightness-0 invert"
    >
      <AppArt :app-key="art" class="size-full" />
    </div>

    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <p v-if="greeting" class="text-sm text-white/70">{{ greeting }}</p>
        <h1 :class="['text-2xl font-bold leading-tight', greeting ? 'mt-0.5' : '']">{{ title }}</h1>
        <p v-if="detail" class="mt-1 text-sm text-white/75">{{ detail }}</p>
      </div>
      <span
        v-if="badge"
        class="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
      >
        {{ badge }}
      </span>
    </div>

    <slot />

    <div v-if="segments.length" :class="['mt-4', to ? 'pr-8' : '']">
      <div class="flex items-center gap-1.5" aria-hidden="true">
        <span
          v-for="(done, index) in segments"
          :key="index"
          :class="['h-1.5 flex-1 rounded-full', done ? 'bg-white' : 'bg-white/25']"
        />
      </div>
      <p v-if="segmentsLabel" class="mt-1.5 text-xs text-white/70">{{ segmentsLabel }}</p>
    </div>

    <ChevronRight
      v-if="to"
      aria-hidden="true"
      class="absolute bottom-5 right-4 size-5 text-white/60 transition-transform duration-300 group-engaged:translate-x-1"
    />
  </component>
</template>

<style scoped>
/* On a dark page the accent token is its lighter shade, made to be read as
   text on dark — and white words on it all but disappear. The card wants the
   opposite, a colour white sits on, so it goes deeper there instead: the same
   hue, mixed down toward black. */
.dark .app-hero {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}
</style>

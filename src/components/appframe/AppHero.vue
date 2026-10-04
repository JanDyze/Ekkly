<script setup>
import AppArt from '../common/AppArt.vue'

// The first card of an app's home, and its header.
//
// It greets whoever opened it and leads with one
// sentence that is true today — "You're ushering this Sunday", not "Schedules"
// — so the screen answers the question most visits are before anything is
// tapped. A row of segments under it shows progress where an app has some to
// show, and the app's own artwork sits faint and oversized in the corner.
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
  // One per step of whatever the app counts — Sundays planned, in Schedules.
  // true is done, false is not.
  segments: { type: Array, default: () => [] },
  segmentsLabel: { type: String, default: '' },
})
</script>

<template>
  <section
    class="animate-rise relative isolate overflow-hidden rounded-2xl bg-primary p-5 text-white"
  >
    <!-- The app's mark, faint and bleeding off the corner. Flattened to white
         so it reads as a watermark on any church's colour. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -bottom-14 -right-10 -z-10 size-[190px] rotate-12 opacity-[0.13] brightness-0 invert"
    >
      <AppArt :app-key="art" class="size-full" />
    </div>

    <p v-if="greeting" class="text-sm text-white/70">{{ greeting }}</p>
    <h1 :class="['text-2xl font-bold leading-tight', greeting ? 'mt-0.5' : '']">{{ title }}</h1>
    <p v-if="detail" class="mt-1 text-sm text-white/75">{{ detail }}</p>

    <div v-if="segments.length" class="mt-4">
      <div class="flex items-center gap-1.5" aria-hidden="true">
        <span
          v-for="(done, index) in segments"
          :key="index"
          :class="['h-1.5 flex-1 rounded-full', done ? 'bg-white' : 'bg-white/25']"
        />
      </div>
      <p v-if="segmentsLabel" class="mt-1.5 text-xs text-white/70">{{ segmentsLabel }}</p>
    </div>
  </section>
</template>

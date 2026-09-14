<script setup>
import mark from '../../assets/ekkly-mark.svg'
import { usePlatformConfig } from '../../composables/usePlatformConfig'

// The platform's logo: the window mark and the name beside it, the way Ekkly's
// logo is drawn. The name is whatever the console calls the platform, so a
// rename there changes it here too; the mark is Ekkly's own.

defineProps({
  // What it sits on. 'ink' draws the name in Ekkly's navy on a light page
  // (white in dark mode); 'light' draws it white on a coloured ground.
  tone: { type: String, default: 'ink' },
  // The mark on a white tile. Its four panes are made to be seen on a light
  // ground, and on the blue of a header two of them all but disappear.
  chip: { type: Boolean, default: false },
  markClass: { type: String, default: 'h-8 w-8' },
  textClass: { type: String, default: 'text-2xl' },
  showName: { type: Boolean, default: true },
})

const { branding } = usePlatformConfig()
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2.5">
    <span v-if="chip" class="flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
      <img :src="mark" alt="" :class="markClass" />
    </span>
    <img v-else :src="mark" alt="" :class="['shrink-0', markClass]" />
    <span
      v-if="showName"
      :class="[
        'wordmark truncate font-medium leading-none',
        textClass,
        tone === 'light' ? 'text-white' : 'text-[#0f1c4d] dark:text-white',
      ]"
    >{{ branding.name }}</span>
    <span v-else class="sr-only">{{ branding.name }}</span>
  </span>
</template>

<style scoped>
/* Ekkly's wordmark is a rounded geometric sans. Poppins is the nearest free
   face (loaded in index.html); the stack behind it keeps the shape close if it
   has not arrived. */
.wordmark {
  font-family: Poppins, 'Avenir Next', Avenir, 'Segoe UI', system-ui, sans-serif;
  letter-spacing: -0.02em;
  padding-bottom: 0.08em;
}
</style>

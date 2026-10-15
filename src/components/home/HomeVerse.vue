<script setup>
import { RouterLink } from 'vue-router'

// The day's verse as a panel of its own on the desktop home (HomeBoard), to
// be dragged wherever someone likes it, rather than a card on the church's
// picture as on a phone. The verse first, as it is read; then the reference,
// which is what someone would look up, and the translation under it. Where
// the Bible app is theirs, the card opens the chapter on the verse.

defineProps({
  // { text, reference, version }.
  verse: { type: Object, required: true },
  // The chapter in the Bible app, or null where it cannot open.
  to: { type: [Object, String], default: null },
})
</script>

<template>
  <section aria-label="A verse for today" class="flex min-h-0 flex-col overflow-hidden rounded-[24px] bg-white/95 ring-1 ring-black/5 dark:bg-gray-900/90 dark:ring-white/10">
    <component
      :is="to ? RouterLink : 'div'"
      :to="to || undefined"
      class="flex min-h-0 flex-1 flex-col px-5 py-4 transition-colors"
      :class="to ? 'hover:bg-gray-900/[0.03] dark:hover:bg-white/[0.04]' : ''"
    >
      <p class="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">A verse for today</p>
      <blockquote class="mt-1.5 min-h-0 overflow-y-auto overscroll-contain text-[15px] leading-relaxed italic text-gray-800 [scrollbar-width:thin] dark:text-gray-100">
        {{ verse.text }}
      </blockquote>
      <p class="mt-2 shrink-0 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-primary dark:text-primary-light">
        {{ verse.reference }}
        <span v-if="verse.version" class="ml-1.5 font-medium normal-case tracking-normal text-gray-400 dark:text-gray-500">{{ verse.version }}</span>
      </p>
      <span v-if="to" class="sr-only">Opens the chapter in the Bible</span>
    </component>
  </section>
</template>

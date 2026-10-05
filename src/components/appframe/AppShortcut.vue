<script setup>
import SectionGlyph from './SectionGlyph.vue'

// One way into a section of an app, as small as it can be and still be found:
// a picture and a name, the way a phone's home screen lays out its apps.
//
// An app's home leads with what is true today; its sections are only doors,
// and a door needs no paragraph. So the grid of these takes two short rows
// rather than half the screen, and the home fits a phone without scrolling.
// Anything a section is waiting on shows as a count on its corner.

defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  // A section's glyph (SectionGlyph).
  glyph: { type: String, required: true },
  // How many things in there are waiting on you.
  badge: { type: Number, default: 0 },
  // The badge in the warning colour, for things that are overdue rather than new.
  urgent: { type: Boolean, default: false },
  // Its beat in the home's entrance, in milliseconds.
  delay: { type: Number, default: 0 },
})
</script>

<template>
  <RouterLink
    :to="to"
    :style="{ animationDelay: `${delay}ms` }"
    class="animate-rise group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl py-1.5 transition-transform duration-200 ease-out pressed:scale-95"
  >
    <span
      class="relative flex size-14 items-center justify-center rounded-2xl border border-gray-200 bg-white transition-colors group-hover:border-gray-300 dark:border-gray-700/80 dark:bg-gray-800 dark:group-hover:border-gray-600"
    >
      <SectionGlyph :name="glyph" class="size-8" />
      <span
        v-if="badge > 0"
        :class="[
          'absolute -right-1.5 -top-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums text-white ring-2 ring-gray-50 dark:ring-gray-900',
          urgent ? 'bg-amber-500' : 'bg-primary',
        ]"
      >
        {{ badge > 99 ? '99+' : badge }}
      </span>
    </span>
    <span class="w-full truncate text-center text-xs font-medium text-gray-700 dark:text-gray-300">{{ title }}</span>
  </RouterLink>
</template>

<script setup>
import AppShortcut from './AppShortcut.vue'
import { useHomeCards } from '../../composables/useHomeCards'
import { MASONRY_SPANS, orbitPlace } from '../../data/homeCards'
import { sectionHue } from '../../data/appHues'

// The sections of an app, on its home, laid out the way the home of all apps
// lays out its apps in the style this person sees (useHomeCards): two across,
// one a row, masonry, or round a circle. Each door is an AppShortcut.
//
// An orbit of sections has no More apps to sit in its middle, so the middle
// is left to the rings.

defineProps({
  // [{ key, to, title, detail?, art?, glyph?, badge?, urgent? }]
  doors: { type: Array, required: true },
  // What the doors are, for a screen reader: usually the app's name.
  label: { type: String, required: true },
})

const { style } = useHomeCards()

const delayOf = (index) => 120 + index * 30

// Only what a door means, so nothing else a home keeps on it lands on the
// link as an attribute. Missing ones keep their defaults.
const propsOf = ({ to, title, detail, art, glyph, badge, urgent }) =>
  Object.fromEntries(Object.entries({ to, title, detail, art, glyph, badge, urgent }).filter(([, value]) => value !== undefined))
</script>

<template>
  <nav v-if="style === 'orbit'" class="relative mx-auto aspect-square w-full max-w-88" :aria-label="label">
    <span class="absolute inset-[13%] rounded-full border border-gray-300/70 dark:border-white/10" />
    <span class="absolute inset-[34%] rounded-full border border-gray-300/50 dark:border-white/10" />
    <AppShortcut
      v-for="(door, index) in doors"
      :key="door.key"
      v-bind="propsOf(door)"
      variant="orbit"
      :hue="sectionHue(index)"
      :delay="delayOf(index)"
      :style="orbitPlace(index, doors.length)"
      class="w-[26%]"
    />
  </nav>

  <nav v-else-if="style === 'list'" class="flex flex-col gap-2" :aria-label="label">
    <AppShortcut v-for="(door, index) in doors" :key="door.key" v-bind="propsOf(door)" variant="list" :hue="sectionHue(index)" :delay="delayOf(index)" />
  </nav>

  <nav v-else-if="style === 'masonry'" class="grid grid-cols-5 gap-2.5" :aria-label="label">
    <AppShortcut
      v-for="(door, index) in doors"
      :key="door.key"
      v-bind="propsOf(door)"
      variant="masonry"
      :hue="sectionHue(index)"
      :delay="delayOf(index)"
      :class="MASONRY_SPANS[index % MASONRY_SPANS.length]"
    />
  </nav>

  <nav v-else class="grid grid-cols-2 gap-2.5" :aria-label="label">
    <AppShortcut v-for="(door, index) in doors" :key="door.key" v-bind="propsOf(door)" :variant="style" :hue="sectionHue(index)" :delay="delayOf(index)" />
  </nav>
</template>

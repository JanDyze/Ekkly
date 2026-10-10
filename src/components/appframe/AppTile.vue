<script setup>
// One way into a section of an app, on the app's home.
//
// The home is the app's navigation: a grid of these in place of tabs. Each says
// what the section is and, in its second line, what is true in it right now —
// "November is a draft", "Next: 11 Oct" — so the grid reads as a summary
// before any of it is opened. A count goes on the badge, for the thing that is
// waiting on you.
//
// Flat, with a hairline border and no shadow: the icon tile carries the colour,
// and the card shrinks a touch under a finger.
//
// Given `art`, the tile wears one of Ekkly's drawings (src/assets/app-icons)
// instead of a line icon — the same glossy orange and blue as the apps
// themselves — and plays its little animation when it is pointed at or pressed.
// Given `glyph`, it wears a section's small flat picture in the church's own
// colours (SectionGlyph): for the rooms inside an app, a step below the app.

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import SectionGlyph from './SectionGlyph.vue'

const props = defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  // A drawing's name in src/assets/app-icons, worn in place of `icon`.
  art: { type: String, default: '' },
  // A section's glyph (SectionGlyph), worn in place of `icon`.
  glyph: { type: String, default: '' },
  badge: { type: Number, default: 0 },
  // The detail in the accent colour, for when it is asking for something.
  urgent: { type: Boolean, default: false },
  // Across both columns, icon beside the words: for the odd tile out.
  wide: { type: Boolean, default: false },
  // Its beat in the home's entrance, in milliseconds.
  delay: { type: Number, default: 0 },
})

// The path this tile opens, which the section's header carries too, so its
// name can fly up into the header and back (router/viewTransitions.js).
const router = useRouter()
const morphKey = computed(() => router.resolve(props.to).path)

// Bumped to play the drawing's animation again.
const play = ref(0)
</script>

<template>
  <RouterLink
    :to="to"
    @pointerenter="play++"
    @focus="play++"
    :style="{ animationDelay: `${delay}ms` }"
    :class="[
      'animate-rise group flex rounded-2xl border border-gray-200 bg-white p-4 transition-[transform,background-color,border-color] duration-200 ease-out hover:border-gray-300 pressed:scale-[0.98] dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600',
      wide ? 'col-span-2 items-center gap-4' : 'flex-col gap-3.5',
    ]"
  >
    <span
      :class="[
        'relative flex size-14 shrink-0 items-center justify-center rounded-2xl',
        art || glyph ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-primary/10 dark:bg-primary-light/15',
      ]"
    >
      <AppArt v-if="art" :app-key="art" :play="play" class="size-12" />
      <SectionGlyph v-else-if="glyph" :name="glyph" class="size-8" />
      <component
        v-else
        :is="icon"
        class="size-7 text-primary transition-transform duration-300 ease-out group-engaged:-rotate-6 group-engaged:scale-110 dark:text-primary-light"
      />
      <span
        v-if="badge > 0"
        class="absolute -right-1.5 -top-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-white ring-2 ring-white dark:ring-gray-800"
      >
        {{ badge > 99 ? '99+' : badge }}
      </span>
    </span>
    <span class="min-w-0">
      <span :data-morph-label="morphKey" class="block text-lg font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
        {{ title }}
      </span>
      <span
        v-if="detail"
        :class="[
          'mt-0.5 block text-sm',
          urgent ? 'font-medium text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
        ]"
      >
        {{ detail }}
      </span>
    </span>
  </RouterLink>
</template>

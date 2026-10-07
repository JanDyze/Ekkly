<script setup>
import { useRouter } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import SectionGlyph from './SectionGlyph.vue'
import { prefetchRoute } from '../../router/prefetch'

// One way into a section of an app: a tile with its picture, its name and,
// where the app has one, a line of what is true inside it right now — "31
// people", "Andeng today", "2 to fill in".
//
// It began as a phone's home-screen icon, a small square with the name under
// it, four across, and then a white tile with a glyph floating in its corner.
// The first left each square alone in a wide column; the second was mostly
// empty box, and its thin glyph read as neither an icon nor a button.
//
// The picture is the section's own artwork where it has one (`art`, drawn
// with the app icons by brand/ekkly/make-app-icons.mjs), and otherwise its
// glyph on a tinted square of the church's colour. Two slots let a tile show
// its own data rather than decoration: `aside`, a small picture opposite the
// artwork (faces, a date, a ring), and the default slot, under the words (a
// bar). Each tile then looks like what is in it, so no two are alike.
//
// The picture sits top left and the words bottom left, so a row of tiles
// lines up along both edges however long the names are. Anything waiting
// inside shows as a count on the corner. The grid around them decides how many
// go across: two where every tile has a line, three where they do not.

const props = defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  // What is true inside the section right now, in a few words.
  detail: { type: String, default: '' },
  // The section's artwork in src/assets/app-icons, by name. Wins over `glyph`.
  art: { type: String, default: '' },
  // A section's glyph (SectionGlyph), for a section with no artwork.
  glyph: { type: String, default: '' },
  // How many things in there are waiting on you.
  badge: { type: Number, default: 0 },
  // The badge in the warning colour, for things that are overdue rather than new.
  urgent: { type: Boolean, default: false },
  // Its beat in the home's entrance, in milliseconds.
  delay: { type: Number, default: 0 },
})

// The page's code is fetched as the finger comes down, so it is usually there
// by the time the tap lands (src/router/prefetch.js).
const router = useRouter()
const warm = () => prefetchRoute(router, props.to)
</script>

<template>
  <RouterLink
    :to="to"
    :style="{ animationDelay: `${delay}ms` }"
    @pointerdown="warm"
    @focus="warm"
    class="animate-rise group relative flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/80 transition duration-200 ease-out hover:ring-gray-300 pressed:scale-[0.97] dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
  >
    <span class="flex items-start justify-between gap-2">
      <AppArt v-if="art" :app-key="art" :play="1" class="size-11 shrink-0" />
      <span v-else class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary-light/15">
        <SectionGlyph :name="glyph" class="size-6" />
      </span>
      <slot name="aside" />
    </span>

    <span class="mt-auto min-w-0">
      <span class="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ title }}</span>
      <span v-if="detail" class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ detail }}</span>
    </span>

    <slot />

    <span
      v-if="badge > 0"
      :class="[
        'absolute -right-1.5 -top-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums text-white ring-2 ring-gray-50 dark:ring-gray-900',
        urgent ? 'bg-amber-500' : 'bg-primary',
      ]"
    >
      {{ badge > 99 ? '99+' : badge }}
    </span>
  </RouterLink>
</template>

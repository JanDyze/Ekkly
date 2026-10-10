<script setup>
import { ChevronRight } from '../../icons'
import AppArt from '../common/AppArt.vue'
import HomeCardIcon from './HomeCardIcon.vue'

// One card in one of the six styles the home of all apps can be drawn in
// (src/data/homeCards.js). The home draws its apps with it (HomeAppCards), and
// every app draws its sections with it too (AppShortcut), so the rooms inside
// an app look like the doors on the home, whichever style was chosen.
//
// Where it sits — the grid, a masonry span, a place on the orbit — is the
// caller's: its class and style fall through to the card, along with the
// link's `to`, its listeners and its animation delay. The card's colour is
// --hue, which the caller sets too: an app's own colour on the home, and a
// colour given out in turn for a section (appHues.js SECTION_HUES).
//
// A section (`section`) is drawn like an app, its artwork in full colour; it
// only has no chevron, so nothing on a section's tile is an arrow.
//
// Every style is flat. Cards are set off the page by a hairline ring and a
// fill, never a shadow, and answer a pointer or a finger by deepening the ring
// and the fill rather than by lifting, growing or shrinking.

defineProps({
  variant: { type: String, default: 'accent' },
  // What the card opens: a RouterLink, or 'button' for More apps.
  as: { type: [String, Object], default: 'button' },
  // { name, tagline, art, glyph, more, peek, path } — `path` is the key the
  // name and the drawing morph on (router/viewTransitions.js).
  card: { type: Object, required: true },
  // A section inside an app rather than an app on the home.
  section: { type: Boolean, default: false },
  // A line under the name in the styles that otherwise show only the name.
  detail: { type: String, default: '' },
  // How many things behind the card are waiting on you.
  badge: { type: Number, default: 0 },
  // The badge in the warning colour, for things that are overdue rather than new.
  urgent: { type: Boolean, default: false },
  // Change it to play the drawing again.
  play: { type: Number, default: 1 },
})

const BADGE = 'flex h-5.5 min-w-5.5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums'
const badgeTone = (urgent) => (urgent ? 'bg-amber-500 text-white' : 'bg-primary text-white dark:bg-primary-light dark:text-gray-900')
const badgeText = (count) => (count > 99 ? '99+' : count)

const press = 'animate-rise transition-[background-color,box-shadow] duration-200 ease-out'
</script>

<template>
  <!-- 1. Accent lines: flat cards, a stripe of the app's colour. -->
  <component
    v-if="variant === 'accent'"
    :is="as"
    :data-morph-card="card.more ? undefined : card.path"
    :class="['home-card group relative flex min-w-0 flex-col items-start gap-2.5 overflow-hidden rounded-2xl p-3.5 pl-4.5 pr-8 text-left', press]"
  >
    <span class="home-stripe absolute inset-y-0 left-0 w-1" />
    <HomeCardIcon :card="card" :play="play" />
    <span class="block w-full min-w-0">
      <span :data-morph-label="card.path" class="block w-full truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">{{ card.name }}</span>
      <span v-if="detail" class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ detail }}</span>
    </span>
    <ChevronRight v-if="!section" class="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-300 dark:text-gray-500" />
    <span v-if="badge > 0" :class="[BADGE, badgeTone(urgent), 'absolute right-2.5 top-2.5 z-10']">{{ badgeText(badge) }}</span>
  </component>

  <!-- 2. Illustrated: the app's colour, its drawing behind, a line on it. -->
  <component
    v-else-if="variant === 'illustrated'"
    :is="as"
    :data-morph-card="card.more ? undefined : card.path"
    :class="['home-wash group relative isolate flex min-h-29 min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-2xl p-3.5 text-left', press]"
  >
    <AppArt v-if="card.art && !card.more" :app-key="card.art" flat class="home-hue pointer-events-none absolute -bottom-5 -right-4 -z-10 size-24 opacity-25" />
    <span v-else class="home-hue pointer-events-none absolute -bottom-10 -right-8 -z-10 size-28 rounded-full bg-current opacity-15" />
    <HomeCardIcon :card="card" :play="play" size="size-11" art="size-7" ground="home-chip" />
    <span class="block w-full min-w-0">
      <span :data-morph-label="card.path" class="block truncate text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{{ card.name }}</span>
      <span v-if="card.tagline" class="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{{ card.tagline }}</span>
    </span>
    <span v-if="badge > 0" :class="[BADGE, badgeTone(urgent), 'absolute right-2.5 top-2.5 z-10']">{{ badgeText(badge) }}</span>
  </component>

  <!-- 3. Compact: slim rows, the picture on the left. -->
  <component
    v-else-if="variant === 'compact'"
    :is="as"
    :data-morph-card="card.more ? undefined : card.path"
    :class="['home-card group flex h-16 min-w-0 items-center gap-2.5 rounded-2xl px-3 text-left', press]"
  >
    <HomeCardIcon :card="card" :play="play" size="size-10" art="size-6.5" />
    <span class="min-w-0 flex-1">
      <span :data-morph-label="card.path" class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ card.name }}</span>
      <span v-if="detail" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ detail }}</span>
    </span>
    <span v-if="badge > 0" :class="[BADGE, badgeTone(urgent)]">{{ badgeText(badge) }}</span>
    <ChevronRight v-if="!section" class="size-4 shrink-0 text-gray-300 dark:text-gray-500" />
  </component>

  <!-- 4. Orbit: a round node on the circle; its place is the caller's. -->
  <component
    v-else-if="variant === 'orbit'"
    :is="as"
    :data-morph-card="card.more ? undefined : card.path"
    :class="['home-node group absolute flex aspect-square flex-col items-center justify-center gap-1 rounded-full text-center', press]"
  >
    <HomeCardIcon :card="card" :play="play" size="size-10" art="size-7" ground="" />
    <span :data-morph-label="card.more ? undefined : card.path" class="block max-w-full truncate px-1.5 text-[11px] font-semibold text-gray-900 dark:text-white">{{ card.name }}</span>
    <span v-if="badge > 0" :class="[BADGE, badgeTone(urgent), 'absolute -right-0.5 -top-0.5 z-10']">{{ badgeText(badge) }}</span>
  </component>

  <!-- 5. List: one a row, with a line on what it is for. -->
  <component
    v-else-if="variant === 'list'"
    :is="as"
    :data-morph-card="card.more ? undefined : card.path"
    :class="['home-card group relative isolate flex h-15 min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3 text-left', press]"
  >
    <svg class="home-hue pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-32 opacity-15" viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M44 0C24 22 66 34 40 60H120V0Z" fill="currentColor" />
    </svg>
    <HomeCardIcon :card="card" :play="play" size="size-10" art="size-6.5" />
    <span class="min-w-0 flex-1">
      <span :data-morph-label="card.path" class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ card.name }}</span>
      <span v-if="card.tagline" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ card.tagline }}</span>
    </span>
    <span v-if="badge > 0" :class="[BADGE, badgeTone(urgent)]">{{ badgeText(badge) }}</span>
    <ChevronRight v-if="!section" class="size-4 shrink-0 text-gray-400 dark:text-gray-500" />
  </component>

  <!-- 6. Masonry: a tile of the app's colour; its width is the caller's. -->
  <component
    v-else
    :is="as"
    :data-morph-card="card.more ? undefined : card.path"
    :class="['home-wash group relative isolate flex min-h-27 min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-2xl p-3.5 text-left', press]"
  >
    <svg class="home-hue pointer-events-none absolute bottom-0 right-0 -z-10 h-full w-3/4 opacity-20" viewBox="0 0 120 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M120 0C80 30 110 60 40 100H120Z" fill="currentColor" />
    </svg>
    <HomeCardIcon :card="card" :play="play" size="size-11" art="size-7" ground="home-chip" />
    <span class="block w-full min-w-0">
      <span :data-morph-label="card.path" class="block truncate text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{{ card.name }}</span>
      <span v-if="card.tagline" class="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{{ card.tagline }}</span>
    </span>
    <span v-if="badge > 0" :class="[BADGE, badgeTone(urgent), 'absolute right-2.5 top-2.5 z-10']">{{ badgeText(badge) }}</span>
  </component>
</template>

<style scoped>
/* A solid white card set off by a hairline ring, for the styles whose colour
   is only an accent. Flat: no shadow under it and no gradient across it. A
   pointer or a finger takes the ring towards the card's colour and greys the
   fill a touch, so it still answers without lifting. */
.home-card {
  background: var(--color-white);
  box-shadow: 0 0 0 1px var(--color-gray-200);
}
.dark .home-card {
  background: var(--color-gray-800);
  box-shadow: 0 0 0 1px var(--color-gray-700);
}

/* The app's own colour, a flat tint across the whole card, ringed in it. */
.home-wash {
  background: color-mix(in srgb, var(--hue) 14%, var(--color-white));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 22%, transparent);
}
.dark .home-wash {
  background: color-mix(in srgb, var(--hue) 26%, var(--color-gray-900));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 34%, transparent);
}

/* An orbit's node: a round card ringed in the app's colour. */
.home-node {
  background: var(--color-white);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--hue) 55%, transparent);
}
.dark .home-node {
  background: color-mix(in srgb, var(--hue) 22%, var(--color-gray-900));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--hue) 65%, transparent);
}

/* Hovered by a mouse, or pressed by a finger (.is-pressed, see style.css). */
@media (hover: hover) {
  .home-card:hover {
    background: var(--color-gray-50);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 45%, transparent);
  }
  .dark .home-card:hover {
    background: color-mix(in srgb, var(--color-gray-700) 70%, var(--color-gray-800));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 55%, transparent);
  }
  .home-wash:hover {
    background: color-mix(in srgb, var(--hue) 20%, var(--color-white));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 40%, transparent);
  }
  .dark .home-wash:hover {
    background: color-mix(in srgb, var(--hue) 34%, var(--color-gray-900));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 50%, transparent);
  }
  .home-node:hover {
    background: color-mix(in srgb, var(--hue) 8%, var(--color-white));
  }
  .dark .home-node:hover {
    background: color-mix(in srgb, var(--hue) 32%, var(--color-gray-900));
  }
}
.home-card.is-pressed {
  background: var(--color-gray-50);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 45%, transparent);
}
.dark .home-card.is-pressed {
  background: color-mix(in srgb, var(--color-gray-700) 70%, var(--color-gray-800));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 55%, transparent);
}
.home-wash.is-pressed {
  background: color-mix(in srgb, var(--hue) 20%, var(--color-white));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 40%, transparent);
}
.dark .home-wash.is-pressed {
  background: color-mix(in srgb, var(--hue) 34%, var(--color-gray-900));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--hue) 50%, transparent);
}
.home-node.is-pressed {
  background: color-mix(in srgb, var(--hue) 8%, var(--color-white));
}
.dark .home-node.is-pressed {
  background: color-mix(in srgb, var(--hue) 32%, var(--color-gray-900));
}

.home-stripe {
  background: var(--hue);
}

.home-hue {
  color: var(--hue);
}

/* The circle a picture sits in: tinted on a white card, white on a coloured
   one. Flat either way — a pool of colour, not a raised plate. */
.home-tint {
  background: color-mix(in srgb, var(--hue) 14%, transparent);
}
.dark .home-tint {
  background: color-mix(in srgb, var(--hue) 26%, transparent);
}
.home-chip {
  background: color-mix(in srgb, var(--color-white) 85%, transparent);
}
.dark .home-chip {
  background: color-mix(in srgb, var(--color-white) 12%, transparent);
}
</style>

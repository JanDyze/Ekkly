<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import AppArt from '../common/AppArt.vue'
import HomeCardIcon from './HomeCardIcon.vue'
import { hueOf } from '../../data/appHues'

// The apps on the home of all apps, drawn in whichever of the six styles this
// person sees (src/data/homeCards.js, useHomeCards). Every style holds the
// same six things — the five apps kept on the home, then More apps — and
// behaves the same: a tap opens the app, holding one shows what it is
// (AppPeek, through `hold`), and More apps opens the drawer of every app.
//
// Each card carries its app's colour as --hue (data/appHues.js): Ekkly's
// colours, from the app's own drawing, never the church's, which the day card
// above already wears.

const props = defineProps({
  variant: { type: String, default: 'accent' },
  apps: { type: Array, required: true },
  others: { type: Array, default: () => [] },
  // The home's press-and-hold, as { start, still, swallow } (usePressAndHold).
  hold: { type: Object, default: null },
})

const emit = defineEmits(['more'])

const GREY = '#64748b'

const cards = computed(() => {
  const list = props.apps.map((item) => ({
    key: item.path,
    item,
    path: item.path,
    name: item.name,
    tagline: item.tagline || '',
    art: item.art,
    hue: hueOf(item.art),
  }))
  if (props.others.length) {
    list.push({
      key: 'more',
      more: true,
      name: 'More apps',
      tagline: `${props.others.length} more`,
      peek: props.others.slice(0, 4),
      hue: GREY,
    })
  }
  return list
})

/** What a card is: a link to its app, or the button that opens every app. */
const tagOf = (card) => (card.more ? 'button' : RouterLink)
const attrsOf = (card, index, place = {}) => {
  const style = { '--hue': card.hue, animationDelay: `${120 + index * 30}ms`, ...place }
  if (card.more) return { type: 'button', style, 'aria-label': `More apps, ${props.others.length} more`, onClick: () => emit('more') }
  return {
    to: card.path,
    style,
    onPointerdown: (event) => props.hold?.start(event, card.item),
    onTouchmove: (event) => props.hold?.still(event),
    onClickCapture: (event) => props.hold?.swallow(event),
  }
}

// Masonry alternates a wide tile and a narrow one, then the other way round.
const SPANS = ['col-span-3', 'col-span-2', 'col-span-2', 'col-span-3', 'col-span-3', 'col-span-2']

// Orbit: the apps evenly round a circle, the first at the top. Placed by
// their corner, half a node's width (13%) back from the point on the circle,
// rather than shifted by half: the entrance animation owns the transform, and
// would undo a shift once it finished. The box is square, so the same
// percentage works both ways.
const orbitPlace = (index, count) => {
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180)
  return { left: `${37 + 37 * Math.cos(angle)}%`, top: `${37 + 37 * Math.sin(angle)}%` }
}
const orbitApps = computed(() => cards.value.filter((card) => !card.more))
const orbitMore = computed(() => cards.value.find((card) => card.more))

const press = 'animate-rise transition duration-200 ease-out pressed:scale-[0.97]'
</script>

<template>
  <!-- 1. Accent lines: cards with depth, a stripe of the app's colour. -->
  <nav v-if="variant === 'accent'" class="grid grid-cols-2 gap-2.5" aria-label="Your apps">
    <component
      v-for="(card, index) in cards"
      :key="card.key"
      :is="tagOf(card)"
      v-bind="attrsOf(card, index)"
      :class="['home-card group relative flex min-w-0 flex-col items-start gap-2.5 overflow-hidden rounded-2xl p-3.5 pl-4.5 pr-8 text-left', press]"
    >
      <span class="home-stripe absolute inset-y-0 left-0 w-1" />
      <HomeCardIcon :card="card" />
      <span :data-morph-label="card.path" class="block w-full truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">{{ card.name }}</span>
      <ChevronRight class="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-300 dark:text-gray-500" />
    </component>
  </nav>

  <!-- 2. Illustrated: the app's colour, its drawing behind, a line on it. -->
  <nav v-else-if="variant === 'illustrated'" class="grid grid-cols-2 gap-2.5" aria-label="Your apps">
    <component
      v-for="(card, index) in cards"
      :key="card.key"
      :is="tagOf(card)"
      v-bind="attrsOf(card, index)"
      :class="['home-wash group relative isolate flex min-h-29 min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-2xl p-3.5 text-left', press]"
    >
      <AppArt v-if="!card.more" :app-key="card.art" flat class="home-hue pointer-events-none absolute -bottom-5 -right-4 -z-10 size-24 opacity-25" />
      <span v-else class="home-hue pointer-events-none absolute -bottom-10 -right-8 -z-10 size-28 rounded-full bg-current opacity-15" />
      <HomeCardIcon :card="card" size="size-11" art="size-7" ground="home-chip" />
      <span class="block w-full min-w-0">
        <span :data-morph-label="card.path" class="block truncate text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{{ card.name }}</span>
        <span class="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{{ card.tagline }}</span>
      </span>
    </component>
  </nav>

  <!-- 3. Compact: slim rows, the picture on the left. -->
  <nav v-else-if="variant === 'compact'" class="grid grid-cols-2 gap-2.5" aria-label="Your apps">
    <component
      v-for="(card, index) in cards"
      :key="card.key"
      :is="tagOf(card)"
      v-bind="attrsOf(card, index)"
      :class="['home-card group flex h-16 min-w-0 items-center gap-2.5 rounded-2xl px-3 text-left', press]"
    >
      <HomeCardIcon :card="card" size="size-10" art="size-6.5" />
      <span :data-morph-label="card.path" class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{{ card.name }}</span>
      <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-500" />
    </component>
  </nav>

  <!-- 4. Orbit: the apps round a circle, More apps in the middle. -->
  <nav v-else-if="variant === 'orbit'" class="relative mx-auto aspect-square w-full max-w-88" aria-label="Your apps">
    <span class="absolute inset-[13%] rounded-full border border-gray-300/70 dark:border-white/10" />
    <span class="absolute inset-[34%] rounded-full border border-gray-300/50 dark:border-white/10" />
    <component
      v-for="(card, index) in orbitApps"
      :key="card.key"
      :is="tagOf(card)"
      v-bind="attrsOf(card, index, orbitPlace(index, orbitApps.length))"
      :class="['home-node group absolute flex aspect-square w-[26%] flex-col items-center justify-center gap-1 rounded-full text-center', press]"
    >
      <HomeCardIcon :card="card" size="size-10" art="size-7" ground="" />
      <span :data-morph-label="card.path" class="block max-w-full truncate px-1.5 text-[11px] font-semibold text-gray-900 dark:text-white">{{ card.name }}</span>
    </component>
    <component
      v-if="orbitMore"
      :is="tagOf(orbitMore)"
      v-bind="attrsOf(orbitMore, orbitApps.length)"
      :class="['home-node group absolute left-[38%] top-[38%] flex aspect-square w-[24%] flex-col items-center justify-center gap-1 rounded-full text-center', press]"
    >
      <HomeCardIcon :card="orbitMore" size="size-10" art="size-7" ground="" />
      <span class="block max-w-full truncate px-1.5 text-[11px] font-semibold text-gray-900 dark:text-white">More apps</span>
    </component>
  </nav>

  <!-- 5. List: one app a row, with a line on what it is for. -->
  <nav v-else-if="variant === 'list'" class="flex flex-col gap-2" aria-label="Your apps">
    <component
      v-for="(card, index) in cards"
      :key="card.key"
      :is="tagOf(card)"
      v-bind="attrsOf(card, index)"
      :class="['home-card group relative isolate flex h-15 min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3 text-left', press]"
    >
      <svg class="home-hue pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-32 opacity-15" viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M44 0C24 22 66 34 40 60H120V0Z" fill="currentColor" />
      </svg>
      <HomeCardIcon :card="card" size="size-10" art="size-6.5" />
      <span class="min-w-0 flex-1">
        <span :data-morph-label="card.path" class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ card.name }}</span>
        <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ card.tagline }}</span>
      </span>
      <ChevronRight class="size-4 shrink-0 text-gray-400 dark:text-gray-500" />
    </component>
  </nav>

  <!-- 6. Masonry: a wide tile and a narrow one, then the other way round. -->
  <nav v-else class="grid grid-cols-5 gap-2.5" aria-label="Your apps">
    <component
      v-for="(card, index) in cards"
      :key="card.key"
      :is="tagOf(card)"
      v-bind="attrsOf(card, index)"
      :class="['home-wash group relative isolate flex min-h-27 min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-2xl p-3.5 text-left', SPANS[index % SPANS.length], press]"
    >
      <svg class="home-hue pointer-events-none absolute bottom-0 right-0 -z-10 h-full w-3/4 opacity-20" viewBox="0 0 120 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M120 0C80 30 110 60 40 100H120Z" fill="currentColor" />
      </svg>
      <HomeCardIcon :card="card" size="size-11" art="size-7" ground="home-chip" />
      <span class="block w-full min-w-0">
        <span :data-morph-label="card.path" class="block truncate text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{{ card.name }}</span>
        <span class="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{{ card.tagline }}</span>
      </span>
    </component>
  </nav>
</template>

<style scoped>
/* A white card with depth, for the styles whose colour is only an accent. */
.home-card {
  background: linear-gradient(var(--color-white), var(--color-gray-50));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-gray-200) 90%, transparent),
    0 1px 2px rgb(15 23 42 / 0.05),
    0 10px 24px -14px rgb(15 23 42 / 0.25);
}
.dark .home-card {
  background: linear-gradient(color-mix(in srgb, var(--color-gray-700) 60%, transparent), var(--color-gray-800));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-gray-700) 80%, transparent),
    0 10px 24px -14px rgb(0 0 0 / 0.5);
}

/* The app's own colour, washed across the whole card. */
.home-wash {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--hue) 20%, var(--color-white)),
    color-mix(in srgb, var(--hue) 7%, var(--color-white))
  );
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--hue) 18%, transparent),
    0 10px 24px -14px rgb(15 23 42 / 0.25);
}
.dark .home-wash {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--hue) 42%, var(--color-gray-900)),
    color-mix(in srgb, var(--hue) 16%, var(--color-gray-900))
  );
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--hue) 30%, transparent),
    0 10px 24px -14px rgb(0 0 0 / 0.5);
}

/* An orbit's node: a round card ringed in the app's colour. */
.home-node {
  background: var(--color-white);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--hue) 55%, transparent),
    0 10px 22px -12px rgb(15 23 42 / 0.3);
}
.dark .home-node {
  background: color-mix(in srgb, var(--hue) 22%, var(--color-gray-900));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--hue) 65%, transparent),
    0 10px 22px -12px rgb(0 0 0 / 0.6);
}

.home-stripe {
  background: var(--hue);
}

.home-hue {
  color: var(--hue);
}

/* The circle a picture sits in: tinted on a white card, white on a coloured one. */
.home-tint {
  background: color-mix(in srgb, var(--hue) 14%, transparent);
}
.dark .home-tint {
  background: color-mix(in srgb, var(--hue) 26%, transparent);
}
.home-chip {
  background: color-mix(in srgb, var(--color-white) 85%, transparent);
  box-shadow: 0 4px 10px -6px rgb(15 23 42 / 0.3);
}
.dark .home-chip {
  background: color-mix(in srgb, var(--color-white) 12%, transparent);
}
</style>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import HomeCard from './HomeCard.vue'
import { prefetchRoute } from '../../router/prefetch'
import { hueOf } from '../../data/appHues'
import { MASONRY_SPANS, orbitPlace } from '../../data/homeCards'

// The apps on the home of all apps, drawn in whichever of the six styles this
// person sees (src/data/homeCards.js, useHomeCards). Every style holds the
// same six things — the five apps kept on the home, then More apps — and
// behaves the same: a tap opens the app, holding one shows what it is
// (AppPeek, through `hold`), and More apps opens every app (/apps).
//
// Each card carries its app's colour as --hue (data/appHues.js): Ekkly's
// colours, from the app's own drawing, never the church's, which the day card
// above already wears. The cards themselves are HomeCard, which the sections
// inside every app are drawn with too (AppShortcuts); this lays them out.
//
// On a desktop the home asks for them as a `column`: down the sidebar beside
// the day, in the style chosen and laid out as on a phone (two across, the
// orbit, one a row), rather than spread into a row across the screen.

const props = defineProps({
  variant: { type: String, default: 'accent' },
  apps: { type: Array, required: true },
  others: { type: Array, default: () => [] },
  // The home's press-and-hold, as { start, still, swallow } (usePressAndHold).
  hold: { type: Object, default: null },
  // Laid out as on a phone whatever the width (the desktop home's sidebar).
  column: { type: Boolean, default: false },
})

const router = useRouter()

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

/** Every card is a link: to its app, or for More apps to every app (/apps). */
const attrsOf = (card, index, place = {}) => {
  const style = { '--hue': card.hue, animationDelay: `${120 + index * 30}ms`, ...place }
  if (card.more) {
    return {
      to: '/apps',
      style,
      'aria-label': `More apps, ${props.others.length} more`,
      onPointerdown: () => prefetchRoute(router, '/apps'),
    }
  }
  return {
    to: card.path,
    style,
    onPointerdown: (event) => props.hold?.start(event, card.item),
    onTouchmove: (event) => props.hold?.still(event),
    onClickCapture: (event) => props.hold?.swallow(event),
  }
}

const orbitApps = computed(() => cards.value.filter((card) => !card.more))
const orbitMore = computed(() => cards.value.find((card) => card.more))
</script>

<template>
  <!-- 4. Orbit: the apps round a circle, More apps in the middle. -->
  <nav v-if="variant === 'orbit'" class="relative mx-auto aspect-square w-full max-w-88" aria-label="Your apps">
    <span class="absolute inset-[13%] rounded-full border border-gray-300/70 dark:border-white/10" />
    <span class="absolute inset-[34%] rounded-full border border-gray-300/50 dark:border-white/10" />
    <HomeCard
      v-for="(card, index) in orbitApps"
      :key="card.key"
      variant="orbit"
      :as="RouterLink"
      :card="card"
      v-bind="attrsOf(card, index, orbitPlace(index, orbitApps.length))"
      class="w-[26%]"
    />
    <HomeCard
      v-if="orbitMore"
      variant="orbit"
      :as="RouterLink"
      :card="orbitMore"
      v-bind="attrsOf(orbitMore, orbitApps.length)"
      class="left-[38%] top-[38%] w-[24%]"
    />
  </nav>

  <!-- 5. List: one app a row, with a line on what it is for; three across
       on a desktop, where a row the width of the screen would be all gap. -->
  <nav v-else-if="variant === 'list'" :class="['flex flex-col gap-2', column ? '' : 'lg:grid lg:grid-cols-3 lg:gap-2.5']" aria-label="Your apps">
    <HomeCard
      v-for="(card, index) in cards"
      :key="card.key"
      variant="list"
      :as="RouterLink"
      :card="card"
      v-bind="attrsOf(card, index)"
    />
  </nav>

  <!-- 6. Masonry: a wide tile and a narrow one, then the other way round.
       On a desktop the spans (3, 2, 2, 3, 3, 2) come to fifteen, one row. -->
  <nav v-else-if="variant === 'masonry'" class="grid grid-cols-5 gap-2.5" :class="column ? '' : 'lg:grid-cols-15'" aria-label="Your apps">
    <HomeCard
      v-for="(card, index) in cards"
      :key="card.key"
      variant="masonry"
      :as="RouterLink"
      :card="card"
      v-bind="attrsOf(card, index)"
      :class="MASONRY_SPANS[index % MASONRY_SPANS.length]"
    />
  </nav>

  <!-- 1–3. Accent lines, Illustrated and Compact: two across; in the
       desktop's sidebar Compact's slim rows go one a row, since two across
       there cut their names short, and the sidebar measures itself
       (@container) so a narrow one sets Accent's names smaller, on two
       lines if need be (HomeCard). -->
  <nav
    v-else
    :class="['grid gap-2.5', column && variant === 'compact' ? 'grid-cols-1' : 'grid-cols-2', column ? '@container' : 'lg:grid-cols-6']"
    aria-label="Your apps"
  >
    <HomeCard
      v-for="(card, index) in cards"
      :key="card.key"
      :variant="variant"
      :as="RouterLink"
      :card="card"
      v-bind="attrsOf(card, index)"
    />
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import HomeCard from './HomeCard.vue'
import { hueOf } from '../../data/appHues'
import { MASONRY_SPANS, orbitPlace } from '../../data/homeCards'

// The apps on the home of all apps, drawn in whichever of the six styles this
// person sees (src/data/homeCards.js, useHomeCards). Every style holds the
// same six things — the five apps kept on the home, then More apps — and
// behaves the same: a tap opens the app, holding one shows what it is
// (AppPeek, through `hold`), and More apps opens the drawer of every app.
//
// Each card carries its app's colour as --hue (data/appHues.js): Ekkly's
// colours, from the app's own drawing, never the church's, which the day card
// above already wears. The cards themselves are HomeCard, which the sections
// inside every app are drawn with too (AppShortcuts); this lays them out.

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
      :as="tagOf(card)"
      :card="card"
      v-bind="attrsOf(card, index, orbitPlace(index, orbitApps.length))"
      class="w-[26%]"
    />
    <HomeCard
      v-if="orbitMore"
      variant="orbit"
      :as="tagOf(orbitMore)"
      :card="orbitMore"
      v-bind="attrsOf(orbitMore, orbitApps.length)"
      class="left-[38%] top-[38%] w-[24%]"
    />
  </nav>

  <!-- 5. List: one app a row, with a line on what it is for. -->
  <nav v-else-if="variant === 'list'" class="flex flex-col gap-2" aria-label="Your apps">
    <HomeCard
      v-for="(card, index) in cards"
      :key="card.key"
      variant="list"
      :as="tagOf(card)"
      :card="card"
      v-bind="attrsOf(card, index)"
    />
  </nav>

  <!-- 6. Masonry: a wide tile and a narrow one, then the other way round. -->
  <nav v-else-if="variant === 'masonry'" class="grid grid-cols-5 gap-2.5" aria-label="Your apps">
    <HomeCard
      v-for="(card, index) in cards"
      :key="card.key"
      variant="masonry"
      :as="tagOf(card)"
      :card="card"
      v-bind="attrsOf(card, index)"
      :class="MASONRY_SPANS[index % MASONRY_SPANS.length]"
    />
  </nav>

  <!-- 1–3. Accent lines, Illustrated and Compact: two across. -->
  <nav v-else class="grid grid-cols-2 gap-2.5" aria-label="Your apps">
    <HomeCard
      v-for="(card, index) in cards"
      :key="card.key"
      :variant="variant"
      :as="tagOf(card)"
      :card="card"
      v-bind="attrsOf(card, index)"
    />
  </nav>
</template>

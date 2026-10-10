<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import HomeCard from '../home/HomeCard.vue'
import { prefetchRoute } from '../../router/prefetch'

// One way into a section of an app: a card with its picture and its name, and
// nothing more unless something in it is waiting on you, and then only how
// many, on the corner. AppShortcuts lays a home's sections out.
//
// It began as a phone's home-screen icon, a small square with the name under
// it, four across, and then a white tile with a glyph floating in its corner.
// The first left each square alone in a wide column; the second was mostly
// empty box, and its thin glyph read as neither an icon nor a button. Later it
// was a card lifted off the page by a shadow, with a round arrow in its foot;
// both went, because nothing in Ekkly is drawn in 3D and the card's shape
// already says it opens.
//
// It is drawn in the same style as the apps on the home of all apps — the one
// the church or the person chose (src/data/homeCards.js, useHomeCards) — by
// the same card (components/home/HomeCard.vue), so going into an app feels
// like going one room further rather than into a different building.
//
// A section wears its drawing in full colour and a colour of its own
// (`hue`, given out in turn by AppShortcuts from appHues.js), just as an app
// does on the home. They used to be drawn flat in the church's one accent, to
// keep an app and a section from ever being mistaken for each other, but an
// app's home of identical tinted cards read as dull, and the screen a section
// sits on already says which app you are in. Flat all the same: a hairline
// ring and a fill, never a shadow.
//
// Section tiles used to carry their data too (faces, a date, a ring, a bar)
// so that no two looked alike; that only repeated what the deck and the
// section already say. Anything waiting inside shows as a count instead.

const props = defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  // What is true inside the section right now, in a few words.
  detail: { type: String, default: '' },
  // The section's artwork in src/assets/app-icons, by name. Wins over `glyph`.
  art: { type: String, default: '' },
  // A section's glyph (SectionGlyph), for a section with no artwork.
  glyph: { type: String, default: '' },
  // Which of the six card styles to draw it in (AppShortcuts passes it).
  variant: { type: String, default: 'accent' },
  // The card's colour, one of Ekkly's (appHues.js SECTION_HUES).
  hue: { type: String, default: '' },
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

// The path this tile opens, which the section's header carries too, so its
// name can fly up into the header and back (router/viewTransitions.js).
const morphKey = computed(() => router.resolve(props.to).path)

const card = computed(() => ({
  path: morphKey.value,
  name: props.title,
  tagline: props.detail,
  art: props.art,
  glyph: props.glyph,
}))

// The drawing plays once as the tile comes in, and again when a pointer
// arrives on it: a small answer to being noticed, never a loop.
const play = ref(1)
const replay = (event) => {
  if (event.pointerType === 'mouse') play.value += 1
}
</script>

<template>
  <HomeCard
    :as="RouterLink"
    :to="to"
    :variant="variant"
    :card="card"
    section
    :detail="detail"
    :badge="badge"
    :urgent="urgent"
    :play="play"
    :style="{ animationDelay: `${delay}ms`, '--hue': hue || 'var(--color-primary)' }"
    @pointerdown="warm"
    @pointerenter="replay"
    @focus="warm"
  />
</template>

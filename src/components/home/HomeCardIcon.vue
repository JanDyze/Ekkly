<script setup>
import AppArt from '../common/AppArt.vue'
import SectionGlyph from '../appframe/SectionGlyph.vue'

// One app's picture as every card style draws it: Ekkly's glossy artwork in a
// circle, or for More apps four of the rest in a little grid, the way a phone
// shows a folder. The circle's ground is the card's to choose (`ground`), so
// a white card can tint it and a coloured one can whiten it.
//
// A section with no artwork yet shows its glyph instead, in the card's
// colour (--hue). `flat` draws the artwork flat in that colour, for any
// caller that wants it quiet.
//
// Marked as the art plate, so the home's press-and-hold peek (AppPeek) opens
// out of it whichever style is drawn.
defineProps({
  card: { type: Object, required: true },
  size: { type: String, default: 'size-12' },
  art: { type: String, default: 'size-8' },
  ground: { type: String, default: 'home-tint' },
  flat: { type: Boolean, default: false },
  play: { type: Number, default: 1 },
})
</script>

<template>
  <span data-art-plate :class="['flex shrink-0 items-center justify-center rounded-full', size, ground]">
    <span v-if="card.more" :class="['grid grid-cols-2 gap-px', art]">
      <AppArt v-for="item in card.peek" :key="item.path" :app-key="item.art" class="size-full" />
    </span>
    <SectionGlyph v-else-if="!card.art" :name="card.glyph || ''" :data-morph-icon="card.path" :class="art" />
    <AppArt v-else :app-key="card.art" :play="play" :flat="flat" :data-morph-icon="card.path" :class="[art, flat ? 'text-(--hue)' : '']" />
  </span>
</template>

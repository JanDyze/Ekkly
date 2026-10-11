<script setup>
import WindowLight from '../common/WindowLight.vue'

// Ekkly's window in the corner of a card in the church's colour, its light
// falling across the card, in white, faint: the same window as the home's sky
// (HomeScene) and the hold preview (AppPeek). For DeckCard's `art` slot,
// which trims it to the card's corners.
//
// It replaced three bare panes of light, which hinted at the window without
// ever showing it. Before those, an arched window drawn in outline ran off
// the card's foot and so read as a door: this one stands whole, filled
// rather than outlined, with its cross showing.
</script>

<template>
  <WindowLight class="absolute -right-5 top-0 aspect-[10/9] h-[96%] w-auto" />
</template>

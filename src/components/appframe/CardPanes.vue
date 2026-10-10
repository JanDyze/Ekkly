<script setup>
// Ekkly's panes of light, for the corner of a card in the church's colour:
// the same three shapes as the home's sky (HomeScene) and the hold preview
// (AppPeek), in white, faint, so a coloured card reads as a window lit from
// one side. For DeckCard's `art` slot, which trims it to the card's corners.
//
// It replaced an arched window drawn in outline, which ran off the card's
// foot and so read as a door.
</script>

<template>
  <svg class="absolute -right-6 -top-4 h-56 w-44" viewBox="0 0 338 522" aria-hidden="true">
    <path d="M0 0H338V285C338 345 300 385 240 415L0 522Z" fill="white" fill-opacity="0.07" />
    <path d="M123 163L297 0H338V285C338 345 300 385 240 415L123 468Z" fill="white" fill-opacity="0.1" />
    <path d="M0 0H113V165L0 232Z" fill="white" fill-opacity="0.06" />
  </svg>
</template>

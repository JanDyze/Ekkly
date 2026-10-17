<script setup>
// One of the made-up people seen from straight above, for the rooms the
// front door's Sunday looks down into (Sunday school). The same people as
// StoryFigure, in the same colours: from above a peg doll is the round top of
// its head over the round of its shoulders, its little hands out in front.
// Drawn facing up the page at (0, 0), about 40 units across; turn it with a
// rotate and size it with a scale.

defineProps({
  look: { type: Object, required: true },
  // Hands held up in front, as when holding a book or a crayon.
  reach: { type: Number, default: 0 },
})
</script>

<template>
  <g>
    <ellipse cx="0" cy="3" rx="19" ry="12" fill="#000" opacity="0.1" />
    <!-- Hands, out in front of the shoulders. -->
    <circle cx="-11" :cy="-10 - reach * 6" r="3" :fill="look.skin" />
    <circle cx="11" :cy="-10 - reach * 6" r="3" :fill="look.skin" />
    <!-- The shoulders, the top of the peg. -->
    <ellipse cx="0" cy="0" rx="17" ry="10.5" :fill="look.shirt" />
    <!-- The head: ears, then the crown, all hair but for the bald. The face
         is turned away from us, down toward the floor, so only a sliver of
         forehead shows at the front. -->
    <!-- The head is drawn at the size of the shoulders' cap and brought in
         to a grown-up's proportion, about three quarters of it. -->
    <g transform="translate(0 -1) scale(0.74) translate(0 1)">
    <circle cx="-12.5" cy="-1" r="3" :fill="look.skin" />
    <circle cx="12.5" cy="-1" r="3" :fill="look.skin" />
    <circle cx="0" cy="-1" r="12.5" :fill="look.skin" />
    <path v-if="look.style !== 'bald'" d="M-12.5 -1A12.5 12.5 0 0 0 12.5 -1A12.5 12.5 0 0 0 9 -9.5Q0 -6 -9 -9.5A12.5 12.5 0 0 0 -12.5 -1Z" :fill="look.hair" />
    <template v-else>
      <path d="M-12 2A12.5 12.5 0 0 0 12 2V-1Q0 4 -12 -1Z" :fill="look.hair" />
    </template>
    <circle v-if="look.style === 'bun'" cx="0" cy="5" r="4.5" :fill="look.hair" />
    <template v-if="look.style === 'pigtails'">
      <circle cx="-13" cy="1" r="4.5" :fill="look.hair" />
      <circle cx="13" cy="1" r="4.5" :fill="look.hair" />
    </template>
    <template v-if="look.style === 'curly'">
      <circle v-for="(a, i) in [0, 60, 120, 180, 240, 300]" :key="i" :cx="Math.cos((a * Math.PI) / 180) * 10" :cy="-1 + Math.sin((a * Math.PI) / 180) * 10" r="4.5" :fill="look.hair" />
    </template>
    <path v-if="look.style === 'long'" d="M-11 2Q-12 13 -6 15H6Q12 13 11 2Z" :fill="look.hair" />
    </g>
  </g>
</template>

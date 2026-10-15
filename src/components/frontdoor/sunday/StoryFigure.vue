<script setup>
import { computed } from 'vue'

// One made-up person standing up, for the Sunday the front door tells: the
// family walking up to the door, the band, the preacher, the usher. Drawn on
// their own feet at (0, 0), about 120 units tall, facing the reader or walking
// away from them. Place and size them with a transform.
//
// Nothing here moves by itself. `step` and `arm` are given by the scroll, so a
// figure walks or plays only while the reader is scrolling them along.

const props = defineProps({
  look: { type: Object, required: true },
  facing: { type: String, default: 'front' },
  // Where the walk is, from -1 to 1: which leg is forward.
  step: { type: Number, default: 0 },
  // How far the right arm is raised, from 0 at the side to 1 overhead.
  arm: { type: Number, default: 0 },
  // How far the head is bowed, from 0 to 1.
  bow: { type: Number, default: 0 },
})

const front = computed(() => props.facing === 'front')
const swing = computed(() => props.step * 14)
const raise = computed(() => -props.arm * 150 + props.step * -10)
const headY = computed(() => -104 + props.bow * 5)
</script>

<template>
  <g>
    <!-- Long hair falls behind the shoulders, so it is drawn first. -->
    <rect v-if="look.style === 'long'" x="-14" :y="headY - 4" width="28" height="30" rx="10" :fill="look.hair" />

    <!-- Legs and shoes, one forward and one back as they walk. -->
    <g :transform="`translate(0 ${-Math.max(0, step) * 3})`">
      <rect x="-10" y="-48" width="8.5" height="48" rx="3.5" :fill="look.legs" />
      <ellipse cx="-6" cy="-1" rx="6.5" ry="3.2" fill="#2a2f3d" />
    </g>
    <g :transform="`translate(0 ${-Math.max(0, -step) * 3})`">
      <rect x="1.5" y="-48" width="8.5" height="48" rx="3.5" :fill="look.legs" />
      <ellipse cx="6" cy="-1" rx="6.5" ry="3.2" fill="#2a2f3d" />
    </g>

    <!-- Arms, swinging as they walk; the right one can be raised. -->
    <g :transform="`rotate(${swing} -18 -84)`">
      <rect x="-23" y="-86" width="7.5" height="40" rx="3.75" :fill="look.shirt" />
      <circle cx="-19.25" cy="-45" r="4.2" :fill="look.skin" />
    </g>
    <g :transform="`rotate(${raise} 18 -84)`">
      <rect x="15.5" y="-86" width="7.5" height="40" rx="3.75" :fill="look.shirt" />
      <circle cx="19.25" cy="-45" r="4.2" :fill="look.skin" />
    </g>

    <rect x="-17" y="-92" width="34" height="50" rx="11" :fill="look.shirt" />
    <rect x="-4" :y="headY + 6" width="8" height="8" :fill="look.skin" />

    <template v-if="front">
      <circle cx="0" :cy="headY" r="13" :fill="look.skin" />
      <path v-if="look.style !== 'bald'" :d="`M-13.4 ${headY + 1}A13.4 13.4 0 0 1 13.4 ${headY + 1}Q6 ${headY - 9} -13.4 ${headY + 1}Z`" :fill="look.hair" />
      <circle v-if="look.style === 'bun'" cx="0" :cy="headY - 15" r="5.5" :fill="look.hair" />
      <template v-if="bow < 0.5">
        <circle cx="-4.6" :cy="headY + 1" r="1.6" fill="#1f2a44" />
        <circle cx="4.6" :cy="headY + 1" r="1.6" fill="#1f2a44" />
      </template>
      <path v-else :d="`M-6.5 ${headY + 1}h4M2.5 ${headY + 1}h4`" stroke="#1f2a44" stroke-width="1.4" stroke-linecap="round" />
      <path :d="`M-4 ${headY + 6.5}Q0 ${headY + 9.5} 4 ${headY + 6.5}`" fill="none" stroke="#1f2a44" stroke-width="1.4" stroke-linecap="round" />
    </template>
    <template v-else>
      <circle cx="0" :cy="headY" r="13" :fill="look.style === 'bald' ? look.skin : look.hair" />
      <circle v-if="look.style === 'bun'" cx="0" :cy="headY - 15" r="5.5" :fill="look.hair" />
    </template>
  </g>
</template>

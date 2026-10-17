<script setup>
import { computed } from 'vue'
import { HANDS, arm, hand, raise } from './limbs'

// Someone in the congregation seen from behind, as the reader sees the room
// from the back of the church: rounded, sloping shoulders, a broad neck,
// small ears where the hair is short, and the back of the head with its hair,
// which is what tells one person from the next here. Drawn flat, in plain
// colours, like StoryFigure. Sits on the line of their pew at (0, 0), drawn
// about 46 units tall above it; place and size them with a transform. `build` widens or narrows the shoulders a little, so a row is
// not a row of copies.

const props = defineProps({
  look: { type: Object, required: true },
  build: { type: Number, default: 1 },
  // How far the head is bowed, from 0 to 1.
  bow: { type: Number, default: 0 },
  // Hands raised in worship: how far, from 0 to 1; how many (0, 1 or 2); and,
  // for one, which (-1 left, 1 right).
  raise: { type: Number, default: 0 },
  hands: { type: Number, default: 0 },
  handSide: { type: Number, default: 1 },
})

const hair = computed(() => props.look.style)
// Broad enough to be grown-ups sitting side by side, not slim figures.
const w = computed(() => 19.5 * props.build)
// The shoulders: a broad, rounded slope down from the neck.
const shoulders = computed(() => {
  const x = w.value
  return `M${-x} 8V-22Q${-x} -31 ${-x + 7} -34.5Q-6 -38 0 -38Q6 -38 ${x - 7} -34.5Q${x} -31 ${x} -22V8Z`
})
const ears = computed(() => ['short', 'bald', 'bun', 'ponytail'].includes(hair.value))

// The hair from behind, each style its own outline, since from the back of a
// church the outline is what tells one person from the next. Drawn over the
// head (and, for long hair, over the shoulders it falls on). Nothing runs
// down the middle of a head unless it is a ponytail: two lines there were
// meant as strands and read as a ponytail on everyone.
const HAIR = {
  // Cropped, tapering into the nape.
  short: 'M-9.4 -53A9.4 10.4 0 0 1 9.4 -53Q9.2 -46.6 7 -44.6Q0 -42.6 -7 -44.6Q-9.2 -46.6 -9.4 -53Z',
  // To the jaw, a little fuller at the ends.
  bob: 'M-9.8 -55A9.8 10.2 0 0 1 9.8 -55Q11 -47.5 10.8 -42.6Q6 -40.6 0 -41.2Q-6 -40.6 -10.8 -42.6Q-11 -47.5 -9.8 -55Z',
  // Down past the shoulders, lying over the back, the ends uneven.
  long: 'M-9.6 -56A9.6 10.2 0 0 1 9.6 -56Q11.8 -46 12 -34Q12.2 -28.4 9.2 -26.4Q5 -28.2 2 -25.8Q-1.4 -28 -4.6 -25.8Q-8 -28 -10.4 -26.6Q-12.6 -29 -12 -34Q-11.8 -46 -9.6 -56Z',
  // Gathered up, with the bun added below.
  bun: 'M-9.4 -53A9.4 10.4 0 0 1 9.4 -53Q9 -46 6.6 -44Q0 -42.4 -6.6 -44Q-9 -46 -9.4 -53Z',
  ponytail: 'M-9.4 -53A9.4 10.4 0 0 1 9.4 -53Q9 -46 6.6 -44Q0 -42.4 -6.6 -44Q-9 -46 -9.4 -53Z',
}
// Long hair's ends, a soft line or two near the sides, not down the middle.
const STRANDS = {
  long: 'M-6.4 -48Q-7.2 -38 -6.4 -28.6M6.6 -48Q7.4 -38 6.6 -28.6',
  bob: 'M-6.8 -48Q-7.2 -45 -6.8 -42M6.8 -48Q7.2 -45 6.8 -42',
}
const head = computed(() => (props.bow ? `translate(0 ${props.bow * 3})` : null))

// Arms raised in worship (limbs.js, drawn to the family on the cover). A
// hand raised in worship comes up in front of the body, so from the back of
// the church it rises into sight past the shoulder, the forearm after it and
// the elbow last: the arm is drawn behind the body, which hides it until it
// clears the shoulder, rather than swung up beside it.
const armsUp = computed(() => {
  const r = props.raise
  if (r <= 0.02 || !props.hands) return []
  const sides = props.hands === 2 ? [-1, 1] : [props.handSide]
  return sides.map((s) => {
    const shoulder = [s * (w.value - 5), -30]
    const { elbow, wrist, short } = raise(shoulder, r, s, { upper: 21, fore: 14, out: [2, 5], away: [0.5, 1] })
    return { s, ...arm(shoulder, elbow, wrist, { side: s }), hand: hand(elbow, wrist, 0, { short }) }
  })
})
</script>

<template>
  <g>
    <!-- Hands raised in worship, behind the body, so it hides each arm until
         it clears the shoulder. -->
    <template v-for="limb in armsUp" :key="limb.s">
      <path :d="limb.sleeve" :fill="look.shirt" />
      <path :d="limb.lines" fill="none" stroke="#000" stroke-width="0.7" stroke-linecap="round" opacity="0.16" />
      <path :d="HANDS.open.d" :transform="limb.hand" :fill="look.skin" />
      <path :d="HANDS.open.lines" :transform="limb.hand" fill="none" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.2" />
    </template>

    <path :d="shoulders" :fill="look.shirt" />
    <!-- A hood lies behind the neck, drawn before it. -->
    <path v-if="look.neck === 'hood'" d="M-10 -36Q-10 -44 0 -44Q10 -44 10 -36Q6 -31 0 -31Q-6 -31 -10 -36Z" :fill="look.shirt" />
    <path v-if="look.neck === 'hood'" d="M-10 -36Q-10 -44 0 -44Q10 -44 10 -36Q6 -31 0 -31Q-6 -31 -10 -36Z" fill="#000" opacity="0.14" />
    <!-- A broad neck, widening into the shoulders. -->
    <path d="M-5 -46.5H5L6.2 -37H-6.2Z" :fill="look.skin" />
    <path d="M-5 -46.5H5L5.4 -43H-5.4Z" fill="#000" opacity="0.14" />
    <!-- Where the clothes meet the neck: a shirt's collar, or a plain line. -->
    <path v-if="look.neck === 'collar'" d="M-7.6 -38.4Q0 -35.6 7.6 -38.4V-35.8Q0 -33 -7.6 -35.8Z" fill="#f4f1ea" opacity="0.9" />
    <path v-else d="M-6 -37.6Q0 -35.2 6 -37.6" fill="none" stroke="#000" stroke-width="0.8" opacity="0.14" />

    <g :transform="head">
      <template v-if="ears">
        <ellipse cx="-9.3" cy="-51" rx="1.4" ry="2.2" :fill="look.skin" />
        <ellipse cx="9.3" cy="-51" rx="1.4" ry="2.2" :fill="look.skin" />
      </template>

      <!-- The back of the head: skin for the bald, with nothing over it (a
           band of hair low on a bald head read as a beard on a face); for
           everyone else the head, then their hair's own outline over it. -->
      <ellipse cx="0" cy="-53" rx="9.4" ry="10.4" :fill="hair === 'bald' ? look.skin : look.hair" />
      <template v-if="HAIR[hair]">
        <path :d="HAIR[hair]" :fill="look.hair" />
      </template>
      <path v-if="STRANDS[hair]" :d="STRANDS[hair]" fill="none" stroke="#000" stroke-width="0.7" stroke-linecap="round" opacity="0.16" />

      <!-- A bun at the crown; a ponytail with its band; curls round. -->
      <circle v-if="hair === 'bun'" cx="0" cy="-61.5" r="4.6" :fill="look.hair" />
      <template v-if="hair === 'ponytail'">
        <path d="M-2.6 -47Q-3.8 -37 -1 -30Q1.8 -35 2.6 -47Z" :fill="look.hair" />
        <rect x="-2" y="-48.6" width="4" height="2" rx="1" fill="#000" opacity="0.25" />
      </template>
      <template v-if="hair === 'curly'">
        <circle v-for="(c, i) in [[-7, -58], [0, -61], [7, -58], [-9, -51], [9, -51], [-7, -45], [7, -45]]" :key="i" :cx="c[0]" :cy="c[1]" r="4.6" :fill="look.hair" />
      </template>
    </g>
  </g>
</template>

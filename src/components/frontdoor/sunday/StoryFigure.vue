<script setup>
import { computed } from 'vue'
import { HANDS, arm, hand, raise, unit } from './limbs'

// One made-up person standing up, for the Sunday the front door tells: the
// family walking up to the door, the band, the preacher, the usher, the
// leaders round the meeting table. A grown-up's proportions and no face, so
// the picture reads as a church rather than a toy box, and drawn flat, in
// plain colours, as the cover art draws its people: no shading across them
// and no shine on the hair, which made them look like plastic figures. Only
// the head's shadow on the neck and a shadow on the ground. Limbs are shaped as limbs are:
// a thigh narrowing to the knee and a calf to the ankle, and an arm in two,
// bending at the elbow, ending in a hand shaped as a hand (limbs.js, drawn to
// the family on the cover), so a hand can be where a hand would be; the neck
// is as broad as a grown-up's, and the ears small and close to the head.
//
// Who someone is shows in what they wear and carry and their hair: `look`
// gives skin, hair, shirt and legs colours and a hair `style`, and may add
// `wear` (jacket, coat), `pattern` (buttons, badge, dress), `collar`,
// `glasses`, `holding` (mic, phone, bible) and `carries` (bag, backpack).
//
// Stands on its feet at (0, 0), about 120 units tall, facing the reader or
// walking away; place and size it with a transform. Nothing here moves by
// itself: `step`, `motion`, `praise` and `bow` are given by the scroll.

const props = defineProps({
  look: { type: Object, required: true },
  facing: { type: String, default: 'front' },
  // Where the walk is, from -1 to 1: which foot is lifted.
  step: { type: Number, default: 0 },
  // What the arms are doing (POSES below): 'rest', 'phone', 'mic', 'keys',
  // 'drums', 'guitar' or 'preach'.
  pose: { type: String, default: 'rest' },
  // The music, or the preaching, from -1 to 1: the hands move a little with it.
  motion: { type: Number, default: 0 },
  // How far a hand with nothing to do is raised in worship, from 0 to 1.
  praise: { type: Number, default: 0 },
  // How far the head is bowed, from 0 to 1.
  bow: { type: Number, default: 0 },
})


const front = computed(() => props.facing === 'front')
const style = computed(() => props.look.style)
const coat = computed(() => props.look.wear === 'coat' || props.look.pattern === 'dress')

// The walk, seen from in front or behind: the lifted leg bends and its foot
// comes up, the hips settle over the other, and the body dips a little as
// each foot lands.
const lift = computed(() => ({ left: Math.max(0, props.step), right: Math.max(0, -props.step) }))
const carry = computed(() => `translate(${props.step * 1.1} ${Math.abs(props.step) * 1.2})`)
// A bowed head drops and tips forward, about the top of the neck.
const head = computed(() => (props.bow ? `translate(0 ${props.bow * 2.5}) rotate(${props.bow * 7} 0 -97)` : null))

const HEAD_Y = -107
const TORSO = 'M-14.5 -83.5Q-14.5 -93 -7 -93.8H7Q14.5 -93 14.5 -83.5L12.2 -47H-12.2Z'
const COAT = 'M-14.5 -83.5Q-14.5 -93 -7 -93.8H7Q14.5 -93 14.5 -83.5L16.5 -30Q0 -27 -16.5 -30Z'
// The neck, broad and widening a little into the shoulders.
const NECK = 'M-4.4 -100H4.4L5.6 -91.5H-5.6Z'

// Limbs are written for the left side as path commands and mirrored for the
// right (`side` -1), so both match.
const draw = (segments, side) =>
  segments.map(([cmd, ...n]) => cmd + n.map((v, i) => (i % 2 ? v : v * side)).join(' ')).join('')

// A leg: the thigh full at the top, narrowing to the knee, the calf swelling
// below it and narrowing again to the ankle. A lifted leg bends: its knee
// comes up a little and its foot comes up more.
const legShape = (up, side) => {
  const knee = -30 - up * 3
  const ankle = -5 - up * 7
  return draw(
    [
      ['M', -9.8, -55],
      ['C', -10.6, -45, -9.8, -36, -9, knee],
      ['C', -9.9, knee + 7, -9.2, ankle - 10, -7.6, ankle],
      ['L', -3.4, ankle],
      ['C', -2.6, ankle - 10, -1.6, knee + 6, -2.2, knee],
      ['C', -1.4, knee - 8, -0.5, -46, -0.5, -55],
      ['Z'],
    ],
    side
  )
}

// The arms (limbs.js): each an upper arm and a forearm meeting at the elbow,
// so a hand can be where a hand would be - a phone held at the chest, a
// microphone at the mouth, sticks over the drums, hands on the keys and on
// the guitar, the preacher's hand open to the people - not a stiff arm swung
// out from the shoulder. A pose places each elbow and the middle of each
// hand, and HOLD says what the hand is doing; an arm left at rest can be
// raised in worship (`praise`), the hand opening as it comes up.
const SHOULDER = { l: [-14.8, -89], r: [14.8, -89] }
const REST = { l: [[-17.8, -70.5], [-16.4, -53]], r: [[17.8, -70.5], [16.4, -53]] }
// An arm at rest: the upper arm's length, and the forearm's to the wrist.
const UPPER = 18.7
const FORE = 13.8
const POSES = {
  rest: REST,
  phone: { l: REST.l, r: [[19.5, -71], [7.5, -79]] },
  mic: { l: REST.l, r: [[21, -79], [6.5, -99.5]] },
  keys: { l: [[-19, -74], [-10, -69]], r: [[19, -74], [10, -69]] },
  drums: { l: [[-23, -77], [-25, -67]], r: [[23, -77], [25, -67]] },
  guitar: { l: [[-19, -70], [-1, -58]], r: [[27, -80], [37, -77]] },
  preach: { l: REST.l, r: [[23, -79], [30, -93]] },
  bible: { l: [[-19, -72], [-6, -76]], r: REST.r },
}
// What each hand is doing, by pose, where it is not resting (limbs.js HANDS).
const HOLD = {
  phone: { r: 'grip' },
  mic: { r: 'grip' },
  drums: { l: 'grip', r: 'grip' },
  guitar: { l: 'grip', r: 'grip' },
  preach: { r: 'open' },
  bible: { l: 'grip' },
}
// How the hands move with `motion`, by pose: [x, y] for each.
const MOTION = {
  drums: (m) => ({ l: [0, m * 4], r: [0, -m * 4] }),
  keys: (m) => ({ l: [0, m * 1.5], r: [0, -m * 1.5] }),
  guitar: (m) => ({ l: [0, m * 3], r: [0, 0] }),
  preach: (m) => ({ l: [0, 0], r: [m, m * 4] }),
}
const arms = computed(() => {
  const name = POSES[props.pose] ? props.pose : props.look.holding === 'bible' && front.value ? 'bible' : 'rest'
  const pose = POSES[name]
  const nudge = MOTION[name]?.(props.motion) || { l: [0, 0], r: [0, 0] }
  return ['l', 'r'].map((side) => {
    const out = side === 'l' ? -1 : 1
    const shoulder = SHOULDER[side]
    if (pose[side] === REST[side]) {
      const { elbow, wrist, short } = raise(shoulder, props.praise, out, { upper: UPPER, fore: FORE })
      const kind = props.praise > 0.35 ? 'open' : 'rest'
      return { side, kind, ...arm(shoulder, elbow, wrist, { side: out }), hand: hand(elbow, wrist, 0, { short }), at: wrist }
    }
    const elbow = pose[side][0]
    const middle = [pose[side][1][0] + nudge[side][0], pose[side][1][1] + nudge[side][1]]
    const kind = HOLD[name]?.[side] || 'rest'
    // The wrist is short of the middle of the hand by the hand's own reach.
    const on = unit(middle, elbow)
    const wrist = [middle[0] - on[0] * HANDS[kind].reach, middle[1] - on[1] * HANDS[kind].reach]
    return { side, kind, ...arm(shoulder, elbow, wrist, { side: out }), hand: hand(elbow, wrist, 0), at: middle }
  })
})

// The hair from behind, by style, so a crowd is people and not one head over
// and over. Short hair is cropped above the neck, the nape's skin showing;
// tousled hair breaks into tufts; long hair falls down the back.
const ROUND = `M-8.9 ${HEAD_Y}A8.9 10.6 0 0 1 8.9 ${HEAD_Y}Q9.4 ${HEAD_Y + 7} 6.4 ${HEAD_Y + 9.6}Q0 ${HEAD_Y + 11.6} -6.4 ${HEAD_Y + 9.6}Q-9.4 ${HEAD_Y + 7} -8.9 ${HEAD_Y}Z`
const BACK = {
  short: `M-9.1 ${HEAD_Y + 2}A9.1 12.9 0 0 1 9.1 ${HEAD_Y + 2}Q8.6 ${HEAD_Y + 6.2} 6.8 ${HEAD_Y + 6.6}Q0 ${HEAD_Y + 7.6} -6.8 ${HEAD_Y + 6.6}Q-8.6 ${HEAD_Y + 6.2} -9.1 ${HEAD_Y + 2}Z`,
  tousled: `M-9.2 ${HEAD_Y + 3}Q-10.4 ${HEAD_Y - 6} -6.6 ${HEAD_Y - 9.6}L-5.6 ${HEAD_Y - 13}L-3 ${HEAD_Y - 10.8}L-0.6 ${HEAD_Y - 13.6}L1.8 ${HEAD_Y - 11}L4.8 ${HEAD_Y - 12.6}L5.6 ${HEAD_Y - 9.4}Q10.4 ${HEAD_Y - 6} 9.2 ${HEAD_Y + 3}Q8.4 ${HEAD_Y + 8} 5 ${HEAD_Y + 8.4}L3 ${HEAD_Y + 10.4}L1 ${HEAD_Y + 8.4}L-1.4 ${HEAD_Y + 10.6}L-3.4 ${HEAD_Y + 8.4}Q-8.4 ${HEAD_Y + 8} -9.2 ${HEAD_Y + 3}Z`,
  long: `M-9.4 ${HEAD_Y}A9.4 11 0 0 1 9.4 ${HEAD_Y}Q11 ${HEAD_Y + 14} 11.8 ${HEAD_Y + 26}Q12.6 ${HEAD_Y + 34} 9.6 ${HEAD_Y + 37}Q6 ${HEAD_Y + 35} 3.4 ${HEAD_Y + 38}Q0 ${HEAD_Y + 36} -3.4 ${HEAD_Y + 38}Q-6 ${HEAD_Y + 35} -9.6 ${HEAD_Y + 37}Q-12.6 ${HEAD_Y + 34} -11.8 ${HEAD_Y + 26}Q-11 ${HEAD_Y + 14} -9.4 ${HEAD_Y}Z`,
  // Bald from behind: a band of short hair round the back, low.
  bald: `M-8.9 ${HEAD_Y + 1}Q0 ${HEAD_Y + 4} 8.9 ${HEAD_Y + 1}Q8.6 ${HEAD_Y + 7} 6 ${HEAD_Y + 9.4}Q0 ${HEAD_Y + 11} -6 ${HEAD_Y + 9.4}Q-8.6 ${HEAD_Y + 7} -8.9 ${HEAD_Y + 1}Z`,
}
const backHair = computed(() => BACK[style.value] || ROUND)
const BACK_LINES = {
  short: `M-6.4 ${HEAD_Y + 5.4}Q0 ${HEAD_Y + 6.4} 6.4 ${HEAD_Y + 5.4}`,
  tousled: `M1 ${HEAD_Y - 6}Q-2.6 ${HEAD_Y - 6.4} -2 ${HEAD_Y - 3.2}Q-1.2 ${HEAD_Y - 1} 1.4 ${HEAD_Y - 2.4}`,
  long: `M-4 ${HEAD_Y - 4}Q-6.6 ${HEAD_Y + 14} -6.4 ${HEAD_Y + 33}M0.6 ${HEAD_Y - 6}Q-0.4 ${HEAD_Y + 14} 0.4 ${HEAD_Y + 34}M5 ${HEAD_Y - 3}Q7 ${HEAD_Y + 14} 6.8 ${HEAD_Y + 33}`,
}

// From the front: a cap of hair ending at the hairline, parted to one side;
// curls a fuller cap; the bald only what is left above the ears.
const CAP = `M-9 ${HEAD_Y + 1}C-9.6 ${HEAD_Y - 9} -4.5 ${HEAD_Y - 12} 0.5 ${HEAD_Y - 12}C5.5 ${HEAD_Y - 12} 9.6 ${HEAD_Y - 8.5} 9 ${HEAD_Y + 1}C6.6 ${HEAD_Y - 4.4} 2.2 ${HEAD_Y - 6} -1.6 ${HEAD_Y - 5.5}C-5 ${HEAD_Y - 5} -7.8 ${HEAD_Y - 2.2} -9 ${HEAD_Y + 1}Z`
const CURLS = `M-9.6 ${HEAD_Y + 1}C-11.4 ${HEAD_Y - 7} -7 ${HEAD_Y - 14} 0 ${HEAD_Y - 13.6}C7 ${HEAD_Y - 14} 11.4 ${HEAD_Y - 7} 9.6 ${HEAD_Y + 1}C7 ${HEAD_Y - 3.6} -7 ${HEAD_Y - 3.6} -9.6 ${HEAD_Y + 1}Z`
const SIDES = `M-9 ${HEAD_Y + 3}Q-9.6 ${HEAD_Y - 3} -7.4 ${HEAD_Y - 5.6}V${HEAD_Y + 4}ZM9 ${HEAD_Y + 3}Q9.6 ${HEAD_Y - 3} 7.4 ${HEAD_Y - 5.6}V${HEAD_Y + 4}Z`
const frontHair = computed(() => (style.value === 'bald' ? SIDES : style.value === 'curly' ? CURLS : CAP))
const BUN_Y = computed(() => HEAD_Y - (front.value ? 11 : 9))
</script>

<template>
  <g>

    <!-- The soft shadow they stand in. -->
    <ellipse cx="2" cy="0.5" rx="15" ry="3" fill="#000" opacity="0.12" />

    <!-- Legs, then shoes with a line of light along each. -->
    <g :transform="`translate(${step * 0.5} 0)`">
      <path :d="legShape(lift.left, 1)" :fill="look.legs" />
      <path :d="legShape(lift.right, -1)" :fill="look.legs" />
      <rect x="-10" :y="-6.4 - lift.left * 7" width="9" height="6.4" rx="2.8" :fill="look.shoes || '#262a33'" />
      <rect x="1" :y="-6.4 - lift.right * 7" width="9" height="6.4" rx="2.8" :fill="look.shoes || '#262a33'" />
    </g>

    <g :transform="carry">
      <!-- From in front, long hair falls behind the shoulders. -->
      <template v-if="style === 'long' && front">
        <path :d="`M-10 ${HEAD_Y - 2}V${HEAD_Y + 22}Q0 ${HEAD_Y + 26} 10 ${HEAD_Y + 22}V${HEAD_Y - 2}Z`" :fill="look.hair" />
      </template>

      <!-- The body: a shirt or jacket to the hip, or a coat or dress to the
           knee. -->
      <path :d="coat ? COAT : TORSO" :fill="look.shirt" />

      <!-- The neck, under the collar, with the head's shadow on it. -->
      <path :d="NECK" :fill="look.skin" />
      <path d="M-4.4 -100H4.4L4.8 -97H-4.8Z" fill="#000" opacity="0.16" />

      <!-- What the clothes say about them, kept small, as at a distance. -->
      <template v-if="front">
        <!-- A shirt's collar, or the skin of an open neck. -->
        <path v-if="look.collar" d="M-7.2 -93.8L0 -86L7.2 -93.8L5.4 -95.6H-5.4Z" :fill="look.collar" />
        <path v-else d="M-5.6 -93.6Q0 -86.8 5.6 -93.6Z" :fill="look.skin" />
        <template v-if="look.pattern === 'buttons'">
          <path d="M0 -86.5V-48" stroke="#000" stroke-width="0.7" opacity="0.18" />
          <circle v-for="y in [-82, -72, -62]" :key="y" cx="1.2" :cy="y" r="0.7" fill="#fff" opacity="0.5" />
        </template>
        <template v-if="look.wear === 'jacket'">
          <path d="M-5.5 -93L0 -80L5.5 -93" fill="none" stroke="#000" stroke-width="0.9" opacity="0.22" />
          <path d="M0 -80V-48" stroke="#000" stroke-width="0.8" opacity="0.2" />
        </template>
        <template v-if="look.pattern === 'badge'">
          <path d="M-4.4 -93L0 -76L4.4 -93" fill="none" stroke="#e5e7eb" stroke-width="0.9" />
          <rect x="-3.4" y="-77" width="6.8" height="8.4" rx="1" fill="#f4f1ea" />
          <rect x="-2.2" y="-75" width="4.4" height="1.4" fill="#2f6fb3" />
        </template>
        <path v-if="coat" d="M0 -88V-30" stroke="#000" stroke-width="0.8" opacity="0.14" />
      </template>
      <template v-else>
        <path v-if="look.wear === 'jacket'" d="M0 -91V-48" stroke="#000" stroke-width="0.8" opacity="0.18" />
        <path v-if="look.collar" d="M-6.6 -94Q0 -91.4 6.6 -94V-91.8Q0 -89.2 -6.6 -91.8Z" :fill="look.collar" />
      </template>
      <ellipse cx="0" cy="-92.8" rx="6.4" ry="1.5" fill="#000" opacity="0.12" />
      <rect v-if="coat" x="-14.6" y="-60" width="29.2" height="3.2" fill="#000" opacity="0.15" />

      <!-- A shoulder bag; a child's backpack, or its straps from in front. -->
      <template v-if="look.carries === 'bag'">
        <path d="M10 -93L-11 -58" stroke="#7a4e33" stroke-width="2" stroke-linecap="round" />
        <rect x="-19" y="-62" width="13" height="11" rx="2.4" fill="#ad724e" />
      </template>
      <template v-if="look.carries === 'backpack'">
        <template v-if="!front">
          <rect x="-10" y="-89" width="20" height="26" rx="5" :fill="look.pack || '#3d6fb6'" />
          <rect x="-7" y="-74" width="14" height="8" rx="2.5" fill="#000" opacity="0.14" />
        </template>
        <path v-else d="M-8 -93V-68M8 -93V-68" :stroke="look.pack || '#3d6fb6'" stroke-width="2.4" stroke-linecap="round" />
      </template>

      <!-- A Bible held to the chest. -->
      <g v-if="look.holding === 'bible' && front" transform="translate(-5 -72)">
        <rect x="-6" y="-8" width="12" height="15" rx="1.2" fill="#5a2e26" />
        <rect x="5" y="-7" width="1.4" height="13" fill="#e9e2d0" />
      </g>

      <!-- The head: small ears close to it, the head in its light, then the
           hair over it. -->
      <g :transform="head">
        <ellipse cx="-8.7" :cy="HEAD_Y + 1.2" rx="1.4" ry="2.2" :fill="look.skin" />
        <ellipse cx="8.7" :cy="HEAD_Y + 1.2" rx="1.4" ry="2.2" :fill="look.skin" />
        <ellipse cx="0" :cy="HEAD_Y" rx="8.9" ry="10.6" :fill="look.skin" />

        <template v-if="front">
          <path :d="frontHair" :fill="look.hair" />
          <circle v-if="style === 'bun'" cx="0" :cy="BUN_Y" r="4.4" :fill="look.hair" />
          <g v-if="look.glasses" fill="none" stroke="#2a2f3a" stroke-width="0.9">
            <circle cx="-3.6" :cy="HEAD_Y + 1" r="2.7" />
            <circle cx="3.6" :cy="HEAD_Y + 1" r="2.7" />
            <path :d="`M-0.9 ${HEAD_Y + 1}H0.9M-6.3 ${HEAD_Y + 0.4}L-8.6 ${HEAD_Y - 0.4}M6.3 ${HEAD_Y + 0.4}L8.6 ${HEAD_Y - 0.4}`" />
          </g>
        </template>
        <template v-else>
          <path :d="backHair" :fill="look.hair" />
          <circle v-if="style === 'bun'" cx="0" :cy="BUN_Y" r="4.4" :fill="look.hair" />
          <path v-if="BACK_LINES[style]" :d="BACK_LINES[style]" fill="none" stroke="#000" stroke-width="0.8" stroke-linecap="round" opacity="0.22" />
        </template>
      </g>

      <!-- A guitar, slung across the body, the neck up to the right. -->
      <g v-if="pose === 'guitar'" :transform="`rotate(${-28 + motion * 2} 2 -58)`">
        <rect x="2" y="-60.5" width="50" height="5" rx="2" fill="#5a3b25" />
        <rect x="49" y="-62" width="7" height="8" rx="1.5" fill="#4a2f1c" />
        <ellipse cx="2" cy="-58" rx="16" ry="13" fill="#c65d4f" />
        <circle cx="2" cy="-58" r="4.2" fill="#2f3a52" />
      </g>

      <!-- The arms, after the body and the head, so a hand can come in front
           of them: the sleeves, then what the hands hold, then the hands
           closing round it. -->
      <template v-for="limb in arms" :key="limb.side">
        <path :d="limb.sleeve" :fill="look.shirt" />
        <path :d="limb.lines" fill="none" stroke="#000" stroke-width="0.7" stroke-linecap="round" opacity="0.16" />
      </template>
      <g v-if="look.holding === 'phone'" :transform="`translate(${arms[1].at[0]} ${arms[1].at[1]}) rotate(-12)`">
        <rect x="-3.2" y="-10" width="6.4" height="10.5" rx="1.2" fill="#1f2430" />
        <rect x="-2.4" y="-9" width="4.8" height="8" rx="0.6" fill="#7fb2e6" opacity="0.8" />
      </g>
      <g v-else-if="look.holding === 'mic'" :transform="`translate(${arms[1].at[0]} ${arms[1].at[1]})`">
        <rect x="-1.2" y="-9" width="2.4" height="12" rx="1" fill="#2a2f3a" />
        <ellipse cx="0" cy="-10.4" rx="2.6" ry="3" fill="#4b5563" />
      </g>
      <template v-if="pose === 'drums'">
        <path
          v-for="limb in arms"
          :key="'stick-' + limb.side"
          :d="`M${limb.at[0] + (limb.side === 'l' ? -2.8 : 2.8)} ${limb.at[1] - 2.1}l${limb.side === 'l' ? 10.8 : -10.8} 8.1`"
          stroke="#c9a77d"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </template>
      <template v-for="limb in arms" :key="'hand-' + limb.side">
        <path :d="HANDS[limb.kind].d" :transform="limb.hand" :fill="look.skin" />
        <path :d="HANDS[limb.kind].lines" :transform="limb.hand" fill="none" stroke="#000" stroke-width="0.5" stroke-linecap="round" opacity="0.2" />
      </template>
    </g>
  </g>
</template>

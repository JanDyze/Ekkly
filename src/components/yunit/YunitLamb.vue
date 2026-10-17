<script>
// His walk, in the units he is drawn in (240 across): one step of each leg
// takes `period` ms, and a leg reaches `reach` ahead of where it rests and as
// far behind, lifting `lift` as it swings through.
const WALK = { period: 360, reach: 12, lift: 9 }
// How fast a page must carry him while he walks, in his own widths a second,
// for his planted legs not to slide: each travels its reach and back
// (4 × reach) in a step.
export const LAMB_WALK_SPEED = ((4 * WALK.reach) / WALK.period) * 1000 / 240
</script>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// YUNIT as a lamb, for the lost page (LostYunit): one round of cream fleece,
// as YUNIT is one round, his face on it, floppy ears at his sides and navy
// feet like YUNIT's own. His four colours — yellow, orange, teal, blue — are
// a few patches of dyed wool woven into his fleece, somewhere new each time
// (FLEECE, below), and the four panes of the lantern he holds in one hoof.
//
// He walks (`walking`): his legs step, each planted while the other swings,
// his body bobbing over them and his ears flopping, the lantern swinging. He
// looks about (play('glance')), hops (play('hop')), hops when tapped, and
// blinks now and then. Nothing else moves while he stands — no breathing, no
// bobbing (BRAND.md) — and with less motion asked for, nothing moves at all.
//
// His colours are his own, as they are in YunitMascot, so they are written
// here rather than taken from the church's tokens.

const props = defineProps({
  // Walking, for as long as it is true: the page carries him across itself at
  // LAMB_WALK_SPEED of his width a second.
  walking: { type: Boolean, default: false },
  // His lantern, held up and lit.
  lantern: { type: Boolean, default: true },
  // Saying "Baa!": his mouth open, round, for as long as it is true. He has
  // no mouth drawn otherwise, as a lamb's face reads without one.
  bleating: { type: Boolean, default: false },
})

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const whole = ref(null)
const upper = ref(null)
const legL = ref(null)
const legR = ref(null)
const earL = ref(null)
const earR = ref(null)
const lamp = ref(null)
const look = ref(null)
const lids = ref(null)
const shadow = ref(null)

// Where a leg is in its step, `p` from 0 to 1. For the first half it is
// planted, sliding back under him exactly as fast as he goes forward, so on
// the ground it stays put; for the second it lifts and swings forward.
const legAt = (p) => {
  if (p < 0.5) return [WALK.reach - (p / 0.5) * WALK.reach * 2, 0]
  const swing = (p - 0.5) / 0.5
  const eased = swing * swing * (3 - 2 * swing)
  return [-WALK.reach + eased * WALK.reach * 2, -Math.sin(Math.PI * swing) * WALK.lift]
}

// How far into his walk he is (0 standing, 1 striding), eased each frame, so
// he sets off and stops rather than snapping.
let step = 0
let frame = 0
let last = 0
const f = (n) => Math.round(n * 100) / 100
const tick = (now) => {
  const dt = Math.min(0.05, (now - (last || now)) / 1000)
  last = now
  step += ((props.walking ? 1 : 0) - step) * Math.min(1, dt * 9)
  const gait = (now / WALK.period) % 1
  const turn = Math.PI * 2 * gait
  ;[legL, legR].forEach((leg, i) => {
    const [x, y] = legAt((gait + i * 0.5) % 1)
    leg.value?.setAttribute('transform', `translate(${f(x * step)} ${f(y * step)})`)
  })
  // Up a little over each leg as it passes under him, rocking from one to
  // the other; his ears lag behind the bob, and the lantern swings.
  const bob = -Math.abs(Math.sin(turn)) * 3.5 * step
  upper.value?.setAttribute('transform', `translate(0 ${f(bob)}) rotate(${f(Math.sin(turn) * 2.5 * step)} 120 226)`)
  earL.value?.setAttribute('transform', `rotate(${f(-bob * 3)} 60 128)`)
  earR.value?.setAttribute('transform', `rotate(${f(bob * 3)} 180 128)`)
  lamp.value?.setAttribute('transform', `rotate(${f(Math.sin(turn + 1) * 9 * step)} 139 190)`)
  if (props.walking || step > 0.005) frame = requestAnimationFrame(tick)
  else {
    frame = 0
    last = 0
  }
}
const walk = () => {
  if (reduced || frame) return
  frame = requestAnimationFrame(tick)
}
watch(() => props.walking, (on) => on && walk())

// Things he does once, played on their parts so nothing jumps back after.
const play = (name) => {
  if (reduced) return
  if (name === 'glance') {
    look.value?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)', offset: 0.15 },
        { transform: 'translateX(-4px)', offset: 0.42 },
        { transform: 'translateX(4px)', offset: 0.58 },
        { transform: 'translateX(4px)', offset: 0.85 },
        { transform: 'translateX(0)' },
      ],
      { duration: 1700, easing: 'ease-in-out' }
    )
  } else if (name === 'hop') {
    whole.value?.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-16px)', offset: 0.3, easing: 'ease-in' },
        { transform: 'translateY(0)', offset: 0.55 },
        { transform: 'translateY(-7px)', offset: 0.75, easing: 'ease-in' },
        { transform: 'translateY(0)' },
      ],
      { duration: 700, easing: 'ease-out' }
    )
    shadow.value?.animate(
      [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.8)', offset: 0.3 }, { transform: 'scaleX(1)', offset: 0.55 }, { transform: 'scaleX(0.9)', offset: 0.75 }, { transform: 'scaleX(1)' }],
      { duration: 700 }
    )
  }
}

// Now and then a blink, both eyes alike, at uneven gaps.
let blinkTimer = null
const blink = () => {
  blinkTimer = setTimeout(() => {
    lids.value?.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.08)', offset: 0.5 }, { transform: 'scaleY(1)' }], { duration: 150 })
    blink()
  }, 2400 + Math.random() * 4000)
}

onMounted(() => {
  if (reduced) return
  blink()
  if (props.walking) walk()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  clearTimeout(blinkTimer)
})

defineExpose({ play })

// He is one round, as YUNIT always is: no head on a body, his face on the
// fleece itself. The fleece is lumps of wool lying over one another: a ring
// of them round his edge, and a ring further in lying over that, each lump
// drawn in its shade and then a little smaller and higher in its light, so
// each is lit from above and the next one's edge shows where it overlaps.
//
// His colours are a few patches of dyed wool woven into his fleece: four
// irregular patches, one of each colour, one large, one middling and two
// small, set somewhere new round him each time he is drawn (never at his
// foot, among his legs and his lantern) and never close together. Each is a
// clump of coloured lumps, most lying under the white ones round his edge
// and one or two on top of them, in the wool, with a small cream lump over
// it, so the colour shows plainly and is in the wool rather than on it
// and never makes a ring round him. His face stays cream: the ring further
// in and his face are drawn over every colour, so nothing dyed reaches it.
// Soft dyed-wool tints.
const WHITE = { shade: '#eadfcd', light: '#fbf6ec' }
const COLOURS = [
  { shade: '#f5b83d', light: '#ffd36b' },
  { shade: '#f2804f', light: '#ffa577' },
  { shade: '#2fb3bb', light: '#62cfd4' },
  { shade: '#3d8ff0', light: '#70b3ff' },
]
const SLOTS = 14
const between = (low, high) => low + Math.random() * (high - low)
const shuffle = (list) => list.map((item) => [Math.random(), item]).sort((a, b) => a[0] - b[0]).map(([, item]) => item)
const toRadians = (degrees) => (degrees * Math.PI) / 180
const at = (degrees, rx, ry = rx) => [120 + Math.cos(toRadians(degrees)) * rx, 140 + Math.sin(toRadians(degrees)) * ry]
const slotDegrees = (i) => (i / SLOTS) * 360
// How far apart two places round him are, in degrees.
const apart = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180)
// The patches, largest first: how many lumps, and how big each may be.
const PATCHES = [
  { lumps: 5, small: 13, large: 19 },
  { lumps: 4, small: 12, large: 16 },
  { lumps: 3, small: 10, large: 14 },
  { lumps: 2, small: 10, large: 13 },
]
// Round him in degrees, clockwise from his right: from low on his left up
// to his topknot, and from his topknot down to low on his right. Not at his
// foot, among his legs and his lantern, and not under his topknot, which
// would hide a patch whole.
const ROOM = [
  [140, 248],
  [292, 400],
]
const somewhere = () => {
  const span = ROOM.reduce((sum, [low, high]) => sum + high - low, 0)
  let at = Math.random() * span
  for (const [low, high] of ROOM) {
    if (at < high - low) return low + at
    at -= high - low
  }
  return ROOM[0][0]
}
const placeFleece = () => {
  const centres = []
  for (let tries = 0; centres.length < PATCHES.length && tries < 400; tries++) {
    const centre = somewhere()
    if (centres.every((other) => apart(centre, other) >= 62)) centres.push(centre)
  }
  const colours = shuffle(COLOURS)
  const under = []
  const over = []
  const woven = []
  centres.forEach((centre, n) => {
    const patch = PATCHES[n]
    const spread = 8 + patch.lumps * 4
    // Most of a patch lies under the white round his edge, bulging past it;
    // one or two of its lumps lie on top, in the wool itself, so every patch
    // shows plainly however the white falls over the rest.
    for (let i = 0; i < patch.lumps; i++) {
      under.push({ ...colours[n], puff: [...at(centre + between(-spread, spread), between(68, 76), between(66, 74)), between(patch.small, patch.large)] })
    }
    for (let i = 0; i < (patch.lumps > 3 ? 2 : 1); i++) {
      over.push({ ...colours[n], puff: [...at(centre + between(-spread * 0.6, spread * 0.6), between(61, 66), between(59, 64)), between(patch.small * 0.8, patch.large * 0.8)] })
    }
    // A small cream lump over the patch, so it is woven in.
    woven.push({ ...WHITE, puff: [...at(centre + between(-spread * 0.7, spread * 0.7), between(58, 64)), between(6, 8)] })
  })
  // The white lumps round his edge lie over the patches; where one is right
  // over a patch's middle it is smaller, so the colour shows round it.
  const outer = Array.from({ length: SLOTS }, (_, i) => {
    const near = Math.min(...centres.map((centre) => apart(slotDegrees(i), centre)))
    return { ...WHITE, puff: [...at(slotDegrees(i), 64, 62), near < 12 ? 10 : near < 22 ? 14 : 18] }
  })
  const inner = Array.from({ length: SLOTS }, (_, i) => ({ ...WHITE, puff: [...at(slotDegrees(i + 0.5), 50, 48), 15] }))
  return [{ ...WHITE, puff: [120, 140, 62] }, ...under, ...outer, ...over, ...woven, ...inner]
}
const FLEECE = placeFleece()
const TUFT = [
  [104, 76, 15],
  [122, 70, 17],
  [140, 77, 14],
]
</script>

<template>
  <svg class="yunit-lamb" viewBox="0 0 240 240" role="img" aria-label="YUNIT the Sheep" @click="play('hop')">
    <ellipse ref="shadow" class="lamb-shadow" cx="120" cy="230" rx="58" ry="6" />

    <g ref="whole">
      <!-- His legs, navy like YUNIT's feet, under the fleece, each stepping
           on its own. -->
      <g ref="legL">
        <ellipse cx="96" cy="221" rx="16" ry="10" fill="#1d3a66" />
      </g>
      <g ref="legR">
        <ellipse cx="144" cy="221" rx="16" ry="10" fill="#1d3a66" />
      </g>

      <g ref="upper">
        <!-- Floppy ears, pink inside, hanging from his sides and flopping as
             he walks: behind the fleece, so he stays one round. -->
        <g ref="earL">
          <ellipse cx="44" cy="138" rx="30" ry="14" transform="rotate(-34 44 138)" fill="#f2e8d8" />
          <ellipse cx="40" cy="141" rx="18" ry="7.5" transform="rotate(-34 40 141)" fill="#f49a87" />
        </g>
        <g ref="earR">
          <ellipse cx="196" cy="138" rx="30" ry="14" transform="rotate(34 196 138)" fill="#f2e8d8" />
          <ellipse cx="200" cy="141" rx="18" ry="7.5" transform="rotate(34 200 141)" fill="#f49a87" />
        </g>

        <!-- Him: one round of fleece, lumps over lumps, his colours among
             them, and his face on it. -->
        <g v-for="(lump, n) in FLEECE" :key="n">
          <circle :cx="lump.puff[0]" :cy="lump.puff[1]" :r="lump.puff[2]" :fill="lump.shade" />
          <circle :cx="lump.puff[0] - 1" :cy="lump.puff[1] - 3" :r="lump.puff[2] - 3" :fill="lump.light" />
        </g>
        <ellipse cx="120" cy="134" rx="50" ry="42" fill="#fffdf7" />

        <!-- A woolly topknot. -->
        <circle v-for="([x, y, r], i) in TUFT" :key="'ts' + i" :cx="x" :cy="y" :r="r" fill="#eadfcd" />
        <circle v-for="([x, y, r], i) in TUFT" :key="'tl' + i" :cx="x - 1" :cy="y - 2" :r="r - 3" fill="#fbf6ec" />

        <!-- His eyes: where he looks, and his lids, for a blink. -->
        <g ref="look">
          <g ref="lids" class="lamb-lids">
            <ellipse cx="103" cy="132" rx="8" ry="11" fill="#2b2838" />
            <ellipse cx="139" cy="129" rx="8" ry="11" fill="#2b2838" />
            <circle cx="105.8" cy="127" r="2.9" fill="#fff" />
            <circle cx="141.8" cy="124" r="2.9" fill="#fff" />
          </g>
        </g>

        <!-- His mouth, open round for a "Baa!". -->
        <g v-if="bleating">
          <ellipse cx="121" cy="152" rx="7" ry="8.5" fill="#5b2135" />
          <ellipse cx="121" cy="156" rx="4.5" ry="3" fill="#e8798b" />
        </g>

        <!-- His forelegs, held up in front of him, navy hooves in. -->
        <circle cx="106" cy="190" r="8" fill="#1d3a66" />
        <ellipse cx="100" cy="176" rx="10" ry="13" transform="rotate(-22 100 176)" fill="#fbf6ec" stroke="#e3d6c1" stroke-width="2" />
        <circle cx="138" cy="190" r="8" fill="#1d3a66" />
        <ellipse cx="144" cy="176" rx="10" ry="13" transform="rotate(22 144 176)" fill="#fbf6ec" stroke="#e3d6c1" stroke-width="2" />

        <!-- His lantern, hanging from his hoof, lit through four panes of
             glass in his four colours, like a church window. -->
        <g v-if="lantern" ref="lamp">
          <g transform="translate(139 190) scale(1.15)">
            <path d="M-6 5Q0 -7 6 5" fill="none" stroke="#1d3a66" stroke-width="2.4" stroke-linecap="round" />
            <rect x="-9" y="4" width="18" height="5" rx="2" fill="#1d3a66" />
            <rect x="-7.5" y="8.5" width="15" height="19" rx="4" fill="#fff3c4" />
            <rect x="-6.5" y="9.5" width="6" height="8" fill="#ffcb4a" opacity="0.9" />
            <rect x="0.5" y="9.5" width="6" height="8" fill="#ff8d4a" opacity="0.9" />
            <rect x="-6.5" y="18.5" width="6" height="8" fill="#2290ff" opacity="0.9" />
            <rect x="0.5" y="18.5" width="6" height="8" fill="#20b9c2" opacity="0.9" />
            <circle cx="0" cy="18" r="3.4" fill="#fff8d6" />
            <rect x="-7.5" y="8.5" width="15" height="19" rx="4" fill="none" stroke="#1d3a66" stroke-width="1.6" />
            <path d="M0 9V27M-7 18H7" stroke="#1d3a66" stroke-width="1.2" />
            <rect x="-10" y="27" width="20" height="5" rx="2" fill="#1d3a66" />
          </g>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.yunit-lamb {
  display: block;
  overflow: visible;
  cursor: pointer;
}
.lamb-shadow {
  fill: rgb(2 6 23 / 0.35);
  transform-box: fill-box;
  transform-origin: center;
}
.lamb-lids {
  transform-box: fill-box;
  transform-origin: center;
}
</style>

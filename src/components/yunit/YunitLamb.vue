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
// as YUNIT is one round, his face on it, ears out at his sides and navy feet
// like YUNIT's own. His four colours — yellow, orange, teal, blue — are a
// crown of curly dyed wool on his head, and the four panes of the lantern he
// holds in one hoof. He is drawn flat, as the brand's artwork is: no shading,
// only a pale edge round him and a few curls in the wool.
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
const lidL = ref(null)
const lidR = ref(null)
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
  earL.value?.setAttribute('transform', `rotate(${f(-bob * 3)} 76 142)`)
  earR.value?.setAttribute('transform', `rotate(${f(bob * 3)} 166 130)`)
  lamp.value?.setAttribute('transform', `rotate(${f(Math.sin(turn + 1) * 9 * step)} 146 190)`)
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

// Now and then a blink, both eyes alike, at uneven gaps. Each eye closes on
// its own middle, as his head is tilted and one sits higher than the other.
let blinkTimer = null
const blink = () => {
  blinkTimer = setTimeout(() => {
    ;[lidL, lidR].forEach((lid) => lid.value?.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.08)', offset: 0.5 }, { transform: 'scaleY(1)' }], { duration: 150 }))
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
// fleece itself. The fleece is a cloud of lumps round one oval, all one
// cream, every lump drawn first a little larger in white, so a pale edge
// runs round the outside of him and nowhere inside.
const WOOL = { edge: '#ffffff', fill: '#fbf7ef', curl: '#e6dfd2' }
const LUMPS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2
  return [120 + Math.cos(angle) * 50, 145 + Math.sin(angle) * 58, i % 2 ? 13.5 : 15]
})

// The curls in his wool: short strokes, a few on his cheeks and more lower
// down, none across his eyes.
const CURLS = [
  'M71 120q-5 10 6 13',
  'M116 120q6 6 13-3',
  'M84 144q8 4 13-8',
  'M82 162q3 13 16 12',
  'M164 160q2 16-14 18',
  'M146 177q-2 12-14 13',
  'M83 188q1 10 10 10',
  'M116 201q7 8 15 2',
  'M158 192q9 0 11-9',
]

// His crown: a clump of curly dyed wool in each of his colours, each a few
// round lobes with a curl of its deeper shade on it. Blue lies over yellow
// and teal over orange, as the wool would fall.
const CROWN = [
  { x: 91, y: 98, r: 19, fill: '#ffd35c', curl: '#f0b23a' },
  { x: 133, y: 86, r: 21, fill: '#ff8350', curl: '#ec6634' },
  { x: 101, y: 114, r: 17, fill: '#4499f5', curl: '#2b7ee0' },
  { x: 157, y: 110, r: 17, fill: '#3ab5b4', curl: '#24999a' },
].map(({ x, y, r, fill, curl }) => ({
  fill,
  curl,
  lobes: [
    [x, y, r * 0.7],
    [x - r * 0.42, y - r * 0.24, r * 0.58],
    [x + r * 0.38, y - r * 0.36, r * 0.6],
    [x + r * 0.5, y + r * 0.26, r * 0.52],
    [x + r * 0.02, y + r * 0.48, r * 0.5],
    [x - r * 0.46, y + r * 0.3, r * 0.5],
  ],
  path: `M${f(x - r * 0.3)} ${f(y + r * 0.18)}q${f(r * 0.04)} ${f(-r * 0.46)} ${f(r * 0.46)} ${f(-r * 0.4)}`,
}))
</script>

<template>
  <svg class="yunit-lamb" viewBox="0 0 240 240" role="img" aria-label="YUNIT the Sheep" @click="play('hop')">
    <ellipse ref="shadow" class="lamb-shadow" cx="122" cy="229" rx="56" ry="5" />

    <g ref="whole">
      <!-- His legs, navy like YUNIT's feet, peeking from under the fleece,
           each stepping on its own. -->
      <g ref="legL">
        <ellipse cx="103" cy="221" rx="12" ry="7.5" fill="#233a64" />
      </g>
      <g ref="legR">
        <ellipse cx="144" cy="221" rx="12" ry="7.5" fill="#233a64" />
      </g>

      <g ref="upper">
        <!-- His ears, out at his sides, pink inside, flopping as he walks:
             behind the fleece, so he stays one round. -->
        <g ref="earL">
          <ellipse cx="54" cy="154" rx="31" ry="17" transform="rotate(-40 54 154)" :fill="WOOL.edge" />
          <ellipse cx="54" cy="154" rx="28.5" ry="14.5" transform="rotate(-40 54 154)" :fill="WOOL.fill" />
          <ellipse cx="50" cy="158" rx="19" ry="7.5" transform="rotate(-40 50 158)" fill="#fcc8c8" />
        </g>
        <g ref="earR">
          <ellipse cx="188" cy="134" rx="29" ry="16" transform="rotate(26 188 134)" :fill="WOOL.edge" />
          <ellipse cx="188" cy="134" rx="26.5" ry="13.5" transform="rotate(26 188 134)" :fill="WOOL.fill" />
          <ellipse cx="192" cy="136" rx="17" ry="7" transform="rotate(26 192 136)" fill="#fcc8c8" />
        </g>

        <!-- Him: one cloud of fleece, its pale edge, then the wool. -->
        <ellipse cx="120" cy="145" rx="54.5" ry="62.5" :fill="WOOL.edge" />
        <circle v-for="([x, y, r], i) in LUMPS" :key="'le' + i" :cx="x" :cy="y" :r="r + 2.5" :fill="WOOL.edge" />
        <ellipse cx="120" cy="145" rx="52" ry="60" :fill="WOOL.fill" />
        <circle v-for="([x, y, r], i) in LUMPS" :key="'lf' + i" :cx="x" :cy="y" :r="r" :fill="WOOL.fill" />
        <path v-for="(d, i) in CURLS" :key="'c' + i" :d="d" fill="none" :stroke="WOOL.curl" stroke-width="2.6" stroke-linecap="round" />

        <!-- His crown of dyed wool. -->
        <g v-for="(clump, i) in CROWN" :key="'k' + i">
          <circle v-for="([x, y, r], j) in clump.lobes" :key="j" :cx="x" :cy="y" :r="r" :fill="clump.fill" />
          <path :d="clump.path" fill="none" :stroke="clump.curl" stroke-width="2.6" stroke-linecap="round" />
        </g>

        <!-- His eyes, his head tipped so one sits higher: where he looks,
             and each eye's lid, for a blink. -->
        <g ref="look">
          <g ref="lidL" class="lamb-lids">
            <ellipse cx="109" cy="154" rx="8" ry="10" fill="#233a64" />
            <circle cx="110.6" cy="149.6" r="2.3" fill="#fff" />
          </g>
          <g ref="lidR" class="lamb-lids">
            <ellipse cx="145" cy="144" rx="8" ry="10" fill="#233a64" />
            <circle cx="146.6" cy="139.6" r="2.3" fill="#fff" />
          </g>
        </g>

        <!-- His mouth, open round for a "Baa!". -->
        <g v-if="bleating">
          <ellipse cx="129" cy="171" rx="6" ry="7.5" fill="#5b2135" />
          <ellipse cx="129" cy="174.5" rx="4" ry="2.6" fill="#e8798b" />
        </g>

        <!-- His lantern, hanging from a hoof held out of the fleece, lit
             through four panes of glass in his four colours, like a church
             window. -->
        <g v-if="lantern">
          <circle cx="146" cy="188" r="7.5" fill="#233a64" />
          <g ref="lamp">
            <g transform="translate(146 190) scale(1.15)">
              <path d="M-6 5Q0 -7 6 5" fill="none" stroke="#233a64" stroke-width="2.4" stroke-linecap="round" />
              <rect x="-9" y="4" width="18" height="5" rx="2" fill="#233a64" />
              <rect x="-7.5" y="8.5" width="15" height="19" rx="4" fill="#fff3c4" />
              <rect x="-6.5" y="9.5" width="6" height="8" fill="#ffd35c" opacity="0.9" />
              <rect x="0.5" y="9.5" width="6" height="8" fill="#ff8350" opacity="0.9" />
              <rect x="-6.5" y="18.5" width="6" height="8" fill="#4499f5" opacity="0.9" />
              <rect x="0.5" y="18.5" width="6" height="8" fill="#3ab5b4" opacity="0.9" />
              <circle cx="0" cy="18" r="3.4" fill="#fff8d6" />
              <rect x="-7.5" y="8.5" width="15" height="19" rx="4" fill="none" stroke="#233a64" stroke-width="1.6" />
              <path d="M0 9V27M-7 18H7" stroke="#233a64" stroke-width="1.2" />
              <rect x="-10" y="27" width="20" height="5" rx="2" fill="#233a64" />
            </g>
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
  fill: rgb(2 6 23 / 0.3);
  transform-box: fill-box;
  transform-origin: center;
}
.lamb-lids {
  transform-box: fill-box;
  transform-origin: center;
}
</style>

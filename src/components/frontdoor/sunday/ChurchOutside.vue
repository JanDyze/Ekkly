<script setup>
import { computed } from 'vue'
import StoryMark from './StoryMark.vue'
import FamilyFigure from './FamilyFigure.vue'
import { CROSS, CROSS_SIDES, RECESS, RIM, throughDoorway } from './hall'
import { seeded } from './people'
import { ROWS } from './pews'
import { ease, lerp, span } from './timeline'

// The church from the front, on its hill, for the Sunday the front door
// tells: white walls, a blue roof, Ekkly's mark as its great window, turned to
// face the reader so the camera can walk straight up the path and in at the
// door. Drawn to the cover art the front door was designed from (References/
// "A Sunday at Ekkly Church.png"): its proportions, its layers and its colours,
// which were sampled from it rather than guessed.
//
// The doorway is cut out of the picture (the mask below), and the inside of
// the church is drawn underneath it (ChurchInside), so opening the doors shows
// the room through them and walking in is the camera going through the hole.
// On the cover, seen from the path, the doorway glows gold instead, as a lit
// room does from outside; the glow gives way to the room itself as the camera
// comes in.
//
// Drawn on a 1600 × 1000 canvas. The church stands on y 851 with its door at
// x 736–864, y 700–851. The sky and the ground run on far past the picture on
// every side, because a phone's camera sees much more height than a desktop's.

const props = defineProps({
  viewBox: { type: String, required: true },
  // How far the doors have swung in, from 0 to 1.
  open: { type: Number, default: 0 },
  // The time of day: 0 is morning, then dusk, then night.
  dusk: { type: Number, default: 0 },
  night: { type: Number, default: 0 },
  // The family walking up to the door in the morning, and back out at night.
  walkIn: { type: Number, default: 0 },
  walkOut: { type: Number, default: 0 },
  // The navy the opening is drawn on (SundayStory), from 1 to 0 as it lifts
  // off the church: over everything but the great window, so at first the
  // window stands alone on it, as Ekkly's logo.
  veil: { type: Number, default: 0 },
  // How far the camera has come in from the cover's view: 1 there, smaller
  // as it closes on the door. Drives the parallax and the doorway's glow.
  depth: { type: Number, default: 1 },
})

// Parallax: as the camera walks in toward the door, what is far away grows
// more slowly than what is near, so the far layers are scaled back about the
// door by a share of the camera's zoom.
const layer = (share) => {
  const k = Math.pow(Math.min(1, props.depth), share)
  return `translate(800 776) scale(${k}) translate(-800 -776)`
}
const far = computed(() => layer(0.45))
const middle = computed(() => layer(0.2))
// The doorway's gold, full on the cover and gone by the time the camera
// stands at the door, before it starts into the room: until then the room is
// seen through the doorway just where the glow draws it (hall.js), so the one
// gives way to the other without the cross in it moving.
const glow = computed(() => Math.min(1, Math.max(0, (props.depth - 0.5) / 0.35)))

/** Two colours mixed, `x` of the way from the first to the second. */
const mix = (a, b, x) => {
  const from = a.match(/\w\w/g).map((h) => parseInt(h, 16))
  const to = b.match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${from.map((c, i) => Math.round(lerp(c, to[i], x))).join(' ')})`
}
const leaf = computed(() => mix('1e64aa', '14284a', props.night))
const leafLine = computed(() => mix('17508a', '0e1d38', props.night))

// The sun sets as the evening comes on.
const sunY = computed(() => 375 + props.dusk * 420 + props.night * 300)

const STARS = (() => {
  const random = seeded(7)
  return Array.from({ length: 46 }, () => ({
    x: lerp(-600, 2200, random()),
    y: lerp(-500, 560, random()),
    r: lerp(1.1, 2.6, random()),
    o: lerp(0.45, 1, random()),
  }))
})()

// The distant tree line along the far hills: a scalloped edge of crowns.
const TREELINE = (() => {
  const random = seeded(19)
  let d = 'M-1400 760V700'
  for (let x = -1400; x < 3000; ) {
    const w = 16 + random() * 26
    const rise = 8 + random() * 18
    const base = 698 + random() * 6
    d += `C${x + w * 0.1} ${base - rise} ${x + w * 0.9} ${base - rise} ${x + w} ${base}`
    x += w
  }
  return `${d}V760Z`
})()

// The village on the far hill to the right: [x, base y, width, height, roof].
const VILLAGE = [
  [1212, 706, 24, 15, '#e2a587'],
  [1234, 702, 30, 20, '#e2a587'],
  [1264, 704, 34, 18, '#d98f72'],
  [1296, 706, 22, 14, '#e2a587'],
]

// Cypresses on the hills: [x, base y, height, width].
const CYPRESSES = [
  [1330, 714, 70, 22],
  [1250, 828, 96, 26],
  [1286, 822, 88, 24],
  [318, 752, 58, 20],
  [290, 760, 48, 17],
  [1452, 800, 80, 22],
]
const cypress = (h, w) => `M0 ${-h}C${w * 0.62} ${-h * 0.8} ${w * 0.58} ${-h * 0.14} ${w * 0.3} 0H${-w * 0.3}C${-w * 0.58} ${-h * 0.14} ${-w * 0.62} ${-h * 0.8} 0 ${-h}Z`

// Round trees: [x, base y, size]. A canopy of overlapping crowns in two
// greens, and the trunk forking into branches drawn over its lower part, as
// the cover has them.
const TREES = [
  [359, 870, 0.92],
  [1161, 882, 0.86],
  [462, 866, 0.47],
  [506, 864, 0.42],
  [282, 772, 0.36],
  [190, 800, 0.5],
  [120, 784, 0.38],
  [1400, 802, 0.5],
  [1488, 788, 0.4],
]
const CROWNS = [
  [0, -118, 44], [-36, -100, 36], [36, -102, 36], [-44, -72, 28], [44, -74, 28],
  [-18, -62, 30], [20, -62, 30], [-24, -138, 30], [24, -140, 30],
]
const LIGHT_CROWNS = [
  [-28, -130, 22], [-46, -98, 15], [-8, -150, 16],
]

// Bushes along the foot of the church: [x, y, r], darker then lighter.
const BUSHES = [
  [500, 872, 16], [516, 862, 22], [548, 852, 28], [586, 856, 26], [622, 852, 24], [654, 864, 20],
  [886, 864, 20], [918, 852, 26], [956, 856, 28], [996, 850, 26], [1034, 856, 24], [1070, 864, 20], [1094, 872, 16],
]
const BUSH_TOPS = [
  [540, 842, 14], [580, 846, 12], [616, 842, 11], [912, 842, 13], [950, 844, 14], [992, 840, 13], [1030, 846, 11],
]
// The leaves picked out on the bushes: a small fork of two strokes each.
const BUSH_LEAVES = [
  [532, 858], [566, 848], [604, 858], [640, 860], [904, 860], [938, 850], [976, 860], [1014, 852], [1052, 862],
]

// Broad leaves at the near corners, fanning from a stem off the picture:
// [base x, base y, angle, length, width].
const FERNS = [
  [330, 1062, -62, 150, 46], [330, 1062, -34, 172, 50], [330, 1062, -6, 140, 44], [330, 1062, -84, 118, 40], [330, 1062, 22, 118, 40], [330, 1062, 46, 96, 34],
  [1330, 1062, 62, 172, 52], [1330, 1062, 34, 182, 52], [1330, 1062, 6, 150, 46], [1330, 1062, 84, 132, 42], [1330, 1062, -22, 130, 42], [1330, 1062, -48, 108, 36],
  [1420, 1010, -20, 160, 50], [1420, 1010, -48, 150, 48], [1420, 1010, -74, 130, 44], [1420, 1010, 6, 120, 40],
]
const FERN_GREENS = ['#0d585b', '#11665f', '#0a4d55']
const fern = (l, w) => `M0 0C${w * 0.62} ${-l * 0.3} ${w * 0.5} ${-l * 0.76} 0 ${-l}C${-w * 0.5} ${-l * 0.76} ${-w * 0.62} ${-l * 0.3} 0 0Z`

// The branch reaching into the top right, its leaves hanging from it:
// [x, y, angle, length, colour].
const BRANCH_LEAVES = [
  [1236, 368, 150, 40, '#97bf5c'], [1262, 354, 108, 44, '#62a753'], [1290, 342, 142, 46, '#97bf5c'], [1318, 328, 96, 48, '#459354'],
  [1346, 314, 128, 50, '#62a753'], [1300, 350, 64, 42, '#459354'], [1336, 334, 70, 46, '#97bf5c'], [1366, 322, 52, 44, '#459354'],
  [1252, 362, -150, 36, '#62a753'], [1322, 330, -128, 40, '#97bf5c'], [1372, 304, -164, 44, '#62a753'], [1384, 300, 92, 46, '#97bf5c'],
]
const almond = (l) => `M0 0Q${l * 0.5} ${-l * 0.32} ${l} 0Q${l * 0.5} ${l * 0.32} 0 0Z`

// The family (FamilyFigure) come from behind the reader: off the foot of the
// picture as the church comes into view, so nobody stands about on the cover
// waiting to be told to move, then up the path and in at the door. They walk
// at an even pace, so they are placed by how far off they are, big and quick
// across the foreground and smaller and slower up the hill, as people walking
// away are. In the cover art's pixels, someone drawn `s` times their size
// has their feet on y = HORIZON + DROP × s: FAR puts them below the foot of
// the picture on any shape of screen, NEAR in the middle of the path, and
// AT_DOOR at about three quarters of the door's height. `side` is where
// each walks across the path, at their own size; `door` is where they go in.
const FAMILY = [
  { key: 'dad', side: -60, door: 786, phase: 0 },
  { key: 'child', side: 0, door: 800, phase: Math.PI + 0.6 },
  { key: 'mum', side: 58, door: 814, phase: 1.1 },
]
const HORIZON = 639
const DROP = 377
const FAR = 3.4
const NEAR = 0.873
const AT_DOOR = 0.568
// Steps from the foot of the picture to the door, and back out at night.
const STEPS_IN = 19
const STEPS_OUT = 12
// The middle of the path at y: straight down the hill below its bend, and
// curving in to the door above it.
const pathMiddle = (y) => (y >= 960 ? 753 - (y - 960) * 0.065 : 800 - (y - 851) * 0.431)

const walkers = computed(() => {
  // Gone in once they reach the door, until they come back out at night.
  const leaving = props.walkOut > 0
  if (!leaving && props.walkIn >= 1) return []
  return FAMILY.map((person) => {
    if (!leaving) {
      const f = props.walkIn
      // At an even pace the distance to them grows evenly, and their size
      // falls as one over it.
      const s = 1 / lerp(1 / FAR, 1 / AT_DOOR, f)
      const y = HORIZON + DROP * s
      return {
        ...person,
        facing: 'back',
        // Side by side up the path, closing up near the door to go in.
        x: lerp(pathMiddle(y) + person.side * s, person.door, ease(span(f, 0.55, 1))),
        y,
        s,
        step: Math.sin(Math.PI * STEPS_IN * f + person.phase),
        opacity: 1 - span(f, 0.93, 1),
      }
    }
    const f = span(props.walkOut, 0, 0.85)
    return {
      ...person,
      facing: 'front',
      x: lerp(person.door, pathMiddle(968) + person.side * NEAR - 40, f),
      y: lerp(853, 985, f),
      s: lerp(AT_DOOR, 0.92, f),
      step: Math.sin(f * Math.PI * STEPS_OUT + person.phase),
      // Gone down the path and out of the picture by the end.
      opacity: span(f, 0, 0.08) * (1 - span(f, 0.75, 1)),
    }
  }).filter((person) => person.opacity > 0)
})

// The doors swing in on their hinges, so from outside each leaf narrows
// toward its own side of the doorway.
const leafScale = computed(() => 1 - props.open * 0.84)

const DOORWAY = 'M736 851V764A64 64 0 0 1 864 764V851Z'
const WINDOWS = [
  'M686 716V656A10 10 0 0 1 706 656V716Z',
  'M894 716V656A10 10 0 0 1 914 656V716Z',
  'M585 796V736A10.5 10.5 0 0 1 606 736V796Z',
  'M994 796V736A10.5 10.5 0 0 1 1015 736V796Z',
]
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sun-sky-day" x1="0" y1="300" x2="0" y2="780" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#7dd0fd" />
        <stop offset="0.45" stop-color="#97d9fc" />
        <stop offset="0.85" stop-color="#c6e9f7" />
        <stop offset="1" stop-color="#e2f4f9" />
      </linearGradient>
      <linearGradient id="sun-sky-dusk" x1="0" y1="-500" x2="0" y2="880" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#3c4f93" />
        <stop offset="0.45" stop-color="#8f6aa4" />
        <stop offset="0.8" stop-color="#f09b7a" />
        <stop offset="1" stop-color="#fbbf86" />
      </linearGradient>
      <linearGradient id="sun-sky-night" x1="0" y1="-500" x2="0" y2="880" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#070f1f" />
        <stop offset="0.45" stop-color="#11213a" />
        <stop offset="0.8" stop-color="#22355a" />
        <stop offset="1" stop-color="#383a58" />
      </linearGradient>
      <radialGradient id="sun-halo" cx="800" cy="543" r="230" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffcf6b" stop-opacity="0.7" />
        <stop offset="1" stop-color="#ffcf6b" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="sun-spill" x1="0" y1="850" x2="0" y2="1250" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffd27a" stop-opacity="0.9" />
        <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
      </linearGradient>
      <!-- Glass by day: the sky's blue, paler toward the sill. -->
      <linearGradient id="sun-glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#94ceeb" />
        <stop offset="1" stop-color="#b2def1" />
      </linearGradient>
      <!-- A lit room seen through the doorway from the path. -->
      <linearGradient id="sun-door-glow" x1="0" y1="700" x2="0" y2="851" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#d9874c" />
        <stop offset="0.45" stop-color="#f6c26a" />
        <stop offset="1" stop-color="#fbe0a0" />
      </linearGradient>
      <clipPath id="sun-door-clip"><path :d="DOORWAY" /></clipPath>
      <!-- The evening on anything drawn over the dark: the same dimming, as a
           filter, a little bluer than it is red. -->
      <filter id="sun-evening" color-interpolation-filters="sRGB">
        <feComponentTransfer>
          <feFuncR type="linear" :slope="1 - night * 0.62" />
          <feFuncG type="linear" :slope="1 - night * 0.58" />
          <feFuncB type="linear" :slope="1 - night * 0.45" />
        </feComponentTransfer>
      </filter>
      <!-- Everything but the doorway, which shows the room inside. -->
      <mask id="sun-doorway" maskUnits="userSpaceOnUse" x="-3000" y="-2000" width="7600" height="4600">
        <rect x="-3000" y="-2000" width="7600" height="4600" fill="#fff" />
        <path :d="DOORWAY" fill="#000" />
      </mask>
    </defs>

    <g mask="url(#sun-doorway)">
      <!-- The sky, morning to night. -->
      <rect x="-3000" y="-2000" width="7600" height="3200" fill="url(#sun-sky-day)" />
      <rect v-if="dusk > 0" x="-3000" y="-2000" width="7600" height="3200" fill="url(#sun-sky-dusk)" :opacity="dusk" />
      <rect v-if="night > 0" x="-3000" y="-2000" width="7600" height="3200" fill="url(#sun-sky-night)" :opacity="night" />

      <g v-if="night > 0" :opacity="night">
        <circle v-for="(star, i) in STARS" :key="i" :cx="star.x" :cy="star.y" :r="star.r" fill="#fff" :opacity="star.o" />
        <!-- The moon, in the open sky where the sun was, clear of the branch. -->
        <circle cx="470" cy="420" r="30" fill="#f4efd9" />
        <circle cx="483" cy="411" r="26" fill="#0e1b31" />
      </g>

      <!-- The far layers: the sun, the distant hills and what is on them. No
           clouds, ever: the sky is clear. -->
      <g :transform="far">
        <g :opacity="1 - night">
          <circle cx="367" :cy="sunY" r="92" fill="#fff" opacity="0.2" />
          <circle cx="367" :cy="sunY" r="68" fill="#fff" opacity="0.24" />
          <circle cx="367" :cy="sunY" r="48" fill="#fdf2c6" />
        </g>

        <path d="M-3000 690C-1800 650 -900 616 -300 640C100 594 400 604 640 622C800 632 900 604 1050 600C1250 592 1450 566 1650 594C2000 644 3000 656 4600 690V2600H-3000Z" fill="#a9dcee" />
        <path d="M-3000 726C-1500 696 -500 646 0 664C250 624 450 618 620 642C760 662 950 644 1100 628C1300 604 1500 618 1700 644C2300 694 3500 704 4600 726V2600H-3000Z" fill="#7dc6df" />
        <path :d="TREELINE" fill="#6fbed9" />

        <!-- The village on the far hill to the right. -->
        <g v-for="([x, y, w, h, roof], i) in VILLAGE" :key="i">
          <rect :x="x" :y="y - h" :width="w" :height="h" fill="#f1efe9" />
          <rect :x="x + w * 0.66" :y="y - h" :width="w * 0.34" :height="h" fill="#d9dee0" />
          <path :d="`M${x - 3} ${y - h + 1}L${x + w / 2} ${y - h - w * 0.4}L${x + w + 3} ${y - h + 1}Z`" :fill="roof" />
          <rect :x="x + w * 0.22" :y="y - h * 0.6" width="4" height="5" fill="#8fb8cc" />
          <rect :x="x + w * 0.52" :y="y - h * 0.6" width="4" height="5" fill="#8fb8cc" />
        </g>
      </g>

      <!-- The middle distance: green slopes, a pale field, cypresses. -->
      <g :transform="middle">
        <path d="M-3000 760C-1200 720 -300 735 250 712C520 702 700 722 820 728C1000 735 1150 705 1350 712C1700 724 2600 740 4600 760V2600H-3000Z" fill="#8fc7a0" />
        <path d="M-3000 800C-1000 770 0 775 300 760C520 750 700 770 820 775C1000 780 1200 752 1400 758C1800 770 2700 790 4600 800V2600H-3000Z" fill="#93c477" />
        <path d="M960 790C1100 770 1300 752 1600 760V772C1300 765 1100 782 960 800Z" fill="#d2daac" />
        <g v-for="([x, y, h, w], i) in CYPRESSES" :key="i" :transform="`translate(${x} ${y})`">
          <rect x="-1.5" y="-6" width="3" height="6" fill="#6e5238" />
          <path :d="cypress(h, w)" fill="#33939e" />
          <path :d="`M0 ${-h}C${w * 0.62} ${-h * 0.8} ${w * 0.58} ${-h * 0.14} ${w * 0.3} 0H0Z`" fill="#000" opacity="0.08" />
        </g>
      </g>

      <!-- The near ground: lit grass round the church, deeper green toward
           the corners. -->
      <path d="M-3000 846H4600V2600H-3000Z" fill="#a8c663" />
      <path d="M-3000 880C-800 868 200 870 480 905C560 916 600 936 620 960L-3000 2544Z" fill="#7ab866" />
      <path d="M4600 880C2400 868 1400 870 1120 905C1040 916 1000 936 990 960L4600 2590Z" fill="#8cc061" />

      <!-- The round trees, behind the church's wings or in front of it. -->
      <g v-for="([x, y, k], i) in TREES" :key="i" :transform="`translate(${x} ${y}) scale(${k})`">
        <circle v-for="([cx, cy, r], j) in CROWNS" :key="j" :cx="cx" :cy="cy" :r="r" fill="#257f68" />
        <circle v-for="([cx, cy, r], j) in LIGHT_CROWNS" :key="'l' + j" :cx="cx" :cy="cy" :r="r" fill="#2f8a6c" />
        <path d="M-6 0L-4 -64H4L6 0Z" fill="#795747" />
        <path d="M0 -54L-22 -84M0 -60L20 -92M-1 -72L-8 -104" fill="none" stroke="#795747" stroke-width="4.5" stroke-linecap="round" />
      </g>

      <!-- The church. Its wings first, their inner faces in shadow, and their
           lean-to roofs. -->
      <path d="M531 851V697L662 630V851Z" fill="#f2ebde" />
      <path d="M600 851V662L662 630V851Z" fill="#e6dccf" />
      <path d="M1069 851V697L938 630V851Z" fill="#f2ebde" />
      <path d="M1000 851V662L938 630V851Z" fill="#e6dccf" />
      <path d="M664 626L508 705M936 626L1092 705" fill="none" stroke="#1a6ab5" stroke-width="14" stroke-linecap="round" />

      <!-- The front, under its gable, a little shadow under the trim. -->
      <path d="M662 851V572L800 438L938 572V851Z" fill="#faf3e5" />
      <path d="M662 572L800 438L938 572V586L800 452L662 586Z" fill="#ece3d3" />
      <path d="M640 585L800 430L960 585" fill="none" stroke="#1a6ab5" stroke-width="15" stroke-linejoin="round" stroke-linecap="round" />

      <!-- The cross on the gable. -->
      <rect x="795.5" y="352" width="9" height="82" rx="2" fill="#1a6ab5" />
      <rect x="776.5" y="373" width="47" height="9" rx="2" fill="#1a6ab5" />

      <!-- Its windows, by day, and the sill under the great window. -->
      <path v-for="(d, i) in WINDOWS" :key="i" :d="d" fill="url(#sun-glass)" />
      <rect x="750" y="595" width="100" height="4" rx="1" fill="#ebe0d3" />

      <!-- The door's surround, and the steps up to it. -->
      <path d="M719 851V762A81 81 0 0 1 881 762V851Z" fill="#ebe0d3" />
      <rect x="712" y="849" width="176" height="10" rx="2" fill="#ece6da" />
      <rect x="700" y="859" width="200" height="10" rx="2" fill="#ddd6c8" />

      <!-- Bushes along the foot of the church. -->
      <circle v-for="([x, y, r], i) in BUSHES" :key="i" :cx="x" :cy="y" :r="r" :fill="i % 2 ? '#459555' : '#4f9d5a'" />
      <circle v-for="([x, y, r], i) in BUSH_TOPS" :key="'t' + i" :cx="x" :cy="y" :r="r" fill="#62ad66" />
      <path v-for="([x, y], i) in BUSH_LEAVES" :key="'v' + i" :d="`M${x} ${y}l-5 -7M${x} ${y}l5 -7M${x} ${y}v6`" fill="none" stroke="#3a8549" stroke-width="1.6" stroke-linecap="round" />

      <!-- The path, widening down the hill toward the reader and on past the
           foot of the picture, where the family come from. -->
      <path d="M736 851C722 900 660 940 616 960C580 976 550 992 528 1008L-1576 2600H2878L987 1008C940 985 900 970 891 960C875 935 866 890 864 851Z" fill="#fbe8c5" />
      <path d="M736 851C722 900 660 940 616 960C580 976 550 992 528 1008L-1576 2600H-1511L540 1012C566 994 596 978 628 962C672 942 734 900 744 851Z" fill="#f1d9b0" />

      <!-- The light from the open door, falling down the steps. -->
      <path v-if="open > 0" d="M736 851H864L900 875L1030 1250H570L700 875Z" fill="url(#sun-spill)" :opacity="open * (0.18 + night * 0.6)" />

      <!-- Broad leaves at the near corners, and a dark bush behind the right. -->

      <path
        v-for="([x, y, a, l, w], i) in FERNS"
        :key="'f' + i"
        :d="fern(l, w)"
        :transform="`translate(${x} ${y}) rotate(${a})`"
        :fill="FERN_GREENS[i % 3]"
      />

      <!-- The branch reaching into the top right, its leaves hanging. -->
      <path d="M1420 290C1350 312 1290 340 1222 374" fill="none" stroke="#6e5238" stroke-width="4.5" stroke-linecap="round" />
      <g v-for="([x, y, a, l, c], i) in BRANCH_LEAVES" :key="'b' + i" :transform="`translate(${x} ${y}) rotate(${a})`">
        <path :d="almond(l)" :fill="c" />
        <path :d="`M2 0H${l - 4}`" stroke="#2f6f48" stroke-width="0.8" opacity="0.4" />
      </g>
    </g>

    <!-- Through the open doors from the path: a lit room, gold, the backs
         of its pews, and at its far end the cross. They are the room's own
         (hall.js, pews.js), drawn where the room is seen through the doorway,
         so as the glow gives way to the room itself nothing in it moves. -->
    <g v-if="glow > 0" clip-path="url(#sun-door-clip)" :opacity="glow">
      <rect x="730" y="695" width="140" height="160" fill="url(#sun-door-glow)" />
      <g :transform="throughDoorway">
        <path :d="RIM" fill="#f3cf92" />
        <path :d="RECESS" fill="#fdecb8" />
        <path :d="CROSS" fill="#8a5a3b" />
        <path :d="CROSS_SIDES" fill="#6f4630" />
        <g opacity="0.3">
          <template v-for="row in ROWS" :key="row.r">
            <rect :x="800 - row.inner - row.length" :y="-30 * row.s + row.y" :width="row.length" :height="36 * row.s" :rx="4 * row.s" fill="#8a5a3b" />
            <rect :x="800 + row.inner" :y="-30 * row.s + row.y" :width="row.length" :height="36 * row.s" :rx="4 * row.s" fill="#8a5a3b" />
            <rect :x="800 - row.inner - row.length" :y="-30 * row.s + row.y" :width="row.length" :height="6 * row.s" :rx="3 * row.s" fill="#e9b26f" />
            <rect :x="800 + row.inner" :y="-30 * row.s + row.y" :width="row.length" :height="6 * row.s" :rx="3 * row.s" fill="#e9b26f" />
          </template>
        </g>
      </g>
    </g>

    <!-- The doors, hinged at the sides of the doorway. -->
    <g :transform="`translate(736 0) scale(${leafScale} 1) translate(-736 0)`">
      <path d="M736 851V764A64 64 0 0 1 800 700V851Z" :fill="leaf" />
      <path d="M746 840V770A54 54 0 0 1 790 712V840Z" fill="none" :stroke="leafLine" stroke-width="2.5" />
      <rect x="786" y="776" width="5" height="24" rx="2.5" fill="#f2c14e" />
    </g>
    <g :transform="`translate(864 0) scale(${leafScale} 1) translate(-864 0)`">
      <path d="M864 851V764A64 64 0 0 0 800 700V851Z" :fill="leaf" />
      <path d="M854 840V770A54 54 0 0 0 810 712V840Z" fill="none" :stroke="leafLine" stroke-width="2.5" />
      <rect x="809" y="776" width="5" height="24" rx="2.5" fill="#f2c14e" />
    </g>

    <!-- Evening and night come down over everything but the doorway. -->
    <g mask="url(#sun-doorway)">
      <rect v-if="dusk > 0" x="-3000" y="-2000" width="7600" height="4600" fill="#ff9a5c" :opacity="dusk * 0.14 * (1 - night)" />
      <rect v-if="night > 0" x="-3000" y="-2000" width="7600" height="4600" fill="#08132b" :opacity="night * 0.58" />
    </g>

    <!-- The family, over the dark rather than under it: the dark leaves the
         doorway out, and someone stepping across it was lit down one side.
         The evening is put on them by the filter instead. -->
    <g :filter="night > 0 ? 'url(#sun-evening)' : null">
      <g v-for="person in walkers" :key="person.key" :transform="`translate(${person.x} ${person.y}) scale(${person.s})`" :opacity="person.opacity">
        <FamilyFigure :who="person.key" :facing="person.facing" :step="person.step" />
      </g>
    </g>

    <!-- Lit windows at night, over the dark, and the great window. -->
    <circle v-if="night > 0" cx="800" cy="543" r="230" fill="url(#sun-halo)" :opacity="night" />
    <path v-for="(d, i) in night > 0 ? WINDOWS : []" :key="'n' + i" :d="d" fill="#ffcf6b" :opacity="night" />
    <rect v-if="veil > 0" x="-3000" y="-2000" width="7600" height="4600" class="fill-slate-900" :opacity="veil" />
    <StoryMark transform="translate(732.3 476.6) scale(1.22)" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import StoryMark from './StoryMark.vue'
import StoryFigure from './StoryFigure.vue'
import { CAST, seeded } from './people'
import { lerp, span } from './timeline'

// The church from the front, on its hill, for the Sunday the front door
// tells: the same church as the home's picture (HomeScene) — white walls,
// blue roof, Ekkly's mark as its great window — turned to face the reader, so
// the camera can walk straight up the path and in at the door.
//
// The doorway is cut out of the picture (the mask below), and the inside of
// the church is drawn underneath it (ChurchInside), so opening the doors shows
// the room through them and walking in is the camera going through the hole.
//
// Drawn on a 1600 × 1000 canvas, the door at x 755–845, y 700–850. The sky and
// the ground run on far past it on every side, because a phone's camera sees
// much more height than a desktop's.

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
})

/** Two colours mixed, `x` of the way from the first to the second. */
const mix = (a, b, x) => {
  const from = a.match(/\w\w/g).map((h) => parseInt(h, 16))
  const to = b.match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${from.map((c, i) => Math.round(lerp(c, to[i], x))).join(' ')})`
}

// Glass reflects the sky by day and is lit from inside at night.
const glass = computed(() => mix('bfe0f2', 'ffcf6b', props.night))
const leaf = computed(() => mix('22819b', '123247', props.night))
const leafLine = computed(() => mix('1b6b82', '0d2636', props.night))

// The sun sets as the evening comes on.
const sunY = computed(() => 210 + props.dusk * 420 + props.night * 300)

const STARS = (() => {
  const random = seeded(7)
  return Array.from({ length: 46 }, () => ({
    x: lerp(-600, 2200, random()),
    y: lerp(-500, 520, random()),
    r: lerp(1.1, 2.6, random()),
    o: lerp(0.45, 1, random()),
  }))
})()

// Clouds as stacks of pills, the way the home's sky draws them: [x, y,
// height, rows of [offset, length]].
const CLOUDS = [
  [80, 150, 30, [[50, 110], [0, 230], [36, 180]]],
  [1080, 90, 26, [[40, 90], [0, 190], [26, 150]]],
  [1320, 300, 30, [[52, 120], [0, 240], [40, 180]]],
  [-260, 380, 34, [[60, 130], [0, 280], [34, 220]]],
  [560, 240, 22, [[30, 70], [0, 150], [20, 110]]],
]
const pills = CLOUDS.flatMap(([x, y, h, rows], c) =>
  rows
    .map(([dx, length], i) => ({ key: `${c}-${i}`, x: x + dx, y: y + i * h * 0.7, width: length, height: h, shade: i === rows.length - 1 }))
    .reverse()
)

// The family: where each starts on the path, how far behind the first they
// set off, and how big they are there (the path runs away up the hill, so
// they shrink as they climb).
const FAMILY = [
  { key: 'dad', look: CAST.dad, x: [742, 788], delay: 0 },
  { key: 'child', look: CAST.child, x: [776, 800], delay: 0.08, small: 0.72 },
  { key: 'mum', look: CAST.mum, x: [812, 814], delay: 0.15 },
]

const walkers = computed(() => {
  // Waiting at the foot of the path until the reader scrolls, then gone in,
  // until they come back out at night.
  const leaving = props.walkOut > 0
  if (!leaving && props.walkIn >= 1) return []
  return FAMILY.map((person) => {
    if (!leaving) {
      const f = span(props.walkIn, person.delay, person.delay + 0.8)
      const s = lerp(1.1, 0.48, f) * (person.small || 1)
      return {
        ...person,
        facing: 'back',
        x: lerp(person.x[0], person.x[1], f),
        y: lerp(915, 853, f),
        s,
        step: Math.sin(f * Math.PI * 7),
        opacity: 1 - span(f, 0.9, 1),
      }
    }
    const f = span(props.walkOut, person.delay, person.delay + 0.8)
    return {
      ...person,
      facing: 'front',
      x: lerp(person.x[1], person.x[0] - 60, f),
      y: lerp(853, 990, f),
      s: lerp(0.48, 1.3, f) * (person.small || 1),
      step: Math.sin(f * Math.PI * 7),
      // Gone down the path and out of the picture by the end.
      opacity: span(f, 0, 0.08) * (1 - span(f, 0.75, 1)),
    }
  }).filter((person) => person.opacity > 0)
})

// The doors swing in on their hinges, so from outside each leaf narrows
// toward its own side of the doorway.
const leafScale = computed(() => 1 - props.open * 0.84)
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sun-sky-day" x1="0" y1="-500" x2="0" y2="880" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#5ea6de" />
        <stop offset="0.45" stop-color="#98cff3" />
        <stop offset="0.8" stop-color="#dbedf1" />
        <stop offset="1" stop-color="#f8f5e6" />
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
      <radialGradient id="sun-halo" cx="800" cy="470" r="230" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffcf6b" stop-opacity="0.7" />
        <stop offset="1" stop-color="#ffcf6b" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="sun-spill" x1="0" y1="850" x2="0" y2="1250" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffd27a" stop-opacity="0.9" />
        <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
      </linearGradient>
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
        <path d="M755 851V745A45 45 0 0 1 845 745V851Z" fill="#000" />
      </mask>
    </defs>

    <g mask="url(#sun-doorway)">
      <!-- The sky, morning to night. -->
      <rect x="-3000" y="-2000" width="7600" height="3200" fill="url(#sun-sky-day)" />
      <rect v-if="dusk > 0" x="-3000" y="-2000" width="7600" height="3200" fill="url(#sun-sky-dusk)" :opacity="dusk" />
      <rect v-if="night > 0" x="-3000" y="-2000" width="7600" height="3200" fill="url(#sun-sky-night)" :opacity="night" />

      <g v-if="night > 0" :opacity="night">
        <circle v-for="(star, i) in STARS" :key="i" :cx="star.x" :cy="star.y" :r="star.r" fill="#fff" :opacity="star.o" />
        <circle cx="1250" cy="170" r="30" fill="#f4efd9" />
        <circle cx="1263" cy="161" r="26" fill="#0e1b31" />
      </g>
      <g :opacity="1 - night">
        <circle cx="330" :cy="sunY" r="92" fill="#fff6d6" opacity="0.35" />
        <circle cx="330" :cy="sunY" r="46" fill="#fff4cc" />
      </g>

      <g :opacity="0.9 - night * 0.55">
        <rect v-for="pill in pills" :key="pill.key" :x="pill.x" :y="pill.y" :width="pill.width" :height="pill.height" :rx="pill.height / 2" :fill="pill.shade ? '#def0f9' : '#f6faf9'" />
      </g>

      <!-- The hills, far to near. -->
      <path d="M-3000 640C-1200 560-400 600 200 590C600 580 900 520 1300 560C1800 610 2600 560 4600 600V2600H-3000Z" fill="#8fcee6" />
      <path d="M-3000 700C-1400 650-200 700 300 660C600 636 800 650 1050 680C1400 720 2200 650 4600 690V2600H-3000Z" fill="#69b9d9" />
      <path d="M-3000 790C-1000 740 0 790 400 765C700 748 900 772 1200 762C1600 750 2600 790 4600 775V2600H-3000Z" fill="#5cb0a0" />

      <!-- Trees either side, behind the church's wings. -->
      <g>
        <rect x="414" y="740" width="13" height="112" rx="3" fill="#4d4031" />
        <circle cx="420" cy="722" r="56" fill="#2b8a9f" />
        <circle cx="384" cy="760" r="40" fill="#2b8a9f" />
        <circle cx="458" cy="762" r="42" fill="#2b8a9f" />
        <rect x="1174" y="750" width="13" height="102" rx="3" fill="#4d4031" />
        <circle cx="1180" cy="736" r="50" fill="#1b7493" />
        <circle cx="1146" cy="770" r="36" fill="#1b7493" />
        <circle cx="1214" cy="772" r="38" fill="#1b7493" />
        <circle cx="250" cy="800" r="36" fill="#1b7493" />
        <circle cx="1370" cy="806" r="32" fill="#2b8a9f" />
      </g>

      <!-- The church. Its wings first, their lean-to roofs and doors. -->
      <path d="M520 852V656L650 601V852Z" fill="#e3e6dd" />
      <path d="M1080 852V656L950 601V852Z" fill="#e3e6dd" />
      <path d="M506 664L652 602V586L506 648Z" fill="#2c84bd" />
      <path d="M1094 664L948 602V586L1094 648Z" fill="#2c84bd" />

      <!-- The front, under its gable, with the light down its left edge. -->
      <path d="M650 852V488L800 370L950 488V852Z" fill="#fbf8ef" />
      <path d="M650 488L800 370V386L650 504Z" fill="#cfe4e9" />
      <path d="M630 498L800 362L970 498" fill="none" stroke="#4c77c0" stroke-width="20" stroke-linejoin="round" stroke-linecap="round" />
      <path d="M800 362L970 498" fill="none" stroke="#3e67ad" stroke-width="20" stroke-linecap="round" />

      <!-- The cross on the gable. -->
      <rect x="793" y="262" width="14" height="96" rx="3" fill="#4da2cc" />
      <rect x="770" y="290" width="60" height="13" rx="3" fill="#4da2cc" />

      <!-- The surround of the great window, and the door's. -->
      <path d="M746.4 536V459.6A53.6 53.6 0 0 1 853.6 459.6V536Z" fill="#cfe4e9" />
      <path d="M738 852V742A62 62 0 0 1 862 742V852Z" fill="#cfe4e9" />

      <!-- The steps, the path down the hill, and the ground. -->
      <path d="M-3000 905C-800 884 300 852 800 850C1300 852 2400 884 4600 905V2600H-3000Z" fill="#4fa58f" />
      <path d="M-3000 1040C-600 990 300 980 800 990C1300 980 2200 990 4600 1040V2600H-3000Z" fill="#3f9584" />
      <path d="M748 874H852L1110 2600H490Z" fill="#eadcc0" />
      <rect x="728" y="850" width="144" height="13" rx="2" fill="#e3e6dd" />
      <rect x="716" y="862" width="168" height="13" rx="2" fill="#d2d7cc" />

      <!-- The light from the open door, falling down the steps. -->
      <path v-if="open > 0" d="M755 851H845L884 875L1010 1250H590L716 875Z" fill="url(#sun-spill)" :opacity="open * (0.35 + night * 0.45)" />

      <!-- Bushes either side of the steps. -->
      <circle cx="690" cy="858" r="26" fill="#1b7493" />
      <circle cx="660" cy="866" r="20" fill="#2b8a9f" />
      <circle cx="910" cy="858" r="26" fill="#1b7493" />
      <circle cx="940" cy="866" r="20" fill="#2b8a9f" />
      <circle cx="540" cy="866" r="22" fill="#2b8a9f" />
      <circle cx="1060" cy="866" r="22" fill="#1b7493" />
    </g>

    <!-- The doors, hinged at the sides of the doorway. -->
    <g :transform="`translate(755 0) scale(${leafScale} 1) translate(-755 0)`">
      <path d="M755 851V745A45 45 0 0 1 800 700V851Z" :fill="leaf" />
      <path d="M763 840V752A37 37 0 0 1 793 712V840Z" fill="none" :stroke="leafLine" stroke-width="3" />
      <circle cx="790" cy="790" r="3.5" fill="#fdc24b" />
    </g>
    <g :transform="`translate(845 0) scale(${leafScale} 1) translate(-845 0)`">
      <path d="M845 851V745A45 45 0 0 0 800 700V851Z" :fill="leaf" />
      <path d="M837 840V752A37 37 0 0 0 807 712V840Z" fill="none" :stroke="leafLine" stroke-width="3" />
      <circle cx="810" cy="790" r="3.5" fill="#fdc24b" />
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
        <StoryFigure :look="person.look" :facing="person.facing" :step="person.step" />
      </g>
    </g>

    <!-- Glass, over the dark, so the windows are lit at night. -->
    <circle v-if="night > 0" cx="800" cy="470" r="230" fill="url(#sun-halo)" :opacity="night" />
    <path d="M565 762V716A15 15 0 0 1 595 716V762Z" :fill="glass" />
    <path d="M1005 762V716A15 15 0 0 1 1035 716V762Z" :fill="glass" />
    <path d="M676 682V604A14 14 0 0 1 704 604V682Z" :fill="glass" />
    <path d="M896 682V604A14 14 0 0 1 924 604V682Z" :fill="glass" />
    <StoryMark transform="translate(722.3 395.2) scale(1.4)" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import StoryMark from './StoryMark.vue'
import StoryFigure from './StoryFigure.vue'
import { CAST } from './people'
import { PEOPLE, ROWS, VANISH_Y, VISITOR } from './pews'
import { LYRICS, READING } from './timeline'

// The inside of the church, seen from the back as the reader comes in: the
// pews either side of the aisle, the stage, the band, the pulpit, the screen,
// and on the back wall Ekkly's mark as the window, its light falling across
// the stage. The same window the outside wears over its door.
//
// One-point perspective (pews.js): every line that runs away from the reader
// heads for the vanishing point. The back wall runs from x 360 to 1240, the
// stage across its foot.
//
// What happens in the room comes in as `scene`, worked out from the scroll by
// SundayStory, so this file only draws.

const props = defineProps({
  viewBox: { type: String, required: true },
  scene: { type: Object, required: true },
  church: { type: String, default: '' },
})

const byRow = computed(() =>
  ROWS.map((row) => ({
    ...row,
    people: PEOPLE.filter((person) => person.row === row.r)
      .map((person) => {
        const here = Math.min(1, Math.max(0, props.scene.seated - person.rank))
        return { ...person, here }
      })
      .filter((person) => person.here > 0),
  }))
)

// The offering baskets, one each side, passed from the aisle along each row,
// front row first.
const baskets = computed(() => {
  const u = props.scene.basket
  if (u == null || u < 0 || u > 1) return null
  const along = u * ROWS.length
  const r = Math.min(ROWS.length - 1, Math.floor(along))
  const row = ROWS[r]
  const f = along - r
  const reach = row.inner + f * row.length
  return { row: r, s: row.s, y: row.y - 30 * row.s, xs: [800 - reach, 800 + reach] }
})

// The banner by the window carries the church's name, two lines of it.
const bannerLines = computed(() => {
  const words = (props.church || 'Grace Fellowship').trim().split(/\s+/)
  if (words.length < 2) return [words[0], '']
  const half = Math.ceil(words.length / 2)
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')]
})

// The tall pillars down each side wall, in perspective: each is a band whose
// top and bottom run toward the vanishing point.
const PILLARS = [240, 20, -360].flatMap((x) => {
  const w = 0.07 * (800 - x)
  const floor = (px) => VANISH_Y + (800 - px) / 2.75
  const ceiling = (px) => VANISH_Y - (800 - px) / 1.257
  const left = `M${x} ${ceiling(x)}L${x} ${floor(x)}L${x - w} ${floor(x - w)}L${x - w} ${ceiling(x - w)}Z`
  const mirror = (px) => 1600 - px
  const right = `M${mirror(x)} ${ceiling(x)}L${mirror(x)} ${floor(x)}L${mirror(x - w)} ${floor(x - w)}L${mirror(x - w)} ${ceiling(x - w)}Z`
  return [left, right]
})

// The band plays only while the reader scrolls: `play` is a phase from the
// scroll, so a sway or a strum follows the hand rather than idling.
const wave = computed(() => Math.sin(props.scene.play || 0))
const wave2 = computed(() => Math.sin((props.scene.play || 0) * 1.7 + 1))

const spotA = computed(() => 690 + 110 * Math.sin((props.scene.play || 0) * 0.35))
const spotB = computed(() => 990 - 110 * Math.sin((props.scene.play || 0) * 0.3 + 0.8))
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sun-in-beam" x1="0" y1="228" x2="0" y2="610" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fdc24b" stop-opacity="0.55" />
        <stop offset="0.55" stop-color="#f6c676" stop-opacity="0.22" />
        <stop offset="1" stop-color="#09a4c6" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="sun-in-spot-a" x1="0" y1="-60" x2="0" y2="600" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fdc24b" stop-opacity="0" />
        <stop offset="1" stop-color="#fdc24b" stop-opacity="0.5" />
      </linearGradient>
      <linearGradient id="sun-in-spot-b" x1="0" y1="-60" x2="0" y2="600" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#09a4c6" stop-opacity="0" />
        <stop offset="1" stop-color="#09a4c6" stop-opacity="0.45" />
      </linearGradient>
    </defs>

    <!-- The room: ceiling, side walls with their pillars, floor, back wall. -->
    <path d="M360 30H1240L6520 -4170H-4920Z" fill="#e8dcc6" />
    <path d="M360 30V540L-4920 2460V-4170Z" fill="#efe4cf" />
    <path d="M1240 30V540L6520 2460V-4170Z" fill="#ebdfc8" />
    <path v-for="(d, i) in PILLARS" :key="i" :d="d" fill="#e2d3b8" />
    <path d="M360 540H1240L6520 2460H-4920Z" fill="#c4976b" />
    <path d="M775 540H825L1145 2460H455Z" fill="#2c5d8f" />
    <rect x="360" y="30" width="880" height="510" fill="#f6eedf" />
    <rect x="360" y="470" width="880" height="70" fill="#e9dbc1" />

    <!-- The window: the mark, in a stone surround, high on the back wall. -->
    <path d="M717 240V128A83 83 0 0 1 883 128V240Z" fill="#ddcfb5" />
    <StoryMark transform="translate(689 36) scale(2)" />

    <!-- The banner with the church's name, and the screen. -->
    <line x1="420" y1="92" x2="604" y2="92" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round" />
    <path d="M432 92H592V300L512 274L432 300Z" fill="#f19140" />
    <rect x="507" y="122" width="10" height="52" rx="2" fill="#fff" />
    <rect x="492" y="136" width="40" height="10" rx="2" fill="#fff" />
    <text x="512" y="214" text-anchor="middle" fill="#fff" font-size="17" font-weight="700">{{ bannerLines[0] }}</text>
    <text x="512" y="236" text-anchor="middle" fill="#fff" font-size="17" font-weight="700">{{ bannerLines[1] }}</text>

    <rect x="982" y="102" width="236" height="140" rx="6" fill="#1f2937" />
    <rect x="990" y="110" width="220" height="124" rx="2" fill="#0f1c4d" />
    <g fill="#fff" text-anchor="middle">
      <template v-if="scene.screen === 'welcome'">
        <text x="1100" y="160" font-size="12" opacity="0.75">Welcome to</text>
        <text x="1100" y="184" font-size="17" font-weight="700">{{ church || 'Grace Fellowship' }}</text>
      </template>
      <template v-else-if="scene.screen === 'lyrics'">
        <text x="1100" y="164" font-size="11.5" font-weight="600">{{ LYRICS[scene.lyric][0] }}</text>
        <text x="1100" y="184" font-size="11.5" font-weight="600">{{ LYRICS[scene.lyric][1] }}</text>
        <text x="1100" y="222" font-size="8" opacity="0.6">John Newton, 1779</text>
      </template>
      <template v-else-if="scene.screen === 'reading'">
        <text v-for="(line, i) in READING.text" :key="i" x="1100" :y="150 + i * 19" font-size="12.5" font-weight="600">{{ line }}</text>
        <text x="1100" y="218" font-size="10" fill="#fdc24b" font-weight="700">{{ READING.ref }}</text>
      </template>
      <template v-else-if="scene.screen === 'pray'">
        <text x="1100" y="178" font-size="15" font-weight="600" opacity="0.8">Let us pray</text>
      </template>
      <template v-else-if="scene.screen === 'offering'">
        <text x="1100" y="168" font-size="15" font-weight="700">Tithes and offerings</text>
        <text x="1100" y="190" font-size="10" opacity="0.7">Thank you for giving</text>
      </template>
      <template v-else-if="scene.screen === 'notices'">
        <text x="1004" y="134" text-anchor="start" font-size="10" fill="#fdc24b" font-weight="700">THIS WEEK</text>
        <g text-anchor="start" font-size="11.5">
          <text x="1004" y="160" font-weight="700">Wed 7 PM</text>
          <text x="1066" y="160">Small groups</text>
          <text x="1004" y="182" font-weight="700">Fri 6 PM</text>
          <text x="1066" y="182">Youth night</text>
          <text x="1004" y="204" font-weight="700">Sat 7 AM</text>
          <text x="1066" y="204">Men’s breakfast</text>
        </g>
      </template>
      <template v-else-if="scene.screen === 'bye'">
        <text x="1100" y="168" font-size="15" font-weight="700">See you next Sunday</text>
        <text x="1100" y="190" font-size="10" opacity="0.7">Coffee in the hall</text>
      </template>
    </g>

    <!-- The stage, its front edge and the step down to the aisle. -->
    <path d="M360 540H1240L1300 600H300Z" fill="#dcc6a4" />
    <rect x="300" y="600" width="1000" height="22" fill="#b89a74" />
    <rect x="720" y="622" width="160" height="12" fill="#c9ad86" />

    <!-- The band. Their instruments stay when they step down for the sermon. -->
    <rect x="408" y="546" width="124" height="30" rx="3" fill="#c9b48f" />
    <g :opacity="scene.band">
      <g transform="translate(470 560) scale(0.84)">
        <StoryFigure :look="CAST.drums" :arm="0.45 + wave * 0.2" />
      </g>
      <g transform="translate(600 578) scale(0.88)">
        <StoryFigure :look="CAST.keys" />
      </g>
      <g transform="translate(700 580) scale(0.9)">
        <StoryFigure :look="CAST.singer" :arm="0.35 + wave2 * 0.12" />
      </g>
      <g transform="translate(980 580) scale(0.9)">
        <StoryFigure :look="CAST.guitar" :arm="0.18 + wave * 0.08" />
      </g>
    </g>
    <!-- The drums. -->
    <line x1="420" y1="482" x2="420" y2="548" stroke="#6b7280" stroke-width="2" />
    <line x1="522" y1="478" x2="522" y2="548" stroke="#6b7280" stroke-width="2" />
    <ellipse cx="420" :cy="481 + (scene.band ? wave * 1.5 : 0)" rx="19" ry="3.6" fill="#fdc24b" />
    <ellipse cx="522" :cy="477 - (scene.band ? wave2 * 1.5 : 0)" rx="17" ry="3.4" fill="#fdc24b" />
    <ellipse cx="450" cy="510" rx="13" ry="6.5" fill="#2f3a52" />
    <ellipse cx="492" cy="510" rx="13" ry="6.5" fill="#2f3a52" />
    <circle cx="470" cy="542" r="25" fill="#f4f1ea" stroke="#2f3a52" stroke-width="4" />
    <circle cx="470" cy="542" r="8" fill="none" stroke="#09a4c6" stroke-width="2.5" />
    <!-- The keyboard, on its stand, in front of whoever plays it. -->
    <path d="M572 576L628 526M628 576L572 526" stroke="#4b5563" stroke-width="3" />
    <rect x="558" y="518" width="84" height="10" rx="2" fill="#1f2937" />
    <rect x="562" y="520" width="76" height="4" fill="#f4f1ea" />
    <!-- The singer's microphone, and the guitar. -->
    <line x1="716" y1="580" x2="716" y2="486" stroke="#4b5563" stroke-width="2.5" />
    <rect x="712" y="480" width="8" height="12" rx="3" fill="#1f2937" />
    <g v-if="scene.band > 0" :opacity="scene.band" :transform="`rotate(${-28 + wave * 2} 984 532)`">
      <rect x="984" y="528" width="44" height="5" rx="2" fill="#5a3b25" />
      <ellipse cx="984" cy="532" rx="15" ry="12" fill="#c65d4f" />
      <circle cx="984" cy="532" r="4" fill="#2f3a52" />
    </g>

    <!-- The pulpit, and the preacher behind it when it is time. -->
    <g v-if="scene.preacher > 0" :opacity="scene.preacher" transform="translate(800 575) scale(0.92)">
      <StoryFigure :look="CAST.preacher" :arm="0.22 + wave * 0.16" :bow="scene.bow" />
    </g>
    <path d="M770 500H830L822 592H778Z" fill="#a8714c" />
    <rect x="762" y="493" width="76" height="9" rx="2" fill="#8a5a3b" />
    <path d="M778 492L800 488L822 492L800 495Z" fill="#fbf8ef" :opacity="scene.preacher" />

    <!-- The congregation, back of the room last, so nearer heads cover the
         rows in front of them. Each row is its people, then the back of
         their pew. -->
    <g v-for="row in byRow" :key="row.r">
      <g
        v-for="person in row.people"
        :key="person.key"
        :transform="`translate(${person.x} ${person.y - (1 - person.here) * 14 * person.s - scene.stand * 22 * person.s}) scale(${person.s})`"
        :opacity="person.here"
      >
        <rect v-if="person.look.style === 'long'" x="-11" y="-76" width="22" height="28" rx="9" :fill="person.look.hair" />
        <rect x="-17" y="-52" width="34" height="60" rx="13" :fill="person.look.shirt" />
        <rect x="-4" y="-60" width="8" height="10" :fill="person.look.skin" />
        <circle cx="0" :cy="-66 + scene.bow * 5" r="11" :fill="person.look.style === 'bald' ? person.look.skin : person.look.hair" />
        <circle v-if="person.look.style === 'bun'" cx="0" :cy="-79 + scene.bow * 5" r="5" :fill="person.look.hair" />
      </g>
      <g :transform="`translate(0 ${row.y})`">
        <rect :x="800 - row.inner - row.length" :y="-30 * row.s" :width="row.length" :height="36 * row.s" :rx="4 * row.s" fill="#8a5a3b" />
        <rect :x="800 + row.inner" :y="-30 * row.s" :width="row.length" :height="36 * row.s" :rx="4 * row.s" fill="#8a5a3b" />
        <rect :x="800 - row.inner - row.length" :y="-30 * row.s" :width="row.length" :height="6 * row.s" :rx="3 * row.s" fill="#a8714c" />
        <rect :x="800 + row.inner" :y="-30 * row.s" :width="row.length" :height="6 * row.s" :rx="3 * row.s" fill="#a8714c" />
        <rect :x="800 - row.inner - 7 * row.s" :y="-40 * row.s" :width="7 * row.s" :height="46 * row.s" :rx="2 * row.s" fill="#6f4630" />
        <rect :x="800 + row.inner" :y="-40 * row.s" :width="7 * row.s" :height="46 * row.s" :rx="2 * row.s" fill="#6f4630" />
      </g>
      <!-- The offering baskets, travelling along this row. -->
      <template v-if="baskets && baskets.row === row.r">
        <g v-for="(x, i) in baskets.xs" :key="i" :transform="`translate(${x} ${baskets.y}) scale(${baskets.s * 1.7})`">
          <path d="M-15 -4Q-15 10 0 10Q15 10 15 -4Z" fill="#b07a3f" />
          <ellipse cx="0" cy="-4" rx="15" ry="3.5" fill="#8a5a2b" />
          <path d="M-8 -6Q0 -10 8 -6" stroke="#fdc24b" stroke-width="2.5" fill="none" stroke-linecap="round" />
        </g>
      </template>
    </g>

    <!-- The first-timer's tag, as they sit down. -->
    <g
      v-if="scene.visitor > 0"
      :transform="`translate(${VISITOR.x} ${VISITOR.y - (90 + scene.stand * 22) * VISITOR.s}) scale(${VISITOR.s})`"
      :opacity="scene.visitor"
    >
      <rect x="-34" y="-12" width="68" height="20" rx="10" fill="#fff" stroke="var(--color-primary)" stroke-width="1.5" />
      <text x="0" y="2" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--color-primary)">First visit</text>
      <path d="M-4 8L0 13L4 8Z" fill="#fff" />
    </g>

    <!-- The usher at the back, greeting whoever comes in, and the count. -->
    <g v-if="scene.usher > 0" :opacity="scene.usher">
      <g transform="translate(888 1020) scale(2.5)">
        <StoryFigure :look="CAST.usher" :arm="0.4" />
      </g>
      <g transform="translate(960 680)">
        <rect x="0" y="0" width="156" height="80" rx="16" fill="#fff" />
        <path d="M14 70L2 96L36 76Z" fill="#fff" />
        <text x="18" y="28" font-size="15" font-weight="600" fill="#6b7280">Here today</text>
        <text x="18" y="64" font-size="34" font-weight="800" fill="#0f1c4d" style="font-variant-numeric: tabular-nums">{{ scene.count }}</text>
      </g>
    </g>

    <!-- Lights: the house dims for prayer, and the coloured stage lights
         swing during worship. The window and its light are over the dark,
         because they are what lights the room. -->
    <rect v-if="scene.dim > 0" x="-5000" y="-4200" width="11600" height="6800" fill="#0b1430" :opacity="scene.dim * 0.6" />
    <template v-if="scene.spots > 0">
      <path :d="`M520 -60L${spotA - 80} 600H${spotA + 80}Z`" fill="url(#sun-in-spot-a)" :opacity="scene.spots" />
      <path :d="`M1080 -60L${spotB - 80} 600H${spotB + 80}Z`" fill="url(#sun-in-spot-b)" :opacity="scene.spots" />
    </template>
    <path d="M727 228H873L1040 610H560Z" fill="url(#sun-in-beam)" :opacity="0.45 + scene.dim * 0.55" />
    <ellipse cx="800" cy="596" rx="240" ry="14" fill="#fdc24b" :opacity="0.12 + scene.dim * 0.2" />
    <g v-if="scene.dim > 0" :opacity="scene.dim">
      <path d="M717 240V128A83 83 0 0 1 883 128V240Z" fill="#ddcfb5" opacity="0.6" />
      <StoryMark transform="translate(689 36) scale(2)" />
    </g>
  </svg>
</template>

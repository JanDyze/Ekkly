<script setup>
import { computed } from 'vue'
import FromAbove from './FromAbove.vue'
import { lookFrom, seeded } from './people'
import { lerp, phase } from './timeline'

// Sunday school, while the sermon is on: the kids' room seen from straight
// above, the one part of the front door's Sunday not seen from the back of
// the church. The kids come in at the door, are counted on the tablet there,
// and sit round the rug facing their teacher, who has the story of Noah's ark
// open; their workbooks for it are out on the tables with the crayons. A room
// made for children - a rainbow of a rug, bright bags in the cubbies, a corner
// of play mats - but drawn as plainly as the church. On a 1600 × 1000 canvas.
//
// Everything follows `u`, how far through the part the reader has scrolled.

const props = defineProps({
  viewBox: { type: String, required: true },
  u: { type: Number, default: 0 },
})

const DOOR = { x: 1330, y: 1010 }
const RUG = { x: 760, y: 520 }
const TEACHER_AT = { x: RUG.x, y: RUG.y - 190 }

const TEACHER = { skin: '#a8754f', hair: '#2b211b', shirt: '#2f9a8f', legs: '#2f3743', style: 'bun' }
const HELPER = { skin: '#eac7aa', hair: '#54392a', shirt: '#f19140', legs: '#4b5160', style: 'long' }

// Twelve kids, the same twelve every visit, sat in an arc on the near half of
// the rug, each turned to face the teacher.
const KIDS = (() => {
  const random = seeded(23)
  return Array.from({ length: 12 }, (_, i) => {
    const look = lookFrom(random)
    if (look.style === 'bald' || random() < 0.3) look.style = random() < 0.5 ? 'pigtails' : 'short'
    // No grey heads in Sunday school.
    if (look.hair === '#8d8a86' || look.hair === '#b9b4ab') look.hair = '#3d2a1e'
    const angle = (200 + (i * 140) / 11) * (Math.PI / 180)
    const ring = i % 2 ? 150 : 228
    const x = RUG.x + Math.cos(angle) * ring * -1
    const y = RUG.y + 40 + Math.sin(angle) * ring * -1
    return { look, x, y, turn: (Math.atan2(TEACHER_AT.y - y, TEACHER_AT.x - x) * 180) / Math.PI + 90, at: 0.04 + i * 0.038 }
  })
})()

// Where each kid is: walking in from the door, then sat down.
const kids = computed(() =>
  KIDS.map((kid) => {
    const walk = phase(props.u, kid.at, kid.at + 0.16)
    return {
      ...kid,
      walk,
      px: lerp(DOOR.x, kid.x, walk),
      py: lerp(DOOR.y, kid.y, walk),
      turn: walk < 1 ? (Math.atan2(kid.y - DOOR.y, kid.x - DOOR.x) * 180) / Math.PI + 90 : kid.turn,
    }
  }).filter((kid) => kid.walk > 0)
)
const here = computed(() => kids.value.filter((kid) => kid.walk > 0.35).length)

// The planks of the floor; the rug's rings, a rainbow from the outside in;
// the play mats' tiles; the bags in the cubbies.
const PLANKS = Array.from({ length: 24 }, (_, i) => 40 + i * 40)
const RINGS = [
  [270, '#f4c45d'],
  [238, '#ef9a5b'],
  [206, '#e8746a'],
  [174, '#7cc3a0'],
  [142, '#6cb8d8'],
  [110, '#fbecd0'],
]
const MAT = ['#f4c45d', '#6cb8d8', '#ef9a5b', '#7cc3a0', '#e8746a', '#9d8fd6']
const BAGS = ['#ef9a5b', '#6cb8d8', '#f4c45d', '#e8746a', '#7cc3a0']

// The workbooks, open at Noah's ark, on the tables: [x, y, turn]. They are
// drawn a little larger than life, so the page can be read at a glance.
const WORKBOOKS = [
  [186, 290, -6],
  [322, 318, 5],
  [190, 628, 4],
  [316, 650, -5],
]
// Crayons out beside them: [colour, x, y, turn].
const CRAYONS = [
  ['#c65d4f', 196, 410, 20],
  ['#0270dc', 236, 418, -35],
  ['#fdc24b', 412, 300, 70],
  ['#3f8f6b', 392, 424, -12],
  ['#f19140', 196, 752, 40],
  ['#8b6bb8', 360, 756, -20],
  ['#09a4c6', 246, 760, 12],
]
// The ark's rainbow, outside in.
const RAINBOW = ['#e8746a', '#f19140', '#f4c45d', '#7cc3a0', '#6cb8d8']
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <!-- The floor, past the room's edges too, should the camera see them. -->
    <rect x="-2000" y="-2000" width="5600" height="5000" fill="#e3d2b4" />
    <rect x="0" y="0" width="1600" height="1000" fill="#ecd6b0" />
    <path v-for="y in PLANKS" :key="y" :d="`M40 ${y}H1560`" stroke="#d9bf95" stroke-width="2" />

    <!-- The walls from above, a window along the top and the door at the
         bottom right, open. -->
    <path d="M0 0H1600V1000H1400V960H1560V40H40V960H1260V1000H0Z" fill="#f6eedf" />
    <rect x="560" y="8" width="420" height="24" rx="4" fill="#9fd3e6" />
    <rect x="766" y="8" width="8" height="24" fill="#f6eedf" />
    <path d="M1260 960A140 140 0 0 1 1400 820" fill="none" stroke="#d9bf95" stroke-width="3" stroke-dasharray="8 8" />
    <rect x="1394" y="820" width="10" height="140" fill="#a8714c" />

    <!-- Cubbies down the right wall, a bright bag in each. -->
    <rect x="1490" y="120" width="64" height="520" rx="4" fill="#c9a77d" />
    <rect v-for="(colour, i) in BAGS" :key="i" x="1502" :y="136 + i * 100" width="40" height="64" rx="8" :fill="colour" />

    <!-- A corner of foam play mats, and a box of blocks. -->
    <rect v-for="(colour, i) in MAT.concat(MAT)" :key="'m' + i" :x="64 + (i % 4) * 58" :y="836 + Math.floor(i / 4) * 40" width="56" height="38" rx="3" :fill="colour" opacity="0.9" />
    <rect x="300" y="860" width="74" height="64" rx="6" fill="#a8714c" />
    <rect v-for="(colour, i) in ['#e8746a', '#6cb8d8', '#f4c45d', '#7cc3a0']" :key="'b' + i" :x="308 + (i % 2) * 32" :y="868 + Math.floor(i / 2) * 26" width="24" height="20" rx="3" :fill="colour" />

    <!-- The rug the class sits on: a rainbow, from the outside in. -->
    <circle v-for="([r, colour], i) in RINGS" :key="'r' + i" :cx="RUG.x" :cy="RUG.y" :r="r" :fill="colour" />

    <!-- The teacher on a low chair at the head of the rug, the picture Bible
         open at Noah's ark toward the kids. -->
    <rect :x="TEACHER_AT.x - 46" :y="TEACHER_AT.y - 52" width="92" height="72" rx="12" fill="#8a5a3b" />
    <g :transform="`translate(${TEACHER_AT.x} ${TEACHER_AT.y}) rotate(180) scale(2.1)`">
      <FromAbove :look="TEACHER" :reach="1" />
    </g>
    <g :transform="`translate(${TEACHER_AT.x} ${TEACHER_AT.y + 62}) scale(1.5)`">
      <rect x="-36" y="-14" width="72" height="34" rx="3" fill="#fff" />
      <path d="M0 -14V20" stroke="#d9bf95" stroke-width="2" />
      <!-- The ark, on one page, and its rainbow on the other. -->
      <path d="M-31 9H-5L-10 16H-26Z" fill="#a8714c" />
      <rect x="-24" y="2" width="12" height="7" fill="#e9c38a" />
      <path d="M-26 2L-18 -3L-10 2Z" fill="#e8746a" />
      <path d="M-34 17Q-27 14 -20 17T-6 17" fill="none" stroke="#6cb8d8" stroke-width="2" />
      <path
        v-for="(colour, i) in RAINBOW.slice(0, 3)"
        :key="'p' + i"
        :d="`M${8 + i * 4} 14A${12 - i * 4} ${12 - i * 4} 0 0 1 ${32 - i * 4} 14`"
        fill="none"
        :stroke="colour"
        stroke-width="3"
      />
    </g>

    <!-- The tables, and the workbooks on them, open at Noah's ark: the ark
         with its house, the water round it, the sun, and the rainbow. -->
    <rect v-for="y in [270, 610]" :key="'t' + y" x="170" :y="y" width="280" height="170" rx="14" fill="#fff8ec" stroke="#e2cfae" stroke-width="3" />
    <g v-for="([x, y, turn], i) in WORKBOOKS" :key="'w' + i" :transform="`translate(${x} ${y}) rotate(${turn}) scale(1.2)`">
      <rect x="0" y="0" width="104" height="78" rx="2" fill="#fff" stroke="#eadfcb" stroke-width="2" />
      <text x="7" y="13" font-size="9" font-weight="800" fill="#0270dc">Noah's Ark</text>
      <circle cx="90" cy="14" r="6" fill="#f4c45d" />
      <path
        v-for="(colour, j) in RAINBOW"
        :key="j"
        :d="`M${18 + j * 4} 52A${34 - j * 4} ${34 - j * 4} 0 0 1 ${86 - j * 4} 52`"
        fill="none"
        :stroke="colour"
        stroke-width="3"
      />
      <path d="M4 66Q12 62 20 66T36 66T52 66T68 66T84 66T100 66V76H4Z" fill="#7fc4e3" />
      <path d="M22 56H82L74 67H30Z" fill="#a8714c" />
      <rect x="38" y="45" width="28" height="11" fill="#e9c38a" />
      <path d="M35 45L52 37L69 45Z" fill="#e8746a" />
      <rect x="44" y="48" width="5" height="5" fill="#6cb8d8" />
      <rect x="55" y="48" width="5" height="5" fill="#6cb8d8" />
    </g>
    <rect v-for="(crayon, i) in CRAYONS" :key="'c' + i" :x="crayon[1]" :y="crayon[2]" width="34" height="8" rx="4" :fill="crayon[0]" :transform="`rotate(${crayon[3]} ${crayon[1] + 17} ${crayon[2] + 4})`" />

    <!-- Check-in by the door: a helper behind the table, and the tablet the
         kids are counted on. -->
    <rect x="1180" y="700" width="220" height="90" rx="8" fill="#a07a5a" />
    <g transform="translate(1290 662) rotate(180) scale(2)">
      <FromAbove :look="HELPER" :reach="0.6" />
    </g>
    <g transform="translate(1214 712)">
      <rect x="0" y="0" width="152" height="66" rx="8" fill="#1f2937" />
      <rect x="5" y="5" width="142" height="56" rx="4" fill="#fff" />
      <text x="14" y="25" font-size="13" font-weight="700" fill="#6b7280">Little Lambs</text>
      <text x="14" y="52" font-size="24" font-weight="800" fill="#111827">{{ here }}</text>
      <text x="56" y="51" font-size="12" font-weight="600" fill="#6b7280">here today</text>
    </g>

    <!-- The kids, walking in and sitting down. -->
    <g v-for="(kid, i) in kids" :key="i" :transform="`translate(${kid.px} ${kid.py}) rotate(${kid.turn}) scale(1.6)`">
      <FromAbove :look="kid.look" :reach="kid.walk >= 1 ? 0.3 : 0" />
    </g>
  </svg>
</template>

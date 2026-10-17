<script setup>
import { computed } from 'vue'
import StoryFigure from './StoryFigure.vue'
import SeatedBack from './SeatedBack.vue'
import { CROSS, CROSS_SIDES, RECESS, RIM } from './hall'
import { CAST } from './people'
import { PEOPLE, ROWS, VANISH_Y, VISITOR } from './pews'
import { LYRICS, READING, phase } from './timeline'

// The inside of the church, seen from the back as the reader comes in: the
// pews either side of the aisle, the stage, the band, the pulpit, the screen,
// and at the centre of the back wall the cross. The room is turned toward it,
// so the cross, and not Ekkly's mark, is what the room is drawn around:
// Christ is the focus of a church, and Ekkly only a tool for the people who
// serve in it.
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

// How far the congregation sits up above the line of their pew.
const SIT = 16

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

// The banner beside the cross carries the church's name, two lines of it.
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

// A hand raised in worship, in its own time: each person starts at their own
// point (pews.js) of the swell of the songs.
const raised = (person) => phase(props.scene.praise || 0, person.praiseAt, person.praiseAt + 0.5)

// What the preacher says: the gospel, a sentence at a time as the reader
// scrolls through the sermon.
const SERMON = [
  ['God is holy,', 'and you are a sinner.'],
  ['Yet God loves you, and sent', 'His Son, Jesus Christ.'],
]
const sermonLine = computed(() => SERMON[(props.scene.sermon || 0) < 0.5 ? 0 : 1])
const wave2 = computed(() => Math.sin((props.scene.play || 0) * 1.7 + 1))
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">

    <!-- The room: ceiling, side walls with their pillars, floor, back wall. -->
    <path d="M360 30H1240L6520 -4170H-4920Z" fill="#e8dcc6" />
    <path d="M360 30V540L-4920 2460V-4170Z" fill="#efe4cf" />
    <path d="M1240 30V540L6520 2460V-4170Z" fill="#ebdfc8" />
    <path v-for="(d, i) in PILLARS" :key="i" :d="d" fill="#e2d3b8" />
    <path d="M360 540H1240L6520 2460H-4920Z" fill="#c4976b" />
    <path d="M775 540H825L1145 2460H455Z" fill="#2f63a6" />
    <rect x="360" y="30" width="880" height="510" fill="#f6eedf" />
    <rect x="360" y="470" width="880" height="70" fill="#e9dbc1" />

    <!-- The cross, plain wood, in an arched recess at the centre of the back
         wall, a little shadow behind it where it stands off the wall. -->
    <path :d="RIM" fill="#e6d8bf" />
    <path :d="RECESS" fill="#fbf4e6" />
    <rect x="716" y="398" width="168" height="9" rx="2" fill="#e6d8bf" />
    <path :d="CROSS" fill="#000" opacity="0.08" transform="translate(6 6)" />
    <path :d="CROSS" fill="#8a5a3b" />
    <path :d="CROSS_SIDES" fill="#6f4630" />

    <!-- The banner with the church's name, and the screen. -->
    <line x1="420" y1="92" x2="604" y2="92" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round" />
    <path d="M432 92H592V300L512 274L432 300Z" fill="#e98a3f" />
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

    <!-- A potted plant at either end of the stage. -->
    <g v-for="x in [392, 1208]" :key="x" :transform="`translate(${x} 598)`">
      <path d="M-14 0L-11 -22H11L14 0Z" fill="#c9a77d" />
      <path d="M0 -22C-4 -40 -20 -50 -30 -48C-20 -42 -10 -34 -4 -22Z" fill="#4f9a5f" />
      <path d="M0 -22C4 -44 18 -58 30 -58C20 -50 10 -38 4 -22Z" fill="#5aa968" />
      <path d="M0 -22C-2 -50 0 -66 6 -74C8 -60 6 -40 3 -22Z" fill="#4f9a5f" />
      <path d="M0 -22C-10 -34 -26 -34 -34 -28C-24 -26 -12 -26 -2 -20Z" fill="#62ad70" />
    </g>

    <!-- The band. Their instruments stay when they step down for the sermon. -->
    <rect x="408" y="546" width="124" height="30" rx="3" fill="#c9b48f" />
    <g :opacity="scene.band">
      <g transform="translate(470 560) scale(0.84)">
        <StoryFigure :look="CAST.drums" pose="drums" :motion="wave" />
      </g>
      <g transform="translate(600 578) scale(0.88)">
        <StoryFigure :look="CAST.keys" pose="keys" :motion="wave2" />
      </g>
      <g transform="translate(700 580) scale(0.9)">
        <StoryFigure :look="CAST.singer" pose="mic" :praise="scene.praise || 0" />
      </g>
      <g transform="translate(980 580) scale(0.9)">
        <StoryFigure :look="CAST.guitar" pose="guitar" :motion="wave" />
      </g>
    </g>
    <!-- The drums. -->
    <line x1="420" y1="482" x2="420" y2="548" stroke="#6b7280" stroke-width="2" />
    <line x1="522" y1="478" x2="522" y2="548" stroke="#6b7280" stroke-width="2" />
    <ellipse cx="420" :cy="481 + (scene.band ? wave * 1.5 : 0)" rx="19" ry="3.6" fill="#b8975a" />
    <ellipse cx="522" :cy="477 - (scene.band ? wave2 * 1.5 : 0)" rx="17" ry="3.4" fill="#b8975a" />
    <ellipse cx="450" cy="510" rx="13" ry="6.5" fill="#2f3a52" />
    <ellipse cx="492" cy="510" rx="13" ry="6.5" fill="#2f3a52" />
    <circle cx="470" cy="542" r="25" fill="#f4f1ea" stroke="#2f3a52" stroke-width="4" />
    <circle cx="470" cy="542" r="8" fill="none" stroke="#8a8f96" stroke-width="2.5" />
    <!-- The keyboard, on its stand, in front of whoever plays it. -->
    <path d="M572 576L628 526M628 576L572 526" stroke="#4b5563" stroke-width="3" />
    <rect x="558" y="518" width="84" height="10" rx="2" fill="#1f2937" />
    <rect x="562" y="520" width="76" height="4" fill="#f4f1ea" />
    <!-- The pulpit, and the preacher behind it when it is time: the pulpit
         comes to his chest, as it does, with the Bible open on it. -->
    <g v-if="scene.preacher > 0" :opacity="scene.preacher" transform="translate(800 592) scale(1.32)">
      <StoryFigure :look="CAST.preacher" pose="preach" :motion="wave" :bow="scene.bow" />
    </g>
    <path d="M770 500H830L822 592H778Z" fill="#a8714c" />
    <rect x="762" y="493" width="76" height="9" rx="2" fill="#8a5a3b" />
    <path d="M778 492L800 488L822 492L800 495Z" fill="#fbf8ef" :opacity="scene.preacher" />

    <!-- What the preacher is saying, beside him while the sermon is on. -->
    <g v-if="scene.preacher > 0 && scene.sermonShown > 0" :opacity="scene.preacher * scene.sermonShown" transform="translate(846 352)">
      <rect x="0" y="0" width="262" height="66" rx="14" fill="#fff" />
      <path d="M18 60L-14 92L42 66Z" fill="#fff" />
      <text x="16" y="28" font-size="16" font-weight="700" fill="#0f1c4d">{{ sermonLine[0] }}</text>
      <text x="16" y="50" font-size="16" font-weight="700" fill="#0f1c4d">{{ sermonLine[1] }}</text>
    </g>

    <!-- The light on the stage's floor. No stage spotlights: a church on a
         Sunday morning, not a concert. Drawn with the stage, under the
         congregation, so it never washes across the front rows' heads. -->
    <ellipse cx="800" cy="596" rx="240" ry="14" fill="#f6dba8" :opacity="0.12 + scene.dim * 0.2" />

    <!-- The congregation, back of the room last, so nearer heads cover the
         rows in front of them. Each row is its people, then the back of
         their pew. -->
    <g v-for="row in byRow" :key="row.r">
      <!-- Repatched only when they sit, stand or bow, not every frame the
           camera moves. -->
      <!-- Each sits up out of the pew by SIT, so the backrest comes to their
           middle and their head and shoulders clear it, rather than coming
           up to their chins and hiding all but the tops of the shorter ones. -->
      <g
        v-for="person in row.people"
        :key="person.key"
        v-memo="[person.here, scene.stand, scene.bow, person.hands ? scene.praise : 0]"
        :transform="`translate(${person.x} ${person.y - (SIT + (1 - person.here) * 14 + scene.stand * 22) * person.s}) scale(${person.s})`"
        :opacity="person.here"
      >
        <SeatedBack
          :look="person.look"
          :build="person.build"
          :bow="scene.bow"
          :raise="person.hands ? raised(person) : 0"
          :hands="person.hands"
          :hand-side="person.handSide"
        />
      </g>
      <!-- The pew, not memoised: v-memo inside the row loop kept the front
           row's pew and drew it in every row's place, over everyone behind. -->
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
          <path d="M-8 -6Q0 -10 8 -6" stroke="#b8975a" stroke-width="2.5" fill="none" stroke-linecap="round" />
        </g>
      </template>
    </g>

    <!-- The first-timer's tag, as they sit down. -->
    <g
      v-if="scene.visitor > 0"
      :transform="`translate(${VISITOR.x} ${VISITOR.y - (76 + SIT + scene.stand * 22) * VISITOR.s}) scale(${VISITOR.s})`"
      :opacity="scene.visitor"
    >
      <rect x="-34" y="-12" width="68" height="20" rx="10" fill="#fff" stroke="var(--color-primary)" stroke-width="1.5" />
      <text x="0" y="2" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--color-primary)">First visit</text>
      <path d="M-4 8L0 13L4 8Z" fill="#fff" />
    </g>

    <!-- The usher at the back, greeting whoever comes in and counting them in
         on a phone held at the chest, and the count rising from it: the same
         number the card shows, from the same scene, so the two can never
         disagree. -->
    <g v-if="scene.usher > 0" :opacity="scene.usher">
      <g transform="translate(888 1020) scale(2.5)">
        <StoryFigure :look="CAST.usher" pose="phone" />
      </g>
      <g transform="translate(920 690)">
        <rect x="0" y="0" width="156" height="80" rx="16" fill="#fff" />
        <path d="M10 74L-6 118L34 80Z" fill="#fff" />
        <text x="18" y="28" font-size="15" font-weight="600" fill="#6b7280">Here today</text>
        <text x="18" y="64" font-size="34" font-weight="800" fill="#0f1c4d" style="font-variant-numeric: tabular-nums">{{ scene.count }}</text>
      </g>
    </g>

    <!-- The house dims for prayer, and the cross's recess stays lit over the
         dark, so the cross is what the room is left looking at. -->
    <rect v-if="scene.dim > 0" x="-5000" y="-4200" width="11600" height="6800" fill="#0b1430" :opacity="scene.dim * 0.6" />
    <g v-if="scene.dim > 0" :opacity="scene.dim">
      <path :d="RECESS" fill="#f6e3bd" />
      <path :d="CROSS" fill="#8a5a3b" />
      <path :d="CROSS_SIDES" fill="#6f4630" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import StoryFigure from './StoryFigure.vue'
import { CAST } from './people'

// The leaders' meeting after the service, seen from a seat at the table: the
// others across it, coffee and papers between, and in the reader's own hands
// the phone the minutes are being kept on. As the meeting goes, a decision is
// written down and each action item gets someone's name. Drawn on a
// 1600 × 1000 canvas.
//
// Everything follows `u`, how far through the part the reader has scrolled.

const props = defineProps({
  viewBox: { type: String, required: true },
  u: { type: Number, default: 0 },
  name: { type: String, default: 'Ekkly' },
})

// Round the table, left to right, the pastor chairing in the middle.
const SEATS = [
  { x: 330, look: { skin: '#f3cfb1', hair: '#5a3b25', shirt: '#c65d4f', legs: '#2f3a52', style: 'long' } },
  { x: 565, look: CAST.usher },
  { x: 800, look: CAST.preacher },
  { x: 1035, look: { ...CAST.mum, pattern: null } },
  { x: 1270, look: { skin: '#8d5a3b', hair: '#1b1b1f', shirt: '#8b6bb8', legs: '#2f3a52', style: 'curly' } },
]

const ITEMS = [
  { says: 'Book the bus for youth camp', who: 'Ana', at: 0.3 },
  { says: 'Call this week’s first-timers', who: 'Lyn', at: 0.5 },
  { says: 'Fix the projector cable', who: 'Jun', at: 0.72 },
]
const shown = computed(() => ITEMS.map((item) => ({ ...item, named: props.u >= item.at })))
const decided = computed(() => props.u >= 0.12)

// The reader's own hands round the phone, drawn to the family on the cover:
// the left hand, the right being it turned over about the phone's middle.
// Each is a palm and fingers behind the phone, showing past its edge, and a
// thumb in front, resting on the screen, with its nail, a fold at the knuckle
// and the side turned from the light a tone darker.
const HAND_SIDES = ['', 'translate(1600 0) scale(-1 1)']
const PALM = 'M570 940C560 900 556 860 562 830C566 808 580 792 598 786C608 783 618 784 626 788L640 800V940Z'
const THUMB = 'M600 928C618 928 636 918 644 900C650 886 653 868 656 852C659 836 662 816 662 802C662 786 646 780 638 792C632 802 628 820 624 836C620 850 614 862 604 868Z'
const THUMB_SHADE = 'M662 804C662 824 658 842 654 858C650 874 646 890 640 902L632 897C639 884 644 868 648 852C651 836 654 818 655 804Z'
const NAIL = 'M642 806C643 795 655 793 657 804L656 817C651 820 645 820 642 816Z'
</script>

<template>
  <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <!-- The room: wall, window, the agenda on the whiteboard, the clock. -->
    <rect x="-2000" y="-2000" width="5600" height="2560" fill="#efe6d6" />
    <rect x="-2000" y="560" width="5600" height="2440" fill="#cbb08a" />
    <rect x="170" y="80" width="330" height="250" rx="8" fill="#e2d3b8" />
    <rect x="186" y="96" width="298" height="218" rx="4" fill="#bfe3ef" />
    <path d="M335 96V314M186 205H484" stroke="#e2d3b8" stroke-width="8" />
    <rect x="1010" y="80" width="420" height="250" rx="8" fill="#fff" stroke="#d9cbb1" stroke-width="6" />
    <text x="1040" y="130" font-size="28" font-weight="800" fill="#33405a">Agenda</text>
    <g fill="#9aa3b2">
      <rect x="1040" y="160" width="250" height="10" rx="5" />
      <rect x="1040" y="196" width="320" height="10" rx="5" />
      <rect x="1040" y="232" width="210" height="10" rx="5" />
      <rect x="1040" y="268" width="280" height="10" rx="5" />
    </g>
    <circle cx="800" cy="150" r="46" fill="#fff" stroke="#8a6a4a" stroke-width="6" />
    <path d="M800 150V118M800 150L826 162" stroke="#1f2937" stroke-width="5" stroke-linecap="round" />

    <!-- The leaders across the table, drawn before it so it hides all but
         their heads and shoulders. -->
    <g v-for="seat in SEATS" :key="seat.x" :transform="`translate(${seat.x} 752) scale(2.45)`">
      <StoryFigure :look="seat.look" />
    </g>

    <!-- The table, and what is on it. -->
    <path d="M200 600H1400L1640 1000H-40Z" fill="#a8714c" />
    <rect x="200" y="592" width="1200" height="14" rx="4" fill="#8a5a3b" />
    <g v-for="x in [330, 565, 1035, 1270]" :key="x">
      <ellipse :cx="x + 70" cy="640" rx="22" ry="9" fill="#f4f1ea" />
      <ellipse :cx="x + 70" cy="640" rx="15" ry="5.5" fill="#6b4226" />
    </g>
    <rect x="300" y="680" width="150" height="100" rx="3" fill="#fff" transform="rotate(-8 375 730)" />
    <rect x="1130" y="690" width="150" height="100" rx="3" fill="#fff" transform="rotate(7 1205 740)" />
    <rect x="740" y="630" width="120" height="34" rx="4" fill="#8a3b2e" />
    <rect x="744" y="660" width="112" height="6" fill="#f4ecd8" />

    <!-- The reader's own hands, and the phone the minutes are kept on. -->
    <!-- Held low, below the faces across the table. -->
    <g transform="translate(0 96) rotate(-3 800 860) translate(800 1000) scale(0.9) translate(-800 -1000)">
      <!-- The palms and fingers, behind the phone; then the sleeves they come
           out of, coming in from below. -->
      <g v-for="side in HAND_SIDES" :key="'palm' + side" :transform="side || null">
        <path :d="PALM" fill="#c99470" />
        <path d="M578 806Q590 798 606 800" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" opacity="0.1" />
      </g>
      <path d="M520 1100L560 930Q600 900 650 930L660 1100Z" fill="#33405a" />
      <path d="M1080 1100L1040 930Q1000 900 950 930L940 1100Z" fill="#33405a" />
      <rect x="610" y="560" width="380" height="520" rx="44" fill="#1f2937" />
      <rect x="626" y="576" width="348" height="488" rx="32" fill="#fff" />
      <text x="652" y="626" font-size="18" font-weight="700" fill="#6b7280">{{ name }} · Minutes</text>
      <text x="652" y="660" font-size="26" font-weight="800" fill="#111827">Leaders’ meeting</text>
      <g :opacity="decided ? 1 : 0">
        <rect x="652" y="682" width="296" height="54" rx="12" fill="#ecfdf5" />
        <circle cx="676" cy="709" r="10" fill="#10b981" />
        <path d="M671 709L675 713L682 705" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
        <text x="696" y="704" font-size="14" font-weight="700" fill="#047857">Decided</text>
        <text x="696" y="724" font-size="15" font-weight="600" fill="#065f46">Youth camp in December</text>
      </g>
      <text x="652" y="772" font-size="15" font-weight="700" fill="#6b7280">Action items</text>
      <g v-for="(item, i) in shown" :key="item.says" :transform="`translate(652 ${790 + i * 70})`" :opacity="u >= item.at - 0.14 ? 1 : 0">
        <rect x="0" y="0" width="296" height="58" rx="12" fill="#f3f4f6" />
        <text x="14" y="24" font-size="15" font-weight="600" fill="#111827">{{ item.says }}</text>
        <g v-if="item.named">
          <circle cx="24" cy="41" r="9" fill="#33405a" />
          <text x="24" y="45" font-size="11" font-weight="800" fill="#fff" text-anchor="middle">{{ item.who[0] }}</text>
          <text x="40" y="46" font-size="14" font-weight="700" fill="#33405a">{{ item.who }}</text>
        </g>
        <text v-else x="14" y="46" font-size="14" font-weight="600" fill="#9ca3af">Who will take it?</text>
      </g>
      <!-- The thumbs, resting on the screen's lower corners, as anyone holds
           a phone to type with it. -->
      <g v-for="side in HAND_SIDES" :key="'thumb' + side" :transform="side || null">
        <path :d="THUMB" fill="#c99470" />
        <path :d="THUMB_SHADE" fill="#b5805c" />
        <path :d="NAIL" fill="#dcb595" />
        <path d="M636 846Q645 843 653 846M612 900Q626 896 638 884" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" opacity="0.1" />
      </g>
    </g>
  </svg>
</template>

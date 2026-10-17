<script setup>
import { computed, useId } from 'vue'

// The family who walk up to the church on the front door's cover: the first
// people anyone sees there, so each is drawn by hand to the cover art
// (References/"A Sunday at Ekkly Church.png") rather than built from the
// figure kit everyone else uses (StoryFigure). The dad in a crew-neck sweater
// over a white T-shirt, jeans and brown shoes; the child in a hooded jacket
// with a backpack; the mum in a belted coat, her long hair down her back, a
// bag on each hip. Flat colour, as the cover has it, with a quieter tone of
// each colour on the side turned from the light, and no gradients or shine.
//
// Drawn in the cover's own pixels, standing on (0, 0): the dad about 200 tall,
// the mum 190, the child 150. Seen from behind as they walk in (`facing`
// 'back'), or from the front as they come out at night. `step`, from -1 to 1,
// is given by the scroll: the lifted foot comes up as its knee bends, the arms
// swing a little, and the body dips as each foot lands.

const props = defineProps({
  who: { type: String, required: true },
  facing: { type: String, default: 'back' },
  step: { type: Number, default: 0 },
})

const id = useId()
const front = computed(() => props.facing === 'front')
const lift = computed(() => ({ left: Math.max(0, props.step), right: Math.max(0, -props.step) }))
const body = computed(() => `translate(0 ${Math.abs(props.step) * 1.2})`)
const swing = computed(() => props.step * 3)

const DAD = {
  hair: '#2f2c2d',
  hairLight: '#403b3b',
  skin: '#e3b08a',
  skinShade: '#c99674',
  sweater: '#2b7991',
  sweaterShade: '#266d83',
  band: '#256a80',
  tee: '#efe9df',
  jeans: '#24435f',
  jeansShade: '#1d3850',
  shoes: '#4b3f3a',
}
const MUM = {
  hair: '#453d3a',
  hairShade: '#3a3331',
  skin: '#f2c39d',
  skinShade: '#e2ad87',
  coat: '#e5c694',
  coatShade: '#d9b680',
  belt: '#d6b27b',
  bag: '#ad724e',
  flap: '#96603f',
  strap: '#8f5c3d',
  shoes: '#363b42',
}
const CHILD = {
  hair: '#5a3b25',
  hairLight: '#6e4a30',
  skin: '#e7b48f',
  skinShade: '#cf9a74',
  jacket: '#1b7a89',
  jacketShade: '#176c79',
  hood: '#145f5a',
  pack: '#1393e5',
  packShade: '#0f80cc',
  pocket: '#0e78c4',
  trousers: '#6f635a',
  trousersShade: '#62574f',
  shoes: '#363534',
}

// Limbs shaped as a body's are, not as tubes: a thigh narrowing to the knee
// and the calf swelling below it before it tapers to the ankle; an arm out a
// little from the body to an elbow that is slightly bent, the forearm coming
// back in to the wrist. Each is written once, for the figure's left side, as
// path segments, and mirrored about the middle of the figure (`c`) for its
// right, so the two always match.
const draw = (segments, c = null) =>
  segments.map(([cmd, ...n]) => cmd + n.map((v, i) => (c === null || i % 2 ? v : 2 * c - v)).join(' ')).join('')

// A lifted foot comes up and its knee bends: the thigh stays where it is and
// the shin, seen end-on from behind, grows shorter. `at` finds a point down
// the shin, from the knee (0) to the ankle (1).
const shin = (knee, ankle) => (f) => knee + (ankle - knee) * f

const dadLeg = (u) => {
  const k = -52
  const a = -12 - u * 9
  const at = shin(k, a)
  return [
    ['M', -17.2, -89],
    ['C', -18.4, -79, -18, -64, -15.9, k],
    ['C', -15.3, at(0.12), -16.9, at(0.3), -16.8, at(0.48)],
    ['C', -16.7, at(0.68), -15.4, at(0.88), -14.6, a],
    ['L', -4.4, a],
    ['C', -3.6, at(0.88), -2.3, at(0.66), -2.4, at(0.48)],
    ['C', -2.5, at(0.3), -2.9, at(0.12), -2.4, k],
    ['C', -1.6, -64, 0, -78, 0.5, -89],
    ['Z'],
  ]
}
const mumLeg = (u) => {
  const k = -40
  const a = -8 - u * 7
  const at = shin(k, a)
  return [
    ['M', -13.6, -46],
    ['C', -13.8, -43, -13.3, -41.4, -12.9, k],
    ['C', -13.9, at(0.2), -14.7, at(0.42), -14.2, at(0.6)],
    ['C', -13.7, at(0.78), -12.5, at(0.92), -11.6, a],
    ['L', -3.2, a],
    ['C', -2.7, at(0.86), -1.9, at(0.62), -2.1, at(0.42)],
    ['C', -2.3, at(0.18), -1.8, -42.5, -1.4, -46],
    ['Z'],
  ]
}
const childLeg = (u) => {
  const k = -36
  const a = -9 - u * 7
  const at = shin(k, a)
  return [
    ['M', -14, -63],
    ['C', -14.6, -56, -14.4, -45, -13.2, k],
    ['C', -12.8, at(0.14), -13.9, at(0.36), -13.8, at(0.54)],
    ['C', -13.7, at(0.74), -13.1, at(0.9), -12.6, a],
    ['L', -3.4, a],
    ['C', -2.9, at(0.86), -2.3, at(0.6), -2.5, at(0.42)],
    ['C', -2.7, at(0.18), -2.8, k + 1, -2.4, k - 2],
    ['C', -2, -48, -1.8, -56, -1.6, -63],
    ['Z'],
  ]
}

// Each figure's middle, how far a lifted foot rises, and the strip down the
// right of each leg turned from the light.
const FIGURES = {
  dad: { leg: dadLeg, c: 1.75, rise: 9, shade: [-6, 16] },
  mum: { leg: mumLeg, c: 0, rise: 7, shade: [-5, 10.4] },
  child: { leg: childLeg, c: 0, rise: 7, shade: [-5.4, 10.2] },
}
const figure = computed(() => FIGURES[props.who] || FIGURES.child)
const legs = computed(() => ({
  left: draw(figure.value.leg(lift.value.left)),
  right: draw(figure.value.leg(lift.value.right), figure.value.c),
}))
const footUp = (u) => `translate(0 ${-u * figure.value.rise})`

const DAD_PARTS = {
  sleeve: [
    ['M', -20.5, -160],
    ['C', -26, -159, -30.5, -155.5, -31.2, -149],
    ['C', -32, -141, -33.2, -133, -32.9, -125.5],
    ['C', -32.6, -117, -31.5, -106, -30.6, -97.5],
    ['Q', -26, -95.8, -21, -97],
    ['C', -21.7, -106, -23.9, -116, -24, -124],
    ['C', -24.1, -132, -22.6, -140, -21.9, -146],
    ['Z'],
  ],
  edge: [['M', -21.9, -146], ['C', -22.6, -140, -24.1, -132, -24, -124], ['C', -23.9, -116, -21.7, -106, -21, -97]],
  elbow: [['M', -32.4, -127.4], ['Q', -29.6, -125.6, -26.8, -126.8]],
  cuff: [['M', -30.8, -101], ['Q', -26, -99.4, -21.1, -100.6], ['L', -21, -97], ['Q', -26, -95.8, -30.6, -97.5], ['Z']],
  hand: [['M', -30.6, -97.5], ['C', -31.5, -92, -30.5, -86, -27.5, -84.5], ['C', -24.5, -83.5, -21.8, -86, -21.4, -90], ['C', -21.2, -93, -21.1, -95.5, -21, -97], ['Z']],
  knuckle: [['M', -22, -93], ['Q', -20.6, -90.5, -21.6, -88]],
  shoe: [['M', -17.6, -11], ['C', -18.3, -6, -17.8, -0.5, -13.8, 0], ['H', -2.8], ['C', -0.3, -0.5, 0, -6, -1.4, -11], ['Z']],
}
const MUM_PARTS = {
  sleeve: [
    ['M', -22, -146],
    ['C', -27, -145, -30.8, -141.5, -31.4, -135],
    ['C', -32.2, -126, -33.4, -117, -33.1, -109],
    ['C', -32.8, -99, -31.5, -87, -30.6, -76],
    ['Q', -26, -74, -22, -76],
    ['C', -22.4, -87, -24.3, -99, -24.3, -108],
    ['C', -24.3, -118, -22.7, -128, -22.4, -135],
    ['Z'],
  ],
  edge: [['M', -22.4, -135], ['C', -22.7, -128, -24.3, -118, -24.3, -108], ['C', -24.3, -99, -22.4, -87, -22, -76]],
  elbow: [['M', -32.6, -110.6], ['Q', -29.8, -108.8, -27, -110]],
  hand: [['M', -30.6, -76.5], ['C', -31.3, -71, -30.3, -65.5, -27.3, -64], ['C', -24.3, -63, -22.2, -65.5, -21.9, -69.5], ['L', -22, -76.5], ['Z']],
  shoe: [['M', -12.6, -9], ['C', -13.4, -5, -13, -0.6, -9.8, 0], ['H', -2], ['C', -0.4, -0.6, -0.6, -5, -1.8, -9], ['Z']],
}
const CHILD_PARTS = {
  sleeve: [
    ['M', -17, -116],
    ['C', -21, -115.5, -23.8, -112.5, -24.2, -107],
    ['C', -24.8, -101, -25.6, -95, -25.3, -89],
    ['C', -25, -82, -24.2, -74, -23.6, -68],
    ['Q', -20, -66.5, -16.6, -68],
    ['C', -16.9, -74, -18.3, -82, -18.3, -88],
    ['C', -18.3, -95, -17.2, -101, -17, -106],
    ['Z'],
  ],
  edge: [['M', -17, -106], ['C', -17.2, -101, -18.3, -95, -18.3, -88], ['C', -18.3, -82, -16.9, -74, -16.6, -68]],
  elbow: [['M', -24.8, -90], ['Q', -22.6, -88.8, -20.4, -89.6]],
  hand: [['M', -23.6, -68.5], ['C', -24.2, -64, -23.4, -59.5, -21, -58.4], ['C', -18.6, -57.6, -16.9, -59.6, -16.7, -62.8], ['L', -16.6, -68.5], ['Z']],
  shoe: [['M', -13.6, -10], ['C', -14.4, -5.5, -14, -0.6, -10.8, 0], ['H', -3.2], ['C', -1.4, -0.6, -1.6, -5.5, -2.8, -10], ['Z']],
}
// Each part as a path for the left side and, named with an R, for the right.
const pair = (parts, c) =>
  Object.fromEntries(Object.entries(parts).flatMap(([name, segments]) => [[name, draw(segments)], [name + 'R', draw(segments, c)]]))
const D = pair(DAD_PARTS, 1.75)
const M = pair(MUM_PARTS, 0)
const C = pair(CHILD_PARTS, 0)
</script>

<template>
  <g>
    <!-- The shadow they stand in. -->
    <ellipse cx="1.5" cy="0" :rx="who === 'child' ? 16 : 21" ry="3.4" fill="#000" opacity="0.13" />
    <defs>
      <clipPath :id="`${id}-l`"><path :d="legs.left" /></clipPath>
      <clipPath :id="`${id}-r`"><path :d="legs.right" /></clipPath>
    </defs>

    <!-- ———————————————————————————— the dad ———————————————————————————— -->
    <template v-if="who === 'dad'">
      <!-- Jeans with a knee and a calf in them, a fold behind each knee, the
           side turned from the light a tone darker; rounded brown shoes. -->
      <path :d="legs.left" :fill="DAD.jeans" />
      <path :d="legs.right" :fill="DAD.jeans" />
      <rect :x="figure.shade[0]" y="-90" width="7.5" height="92" :fill="DAD.jeansShade" :clip-path="`url(#${id}-l)`" />
      <rect :x="figure.shade[1]" y="-90" width="7.5" height="92" :fill="DAD.jeansShade" :clip-path="`url(#${id}-r)`" />
      <path :d="`M-13.6 -49.5Q-9.4 ${-47 + lift.left * 2} -5 -49.5M8.5 -49.5Q12.9 ${-47 + lift.right * 2} 17.1 -49.5`" fill="none" :stroke="DAD.jeansShade" stroke-width="1" />
      <path :d="D.shoe" :transform="footUp(lift.left)" :fill="DAD.shoes" />
      <path :d="D.shoeR" :transform="footUp(lift.right)" :fill="DAD.shoes" />

      <g :transform="body">
        <!-- The sweater: rounded shoulders, straight down to a ribbed hem,
             the far side a shade darker. -->
        <path d="M-6 -165C-12 -164.5 -19 -162 -22 -158C-24 -154 -24 -140 -23 -120C-22.2 -105 -21.5 -95 -21.5 -87.5H25C25 -95 25.6 -105 26.2 -120C27 -140 27 -154 25 -158C22 -162 15 -164.5 9 -165C6 -163.5 -3 -163.5 -6 -165Z" :fill="DAD.sweater" />
        <path d="M14 -164C20 -162 24 -160 25 -158C27 -154 27 -140 26.2 -120C25.6 -105 25 -95 25 -87.5H18C18.5 -110 18 -140 14 -164Z" :fill="DAD.sweaterShade" />
        <path d="M-21.6 -92H25V-89Q25 -87.5 23.5 -87.5H-20Q-21.5 -87.5 -21.5 -89Z" :fill="DAD.band" />

        <!-- Arms hanging at his sides, a little out at the elbow, cuffed,
             hands relaxed. -->
        <g :transform="`rotate(${swing} -24 -156)`">
          <path :d="D.sleeve" :fill="DAD.sweater" />
          <path :d="D.edge" fill="none" :stroke="DAD.band" stroke-width="1.1" />
          <path :d="D.elbow" fill="none" :stroke="DAD.band" stroke-width="0.9" stroke-linecap="round" />
          <path :d="D.cuff" :fill="DAD.band" />
          <path :d="D.hand" :fill="DAD.skin" />
          <path :d="D.knuckle" fill="none" :stroke="DAD.skinShade" stroke-width="0.8" />
        </g>
        <g :transform="`rotate(${-swing} 27.5 -156)`">
          <path :d="D.sleeveR" :fill="DAD.sweaterShade" />
          <path :d="D.edgeR" fill="none" :stroke="DAD.band" stroke-width="1.1" />
          <path :d="D.elbowR" fill="none" :stroke="DAD.band" stroke-width="0.9" stroke-linecap="round" />
          <path :d="D.cuffR" :fill="DAD.band" />
          <path :d="D.handR" :fill="DAD.skin" />
          <path :d="D.knuckleR" fill="none" :stroke="DAD.skinShade" stroke-width="0.8" />
        </g>

        <!-- Neck, the white T-shirt's collar at its foot, the hair's shadow. -->
        <path d="M-5 -176C-5.2 -171 -5.6 -167 -6.5 -164.6H10C9.2 -167 8.8 -171 8.6 -176Z" :fill="DAD.skin" />
        <path d="M-5 -176H8.6L8.7 -172.5Q1.8 -170.5 -5.1 -172.5Z" :fill="DAD.skinShade" />
        <path v-if="!front" d="M-8.5 -165.6Q1.8 -161.8 12 -165.6L12.6 -163.6Q1.8 -159.4 -9.1 -163.6Z" :fill="DAD.tee" />
        <path v-else d="M-6.6 -165.2Q1.8 -157.8 10.2 -165.2L10.6 -163Q1.8 -154.8 -7 -163Z" :fill="DAD.tee" />

        <!-- Ears, then the head: short hair from behind, cut clean above the
             neck; from in front, the face under its hairline. -->
        <template v-if="!front">
          <path d="M-11.6 -185C-12.4 -192.5 -8.8 -199.8 -1.6 -201.6C1.8 -202.4 5.4 -202 8.4 -200.8C14.2 -198.4 16.4 -192 15.2 -185C14.8 -181.6 13.2 -178.6 11 -176.6C7.8 -174.2 -4.2 -174.2 -7.4 -176.6C-9.6 -178.6 -11.2 -181.6 -11.6 -185Z" :fill="DAD.hair" />
          <path d="M-7 -196.6C-3 -199.6 3 -200.2 6.4 -198.8C2.4 -197.4 -3 -196.4 -7 -196.6Z" :fill="DAD.hairLight" />
        </template>
        <template v-else>
          <ellipse cx="1.8" cy="-186.5" rx="12" ry="14.4" :fill="DAD.skin" />
          <path d="M-11 -184C-12 -193 -8 -200.5 1.8 -201C11.6 -200.5 15.6 -193 14.6 -184C12.5 -188 8 -191.5 1.8 -191.6C-4 -191.5 -8.8 -188 -11 -184Z" :fill="DAD.hair" />
        </template>
        <path d="M-11 -185.6C-14.4 -186.4 -15 -182 -14 -179.4C-13.2 -177.4 -11.6 -177 -10.4 -178.2Z" :fill="DAD.skin" />
        <path d="M14.6 -185.6C18 -186.4 18.6 -182 17.6 -179.4C16.8 -177.4 15.2 -177 14 -178.2Z" :fill="DAD.skin" />
        <path d="M-12.4 -183.6Q-13.4 -181.4 -12.2 -179.6M16 -183.6Q17 -181.4 15.8 -179.6" fill="none" :stroke="DAD.skinShade" stroke-width="0.8" />
      </g>
    </template>

    <!-- ———————————————————————————— the mum ———————————————————————————— -->
    <template v-else-if="who === 'mum'">
      <!-- Legs below the coat, the calves rounded, and dark flat shoes. -->
      <path :d="legs.left" :fill="MUM.skin" />
      <path :d="legs.right" :fill="MUM.skin" />
      <rect :x="figure.shade[0]" y="-47" width="5" height="48" :fill="MUM.skinShade" :clip-path="`url(#${id}-l)`" />
      <rect :x="figure.shade[1]" y="-47" width="5" height="48" :fill="MUM.skinShade" :clip-path="`url(#${id}-r)`" />
      <path :d="M.shoe" :transform="footUp(lift.left)" :fill="MUM.shoes" />
      <path :d="M.shoeR" :transform="footUp(lift.right)" :fill="MUM.shoes" />

      <g :transform="body">
        <!-- From in front, her hair falls behind her shoulders. -->
        <path v-if="front" d="M-13.6 -168C-14.6 -182 -9 -189.5 0 -189.5C9 -189.5 14.6 -182 13.6 -168C15.6 -158 17.6 -146 18.4 -136C19 -129 17 -124 13 -122.5H-13C-17 -124 -19 -129 -18.4 -136C-17.6 -146 -15.6 -158 -13.6 -168Z" :fill="MUM.hairShade" />

        <!-- The coat: rounded shoulders, an A-line to below the knee, the far
             side a shade darker, belted at the waist. -->
        <path d="M-9 -150C-16 -149 -22.5 -146.5 -25 -142C-27 -137 -26.6 -120 -26 -100C-25.6 -80 -25.2 -55 -25 -40Q0 -37 25 -40C25.2 -55 25.6 -80 26 -100C26.6 -120 27 -137 25 -142C22.5 -146.5 16 -149 9 -150Z" :fill="MUM.coat" />
        <path d="M14 -149C20 -147.5 24 -145 25 -142C27 -137 26.6 -120 26 -100C25.6 -80 25.2 -55 25 -40L17 -39.4C18 -70 18 -110 14 -149Z" :fill="MUM.coatShade" />
        <path d="M-25.6 -107Q0 -105 25.6 -107L25.7 -103Q0 -101 -25.7 -103Z" :fill="MUM.belt" />
        <path v-if="!front" d="M0 -101V-39" fill="none" :stroke="MUM.belt" stroke-width="0.9" />
        <template v-else>
          <path d="M-7.5 -149.5L0 -128L7.5 -149.5" fill="none" :stroke="MUM.coatShade" stroke-width="1.4" />
          <path d="M0 -128V-39" fill="none" :stroke="MUM.belt" stroke-width="0.9" />
        </template>

        <!-- The straps, under her hair where it covers them. -->
        <path :d="front ? 'M-18.5 -147L15 -101' : 'M18.5 -147L-15 -101'" fill="none" :stroke="MUM.strap" stroke-width="2.2" stroke-linecap="round" />
        <path :d="front ? 'M-21 -146C-25 -128 -30 -104 -31.6 -86' : 'M21 -146C25 -128 30 -104 31.6 -86'" fill="none" :stroke="MUM.strap" stroke-width="1.8" stroke-linecap="round" />

        <!-- Arms in the coat's sleeves, a little out at the elbow, hands at
             her sides. -->
        <g :transform="`rotate(${swing} -24 -142)`">
          <path :d="M.sleeve" :fill="MUM.coat" />
          <path :d="M.edge" fill="none" :stroke="MUM.coatShade" stroke-width="1.1" />
          <path :d="M.elbow" fill="none" :stroke="MUM.coatShade" stroke-width="0.9" stroke-linecap="round" />
          <path :d="M.hand" :fill="MUM.skin" />
        </g>
        <g :transform="`rotate(${-swing} 24 -142)`">
          <path :d="M.sleeveR" :fill="MUM.coatShade" />
          <path :d="M.edgeR" fill="none" :stroke="MUM.belt" stroke-width="1.1" />
          <path :d="M.elbowR" fill="none" :stroke="MUM.belt" stroke-width="0.9" stroke-linecap="round" />
          <path :d="M.handR" :fill="MUM.skin" />
        </g>

        <!-- A bag on each hip: the cross-body bag and a small one. -->
        <g :transform="front ? 'scale(-1 1)' : null">
          <path d="M-29.5 -103H-14.5Q-12.6 -103 -12.8 -101L-13.6 -84Q-13.8 -81 -16.6 -81H-27.8Q-30.6 -81 -30.8 -84L-31.4 -101Q-31.4 -103 -29.5 -103Z" :fill="MUM.bag" />
          <path d="M-31.3 -101.5Q-22 -98 -12.8 -101.5L-13 -96Q-22 -91.5 -31.1 -96Z" :fill="MUM.flap" />
          <circle cx="-22" cy="-94.2" r="0.9" fill="#e7c48a" />
          <path d="M27.4 -86H36.6Q38 -86 38 -84.2L37.6 -68.2Q37.4 -66 35.4 -66H28.6Q26.6 -66 26.4 -68.2L25.9 -84.2Q25.9 -86 27.4 -86Z" :fill="MUM.bag" />
          <path d="M26 -84.4Q32 -81.6 38 -84.4L37.9 -80.6Q32 -77.6 26.1 -80.6Z" :fill="MUM.flap" />
        </g>

        <!-- Her long hair: from behind, one mass from the crown to the middle
             of her back, wider than her head, the far side a shade darker. -->
        <template v-if="!front">
          <path d="M-13.6 -168C-14.6 -182 -9 -189.5 0 -189.5C9 -189.5 14.6 -182 13.6 -168C15.6 -158 17.6 -146 18.4 -136C19 -129 17 -124 13 -122.5C8.6 -121 4 -121.4 1.6 -120C0.6 -119 -0.6 -119 -1.6 -120C-4 -121.4 -8.6 -121 -13 -122.5C-17 -124 -19 -129 -18.4 -136C-17.6 -146 -15.6 -158 -13.6 -168Z" :fill="MUM.hair" />
          <path d="M8 -186C12 -183 14.4 -176 13.6 -168C15.6 -158 17.6 -146 18.4 -136C19 -129 17 -124 13 -122.5C14 -135 13.6 -160 8 -186Z" :fill="MUM.hairShade" />
          <path d="M-6 -150Q-7 -136 -5.5 -124M5 -152Q6.4 -138 5.6 -124" fill="none" :stroke="MUM.hairShade" stroke-width="1" />
        </template>
        <!-- From in front: her neck, her face, and her hair framing it. -->
        <template v-else>
          <path d="M-4.6 -166C-4.8 -160 -5.2 -155 -6 -151H6C5.2 -155 4.8 -160 4.6 -166Z" :fill="MUM.skin" />
          <ellipse cx="0" cy="-176" rx="11.4" ry="13.6" :fill="MUM.skin" />
          <path d="M-13 -170C-14 -184 -8 -190 0 -190C8 -190 14 -184 13 -170L13.6 -148C11 -148.6 10.6 -160 10 -168C7 -177.4 -7 -177.4 -10 -168C-10.6 -160 -11 -148.6 -13.6 -148Z" :fill="MUM.hair" />
        </template>
      </g>
    </template>

    <!-- ——————————————————————————— the child ——————————————————————————— -->
    <template v-else>
      <!-- Trousers with a knee in them, a fold behind it, and shoes. -->
      <path :d="legs.left" :fill="CHILD.trousers" />
      <path :d="legs.right" :fill="CHILD.trousers" />
      <rect :x="figure.shade[0]" y="-64" width="5" height="65" :fill="CHILD.trousersShade" :clip-path="`url(#${id}-l)`" />
      <rect :x="figure.shade[1]" y="-64" width="5" height="65" :fill="CHILD.trousersShade" :clip-path="`url(#${id}-r)`" />
      <path :d="`M-11.8 -34Q-8 ${-31.8 + lift.left * 1.6} -4.4 -34M4.4 -34Q8 ${-31.8 + lift.right * 1.6} 11.8 -34`" fill="none" :stroke="CHILD.trousersShade" stroke-width="0.9" />
      <path :d="C.shoe" :transform="footUp(lift.left)" :fill="CHILD.shoes" />
      <path :d="C.shoeR" :transform="footUp(lift.right)" :fill="CHILD.shoes" />

      <g :transform="body">
        <!-- The jacket, its hood lying at the neck. -->
        <path d="M-6 -119C-11 -118.5 -16.5 -116.5 -18.5 -113C-20 -110 -20 -100 -19.4 -85C-19 -75 -18.6 -68 -18.4 -61.5H18.4C18.6 -68 19 -75 19.4 -85C20 -100 20 -110 18.5 -113C16.5 -116.5 11 -118.5 6 -119C3 -117.5 -3 -117.5 -6 -119Z" :fill="CHILD.jacket" />
        <path d="M10 -118.6C14 -117.4 17.4 -115.6 18.5 -113C20 -110 20 -100 19.4 -85C19 -75 18.6 -68 18.4 -61.5H13C13.6 -80 13.6 -100 10 -118.6Z" :fill="CHILD.jacketShade" />
        <path d="M-18.4 -65H18.4V-62.6Q18.4 -61.5 17.2 -61.5H-17.2Q-18.4 -61.5 -18.4 -62.6Z" :fill="CHILD.jacketShade" />
        <path v-if="front" d="M0 -118V-62" fill="none" :stroke="CHILD.jacketShade" stroke-width="1" />

        <!-- Arms, a little out at the elbow, hands at his sides. -->
        <g :transform="`rotate(${swing} -19 -113)`">
          <path :d="C.sleeve" :fill="CHILD.jacket" />
          <path :d="C.edge" fill="none" :stroke="CHILD.jacketShade" stroke-width="1" />
          <path :d="C.elbow" fill="none" :stroke="CHILD.jacketShade" stroke-width="0.8" stroke-linecap="round" />
          <path :d="C.hand" :fill="CHILD.skin" />
        </g>
        <g :transform="`rotate(${-swing} 19 -113)`">
          <path :d="C.sleeveR" :fill="CHILD.jacketShade" />
          <path :d="C.elbowR" fill="none" :stroke="CHILD.hood" stroke-width="0.8" stroke-linecap="round" />
          <path :d="C.handR" :fill="CHILD.skin" />
        </g>

        <!-- The backpack from behind: straps over the shoulders, a loop at
             the top, a zipped pocket. From in front, just its straps. -->
        <template v-if="!front">
          <path d="M-9.6 -110.5H9.6Q13 -110.5 13 -106.5V-80.5Q13 -77 9.6 -77H-9.6Q-13 -77 -13 -80.5V-106.5Q-13 -110.5 -9.6 -110.5Z" :fill="CHILD.pack" />
          <path d="M7 -110.5H9.6Q13 -110.5 13 -106.5V-80.5Q13 -77 9.6 -77H8Q10 -95 7 -110.5Z" :fill="CHILD.packShade" />
          <path d="M-9 -93H9Q10.8 -93 10.8 -91V-81Q10.8 -78.8 8.6 -78.8H-8.6Q-10.8 -78.8 -10.8 -81V-91Q-10.8 -93 -9 -93Z" :fill="CHILD.pocket" />
          <path d="M-7 -90.5H7" fill="none" stroke="#0b6aad" stroke-width="0.8" />
          <path d="M-9 -118.4C-9.6 -115 -10.2 -112.6 -10.4 -110M9 -118.4C9.6 -115 10.2 -112.6 10.4 -110" fill="none" :stroke="CHILD.packShade" stroke-width="3" stroke-linecap="round" />
          <path d="M-3 -110.5Q0 -114.4 3 -110.5" fill="none" :stroke="CHILD.packShade" stroke-width="1.6" />
        </template>
        <path v-else d="M-9 -118V-94M9 -118V-94" fill="none" :stroke="CHILD.packShade" stroke-width="3" stroke-linecap="round" />

        <!-- Neck, the hood behind it, ears, and tousled hair; from in front,
             his face under the fringe. -->
        <path d="M-4.2 -126C-4.4 -122.5 -4.8 -120.5 -5.6 -118.6H5.6C4.8 -120.5 4.4 -122.5 4.2 -126Z" :fill="CHILD.skin" />
        <path d="M-9 -119.5Q0 -114 9 -119.5L9.6 -116.5Q0 -110 -9.6 -116.5Z" :fill="CHILD.hood" />
        <template v-if="!front">
          <path d="M-10.6 -133.5C-11.6 -138 -11 -142 -8.6 -144.6C-9 -148.6 -5.6 -151 -2.8 -149.2C-1.2 -152 3.2 -152 4.4 -148.8C7.6 -149.4 10.2 -146 9.4 -143C11.4 -140.6 11.6 -137 10.6 -133.5C9.6 -129 7.4 -126 4 -125.4C1.2 -124.8 -1.6 -124.8 -4.4 -125.4C-7.8 -126 -9.8 -129 -10.6 -133.5Z" :fill="CHILD.hair" />
          <path d="M-7.6 -145.6C-7 -148.6 -4.4 -149.6 -2.8 -148.6C-4.4 -147.2 -6 -146.4 -7.6 -145.6ZM-0.6 -148.8C0.6 -150.8 3.4 -150.6 4.2 -148.6C2.8 -148.2 1 -148.2 -0.6 -148.8Z" :fill="CHILD.hairLight" />
          <path d="M-1 -138Q-3.6 -137.4 -3 -134.8Q-2.2 -133 0.4 -134.2" fill="none" stroke="#4a2f1c" stroke-width="0.8" />
        </template>
        <template v-else>
          <ellipse cx="0" cy="-134" rx="9.6" ry="11" :fill="CHILD.skin" />
          <path d="M-10.4 -133C-11.6 -139 -10.4 -143.6 -7.4 -146C-6.6 -149.6 -2.6 -151 0 -149.6C2.8 -151 6.8 -149.4 7.4 -146C10.4 -143.6 11.6 -139 10.4 -133C8 -136 3 -139 -1 -138.6C-5 -138.4 -8.6 -136.4 -10.4 -133Z" :fill="CHILD.hair" />
        </template>
        <ellipse cx="-10.6" cy="-131" rx="2" ry="3.2" :fill="CHILD.skin" />
        <ellipse cx="10.6" cy="-131" rx="2" ry="3.2" :fill="CHILD.skin" />
      </g>
    </template>
  </g>
</template>

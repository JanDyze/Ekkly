<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import HomeScene from '../home/HomeScene.vue'
import LostAbout from './LostAbout.vue'
import LostField from './LostField.vue'
import { useAuth } from '../../composables/useAuth'
import { useSounds } from '../../composables/useSounds'
import baaUrl from '../../assets/sounds/baa.mp3'

// The page for an address that leads nowhere: a little lamb that has
// wandered off into an open field, a signpost that points both ways and no
// help at all, and the way back to the flock.
//
// The field is the home's own sky over rolling hills, in the home picture's
// colours (HomeScene's --scene-* settings), so it goes to night with the
// home. The lamb lives in it. Every few seconds it does one thing and stops:
// trots a little way, leaving hoofprints that fade behind it; puts its head
// down to graze; or looks about, a "?" over its head. Tap the grass and it
// trots over to you and says "Baa!"; tap the lamb and it hops and says it,
// aloud if the app's sounds are on (useSounds). Its shadow stays on the
// ground, under it, whatever it does. With less motion asked for it stands
// still, and a tap on the grass simply puts it there.
//
// The way back is the home of all apps for someone signed in to a church, and
// the front page otherwise (`meta.flock` says which kind of address this is).

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const { soundsOn } = useSounds()
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const home = computed(() => (route.meta.flock === 'church' && isAuthenticated.value ? '/home' : '/'))

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push(home.value)
}

/* --------------------------------------------------------- where it is */

const walker = ref(null)
const lamb = ref(null)
const shadow = ref(null)

// How far along the field it stands, which way it faces, and its walk: where
// it is in a stride (`cycle`, 0 to 1, moved on by the ground it covers, so its
// hooves never slide), how fully it is walking (`gait`, easing in as it sets
// off and out as it stops), and the dip of its body at each step.
const x = ref(0)
const facing = ref(1)
const cycle = ref(0)
const gait = ref(0)
const lift = ref(0)
let trotting = false

const width = () => walker.value?.offsetWidth || 160
const bounds = () => {
  const edge = window.innerWidth * 0.03
  return [edge, Math.max(edge, window.innerWidth - width() - edge)]
}
const clamp = (value) => {
  const [min, max] = bounds()
  return Math.max(min, Math.min(max, value))
}

// Its hoofprints, left every few steps and fading where they were left.
const prints = ref([])
let printId = 0
const leavePrint = () => {
  const id = ++printId
  const at = x.value + width() * (facing.value > 0 ? 0.6 : 0.4)
  prints.value = [...prints.value.slice(-23), { id, x: Math.round(at), y: id % 2 ? 0 : 5 }]
  setTimeout(() => (prints.value = prints.value.filter((print) => print.id !== id)), 4200)
}

let target = null
let speed = 0
let frame = 0
let last = 0
let travelled = 0
let arrived = null

const step = (now) => {
  const dt = Math.min(0.05, (now - (last || now)) / 1000)
  last = now
  if (target !== null) {
    const left = target - x.value
    const move = Math.sign(left) * Math.min(Math.abs(left), speed * dt)
    x.value += move
    travelled += Math.abs(move)
    // One whole stride, every leg round once, for each stretch of ground.
    cycle.value = (cycle.value + Math.abs(move) / STRIDE) % 1
    gait.value += (1 - gait.value) * Math.min(1, dt * 8)
    if (travelled > 26) {
      travelled = 0
      leavePrint()
    }
    if (Math.abs(target - x.value) < 0.5) {
      target = null
      const then = arrived
      arrived = null
      then?.()
    }
  } else {
    // Stopping, its legs come back under it and its body settles.
    gait.value *= 0.82
    if (gait.value < 0.01) {
      gait.value = 0
      lift.value = 0
      frame = 0
      last = 0
      return
    }
  }
  // Its body dips as each foot takes its weight: twice a stride, deeper at a
  // trot.
  lift.value = -Math.abs(Math.sin(cycle.value * Math.PI * 2 * 2)) * (trotting ? 3 : 1.5) * gait.value
  frame = requestAnimationFrame(step)
}

// How much ground a stride covers, in pixels on the screen.
const STRIDE = 64

// A sheep walks one leg at a time, round the four: near hind, near fore, far
// hind, far fore, a quarter of a stride apart. Each leg spends most of the
// stride planted, straight, its hoof on the ground as the body goes over it
// (the hip swinging from in front to behind), and the rest lifted: bent at
// the knee, the hoof tucked up, swinging forward to be put down again.
const LEG_PHASE = { nh: 0, nf: 0.25, fh: 0.5, ff: 0.75 }
const STANCE = 0.62
const legPose = (leg) => {
  const p = (cycle.value + LEG_PHASE[leg]) % 1
  const reach = (trotting ? 26 : 20) * gait.value
  const bend = (trotting ? 70 : 55) * gait.value
  if (p < STANCE) {
    // Planted: from reaching forward (negative) to pushing back (positive).
    return { hip: -reach + (2 * reach * p) / STANCE, knee: 0 }
  }
  const s = (p - STANCE) / (1 - STANCE)
  const ease = 0.5 - 0.5 * Math.cos(Math.PI * s)
  return { hip: reach - 2 * reach * ease, knee: Math.sin(Math.PI * s) * bend }
}
const legs = computed(() => ({ nh: legPose('nh'), nf: legPose('nf'), fh: legPose('fh'), ff: legPose('ff') }))

// Off it goes, turning to face the way it is going; `then` when it gets there.
const walkTo = (to, quick = false, then = null) => {
  const goal = clamp(to)
  grazing.value = false
  if (Math.abs(goal - x.value) < 2) {
    then?.()
    return
  }
  facing.value = goal > x.value ? 1 : -1
  target = goal
  speed = quick ? 170 : 70
  trotting = quick
  arrived = then
  if (!frame) {
    last = 0
    frame = requestAnimationFrame(step)
  }
}

/* ----------------------------------------------------- what it does */

// A blink at uneven gaps, now and then a double one.
const blinking = ref(false)
let blinkTimer = null
const blink = () => {
  blinking.value = true
  setTimeout(() => (blinking.value = false), 120)
}
const scheduleBlink = () => {
  blinkTimer = setTimeout(() => {
    blink()
    if (Math.random() < 0.25) setTimeout(blink, 260)
    scheduleBlink()
  }, 2200 + Math.random() * 3800)
}

// Head down in the grass for a mouthful or two.
const grazing = ref(false)
let grazeTimer = null
const graze = () => {
  grazing.value = true
  clearTimeout(grazeTimer)
  grazeTimer = setTimeout(() => (grazing.value = false), 2400)
}

// A look one way and the other, a "?" over its head, as the lost do.
const glance = ref(0)
const wondering = ref(false)
const lookAbout = () => {
  wondering.value = true
  glance.value = -10
  setTimeout(() => (glance.value = 8), 750)
  setTimeout(() => (glance.value = 0), 1500)
  setTimeout(() => (wondering.value = false), 2100)
}

// On its own, every few seconds it does one thing, and stops: wanders a
// little way, grazes, or looks about. Never while it is coming to someone.
let wanderTimer = null
let called = false
const wander = () => {
  clearTimeout(wanderTimer)
  wanderTimer = setTimeout(() => {
    if (target !== null || called) return wander()
    const roll = Math.random()
    if (roll < 0.5) {
      const [min, max] = bounds()
      const distance = (80 + Math.random() * 200) * (Math.random() < 0.5 ? -1 : 1)
      let to = x.value + distance
      if (to < min || to > max) to = x.value - distance
      walkTo(to, false, wander)
      return
    }
    if (roll < 0.8) graze()
    else lookAbout()
    wander()
  }, 2500 + Math.random() * 4000)
}

// "Baa!" over its head, aloud if the sounds are on, with a hop: the body
// goes up, and its shadow, left on the ground, shrinks and fades under it.
const baa = ref(0)
let baaTimer = null
let audio = null
// Its bleat is a recording (src/assets/sounds/baa.mp3). Should it not play,
// a drawn one stands in, so a tap is never met with silence.
let recording = null
const bleat = () => {
  if (!soundsOn.value) return
  try {
    recording ||= new Audio(baaUrl)
    recording.currentTime = 0
    recording.volume = 0.8
    recording.play().catch(drawnBleat)
  } catch {
    drawnBleat()
  }
}
const drawnBleat = () => {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
    const t = audio.currentTime + 0.01
    // A buzzy voice that wavers as it falls, through a throat-like filter:
    // near enough to a lamb to make anyone smile.
    const voice = audio.createOscillator()
    voice.type = 'sawtooth'
    voice.frequency.setValueAtTime(520, t)
    voice.frequency.linearRampToValueAtTime(430, t + 0.6)
    const waver = audio.createOscillator()
    waver.frequency.value = 9
    const depth = audio.createGain()
    depth.gain.value = 28
    waver.connect(depth).connect(voice.frequency)
    const throat = audio.createBiquadFilter()
    throat.type = 'bandpass'
    throat.frequency.value = 1250
    throat.Q.value = 2.5
    const level = audio.createGain()
    level.gain.setValueAtTime(0, t)
    level.gain.linearRampToValueAtTime(0.14, t + 0.05)
    level.gain.setValueAtTime(0.14, t + 0.38)
    level.gain.exponentialRampToValueAtTime(0.0001, t + 0.66)
    voice.connect(throat).connect(level).connect(audio.destination)
    voice.start(t)
    waver.start(t)
    voice.stop(t + 0.7)
    waver.stop(t + 0.7)
  } catch {
    // No sound to be had; the "Baa!" is still said.
  }
}
// Its mouth open for as long as the bleat lasts: the recording's own length
// once known, near enough before.
const bleating = ref(false)
let bleatTimer = null
const sayBaa = () => {
  baa.value += 1
  wondering.value = false
  grazing.value = false
  clearTimeout(baaTimer)
  baaTimer = setTimeout(() => (baa.value = 0), 1600)
  bleat()
  bleating.value = true
  clearTimeout(bleatTimer)
  const length = recording?.duration && Number.isFinite(recording.duration) ? recording.duration * 1000 : 800
  bleatTimer = setTimeout(() => (bleating.value = false), Math.min(length, 2000))
  if (reduced) return
  lamb.value?.animate(
    [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(2px) scale(1.04, 0.95)', offset: 0.15 },
      { transform: 'translateY(-20px) scale(0.98, 1.03)', offset: 0.45 },
      { transform: 'translateY(0) scale(1.04, 0.96)', offset: 0.75 },
      { transform: 'translateY(0) scale(1, 1)' },
    ],
    { duration: 640, easing: 'ease-out' }
  )
  shadow.value?.animate(
    [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.72)', opacity: 0.55, offset: 0.45 }, { transform: 'scale(1)', opacity: 1, offset: 0.75 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: 640, easing: 'ease-out' }
  )
}

// A tap on the grass calls it: it trots over to where the tap was, and says
// "Baa!" when it gets there.
const callLamb = (event) => {
  const to = event.clientX - width() / 2
  if (reduced) {
    x.value = clamp(to)
    sayBaa()
    return
  }
  called = true
  wondering.value = false
  walkTo(to, true, () => {
    called = false
    sayBaa()
    wander()
  })
}

const onResize = () => {
  x.value = clamp(x.value)
}

onMounted(() => {
  x.value = clamp(window.innerWidth * (window.innerWidth >= 640 ? 0.2 : 0.06))
  window.addEventListener('resize', onResize)
  if (reduced) return
  scheduleBlink()
  wander()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(frame)
  clearTimeout(blinkTimer)
  clearTimeout(wanderTimer)
  clearTimeout(grazeTimer)
  clearTimeout(baaTimer)
  audio?.close?.()
  recording?.pause()
  clearTimeout(bleatTimer)
})

/* ----------------------------------------------------------- its shape */

// The fleece: puffs round an oval, drawn twice — outlined underneath, filled
// on top — so only its outer edge shows a line, scalloped like wool, and none
// of the puffs inside it does.
const FLEECE = [
  [54, 90, 17],
  [62, 72, 19],
  [82, 62, 21],
  [106, 60, 21],
  [128, 68, 19],
  [138, 88, 17],
  [128, 106, 18],
  [104, 114, 20],
  [80, 112, 20],
  [60, 104, 17],
  [96, 88, 32],
]
// Its topknot, the same way.
const TUFT = [
  [152, 47, 8],
  [161, 42, 9],
  [171, 46, 8],
  [157, 53, 6],
  [167, 53, 6],
]
// The curls in its wool.
const CURLS = ['M70 82q4-7 9-1', 'M92 74q4-7 9-1', 'M114 80q4-7 9-1', 'M80 98q4-7 9-1', 'M104 100q4-7 9-1', 'M62 92q3-5 7-1']
// What it eats: the head goes down to the grass, or turns to look about.
// Bleating, it lifts its head a little to call.
const headTurn = computed(() => glance.value + (grazing.value ? 30 : 0) - (bleating.value ? 8 : 0))
</script>

<template>
  <main class="home-scene relative isolate min-h-dvh overflow-hidden bg-(--scene-sky-3)">
    <HomeScene part="sky" class="pointer-events-none absolute inset-0 -z-10 size-full" />

    <!-- Where this page comes from, for whoever wonders (LostAbout). -->
    <LostAbout />

    <!-- What happened, and the way back. -->
    <section class="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 pt-[max(10dvh,4rem)] text-center">
      <p class="lost-ink text-xs font-bold uppercase tracking-[0.2em] text-(--scene-ink-accent)">404 · Lost in the field</p>
      <h1 class="lost-ink mt-3 text-4xl font-black tracking-tight text-(--scene-ink) sm:text-6xl">Oops, little sheep.</h1>
      <p class="lost-ink mt-4 max-w-md text-base text-(--scene-ink) sm:text-lg">
        You’ve wandered off. This page isn’t anywhere in the field, but the flock isn’t far.
      </p>
      <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
        <RouterLink
          :to="home"
          class="inline-flex h-12 items-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Back to the flock
        </RouterLink>
        <button
          type="button"
          class="inline-flex h-12 items-center rounded-xl bg-white/70 px-5 text-[15px] font-semibold text-gray-800 ring-1 ring-white/80 backdrop-blur-md transition-colors hover:bg-white/90 dark:bg-gray-900/60 dark:text-gray-100 dark:ring-white/15 dark:hover:bg-gray-900/80"
          @click="goBack"
        >
          Go back
        </button>
      </div>
    </section>

    <LostField />
    <!-- The grass: a tap anywhere on it calls the lamb over. -->
    <div class="absolute inset-x-0 bottom-0 z-5 h-[min(40dvh,22rem)] cursor-pointer" aria-hidden="true" @click="callLamb" />
    <p class="lost-hint pointer-events-none absolute inset-x-0 bottom-2 z-6 text-center text-xs font-semibold text-white/85">Tap the grass to call it over</p>

    <!-- Its hoofprints, fading where it left them. -->
    <span
      v-for="print in prints"
      :key="print.id"
      class="lost-print pointer-events-none absolute z-6"
      :style="{ left: `${print.x}px`, bottom: `calc(min(40dvh, 22rem) * 0.2 + ${print.y}px)` }"
      aria-hidden="true"
    />

    <!-- The lamb, where it has got to along the field. -->
    <div ref="walker" class="lost-walker absolute left-0 z-10 w-40 sm:w-52" :style="{ transform: `translateX(${x}px)` }">
      <!-- Its shadow, on the ground: it stays there when the lamb hops. -->
      <svg class="pointer-events-none absolute inset-x-0 bottom-0 w-full" viewBox="0 0 200 160" aria-hidden="true">
        <ellipse ref="shadow" cx="100" cy="150" rx="64" ry="6" class="lost-shadow" />
      </svg>

      <!-- What it says when it gets to someone or is tapped, or wonders when
           it looks about: beside its head, whichever way it faces. -->
      <Transition enter-active-class="lost-pop-in" leave-active-class="lost-pop-out">
        <span
          v-if="baa"
          :key="'baa' + baa"
          :class="[
            'absolute -top-9 rounded-2xl bg-white px-3 py-1.5 text-base font-black text-gray-900 ring-1 ring-black/5 dark:bg-gray-800 dark:text-white dark:ring-white/10',
            facing > 0 ? 'left-[66%] origin-bottom-left rounded-bl-md' : 'right-[66%] origin-bottom-right rounded-br-md',
          ]"
          aria-live="polite"
        >
          Baa!
        </span>
        <span
          v-else-if="wondering"
          key="what"
          :class="['lost-ink absolute -top-6 text-3xl font-black text-(--scene-ink)', facing > 0 ? 'left-[86%]' : 'right-[86%]']"
          aria-hidden="true"
        >
          ?
        </span>
      </Transition>

      <button ref="lamb" type="button" class="lost-lamb relative block w-full" aria-label="Say hello to the little lamb" @click="sayBaa">
        <svg viewBox="0 0 200 160" class="block w-full overflow-visible" :style="{ transform: facing < 0 ? 'scaleX(-1)' : null }">
          <defs>
            <clipPath id="lost-fleece">
              <circle v-for="([cx, cy, r], i) in FLEECE" :key="i" :cx="cx" :cy="cy" :r="r" />
            </clipPath>
          </defs>

          <!-- The far legs, a shade back. Each is two parts, thigh and shank,
               bending at the knee as it lifts (legPose). -->
          <g class="lost-leg-far" :transform="`rotate(${legs.fh.hip} 75 106)`">
            <rect x="70" y="104" width="10" height="22" rx="5" />
            <g :transform="`rotate(${legs.fh.knee} 75 124)`">
              <rect x="70.5" y="121" width="9" height="22" rx="4.5" />
              <rect x="70" y="138" width="10" height="7" rx="3" class="lost-hoof" />
            </g>
          </g>
          <g class="lost-leg-far" :transform="`rotate(${legs.ff.hip} 125 106)`">
            <rect x="120" y="104" width="10" height="22" rx="5" />
            <g :transform="`rotate(${legs.ff.knee} 125 124)`">
              <rect x="120.5" y="121" width="9" height="22" rx="4.5" />
              <rect x="120" y="138" width="10" height="7" rx="3" class="lost-hoof" />
            </g>
          </g>

          <!-- Its body, which lifts a little with each step. -->
          <g :transform="`translate(0 ${lift})`">
            <circle cx="40" cy="80" r="10" class="lost-wool-edge" />
            <circle cx="40" cy="80" r="10" class="lost-wool" />
            <circle v-for="([cx, cy, r], i) in FLEECE" :key="'e' + i" :cx="cx" :cy="cy" :r="r" class="lost-wool-edge" />
            <circle v-for="([cx, cy, r], i) in FLEECE" :key="'f' + i" :cx="cx" :cy="cy" :r="r" class="lost-wool" />
            <ellipse cx="98" cy="124" rx="64" ry="20" clip-path="url(#lost-fleece)" class="lost-wool-shade" />
            <ellipse cx="86" cy="58" rx="34" ry="11" clip-path="url(#lost-fleece)" fill="#fff" />
            <path v-for="(d, i) in CURLS" :key="'c' + i" :d="d" class="lost-curl" />
          </g>

          <!-- The near legs, in front of the fleece. -->
          <g class="lost-leg" :transform="`rotate(${legs.nh.hip} 87.5 112)`">
            <rect x="82" y="110" width="11" height="21" rx="5.5" />
            <g :transform="`rotate(${legs.nh.knee} 87.5 128)`">
              <rect x="82.5" y="125" width="10" height="21" rx="5" />
              <rect x="82" y="141" width="11" height="7" rx="3" class="lost-hoof" />
            </g>
          </g>
          <g class="lost-leg" :transform="`rotate(${legs.nf.hip} 137.5 110)`">
            <rect x="132" y="108" width="11" height="21" rx="5.5" />
            <g :transform="`rotate(${legs.nf.knee} 137.5 126)`">
              <rect x="132.5" y="123" width="10" height="21" rx="5" />
              <rect x="132" y="139" width="11" height="7" rx="3" class="lost-hoof" />
            </g>
          </g>

          <g :transform="`translate(0 ${lift})`">
            <!-- Its collar and bell, in the home's orange and yellow. -->
            <path d="M136 82q12 12 28 4" class="lost-collar" />
            <circle cx="150" cy="92" r="6" fill="#FFCB4A" stroke="#F7B12E" stroke-width="1.5" />
            <circle cx="150" cy="95" r="1.4" fill="#B37A12" />

            <!-- Its head: turned toward whoever found it, down to the grass
                 to graze, or turning to look about. -->
            <g class="lost-head" :style="{ transform: `rotate(${headTurn}deg)` }">
              <ellipse cx="141" cy="62" rx="12" ry="6" transform="rotate(-24 141 62)" class="lost-ear" />
              <ellipse cx="141" cy="62" rx="7" ry="3" transform="rotate(-24 141 62)" class="lost-ear-in" />
              <ellipse cx="180" cy="62" rx="12" ry="6" transform="rotate(24 180 62)" class="lost-ear" />
              <ellipse cx="181" cy="62" rx="7" ry="3" transform="rotate(24 181 62)" class="lost-ear-in" />
              <ellipse cx="161" cy="70" rx="19" ry="22" class="lost-face" />
              <ellipse cx="162" cy="83" rx="12" ry="8.5" class="lost-muzzle" />
              <circle v-for="([cx, cy, r], i) in TUFT" :key="'te' + i" :cx="cx" :cy="cy" :r="r" class="lost-wool-edge" />
              <circle v-for="([cx, cy, r], i) in TUFT" :key="'tf' + i" :cx="cx" :cy="cy" :r="r" class="lost-wool" />
              <!-- Worried brows, inner ends raised. -->
              <path d="M148 62l8-3M174 62l-8-3" class="lost-brow" />
              <!-- Its eyes: shut for a blink, and happily shut while it eats. -->
              <g v-if="!grazing" :style="{ transform: `scaleY(${blinking ? 0.1 : 1})`, transformOrigin: '161px 70px', transformBox: 'view-box' }">
                <ellipse cx="154" cy="70" rx="3.8" ry="4.8" class="lost-eye" />
                <ellipse cx="168" cy="70" rx="3.8" ry="4.8" class="lost-eye" />
                <circle cx="155.3" cy="68.3" r="1.4" fill="#fff" />
                <circle cx="169.3" cy="68.3" r="1.4" fill="#fff" />
              </g>
              <path v-else d="M150 71q4-4 8 0M164 71q4-4 8 0" class="lost-shut" />
              <ellipse cx="148" cy="79" rx="4" ry="2.6" class="lost-cheek" />
              <ellipse cx="175" cy="79" rx="4" ry="2.6" class="lost-cheek" />
              <path d="M158.6 79h6.8a1.4 1.4 0 0 1 1 2.4l-3 2.6a1.4 1.4 0 0 1-1.9 0l-3-2.6a1.4 1.4 0 0 1 1-2.4z" class="lost-nose" />
              <!-- Its mouth: open in a round "baa" while it bleats, munching
                   while it grazes, a small worried line otherwise. -->
              <g v-if="bleating">
                <ellipse cx="162" cy="89" rx="4.2" ry="5" class="lost-mouth-open" />
                <ellipse cx="162" cy="91.5" rx="2.6" ry="1.8" fill="#e8798b" />
              </g>
              <path v-else :d="grazing ? 'M158.5 87.5q3.5 3 7 0' : 'M158.5 88.5q3.5-2.5 7 0'" class="lost-mouth" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  </main>
</template>

<style scoped>
/* Words set on the picture, haloed by the sky behind them (HomeScene's ink),
   as the home's verse is, so they read over a cloud by day or night. */
.lost-ink {
  text-shadow:
    0 0 12px var(--scene-ink-halo),
    0 0 2px var(--scene-ink-halo);
}

/* The hint, on the darkest ground at the foot, by day or night. */
.lost-hint {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
}

/* Where the lamb stands: its feet on the near hill, a fifth of the field up. */
.lost-walker {
  bottom: calc(min(40dvh, 22rem) * 0.2);
}

/* A hoofprint: a pair of dents in the grass, fading as the grass springs
   back. */
.lost-print {
  width: 5px;
  height: 3px;
  border-radius: 9999px;
  background: var(--scene-ink);
  box-shadow: 7px 0 0 var(--scene-ink);
  opacity: 0;
  animation: lost-print 4.2s ease-out forwards;
}
@keyframes lost-print {
  0% {
    opacity: 0.28;
  }
  100% {
    opacity: 0;
  }
}

/* The lamb's colours are its own, the same on every church's page, like
   YUNIT's: a lamb is white whoever's field it is in. */
.lost-wool {
  fill: #f8f9fd;
}
.lost-wool-edge {
  fill: none;
  stroke: #d5dbe8;
  stroke-width: 4;
}
.lost-wool-shade {
  fill: #e4e9f3;
}
.lost-curl {
  fill: none;
  stroke: #dbe1ec;
  stroke-width: 2.2;
  stroke-linecap: round;
}
.lost-leg {
  fill: #3a3550;
}
.lost-leg-far {
  fill: #2a2640;
}
.lost-hoof {
  fill: #1c1a2b;
}
.lost-face {
  fill: #f6e6d4;
}
.lost-muzzle {
  fill: #efd6bf;
}
.lost-ear {
  fill: #eed5bf;
}
.lost-ear-in {
  fill: #f4a9b8;
}
.lost-eye {
  fill: #2a2440;
}
.lost-shut {
  fill: none;
  stroke: #2a2440;
  stroke-width: 2;
  stroke-linecap: round;
}
.lost-brow {
  fill: none;
  stroke: #c9a68c;
  stroke-width: 2;
  stroke-linecap: round;
}
.lost-cheek {
  fill: #f6a5b5;
  opacity: 0.7;
}
.lost-nose {
  fill: #a8727b;
}
.lost-mouth-open {
  fill: #6b2f3c;
}
.lost-mouth {
  fill: none;
  stroke: #a8727b;
  stroke-width: 1.6;
  stroke-linecap: round;
}
.lost-collar {
  fill: none;
  stroke: #f26a38;
  stroke-width: 5;
  stroke-linecap: round;
}
.lost-shadow {
  fill: rgb(0 0 0 / 0.14);
  transform-box: fill-box;
  transform-origin: center;
}

.lost-lamb {
  appearance: none;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform-origin: 50% 95%;
  -webkit-tap-highlight-color: transparent;
}
.lost-lamb:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 6px;
  border-radius: 1rem;
}

/* Its head turns from the neck when it looks about or grazes. */
.lost-head {
  transform-box: view-box;
  transform-origin: 146px 86px;
  transition: transform 450ms cubic-bezier(0.3, 0.7, 0.2, 1);
}

/* "Baa!" and "?" pop out from beside it, and go. */
.lost-pop-in {
  animation: lost-pop 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.lost-pop-out {
  animation: lost-pop 160ms ease-in reverse;
}
@keyframes lost-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lost-head {
    transition: none;
  }
  .lost-pop-in,
  .lost-pop-out,
  .lost-print {
    animation: none;
  }
}
</style>

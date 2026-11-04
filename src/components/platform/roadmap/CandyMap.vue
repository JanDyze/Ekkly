<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Flag, Plus, X } from '../../../icons'
import { currentStepId, groupStops, progressOf, shortDate } from '../../../utils/roadmap'

// A roadmap drawn as a candy-land map: a sweet road winding up the screen
// from Start to the end goal, a lollipop at the top. Each step is a round
// candy on the road, numbered, with up to three stars for how it went; the
// steps still ahead are pale. A sidetrack is a wrapped sweet off to one side
// on a dotted trail from the step it left; a trail that was taken and
// finished comes back to the road, one that was dropped stops dead. A flag
// stands over the first step not yet done, which is where the road is now.
//
// Like a level map, it is read from the bottom up and opens scrolled to the
// flag. Everything is placed by its distance from the foot of the map, so
// adding a step at the top leaves every candy below exactly where it was.
//
// This is the one deliberately playful page in Ekkly, so its candies carry a
// sheen and a darker underside the rest of the app never uses; the road,
// labels and sheets around it stay flat.

const props = defineProps({
  roadmap: { type: Object, required: true },
})

const emit = defineEmits(['open-stop', 'open-goal', 'add-step'])

const uid = useId()
const scroller = ref(null)
const width = ref(0)
const viewH = ref(0)
let observer = null

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    width.value = entry.contentRect.width
    viewH.value = entry.contentRect.height
  })
  observer.observe(scroller.value)
})
onBeforeUnmount(() => observer?.disconnect())

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ---------------------------------------------------------------- layout */

const FOOT = 70 // Start, above the map's foot
const STEP_ROW = 118
const SIDE_ROW = 88
const GOAL_ROOM = 250

// Each finished step its own flavour, in turn, so the road behind reads as a
// row of sweets rather than one colour.
const FLAVOURS = [
  { body: 'bg-pink-500', rim: 'ring-pink-700/45' },
  { body: 'bg-orange-500', rim: 'ring-orange-700/45' },
  { body: 'bg-sky-500', rim: 'ring-sky-700/45' },
  { body: 'bg-violet-500', rim: 'ring-violet-700/45' },
  { body: 'bg-emerald-500', rim: 'ring-emerald-700/45' },
  { body: 'bg-rose-500', rim: 'ring-rose-700/45' },
  { body: 'bg-cyan-500', rim: 'ring-cyan-700/45' },
]

const SIDE_LOOK = {
  done: { body: 'fill-teal-400', rim: 'stroke-teal-600', word: 'taken' },
  open: { body: 'fill-amber-400', rim: 'stroke-amber-600', word: 'on it now' },
  dropped: { body: 'fill-slate-300 dark:fill-slate-500', rim: 'stroke-slate-400 dark:stroke-slate-600', word: 'dropped' },
}

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))

const layout = computed(() => {
  const W = width.value || 360
  const mapW = Math.min(W, 640)
  const cx = W / 2
  const amp = Math.min(mapW * 0.3, 190)
  // The road swings left and right as it climbs, twice a turn.
  const roadX = (m) => cx + amp * Math.sin(0.7 + m * 1.25)

  const stops = props.roadmap.stops || []
  const groups = groupStops(stops)
  const current = currentStepId(stops)
  const { reached } = progressOf(stops)

  // How far a label may run before the edge, from a candy of radius r.
  const labelRoom = (x, side, r) => clamp((side === 'left' ? x : W - x) - r - 20, 72, 240)

  const start = { x: cx, yb: FOOT, done: stops.length > 0 && stops[0].status === 'done' }
  const road = [start]
  const steps = []
  const sides = []
  const trails = []
  let yb = FOOT + STEP_ROW * 0.8

  groups.forEach((group, m) => {
    const x = roadX(m)
    const done = group.step.status === 'done'
    const labelSide = x >= cx ? 'left' : 'right'
    const step = {
      ...group.step,
      n: m + 1,
      x,
      yb,
      done,
      current: group.step.id === current,
      flavour: FLAVOURS[m % FLAVOURS.length],
      labelSide,
      labelMax: labelRoom(x, labelSide, 30),
    }
    steps.push(step)
    road.push(step)

    const gap = STEP_ROW + SIDE_ROW * group.sides.length
    if (group.sides.length) {
      // Sidetracks wander off on whichever side has the room, spaced evenly
      // up the stretch of road before the next step.
      const nextX = roadX(m + 1)
      const midRoad = x + (nextX - x) * 0.5
      const dir = midRoad >= cx ? -1 : 1
      const trail = [step]
      group.sides.forEach((side, j) => {
        const t = (j + 1) / (group.sides.length + 1)
        const atRoad = x + (nextX - x) * t
        const room = dir < 0 ? atRoad : W - atRoad
        // Close enough to the road to leave its label room to be read on a
        // phone, far enough to sit clear of it.
        const sx = clamp(atRoad + dir * clamp(room - 170, 56, 140), 30, W - 30)
        const labelSide = dir < 0 ? 'left' : 'right'
        const node = {
          ...side,
          x: sx,
          yb: yb + gap * t,
          look: SIDE_LOOK[side.status] || SIDE_LOOK.open,
          labelSide,
          labelMax: labelRoom(sx, labelSide, 22),
        }
        sides.push(node)
        trail.push(node)
      })
      const last = group.sides[group.sides.length - 1]
      trails.push({ id: group.step.id, points: trail, rejoins: last.status === 'done', joinAt: road.length })
    }
    yb += gap
  })

  // The next step to add sits where the road would go next.
  const addX = roadX(groups.length)
  const addSide = addX >= cx ? 'left' : 'right'
  const add = { x: addX, yb, done: reached, labelSide: addSide, labelMax: labelRoom(addX, addSide, 24) }
  road.push(add)
  yb += STEP_ROW * 0.85

  const goal = { x: cx, yb, done: reached }
  road.push(goal)

  const height = Math.max(yb + GOAL_ROOM, viewH.value)

  // A finished trail comes back to the road at the next point on it.
  trails.forEach((trail) => {
    if (trail.rejoins) trail.points = [...trail.points, road[trail.joinAt]]
  })

  const here = steps.find((s) => s.current) || (steps.length ? null : start)

  return { W, cx, height, road, steps, sides, trails, add, goal, here, reached }
})

const yOf = (p) => layout.value.height - p.yb

/* ------------------------------------------------------------------ road */

// A smooth curve through every point on the road (Catmull-Rom, as cubic
// Béziers), cut into one piece per stretch so the stretches already
// travelled can be coloured apart from the ones ahead.
const roadPieces = computed(() => {
  const pts = layout.value.road.map((p) => ({ x: p.x, y: yOf(p), done: p.done }))
  const at = (i) => pts[clamp(i, 0, pts.length - 1)]
  const pieces = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    pieces.push({
      d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`,
      done: p2.done,
    })
  }
  return pieces
})

// A sidetrack's trail bows gently between its sweets rather than running
// ruler-straight.
const trailPath = (points) =>
  points
    .map((p, i) => {
      const y = yOf(p)
      if (i === 0) return `M${p.x},${y}`
      const prev = points[i - 1]
      const py = yOf(prev)
      return `Q${(prev.x + p.x) / 2 + (y - py) * 0.25},${(py + y) / 2} ${p.x},${y}`
    })
    .join(' ')

/* ------------------------------------------------------------ decoration */

// Sweets scattered down both edges of the map, the same every time for the
// same height, so the scenery does not reshuffle while you work.
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const DECOR_KINDS = ['lolly', 'drop', 'cane', 'sprinkles', 'star', 'drop', 'lolly']
const DECOR_TINTS = [
  { a: 'fill-pink-300', b: 'stroke-pink-300' },
  { a: 'fill-sky-300', b: 'stroke-sky-300' },
  { a: 'fill-amber-300', b: 'stroke-amber-300' },
  { a: 'fill-violet-300', b: 'stroke-violet-300' },
  { a: 'fill-emerald-300', b: 'stroke-emerald-300' },
]

const decor = computed(() => {
  const { W, height } = layout.value
  const rand = seeded(11)
  const edge = Math.max(26, (W - Math.min(W, 640)) / 2 + 20)
  const items = []
  for (let y = 60; y < height - 40; y += 130) {
    for (const left of [true, false]) {
      const jitter = rand()
      const x = left ? 8 + rand() * (edge - 30) + 12 : W - 8 - rand() * (edge - 30) - 12
      items.push({
        key: `${y}-${left}`,
        kind: DECOR_KINDS[Math.floor(rand() * DECOR_KINDS.length)],
        tint: DECOR_TINTS[Math.floor(rand() * DECOR_TINTS.length)],
        x,
        y: y + jitter * 70,
        scale: W < 500 ? 0.6 : 0.8 + rand() * 0.4,
        turn: Math.round((rand() - 0.5) * 50),
      })
    }
  }
  return items
})

// A lollipop's swirl: two spirals, half a turn apart.
const spiral = (cx, cy, r, turns, offset = 0) => {
  const pts = []
  const end = turns * Math.PI * 2
  for (let t = 0; t <= end; t += 0.18) {
    const rr = (r * t) / end
    pts.push(`${(cx + rr * Math.cos(t + offset)).toFixed(1)},${(cy + rr * Math.sin(t + offset)).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}

const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z'

/* -------------------------------------------------------------- scrolling */

const scrollToBottomOf = (p, smooth) => {
  const el = scroller.value
  if (!el || !p) return
  const top = clamp(yOf(p) - el.clientHeight * 0.55, 0, el.scrollHeight)
  el.scrollTo({ top, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
}

// Opening a roadmap starts at the foot of the map and rolls up to the flag,
// the way a level map shows you where you are.
const arrive = async () => {
  await nextTick()
  const el = scroller.value
  if (!el || !width.value) return
  el.scrollTop = el.scrollHeight
  const target = layout.value.here || (layout.value.reached ? layout.value.goal : layout.value.add)
  requestAnimationFrame(() => scrollToBottomOf(target, true))
}

watch(() => [props.roadmap.id, width.value > 0], arrive)

// The map grows at the top, so to keep what you are looking at still, the
// scroll moves by as much as the map grew.
watch(
  () => layout.value.height,
  (now, before) => {
    if (scroller.value && before) scroller.value.scrollTop += now - before
  },
  { flush: 'post' }
)

// Finishing a step moves the flag on, and the map follows it.
const hereId = computed(() => (layout.value.steps.find((s) => s.current) || {}).id || '')
watch([() => props.roadmap.id, hereId], ([id, step], [wasId, wasStep]) => {
  // Opening another roadmap is arrive()'s to scroll, not this.
  if (id !== wasId || !wasStep || step === wasStep) return
  const target = layout.value.here || layout.value.goal
  setTimeout(() => scrollToBottomOf(target, true), 250)
})

/* -------------------------------------------------- stars for a new finish */

// Stars pop in only for a stop just finished, not for every one on opening.
const popping = ref(new Set())
let seen = { id: '', stars: new Map() }
watch(
  () => props.roadmap,
  (roadmap) => {
    const now = new Map((roadmap.stops || []).map((s) => [s.id, s.status === 'done' ? s.stars : -1]))
    if (seen.id === roadmap.id) {
      const fresh = [...now].filter(([id, stars]) => stars > 0 && seen.stars.get(id) !== stars).map(([id]) => id)
      if (fresh.length) {
        popping.value = new Set([...popping.value, ...fresh])
        setTimeout(() => {
          popping.value = new Set([...popping.value].filter((id) => !fresh.includes(id)))
        }, 1200)
      }
    }
    seen = { id: roadmap.id, stars: now }
  },
  { immediate: true, deep: true }
)

const stepWord = (step) => {
  if (step.current) return 'Here now'
  if (step.done) return step.doneOn ? `Done ${shortDate(step.doneOn)}` : 'Done'
  return 'Ahead'
}

const labelStyle = (node) => ({
  maxWidth: `${node.labelMax}px`,
  ...(node.labelSide === 'left' ? { right: 'calc(100% + 10px)' } : { left: 'calc(100% + 10px)' }),
})
</script>

<template>
  <div
    ref="scroller"
    class="candy-map relative h-[68dvh] min-h-105 overflow-x-hidden overflow-y-auto overscroll-contain bg-linear-to-t from-sky-100 via-pink-50 to-violet-100 dark:from-indigo-950 dark:via-violet-950 dark:to-fuchsia-950"
  >
    <div class="relative w-full" :style="{ height: `${layout.height}px` }">
      <svg
        class="pointer-events-none absolute inset-0"
        :width="layout.W"
        :height="layout.height"
        :viewBox="`0 0 ${layout.W} ${layout.height}`"
        aria-hidden="true"
      >
        <defs>
          <!-- Sprinkles on the ground, faint enough to read over. -->
          <pattern :id="`sprinkles-${uid}`" width="70" height="70" patternUnits="userSpaceOnUse">
            <rect x="8" y="10" width="9" height="3.5" rx="1.75" transform="rotate(30 12 12)" class="fill-pink-300/45 dark:fill-pink-300/15" />
            <rect x="44" y="18" width="9" height="3.5" rx="1.75" transform="rotate(-40 48 20)" class="fill-sky-300/50 dark:fill-sky-300/15" />
            <rect x="22" y="46" width="9" height="3.5" rx="1.75" transform="rotate(75 26 48)" class="fill-amber-300/50 dark:fill-amber-300/15" />
            <rect x="52" y="54" width="9" height="3.5" rx="1.75" transform="rotate(10 56 56)" class="fill-emerald-300/45 dark:fill-emerald-300/15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" :fill="`url(#sprinkles-${uid})`" />

        <!-- Sweets along the edges. -->
        <g
          v-for="d in decor"
          :key="d.key"
          :transform="`translate(${d.x} ${d.y}) rotate(${d.turn}) scale(${d.scale})`"
          class="opacity-75 dark:opacity-45"
        >
          <template v-if="d.kind === 'lolly'">
            <rect x="-2.5" y="4" width="5" height="34" rx="2.5" class="fill-white dark:fill-slate-300" />
            <circle r="15" :class="d.tint.a" />
            <path :d="spiral(0, 0, 13, 2.2)" class="fill-none stroke-white" stroke-width="3.5" stroke-linecap="round" />
          </template>
          <template v-else-if="d.kind === 'drop'">
            <path d="M-15,12 C-15,-4 -8,-15 0,-15 C8,-15 15,-4 15,12 Z" :class="d.tint.a" />
            <circle cx="-5" cy="-3" r="1.8" class="fill-white/80" />
            <circle cx="4" cy="2" r="1.8" class="fill-white/80" />
            <circle cx="-1" cy="8" r="1.8" class="fill-white/80" />
          </template>
          <template v-else-if="d.kind === 'cane'">
            <path d="M6,34 L6,-4 A9,9 0 0 0 -12,-4" class="fill-none stroke-white dark:stroke-slate-300" stroke-width="7" stroke-linecap="round" />
            <path d="M6,34 L6,-4 A9,9 0 0 0 -12,-4" :class="['fill-none', d.tint.b]" stroke-width="7" stroke-linecap="butt" stroke-dasharray="5 6" />
          </template>
          <template v-else-if="d.kind === 'star'">
            <path :d="STAR" transform="translate(-14 -14) scale(1.15)" :class="d.tint.a" />
          </template>
          <template v-else>
            <rect x="-14" y="-6" width="12" height="4" rx="2" transform="rotate(25)" class="fill-pink-300" />
            <rect x="2" y="-12" width="12" height="4" rx="2" transform="rotate(-35)" class="fill-sky-300" />
            <rect x="-6" y="6" width="12" height="4" rx="2" transform="rotate(70)" class="fill-amber-300" />
            <rect x="6" y="6" width="12" height="4" rx="2" transform="rotate(5)" class="fill-emerald-300" />
          </template>
        </g>

        <!-- The road: a wide sweet ribbon with a line of sugar dots down
             its middle, deep pink where it has been travelled. -->
        <g fill="none" stroke-linecap="round">
          <path
            v-for="(piece, i) in roadPieces"
            :key="`edge-${i}`"
            :d="piece.d"
            stroke-width="30"
            :class="piece.done ? 'stroke-pink-600/35' : 'stroke-violet-300/40 dark:stroke-white/10'"
          />
          <path
            v-for="(piece, i) in roadPieces"
            :key="`bed-${i}`"
            :d="piece.d"
            stroke-width="22"
            :class="piece.done ? 'stroke-pink-400' : 'stroke-white/85 dark:stroke-white/15'"
          />
          <path
            v-for="(piece, i) in roadPieces"
            :key="`dots-${i}`"
            :d="piece.d"
            stroke-width="5"
            stroke-dasharray="0.1 14"
            :class="piece.done ? 'stroke-white' : 'stroke-pink-300 dark:stroke-pink-300/50'"
          />
        </g>

        <!-- Sidetracks' trails: dotted, off the road and, if finished, back. -->
        <path
          v-for="trail in layout.trails"
          :key="`trail-${trail.id}`"
          :d="trailPath(trail.points)"
          fill="none"
          stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="0.1 11"
          class="stroke-violet-400 dark:stroke-violet-300/70"
        />
      </svg>

      <!-- Start -->
      <div
        class="pointer-events-none absolute -translate-x-1/2 translate-y-1/2 rounded-full bg-white px-3 py-1 text-xs font-black tracking-wide text-pink-600 uppercase ring-2 ring-pink-300 dark:bg-gray-900 dark:text-pink-300 dark:ring-pink-500/50"
        :style="{ left: `${layout.road[0].x}px`, bottom: `${layout.road[0].yb - 26}px` }"
      >
        Start
      </div>

      <!-- Steps on the road -->
      <button
        v-for="step in layout.steps"
        :key="step.id"
        type="button"
        class="candy-stop group absolute flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
        :class="step.current ? 'size-16' : 'size-14'"
        :style="{ left: `${step.x}px`, bottom: `${step.yb}px` }"
        :aria-label="`Step ${step.n}: ${step.title}. ${stepWord(step)}${step.stars ? `, ${step.stars} of 3 stars` : ''}`"
        @click="emit('open-stop', step.id)"
      >
        <span
          :class="[
            'absolute inset-0 rounded-full ring-[3px] transition-colors',
            step.done || step.current
              ? [step.flavour.body, step.flavour.rim, 'group-hover:brightness-110']
              : 'bg-white ring-violet-200 group-hover:bg-violet-50 dark:bg-slate-700 dark:ring-slate-500 dark:group-hover:bg-slate-600',
            step.current ? 'outline-4 outline-offset-2 outline-white dark:outline-gray-900' : '',
          ]"
        ></span>
        <!-- The sweet's underside and its shine. -->
        <span
          :class="[
            'absolute inset-x-0 bottom-0 h-1/2 rounded-b-full',
            step.done || step.current ? 'bg-black/10' : 'bg-violet-200/25 dark:bg-black/10',
          ]"
        ></span>
        <span class="absolute top-[11%] left-[20%] h-[26%] w-[42%] -rotate-20 rounded-full bg-white/55"></span>
        <span
          :class="[
            'relative text-xl font-black tabular-nums',
            step.done || step.current ? 'text-white' : 'text-violet-300 dark:text-slate-400',
          ]"
        >
          {{ step.n }}
        </span>

        <!-- Up to three stars over a finished step. -->
        <span v-if="step.done && step.stars" class="pointer-events-none absolute -top-5 left-1/2 flex -translate-x-1/2 items-end">
          <svg
            v-for="s in 3"
            :key="s"
            viewBox="0 0 24 24"
            :class="[
              s === 2 ? 'size-6 -mb-0.5' : 'size-4.5',
              s === 1 ? '-rotate-12' : s === 3 ? 'rotate-12' : '',
              popping.has(step.id) && s <= step.stars ? 'star-pop' : '',
            ]"
            :style="{ animationDelay: `${(s - 1) * 120}ms` }"
          >
            <path
              :d="STAR"
              stroke-width="1.6"
              stroke-linejoin="round"
              :class="s <= step.stars ? 'fill-amber-300 stroke-amber-600' : 'fill-white/80 stroke-violet-200 dark:fill-slate-700 dark:stroke-slate-500'"
            />
          </svg>
        </span>

        <span
          class="absolute top-1/2 w-max -translate-y-1/2 rounded-xl bg-white/92 px-2.5 py-1.5 text-left ring-1 ring-black/5 dark:bg-gray-900/85 dark:ring-white/10"
          :style="labelStyle(step)"
        >
          <span class="line-clamp-2 text-xs leading-snug font-bold text-gray-900 dark:text-white">{{ step.title }}</span>
          <span
            :class="[
              'block text-[11px] leading-tight font-semibold',
              step.current ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ stepWord(step) }}
          </span>
        </span>
      </button>

      <!-- Sidetracks: wrapped sweets off the road. -->
      <button
        v-for="side in layout.sides"
        :key="side.id"
        type="button"
        class="candy-stop group absolute flex h-9 w-13 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :style="{ left: `${side.x}px`, bottom: `${side.yb}px` }"
        :aria-label="`Sidetrack: ${side.title}, ${side.look.word}`"
        @click="emit('open-stop', side.id)"
      >
        <svg viewBox="0 0 52 36" class="absolute inset-0 size-full transition-[filter] group-hover:brightness-110">
          <path d="M2,6 L15,18 L2,30 Z" :class="[side.look.body, side.look.rim]" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M50,6 L37,18 L50,30 Z" :class="[side.look.body, side.look.rim]" stroke-width="2.5" stroke-linejoin="round" />
          <ellipse cx="26" cy="18" rx="14" ry="13" :class="[side.look.body, side.look.rim]" stroke-width="2.5" />
          <path d="M14,22 A14,13 0 0 0 38,22 Z" class="fill-black/10" />
          <ellipse cx="21" cy="12" rx="5.5" ry="3.2" transform="rotate(-20 21 12)" class="fill-white/60" />
        </svg>
        <X v-if="side.status === 'dropped'" class="relative size-4 text-slate-600 dark:text-slate-200" />

        <span
          class="absolute top-1/2 w-max -translate-y-1/2 rounded-xl bg-white/92 px-2.5 py-1.5 text-left ring-1 ring-black/5 dark:bg-gray-900/85 dark:ring-white/10"
          :style="labelStyle(side)"
        >
          <span
            :class="[
              'line-clamp-2 text-xs leading-snug font-bold',
              side.status === 'dropped' ? 'text-gray-500 line-through decoration-gray-400 dark:text-gray-400' : 'text-gray-900 dark:text-white',
            ]"
          >
            {{ side.title }}
          </span>
          <span class="block text-[11px] leading-tight font-semibold text-violet-600 dark:text-violet-300">Sidetrack · {{ side.look.word }}</span>
        </span>
      </button>

      <!-- The next step, waiting to be named. -->
      <button
        type="button"
        class="group absolute flex size-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-[3px] border-dashed border-pink-400 bg-white/70 text-pink-500 transition-colors hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary dark:border-pink-400/60 dark:bg-white/5 dark:text-pink-300 dark:hover:bg-white/10"
        :style="{ left: `${layout.add.x}px`, bottom: `${layout.add.yb}px` }"
        @click="emit('add-step')"
      >
        <Plus class="size-6" />
        <span
          class="absolute top-1/2 w-max -translate-y-1/2 rounded-xl bg-white/92 px-2.5 py-1.5 text-xs font-bold text-pink-600 ring-1 ring-black/5 dark:bg-gray-900/85 dark:text-pink-300 dark:ring-white/10"
          :style="labelStyle(layout.add)"
        >
          {{ layout.steps.length ? 'Add the next step' : 'Add the first step' }}
        </span>
      </button>

      <!-- The end goal: a lollipop at the top of the road, its name on a
           ribbon across the stick. -->
      <button
        type="button"
        class="group absolute flex -translate-x-1/2 flex-col items-center rounded-3xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
        :style="{ left: `${layout.goal.x}px`, bottom: `${layout.goal.yb - 22}px`, width: `${Math.min(layout.W - 24, 400)}px` }"
        :aria-label="`End goal: ${roadmap.title}${layout.reached ? ', reached' : ''}`"
        @click="emit('open-goal')"
      >
        <span
          :class="[
            'mb-1 rounded-full px-3 py-0.5 text-[11px] font-black tracking-wider uppercase',
            layout.reached ? 'bg-amber-300 text-amber-900' : 'bg-white/90 text-violet-600 dark:bg-gray-900/80 dark:text-violet-300',
          ]"
        >
          {{ layout.reached ? 'Reached!' : 'End goal' }}
        </span>
        <svg viewBox="0 0 140 180" class="h-40 w-32 transition-[filter] group-hover:brightness-105">
          <g v-if="layout.reached" class="fill-amber-300 stroke-amber-500" stroke-width="1.5">
            <path :d="STAR" transform="translate(4 14) scale(1)" />
            <path :d="STAR" transform="translate(112 6) scale(1.1)" />
            <path :d="STAR" transform="translate(118 78) scale(0.8)" />
            <path :d="STAR" transform="translate(2 84) scale(0.75)" />
          </g>
          <rect x="64" y="100" width="12" height="80" rx="6" class="fill-white stroke-violet-200 dark:fill-slate-200 dark:stroke-slate-400" stroke-width="2" />
          <circle cx="70" cy="58" r="52" class="fill-pink-400 stroke-pink-600" stroke-width="3" />
          <path :d="spiral(70, 58, 48, 3)" class="fill-none stroke-white" stroke-width="8" stroke-linecap="round" />
          <path :d="spiral(70, 58, 48, 3, Math.PI)" class="fill-none stroke-amber-300" stroke-width="8" stroke-linecap="round" />
          <path d="M22,70 A52,52 0 0 0 118,70 A50,46 0 0 1 22,70 Z" class="fill-black/10" />
          <ellipse cx="48" cy="30" rx="16" ry="8" transform="rotate(-30 48 30)" class="fill-white/55" />
        </svg>
        <span
          class="goal-ribbon -mt-16 max-w-full bg-primary px-7 py-2.5 text-center text-sm leading-snug font-black text-white sm:text-base"
        >
          <span class="line-clamp-2">{{ roadmap.title }}</span>
        </span>
      </button>

      <!-- Where the road is now: a flag over the first step not yet done.
           It glides to the next one when a step is finished. -->
      <div
        v-if="layout.here"
        class="here-flag pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
        :style="{ left: `${layout.here.x}px`, bottom: `${layout.here.yb + (layout.here === layout.road[0] ? 20 : 42)}px` }"
        aria-hidden="true"
      >
        <span class="flex size-9 items-center justify-center rounded-full bg-primary ring-[3px] ring-white dark:ring-gray-900">
          <Flag class="size-5 text-white" />
        </span>
        <span class="-mt-1 size-3 rotate-45 bg-primary"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Stops slide to their new place when the road is reordered, and the flag
   glides from one step to the next. */
.candy-stop,
.here-flag {
  transition:
    left 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
    bottom 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* A notched ribbon, flat. */
.goal-ribbon {
  clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 50%, 100% 100%, 0 100%, 14px 50%);
}

/* A star earned just now lands with a little overshoot. */
.star-pop {
  animation: star-pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) both;
}

@keyframes star-pop {
  from {
    transform: scale(0) rotate(-40deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .candy-stop,
  .here-flag {
    transition: none;
  }
  .star-pop {
    animation: none;
  }
}
</style>

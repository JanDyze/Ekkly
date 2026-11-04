<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowBendUpRight, Flag, Plus, Trophy, X } from '../../../icons'
import { currentStepId, goalHue, groupStops, progressOf } from '../../../utils/roadmap'

// A roadmap drawn as a level map, the way a puzzle game lays out its levels:
// a road winding up the screen from Start to the end goal at the top. Each
// step is a numbered stop on the road with up to three stars for how it
// went; the road travelled and the steps done are in the church's colour,
// the rest still grey. A sidetrack is a smaller stop off to one side on a
// dotted trail from the step it left; a trail that was taken and finished
// comes back to the road, one that was dropped stops dead. A flag stands over
// the first step not yet done, which is where the road is now.
//
// Only the idea is the game's. The look is Ekkly's own (DESIGN.md, "The
// roadmap's level map"): flat, in the goal's own colour (goalHue), with
// its labels as plain words beside the stops.
//
// Read from the bottom up, and opened scrolled to the flag. Everything is
// placed by its distance from the foot of the map, so adding a step at the
// top leaves every stop below exactly where it was.

const props = defineProps({
  roadmap: { type: Object, required: true },
})

const emit = defineEmits(['open-stop', 'open-goal', 'add-step'])

const scroller = ref(null)
const width = ref(0)
const viewH = ref(0)
let observer = null

// Things glide to a new place only once the map has been laid out at its
// real size: the first layout is a guess at the width, and sliding from it
// made the map wobble as it opened.
const ready = ref(false)

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    width.value = entry.contentRect.width
    viewH.value = entry.contentRect.height
    if (!ready.value) requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true)))
  })
  observer.observe(scroller.value)
})
onBeforeUnmount(() => observer?.disconnect())

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ---------------------------------------------------------------- layout */

const FOOT = 70 // Start, above the map's foot
const STEP_ROW = 118
const SIDE_ROW = 88
const GOAL_ROOM = 230

const SIDE_LOOK = {
  done: { tile: 'bg-(--hue)/15 text-(--hue) dark:bg-(--hue)/25', word: 'taken' },
  open: { tile: 'bg-amber-400 text-amber-950', word: 'on it now' },
  dropped: { tile: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500', word: 'dropped' },
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

  // How far a label may run before the edge, from a stop of radius r.
  const labelRoom = (x, side, r) => clamp((side === 'left' ? x : W - x) - r - 20, 72, 240)

  const start = { x: cx, yb: FOOT, done: stops.length > 0 && stops[0].status === 'done' }
  const road = [start]
  const steps = []
  const sides = []
  const trails = []
  let yb = FOOT + STEP_ROW * 0.8

  groups.forEach((group, m) => {
    const x = roadX(m)
    const labelSide = x >= cx ? 'left' : 'right'
    const step = {
      ...group.step,
      n: m + 1,
      x,
      yb,
      done: group.step.status === 'done',
      current: group.step.id === current,
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
        const sideLabel = dir < 0 ? 'left' : 'right'
        const node = {
          ...side,
          x: sx,
          // Starting a little up the stretch, so the first sits clear of the
          // flag when its step is where the road is now.
          yb: yb + 36 + (gap - 36) * t,
          look: SIDE_LOOK[side.status] || SIDE_LOOK.open,
          labelSide: sideLabel,
          labelMax: labelRoom(sx, sideLabel, 20),
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

  // The road ends at the foot of the goal's circle.
  const goal = { x: cx, yb, done: reached }
  road.push(goal)

  const height = Math.max(yb + GOAL_ROOM, viewH.value)

  // A finished trail comes back to the road at the next point on it.
  trails.forEach((trail) => {
    if (trail.rejoins) trail.points = [...trail.points, road[trail.joinAt]]
  })

  const here = steps.find((s) => s.current) || (steps.length ? null : start)

  return { W, height, road, steps, sides, trails, add, goal, here, reached }
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

// A sidetrack's trail bows gently between its stops rather than running
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

// Stars arrive only for a stop just finished, not for every one on opening.
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

const stepWord = (step) => (step.current ? 'Here now' : step.done ? 'Done' : 'Ahead')

// The goal's own colour, the same as its stop on the map of every goal.
const hue = computed(() => goalHue(props.roadmap.id))

const labelStyle = (node) => ({
  maxWidth: `${node.labelMax}px`,
  ...(node.labelSide === 'left' ? { right: 'calc(100% + 10px)' } : { left: 'calc(100% + 10px)' }),
})

const LABEL = 'absolute top-1/2 w-max -translate-y-1/2 text-left'
</script>

<template>
  <div
    ref="scroller"
    :class="{ ready }"
    class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white dark:bg-gray-900"
    :style="{ '--hue': hue }"
  >
    <div class="relative w-full" :style="{ height: `${layout.height}px` }">
      <!-- A soft pool of the goal's colour where the road ends. -->
      <span
        class="pointer-events-none absolute size-72 -translate-x-1/2 translate-y-1/2 rounded-full bg-(--hue)/10 dark:bg-(--hue)/15"
        :style="{ left: `${layout.goal.x}px`, bottom: `${layout.goal.yb + 40}px` }"
      ></span>

      <svg
        class="pointer-events-none absolute inset-0"
        :width="layout.W"
        :height="layout.height"
        :viewBox="`0 0 ${layout.W} ${layout.height}`"
        aria-hidden="true"
      >
        <!-- The road: travelled in the goal's colour, the rest grey, with a
             dashed line down its middle. -->
        <g fill="none" stroke-linecap="round">
          <path
            v-for="(piece, i) in roadPieces"
            :key="`bed-${i}`"
            :d="piece.d"
            stroke-width="20"
            :class="piece.done ? 'stroke-(--hue)' : 'stroke-gray-100 dark:stroke-gray-800'"
          />
          <path
            v-for="(piece, i) in roadPieces"
            :key="`line-${i}`"
            :d="piece.d"
            stroke-width="2.5"
            stroke-dasharray="7 9"
            :class="piece.done ? 'stroke-white/70 dark:stroke-gray-900/50' : 'stroke-gray-300 dark:stroke-gray-600'"
          />
        </g>

        <!-- Sidetracks' trails: dotted, off the road and, if finished, back. -->
        <path
          v-for="trail in layout.trails"
          :key="`trail-${trail.id}`"
          :d="trailPath(trail.points)"
          fill="none"
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray="0.1 9"
          class="stroke-(--hue)/50"
        />
      </svg>

      <!-- Start -->
      <div
        class="pointer-events-none absolute -translate-x-1/2 translate-y-1/2 text-[11px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500"
        :style="{ left: `${layout.road[0].x}px`, bottom: `${layout.road[0].yb - 24}px` }"
      >
        Start
      </div>

      <!-- Steps on the road -->
      <button
        v-for="step in layout.steps"
        :key="step.id"
        type="button"
        :class="[
          'map-stop absolute flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full font-black tabular-nums focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary',
          step.current
            ? 'size-16 bg-(--hue) text-xl text-white ring-8 ring-(--hue)/20 hover:brightness-110'
            : step.done
              ? 'size-13 bg-(--hue) text-lg text-white hover:brightness-110'
              : 'size-13 bg-white text-lg text-gray-300 ring-2 ring-gray-200 hover:text-(--hue) hover:ring-(--hue)/50 dark:bg-gray-800 dark:text-gray-600 dark:ring-gray-700',
        ]"
        :style="{ left: `${step.x}px`, bottom: `${step.yb}px` }"
        :aria-label="`Step ${step.n}: ${step.title}. ${stepWord(step)}${step.stars ? `, ${step.stars} of 3 stars` : ''}`"
        @click="emit('open-stop', step.id)"
      >
        {{ step.n }}

        <!-- Up to three stars over a finished step. -->
        <span v-if="step.done && step.stars" class="pointer-events-none absolute -top-5 left-1/2 flex -translate-x-1/2 items-end gap-px">
          <svg
            v-for="s in 3"
            :key="s"
            viewBox="0 0 24 24"
            :class="[
              s === 2 ? 'size-5.5 -mb-0.5' : 'size-4',
              popping.has(step.id) && s <= step.stars ? 'star-in' : '',
            ]"
            :style="{ animationDelay: `${(s - 1) * 100}ms` }"
          >
            <path :d="STAR" :class="s <= step.stars ? 'fill-amber-400' : 'fill-gray-200 dark:fill-gray-700'" />
          </svg>
        </span>

        <span :class="LABEL" :style="labelStyle(step)">
          <span
            :class="[
              'line-clamp-2 text-sm leading-snug font-semibold',
              step.done || step.current ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
            ]"
          >
            {{ step.title }}
          </span>
          <span v-if="step.current" class="block text-xs font-bold text-(--hue)">Here now</span>
        </span>
      </button>

      <!-- Sidetracks: smaller stops off the road. -->
      <button
        v-for="side in layout.sides"
        :key="side.id"
        type="button"
        :class="[
          'map-stop absolute flex size-9 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full hover:brightness-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary',
          side.look.tile,
        ]"
        :style="{ left: `${side.x}px`, bottom: `${side.yb}px` }"
        :aria-label="`Sidetrack: ${side.title}, ${side.look.word}`"
        @click="emit('open-stop', side.id)"
      >
        <X v-if="side.status === 'dropped'" class="size-4" />
        <ArrowBendUpRight v-else class="size-4" />

        <span :class="LABEL" :style="labelStyle(side)">
          <span
            :class="[
              'line-clamp-2 text-xs leading-snug font-medium',
              side.status === 'dropped' ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ side.title }}
          </span>
        </span>
      </button>

      <!-- The next step, waiting to be named. -->
      <button
        type="button"
        class="absolute flex size-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white text-gray-400 transition-colors hover:border-(--hue) hover:text-(--hue) focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500"
        :style="{ left: `${layout.add.x}px`, bottom: `${layout.add.yb}px` }"
        @click="emit('add-step')"
      >
        <Plus class="size-5" />
        <span :class="[LABEL, 'text-sm font-semibold text-gray-400 dark:text-gray-500']" :style="labelStyle(layout.add)">
          {{ layout.steps.length ? 'Next step' : 'First step' }}
        </span>
      </button>

      <!-- The end goal at the top of the road: its name over a large stop. -->
      <button
        type="button"
        class="group absolute flex -translate-x-1/2 flex-col items-center rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
        :style="{ left: `${layout.goal.x}px`, bottom: `${layout.goal.yb - 2}px`, width: `${Math.min(layout.W - 24, 400)}px` }"
        :aria-label="`End goal: ${roadmap.title}${layout.reached ? ', reached' : ''}`"
        @click="emit('open-goal')"
      >
        <span class="mb-3 line-clamp-2 max-w-full text-center text-lg leading-snug font-black text-gray-900 dark:text-white">
          {{ roadmap.title }}
        </span>
        <span class="flex size-20 items-center justify-center rounded-full bg-(--hue) text-white ring-8 ring-(--hue)/20 transition-[filter] group-hover:brightness-110">
          <Trophy class="size-9" />
        </span>
      </button>

      <!-- Where the road is now: a flag over the first step not yet done.
           It glides to the next one when a step is finished. -->
      <div
        v-if="layout.here"
        class="map-stop pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
        :style="{ left: `${layout.here.x}px`, bottom: `${layout.here.yb + (layout.here === layout.road[0] ? 20 : 46)}px` }"
        aria-hidden="true"
      >
        <span class="flex size-9 items-center justify-center rounded-full bg-(--hue) ring-[3px] ring-white dark:ring-gray-900">
          <Flag class="size-5 text-white" />
        </span>
        <span class="-mt-1 size-3 rotate-45 bg-(--hue)"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Stops slide to their new place when the road is reordered, and the flag
   glides from one step to the next. */
.ready .map-stop {
  transition-property: left, bottom, background-color, color, box-shadow, filter;
  transition-duration: 0.45s, 0.45s, 0.15s, 0.15s, 0.15s, 0.15s;
  transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* A star earned just now fades and turns into place. */
.star-in {
  animation: star-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes star-in {
  from {
    transform: scale(0.4) rotate(-30deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ready .map-stop {
    transition: none;
  }
  .star-in {
    animation: none;
  }
}
</style>

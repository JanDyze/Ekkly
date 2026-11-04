<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowBendUpRight, ArrowBendUpRightBold, CheckBold, FlagFill, PencilSimple, PlusBold, Star, StarFill, TrophyFill, XBold } from '../../../icons'
import { currentStepId, goalHue, groupStops, progressOf, shortDate } from '../../../utils/roadmap'
import MapPopup from './MapPopup.vue'

// A goal's road, drawn the way a puzzle game lays out its levels: a road
// winding up the screen from Start to the goal at the top. Each step is a
// numbered stop on the road with up to three stars for how it went; the road
// travelled and the steps done are in the goal's own colour (goalHue), the
// rest still grey. A sidetrack is a smaller stop off to one side on a dotted
// trail from the step it left; a trail that was taken and finished comes
// back to the road, one that was dropped stops dead. A flag stands over the
// first step not yet done, which is where the road is now.
//
// Its pieces have depth (roadmap3d.css): each stop is a chunky button on an
// edge of its own colour that presses down when tapped, the road has a kerb,
// and the goal stands on an island. Tapping a stop pops up what it is and
// what can be done with it: mark it done and say how it went, add a
// sidetrack off it, or open it to change. Nothing slides.
//
// Read from the bottom up, and opened already at the flag. Everything is
// placed by its distance from the foot of the map, so adding a step at the
// top leaves every stop below exactly where it was.

const props = defineProps({
  roadmap: { type: Object, required: true },
})

const emit = defineEmits(['open-stop', 'open-goal', 'add-step', 'add-side', 'complete', 'rate'])

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
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
})

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ---------------------------------------------------------------- layout */

const FOOT = 70 // Start, above the map's foot
const STEP_ROW = 122
const SIDE_ROW = 90
const GOAL_ROOM = 250

const SIDE_LOOK = {
  done: { token: 'rm-token--soft', word: 'Taken' },
  open: { token: 'rm-token--amber text-amber-950', word: 'On it now' },
  dropped: { token: 'rm-token--muted text-gray-400 dark:text-gray-500', word: 'Dropped' },
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
  const labelRoom = (x, side, r) => clamp((side === 'left' ? x : W - x) - r - 22, 72, 220)

  const start = { x: cx, yb: FOOT, done: stops.length > 0 && stops[0].status === 'done' }
  const road = [start]
  const steps = []
  const sides = []
  const trails = []
  let yb = FOOT + STEP_ROW * 0.8

  groups.forEach((group, m) => {
    const x = roadX(m)
    const labelSide = x >= cx ? 'left' : 'right'
    const isCurrent = group.step.id === current
    const step = {
      ...group.step,
      n: m + 1,
      x,
      yb,
      done: group.step.status === 'done',
      current: isCurrent,
      reach: isCurrent ? 42 : 34,
      labelSide,
      labelMax: labelRoom(x, labelSide, isCurrent ? 42 : 32),
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
      const lift = isCurrent ? 104 : 44
      group.sides.forEach((side, j) => {
        const t = (j + 1) / (group.sides.length + 1)
        const atRoad = x + (nextX - x) * t
        const room = dir < 0 ? atRoad : W - atRoad
        // Close enough to the road to leave its label room to be read on a
        // phone, far enough to sit clear of it.
        const sx = clamp(atRoad + dir * clamp(room - 170, 60, 140), 30, W - 30)
        const sideLabel = dir < 0 ? 'left' : 'right'
        const node = {
          ...side,
          x: sx,
          // Starting a little up the stretch, and further when its step is
          // where the road is now, so the first sits clear of the flag.
          yb: yb + lift + (gap - lift) * t,
          reach: 26,
          stepN: m + 1,
          stepId: group.step.id,
          look: SIDE_LOOK[side.status] || SIDE_LOOK.open,
          labelSide: sideLabel,
          labelMax: labelRoom(sx, sideLabel, 22),
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
  const add = { x: addX, yb, done: reached, labelSide: addSide, labelMax: labelRoom(addX, addSide, 26) }
  road.push(add)
  yb += STEP_ROW * 0.9

  // The road ends on the goal's island.
  const goal = { x: cx, yb, done: reached }
  road.push(goal)

  // A short road sits in the middle of the screen rather than at its foot:
  // everything is lifted by half the room to spare.
  const contentH = yb + GOAL_ROOM
  const lift = Math.max(0, (viewH.value - contentH) / 2)
  if (lift) [...road, ...sides].forEach((p) => (p.yb += lift))
  const height = Math.max(contentH, viewH.value)

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

// Where the stars sit round a reached goal's trophy, in its 176-wide box.
const GOAL_STARS = [
  { left: '6px', top: '18px', size: 26, turn: -18 },
  { left: '148px', top: '8px', size: 22, turn: 14 },
  { left: '150px', top: '56px', size: 16, turn: -6 },
]

/* -------------------------------------------------------------- scrolling */

const scrollToBottomOf = (p, smooth) => {
  const el = scroller.value
  if (!el || !p) return
  const top = clamp(yOf(p) - el.clientHeight * 0.55, 0, el.scrollHeight)
  el.scrollTo({ top, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
}

// A road opens already at the flag, not rolling up to it from Start.
const arrive = async () => {
  await nextTick()
  if (!scroller.value || !width.value) return
  scrollToBottomOf(layout.value.here || (layout.value.reached ? layout.value.goal : layout.value.add), false)
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

// Finishing a step moves the flag on; the map follows it only if it would
// otherwise move out of sight.
const hereId = computed(() => (layout.value.steps.find((s) => s.current) || {}).id || '')
watch([() => props.roadmap.id, hereId], ([id, step], [wasId, wasStep]) => {
  if (id !== wasId || !wasStep || step === wasStep) return
  const target = layout.value.here || layout.value.goal
  const el = scroller.value
  if (!el || !target) return
  const y = yOf(target) - el.scrollTop
  if (y < 90 || y > el.clientHeight - 60) setTimeout(() => scrollToBottomOf(target, true), 300)
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

/* ----------------------------------------------------------------- popup */

// Which stop's popup is open, and whether it is asking how a finish went.
// The popup keeps the last stop while it fades away.
const popupId = ref('')
const popupOpen = ref(false)
const rating = ref(false)

const popupStop = computed(
  () => layout.value.steps.find((s) => s.id === popupId.value) || layout.value.sides.find((s) => s.id === popupId.value) || null
)

const toggle = (id) => {
  if (popupOpen.value && popupId.value === id) return closePopup()
  popupId.value = id
  rating.value = false
  popupOpen.value = true
}
const closePopup = () => {
  popupOpen.value = false
  rating.value = false
}
const onKey = (event) => {
  if (event.key === 'Escape' && popupOpen.value) closePopup()
}

// A different goal, or the stop gone: nothing to show.
watch(() => props.roadmap.id, closePopup)
watch(popupStop, (stop) => {
  if (!stop) closePopup()
})

const isSide = computed(() => popupStop.value?.kind === 'side')

const statusLine = (stop) => {
  if (!stop) return ''
  if (stop.kind === 'side') return stop.look.word
  if (stop.current) return 'You are here'
  if (stop.done) return stop.doneOn ? `Done ${shortDate(stop.doneOn)}` : 'Done'
  return 'Still ahead'
}

const finish = (stars) => {
  emit('complete', popupStop.value.id, stars)
  closePopup()
}
const rate = (n) => emit('rate', popupStop.value.id, popupStop.value.stars === n ? 0 : n)
const edit = () => {
  const id = popupStop.value.id
  closePopup()
  emit('open-stop', id)
}
const branch = () => {
  const id = popupStop.value.id
  closePopup()
  emit('add-side', id)
}

/* ---------------------------------------------------------------- labels */

const stepWord = (step) => (step.current ? 'Here now' : step.done ? 'Done' : 'Ahead')

// The goal's own colour, the same as its stop on the map of every goal.
const hue = computed(() => goalHue(props.roadmap.id))

const labelStyle = (node) => ({
  maxWidth: `${node.labelMax}px`,
  ...(node.labelSide === 'left' ? { right: 'calc(100% + 14px)' } : { left: 'calc(100% + 14px)' }),
})

const LABEL = 'pointer-events-none absolute top-1/2 w-max -translate-y-1/2 text-left'
</script>

<template>
  <div
    ref="scroller"
    class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white dark:bg-gray-900"
    :style="{ '--hue': hue }"
    @click="closePopup"
  >
    <!-- A wash of the goal's colour from Start that fades as the road climbs,
         on the map itself so it scrolls with it. -->
    <div class="relative w-full bg-linear-to-t from-(--hue)/10 to-transparent dark:from-(--hue)/20" :style="{ height: `${layout.height}px` }">
      <!-- Soft light of the goal's colour where the road ends. -->
      <span
        class="pointer-events-none absolute size-80 -translate-x-1/2 translate-y-1/2 rounded-full bg-(--hue)/10 dark:bg-(--hue)/15"
        :style="{ left: `${layout.goal.x}px`, bottom: `${layout.goal.yb + 70}px` }"
      ></span>

      <svg
        class="pointer-events-none absolute inset-0"
        :width="layout.W"
        :height="layout.height"
        :viewBox="`0 0 ${layout.W} ${layout.height}`"
        aria-hidden="true"
      >
        <!-- The road, in depth: its kerb drawn a little lower and darker,
             then its surface, then a dashed line down the middle. The
             stretches travelled are in the goal's colour. -->
        <g fill="none" stroke-linecap="round">
          <g transform="translate(0 6)">
            <path
              v-for="(piece, i) in roadPieces"
              :key="`kerb-${i}`"
              :d="piece.d"
              stroke-width="24"
              :style="piece.done ? { stroke: 'color-mix(in srgb, var(--hue) 66%, black)' } : null"
              :class="piece.done ? '' : 'stroke-gray-300 dark:stroke-gray-950'"
            />
          </g>
          <path
            v-for="(piece, i) in roadPieces"
            :key="`top-${i}`"
            :d="piece.d"
            stroke-width="24"
            :class="piece.done ? 'stroke-(--hue)' : 'stroke-gray-100 dark:stroke-gray-700'"
          />
          <path
            v-for="(piece, i) in roadPieces"
            :key="`line-${i}`"
            :d="piece.d"
            stroke-width="3"
            stroke-dasharray="8 10"
            :class="piece.done ? 'stroke-white/60' : 'stroke-gray-300 dark:stroke-gray-500'"
          />
        </g>

        <!-- Sidetracks' trails: dotted, off the road and, if finished, back. -->
        <path
          v-for="trail in layout.trails"
          :key="`trail-${trail.id}`"
          :d="trailPath(trail.points)"
          fill="none"
          stroke-width="5"
          stroke-linecap="round"
          stroke-dasharray="0.1 11"
          class="stroke-(--hue)/55"
        />
      </svg>

      <!-- Start -->
      <div
        class="rm-pill pointer-events-none absolute -translate-x-1/2 translate-y-1/2 rounded-full px-3 py-0.5 text-[11px] font-black tracking-wider text-gray-500 uppercase dark:text-gray-300"
        :style="{ left: `${layout.road[0].x}px`, bottom: `${layout.road[0].yb - 30}px` }"
      >
        Start
      </div>

      <!-- Steps on the road -->
      <button
        v-for="step in layout.steps"
        :key="step.id"
        type="button"
        :class="[
          'rm-token absolute flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full font-black tabular-nums focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary',
          step.current ? 'rm-current size-18 text-2xl text-white' : 'size-15 text-xl',
          step.done || step.current ? 'text-white' : 'rm-token--ahead text-gray-400 dark:text-gray-400',
        ]"
        :style="{ left: `${step.x}px`, bottom: `${step.yb}px` }"
        :aria-label="`Step ${step.n}: ${step.title}. ${stepWord(step)}${step.stars ? `, ${step.stars} of 3 stars` : ''}`"
        :aria-expanded="popupOpen && popupId === step.id"
        @click.stop="toggle(step.id)"
      >
        <CheckBold v-if="step.done" class="size-7" />
        <template v-else>{{ step.n }}</template>

        <!-- Up to three stars over a finished step, each on a darker edge. -->
        <span v-if="step.done && step.stars" class="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 items-end gap-0.5">
          <svg
            v-for="s in 3"
            :key="s"
            viewBox="0 0 24 26"
            :class="[
              s === 2 ? 'size-6.5 -mb-1' : 'size-5',
              popping.has(step.id) && s <= step.stars ? 'rm-star-in' : '',
            ]"
            :style="{ animationDelay: `${(s - 1) * 110}ms` }"
          >
            <path :d="STAR" transform="translate(0 2)" :class="s <= step.stars ? 'fill-amber-600' : 'fill-gray-300 dark:fill-gray-800'" />
            <path :d="STAR" :class="s <= step.stars ? 'fill-amber-400' : 'fill-gray-200 dark:fill-gray-700'" />
          </svg>
        </span>

        <span :class="LABEL" :style="labelStyle(step)">
          <span
            :class="[
              'line-clamp-2 text-sm leading-snug font-bold',
              step.done || step.current ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
            ]"
          >
            {{ step.title }}
          </span>
          <span v-if="step.current" class="block text-xs font-black text-(--hue)">Here now</span>
        </span>
      </button>

      <!-- Sidetracks: smaller stops off the road. -->
      <button
        v-for="side in layout.sides"
        :key="side.id"
        type="button"
        :class="[
          'rm-token absolute flex size-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary',
          side.look.token,
        ]"
        :style="{ left: `${side.x}px`, bottom: `${side.yb}px`, '--lip': '4px' }"
        :aria-label="`Sidetrack: ${side.title}, ${side.look.word}`"
        :aria-expanded="popupOpen && popupId === side.id"
        @click.stop="toggle(side.id)"
      >
        <XBold v-if="side.status === 'dropped'" class="size-5" />
        <ArrowBendUpRightBold v-else class="size-5" />

        <span :class="LABEL" :style="labelStyle(side)">
          <span
            :class="[
              'line-clamp-3 text-xs leading-snug font-semibold',
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
        class="absolute flex size-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-[3px] border-dashed border-gray-300 bg-white text-gray-400 transition-colors hover:border-(--hue) hover:text-(--hue) focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500"
        :style="{ left: `${layout.add.x}px`, bottom: `${layout.add.yb}px` }"
        @click.stop="emit('add-step')"
      >
        <PlusBold class="size-6" />
        <span :class="[LABEL, 'text-sm font-bold text-gray-400 dark:text-gray-500']" :style="labelStyle(layout.add)">
          {{ layout.steps.length ? 'Next step' : 'First step' }}
        </span>
      </button>

      <!-- The goal at the top of the road: a big piece on its own island,
           its name raised over it. -->
      <div
        class="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
        :style="{ left: `${layout.goal.x}px`, bottom: `${layout.goal.yb - 34}px`, width: `${Math.min(layout.W - 24, 380)}px` }"
      >
        <span
          :class="[
            'rm-pill mb-3 line-clamp-2 max-w-full rounded-2xl px-4 py-1.5 text-center text-base leading-snug font-black text-gray-900 dark:text-white',
          ]"
        >
          {{ roadmap.title }}
        </span>
        <span class="relative flex h-30 w-44 items-start justify-center">
          <span class="rm-island absolute bottom-3 h-14 w-44 rounded-[50%]"></span>
          <button
            type="button"
            class="rm-token pointer-events-auto relative flex size-24 items-center justify-center rounded-full text-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
            :style="{ '--lip': '8px' }"
            :aria-label="`The goal: ${roadmap.title}${layout.reached ? ', reached' : ''}. Change it`"
            @click.stop="emit('open-goal')"
          >
            <TrophyFill class="size-11" />
          </button>
          <span
            v-if="layout.reached"
            class="rm-pill absolute -top-2 -right-1 rounded-full px-2 py-0.5 text-[11px] font-black tracking-wider text-amber-600 uppercase dark:text-amber-400"
          >
            Reached
          </span>
          <!-- Reached: three stars thrown up round the trophy. -->
          <template v-if="layout.reached">
            <svg
              v-for="(star, i) in GOAL_STARS"
              :key="i"
              viewBox="0 0 24 26"
              class="absolute"
              :style="{ left: star.left, top: star.top, width: `${star.size}px`, height: `${star.size}px`, rotate: `${star.turn}deg` }"
              aria-hidden="true"
            >
              <path :d="STAR" transform="translate(0 2)" class="fill-amber-600" />
              <path :d="STAR" class="fill-amber-400" />
            </svg>
          </template>
        </span>
      </div>

      <!-- Where the road is now: a flag over the first step not yet done. -->
      <div
        v-if="layout.here"
        class="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
        :style="{ left: `${layout.here.x}px`, bottom: `${layout.here.yb + (layout.here === layout.road[0] ? 22 : 50)}px` }"
        aria-hidden="true"
      >
        <span class="rm-token flex size-10 items-center justify-center rounded-full text-white" :style="{ '--lip': '4px' }">
          <FlagFill class="size-5" />
        </span>
        <span class="-mt-0.5 h-2.5 w-1 rounded-b bg-(--hue)"></span>
      </div>

      <!-- What a stop is, and what can be done with it. -->
      <MapPopup
        :show="popupOpen && !!popupStop"
        :anchor="popupId"
        :x="popupStop?.x || 0"
        :yb="popupStop?.yb || 0"
        :reach="popupStop?.reach || 30"
        :width="layout.W"
        :height="layout.height"
      >
        <template v-if="popupStop">
          <p class="text-[11px] font-black tracking-wider text-(--hue) uppercase">
            {{ isSide ? `Sidetrack off step ${popupStop.stepN}` : `Step ${popupStop.n}` }}
          </p>
          <p class="mt-0.5 text-base leading-snug font-bold text-gray-900 dark:text-white">{{ popupStop.title }}</p>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ statusLine(popupStop) }}</p>

          <!-- How it went, for a finished stop: tap a star to change it. -->
          <div v-if="popupStop.status === 'done' && !rating" class="mt-2 flex items-center gap-1">
            <button
              v-for="n in 3"
              :key="n"
              type="button"
              class="rounded-lg p-0.5 transition-colors hover:bg-amber-50 dark:hover:bg-amber-400/10"
              :aria-label="`${n} star${n > 1 ? 's' : ''}`"
              :aria-pressed="popupStop.stars >= n"
              @click.stop="rate(n)"
            >
              <StarFill v-if="popupStop.stars >= n" class="size-6 text-amber-400" />
              <Star v-else class="size-6 text-gray-300 dark:text-gray-600" />
            </button>
          </div>

          <p v-if="popupStop.note && !rating" class="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{{ popupStop.note }}</p>

          <!-- Marking it done asks how it went, right here. -->
          <div v-if="rating" class="mt-3">
            <p class="text-sm font-bold text-gray-900 dark:text-white">How did it go?</p>
            <div class="mt-2 flex justify-center gap-2">
              <button
                v-for="n in 3"
                :key="n"
                type="button"
                class="group/star rounded-xl p-1"
                :aria-label="`${n} star${n > 1 ? 's' : ''}`"
                @click.stop="finish(n)"
              >
                <StarFill class="size-11 text-gray-200 transition-colors group-hover/star:text-amber-400 dark:text-gray-700" />
              </button>
            </div>
            <button
              type="button"
              class="mt-1 w-full rounded-lg py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click.stop="finish(0)"
            >
              Skip the stars
            </button>
          </div>

          <template v-else>
            <button
              v-if="popupStop.status !== 'done' && popupStop.status !== 'dropped'"
              type="button"
              class="rm-token rm-btn mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black tracking-wide text-white uppercase"
              @click.stop="rating = true"
            >
              <CheckBold class="size-5" />
              {{ isSide ? 'Back on the road' : 'Mark done' }}
            </button>
            <div class="mt-3 flex gap-2">
              <button
                type="button"
                class="rm-token rm-btn rm-btn--plain flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200"
                @click.stop="edit"
              >
                <PencilSimple class="size-4" />
                Edit
              </button>
              <button
                v-if="!isSide"
                type="button"
                class="rm-token rm-btn rm-btn--plain flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200"
                @click.stop="branch"
              >
                <ArrowBendUpRight class="size-4" />
                Sidetrack
              </button>
            </div>
          </template>
        </template>
      </MapPopup>
    </div>
  </div>
</template>

<style src="./roadmap3d.css"></style>

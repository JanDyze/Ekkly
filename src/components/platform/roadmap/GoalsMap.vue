<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Flag, Trophy } from '../../../icons'
import { goalHue, progressOf } from '../../../utils/roadmap'

// Every goal on one map, the world map above each goal's own road
// (LevelMap). Read from the bottom up like the roads: a goal that comes after
// another (its `after`) sits higher, joined to it by a road, so the goals
// that lead into each other read as a climb and the ones that run side by
// side stand side by side.
//
// Each goal is a big round stop in its own colour (goalHue), in a soft halo
// of it, with how many of its steps are done inside and its name
// underneath; nothing else, so the map reads at a glance. A road takes the
// colour of the goal below it once that goal is reached. Opening a goal
// opens its road.

const props = defineProps({
  roadmaps: { type: Array, required: true },
})

const emit = defineEmits(['open'])

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

// A goal's stop: the ring and circle on top, its name in the room under it.
const RING = 104
const NAME_H = 44
const BLOCK_H = RING + NAME_H
const ROW = BLOCK_H + 48
const PAD = 28

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))

const layout = computed(() => {
  const W = width.value || 360
  const goals = props.roadmaps
  const byId = new Map(goals.map((g) => [g.id, g]))

  // How high a goal sits: one row above the highest goal it comes after. A
  // loop of goals each after the other is cut where it closes, so it still
  // draws.
  const depth = new Map()
  const visiting = new Set()
  const depthOf = (g) => {
    if (depth.has(g.id)) return depth.get(g.id)
    if (visiting.has(g.id)) return 0
    visiting.add(g.id)
    const parents = (g.after || []).map((id) => byId.get(id)).filter(Boolean)
    const d = parents.length ? 1 + Math.max(...parents.map(depthOf)) : 0
    visiting.delete(g.id)
    depth.set(g.id, d)
    return d
  }
  goals.forEach(depthOf)
  const deepest = Math.max(0, ...depth.values())

  // Two across on a phone; on a wider screen, as many to a row as fit.
  const GAP = 16
  const slotW = clamp((W - GAP * 3) / 2, 120, 190)
  const perRow = Math.max(1, Math.floor((W - GAP) / (slotW + GAP)))

  // Rows from the bottom. Within a row, each goal stands over the middle of
  // the goals it comes after, so its road climbs straight up and a road that
  // skips a row passes beside the goals in it rather than behind them; goals
  // are pushed apart only as far as they would otherwise overlap. A row too
  // full for the width carries on above.
  const placed = new Map()
  const rows = []
  const lo = GAP + slotW / 2
  const hi = W - GAP - slotW / 2
  const spread = (wanted) => {
    const xs = wanted.map((x) => clamp(x, lo, hi))
    for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + slotW + GAP)
    xs[xs.length - 1] = Math.min(xs[xs.length - 1], hi)
    for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - slotW - GAP)
    return xs
  }
  for (let d = 0; d <= deepest; d++) {
    const level = goals.filter((g) => depth.get(g.id) === d)
    const pull = (g) => {
      const xs = (g.after || []).map((id) => placed.get(id)?.x).filter((x) => x !== undefined)
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
    }
    const wanted = new Map(level.map((g) => [g.id, pull(g)]))
    level.sort((a, b) => (wanted.get(a.id) ?? W / 2) - (wanted.get(b.id) ?? W / 2))
    for (let i = 0; i < level.length; i += perRow) {
      const chunk = level.slice(i, i + perRow)
      // A goal with nothing before it takes an even share of the row.
      const xs = spread(chunk.map((g, j) => wanted.get(g.id) ?? (W * (j + 1)) / (chunk.length + 1)))
      chunk.forEach((g, j) => placed.set(g.id, { x: xs[j], row: rows.length }))
      rows.push(chunk)
    }
  }

  // A short map sits in the middle of the screen rather than at its foot.
  const contentH = rows.length * ROW - (ROW - BLOCK_H) + PAD * 2
  const height = Math.max(contentH, viewH.value)
  const base = PAD + Math.max(0, (viewH.value - contentH) / 2)

  const stops = goals.map((g) => {
    const p = placed.get(g.id)
    return { ...g, x: p.x, yb: base + p.row * ROW, hue: goalHue(g.id), progress: progressOf(g.stops) }
  })
  const stopById = new Map(stops.map((s) => [s.id, s]))

  // From the top of the goal below to the foot of the goal above's circle,
  // passing behind its name.
  const roads = []
  stops.forEach((s) => {
    ;(s.after || []).forEach((id) => {
      const from = stopById.get(id)
      if (!from || from.yb >= s.yb) return
      const x1 = from.x
      const y1 = height - (from.yb + BLOCK_H - 4)
      const x2 = s.x
      const y2 = height - (s.yb + NAME_H)
      const mid = (y1 + y2) / 2
      roads.push({
        key: `${id}-${s.id}`,
        d: `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`,
        hue: from.progress.reached ? from.hue : '',
      })
    })
  })

  return { W, height, slotW, stops, roads }
})

// The map opens at its foot, where the goals begin.
watch(
  () => [props.roadmaps.length, width.value > 0],
  async () => {
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  }
)

// How far along: a ring round the goal's circle.
const CIRC = 2 * Math.PI * 48
const ringOffset = (p) => CIRC * (1 - (p.steps ? p.done / p.steps : 0))
</script>

<template>
  <div ref="scroller" class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white dark:bg-gray-900">
    <div class="relative w-full" :style="{ height: `${layout.height}px` }">
      <!-- Each goal's soft pool of colour, under everything. -->
      <span
        v-for="goal in layout.stops"
        :key="`pool-${goal.id}`"
        class="pointer-events-none absolute size-30 -translate-x-1/2 translate-y-1/2 rounded-full bg-(--hue)/10 dark:bg-(--hue)/15"
        :style="{ '--hue': goal.hue, left: `${goal.x}px`, bottom: `${goal.yb + NAME_H + RING / 2}px` }"
      ></span>

      <svg
        class="pointer-events-none absolute inset-0"
        :width="layout.W"
        :height="layout.height"
        :viewBox="`0 0 ${layout.W} ${layout.height}`"
        aria-hidden="true"
      >
        <g fill="none" stroke-linecap="round">
          <path
            v-for="road in layout.roads"
            :key="`bed-${road.key}`"
            :d="road.d"
            stroke-width="16"
            :style="road.hue ? { stroke: road.hue } : null"
            :class="road.hue ? '' : 'stroke-gray-200 dark:stroke-gray-700'"
          />
          <path
            v-for="road in layout.roads"
            :key="`line-${road.key}`"
            :d="road.d"
            stroke-width="2.5"
            stroke-dasharray="7 9"
            class="stroke-white dark:stroke-gray-900"
            :class="road.hue ? 'opacity-70' : ''"
          />
        </g>
      </svg>

      <button
        v-for="goal in layout.stops"
        :key="goal.id"
        type="button"
        class="group absolute flex -translate-x-1/2 flex-col items-center rounded-3xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :style="{ '--hue': goal.hue, left: `${goal.x}px`, bottom: `${goal.yb}px`, width: `${layout.slotW}px`, height: `${BLOCK_H}px` }"
        :aria-label="`${goal.title}: ${goal.progress.done} of ${goal.progress.steps} steps done${goal.progress.reached ? ', reached' : ''}`"
        @click="emit('open', goal.id)"
      >
        <span class="relative flex shrink-0 items-center justify-center" :style="{ width: `${RING}px`, height: `${RING}px` }">
          <svg viewBox="0 0 104 104" class="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx="52" cy="52" r="48" fill="none" stroke-width="6" class="stroke-(--hue)/20" />
            <circle
              cx="52"
              cy="52"
              r="48"
              fill="none"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="CIRC"
              :stroke-dashoffset="ringOffset(goal.progress)"
              class="stroke-(--hue) transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <span
            class="flex size-21 flex-col items-center justify-center rounded-full bg-(--hue) text-white transition-[filter] group-hover:brightness-110"
          >
            <template v-if="goal.progress.reached">
              <Trophy class="size-8" />
              <span class="mt-0.5 text-[10px] font-bold tracking-wider uppercase">Reached</span>
            </template>
            <template v-else-if="goal.progress.steps">
              <span class="text-2xl leading-none font-black tabular-nums">
                {{ goal.progress.done }}<span class="text-sm font-bold opacity-75">/{{ goal.progress.steps }}</span>
              </span>
              <span class="mt-1 text-[10px] font-semibold opacity-85">steps</span>
            </template>
            <Flag v-else class="size-8" />
          </span>
        </span>
        <!-- The name, on a patch of ground so the road arriving from below
             passes behind it to the circle. -->
        <span
          class="mt-2 line-clamp-2 max-w-full rounded-md bg-white px-1.5 text-center text-sm leading-snug font-bold text-gray-900 dark:bg-gray-900 dark:text-white"
        >
          {{ goal.title }}
        </span>
      </button>
    </div>
  </div>
</template>


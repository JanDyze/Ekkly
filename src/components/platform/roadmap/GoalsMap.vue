<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowRightBold, TrophyFill } from '../../../icons'
import { currentStepId, goalHue, progressOf } from '../../../utils/roadmap'
import MapPopup from './MapPopup.vue'

// Every goal on one map, the world map above each goal's own road
// (LevelMap). Read from the bottom up like the roads: a goal that comes after
// another (its `after`) sits higher, joined to it by a road, so the goals
// that lead into each other read as a climb and the ones that run side by
// side stand side by side.
//
// Each goal is a world of its own colour (goalHue): a chunky trophy piece on
// a raised island (roadmap3d.css), how far along it is on a badge, its name
// on a raised sign under it. A road between two goals takes the colour of
// the one below once that one is reached. Tapping a goal pops up how it is
// going and the way onto its road.

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
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
})

// A goal's place, top to bottom: the piece (84 across, on an 8px edge), the
// island under it, and the sign with its name.
const TOKEN = 84
const ISLAND_Y = 76 // the island's middle, down from the top
const BLOCK_H = 178
const ROW = BLOCK_H + 34
const PAD = 36

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
  const slotW = clamp((W - GAP * 3) / 2, 130, 200)
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

  const worlds = goals.map((g) => {
    const p = placed.get(g.id)
    const progress = progressOf(g.stops)
    const nextId = currentStepId(g.stops)
    return {
      ...g,
      x: p.x,
      yb: base + p.row * ROW,
      hue: goalHue(g.id),
      progress,
      next: g.stops.find((s) => s.id === nextId)?.title || '',
    }
  })
  const byWorld = new Map(worlds.map((w) => [w.id, w]))

  // From island to island, under both pieces and behind the upper sign.
  const islandUp = BLOCK_H - ISLAND_Y
  const roads = []
  worlds.forEach((w) => {
    ;(w.after || []).forEach((id) => {
      const from = byWorld.get(id)
      if (!from || from.yb >= w.yb) return
      const x1 = from.x
      const y1 = height - (from.yb + islandUp)
      const x2 = w.x
      const y2 = height - (w.yb + islandUp)
      const mid = (y1 + y2) / 2
      roads.push({
        key: `${id}-${w.id}`,
        d: `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`,
        hue: from.progress.reached ? from.hue : '',
      })
    })
  })

  return { W, height, slotW, worlds, roads }
})

// The map opens at its foot, where the goals begin.
watch(
  () => [props.roadmaps.length, width.value > 0],
  async () => {
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  }
)

/* ----------------------------------------------------------------- popup */

const popupId = ref('')
const popupOpen = ref(false)
const popupWorld = computed(() => layout.value.worlds.find((w) => w.id === popupId.value) || null)

const toggle = (id) => {
  if (popupOpen.value && popupId.value === id) return (popupOpen.value = false)
  popupId.value = id
  popupOpen.value = true
}
const closePopup = () => (popupOpen.value = false)
const onKey = (event) => {
  if (event.key === 'Escape') closePopup()
}

const badge = (w) => {
  if (w.progress.reached) return 'Done!'
  if (!w.progress.steps) return 'New'
  return `${w.progress.done}/${w.progress.steps}`
}
const percent = (p) => (p.steps ? Math.round((p.done / p.steps) * 100) : 0)
</script>

<template>
  <div
    ref="scroller"
    class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-linear-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900"
    @click="closePopup"
  >
    <div class="relative w-full" :style="{ height: `${layout.height}px` }">
      <!-- Each world's soft light, under everything. -->
      <span
        v-for="w in layout.worlds"
        :key="`light-${w.id}`"
        class="pointer-events-none absolute size-52 -translate-x-1/2 translate-y-1/2 rounded-full bg-(--hue)/10 dark:bg-(--hue)/8"
        :style="{ '--hue': w.hue, left: `${w.x}px`, bottom: `${w.yb + BLOCK_H - ISLAND_Y}px` }"
      ></span>

      <svg
        class="pointer-events-none absolute inset-0"
        :width="layout.W"
        :height="layout.height"
        :viewBox="`0 0 ${layout.W} ${layout.height}`"
        aria-hidden="true"
      >
        <!-- Roads between goals, in depth: kerb, surface, dashes. -->
        <g fill="none" stroke-linecap="round">
          <g transform="translate(0 5)">
            <path
              v-for="road in layout.roads"
              :key="`kerb-${road.key}`"
              :d="road.d"
              stroke-width="20"
              :style="road.hue ? { stroke: `color-mix(in srgb, ${road.hue} 66%, black)` } : null"
              :class="road.hue ? '' : 'stroke-gray-300 dark:stroke-gray-950'"
            />
          </g>
          <path
            v-for="road in layout.roads"
            :key="`top-${road.key}`"
            :d="road.d"
            stroke-width="20"
            :style="road.hue ? { stroke: road.hue } : null"
            :class="road.hue ? '' : 'stroke-gray-100 dark:stroke-gray-700'"
          />
          <path
            v-for="road in layout.roads"
            :key="`line-${road.key}`"
            :d="road.d"
            stroke-width="3"
            stroke-dasharray="8 10"
            :class="road.hue ? 'stroke-white/60' : 'stroke-gray-300 dark:stroke-gray-500'"
          />
        </g>
      </svg>

      <!-- The worlds. -->
      <div
        v-for="w in layout.worlds"
        :key="w.id"
        class="pointer-events-none absolute -translate-x-1/2"
        :style="{ '--hue': w.hue, left: `${w.x}px`, bottom: `${w.yb}px`, width: `${layout.slotW}px`, height: `${BLOCK_H}px` }"
      >
        <span
          class="rm-island absolute left-1/2 h-13 w-38 -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          :style="{ top: `${ISLAND_Y}px` }"
        ></span>
        <button
          type="button"
          class="rm-token pointer-events-auto absolute top-0 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full text-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
          :style="{ width: `${TOKEN}px`, height: `${TOKEN}px`, '--lip': '8px' }"
          :aria-label="`${w.title}: ${w.progress.done} of ${w.progress.steps} steps done${w.progress.reached ? ', reached' : ''}`"
          :aria-expanded="popupOpen && popupId === w.id"
          @click.stop="toggle(w.id)"
        >
          <TrophyFill class="size-10" />
          <span
            :class="[
              'rm-pill absolute -top-2 -right-4 rounded-full px-2 py-0.5 text-xs font-black tabular-nums',
              w.progress.reached ? 'text-amber-600 dark:text-amber-400' : 'text-(--hue)',
            ]"
          >
            {{ badge(w) }}
          </span>
        </button>
        <span
          class="rm-pill absolute bottom-1 left-1/2 line-clamp-2 w-max max-w-full -translate-x-1/2 rounded-xl px-3 py-1 text-center text-sm leading-snug font-black text-gray-900 dark:text-white"
        >
          {{ w.title }}
        </span>
      </div>

      <!-- How a goal is going, and the way onto its road. -->
      <MapPopup
        :show="popupOpen && !!popupWorld"
        :x="popupWorld?.x || 0"
        :yb="(popupWorld?.yb || 0) + BLOCK_H - TOKEN / 2"
        :reach="TOKEN / 2 + 6"
        :width="layout.W"
        :height="layout.height"
        :hue="popupWorld?.hue || ''"
      >
        <template v-if="popupWorld">
          <p class="text-[11px] font-black tracking-wider text-(--hue) uppercase">
            {{ popupWorld.progress.reached ? 'Goal reached' : 'Goal' }}
          </p>
          <p class="mt-0.5 text-base leading-snug font-bold text-gray-900 dark:text-white">{{ popupWorld.title }}</p>

          <!-- How far along, as a chunky bar. -->
          <div class="mt-3 h-3.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div class="h-full rounded-full bg-(--hue)" :style="{ width: `${percent(popupWorld.progress)}%` }"></div>
          </div>
          <p class="mt-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <template v-if="popupWorld.progress.steps">
              {{ popupWorld.progress.done }} of {{ popupWorld.progress.steps }} steps<template v-if="popupWorld.progress.sides">
                · {{ popupWorld.progress.sides }} {{ popupWorld.progress.sides === 1 ? 'sidetrack' : 'sidetracks' }}</template
              >
            </template>
            <template v-else>No steps yet</template>
          </p>
          <p v-if="popupWorld.next && !popupWorld.progress.reached" class="mt-2 text-sm text-gray-700 dark:text-gray-200">
            <span class="font-bold">Next:</span> {{ popupWorld.next }}
          </p>

          <button
            type="button"
            class="rm-token rm-btn mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black tracking-wide text-white uppercase"
            @click.stop="emit('open', popupWorld.id)"
          >
            Open the road
            <ArrowRightBold class="size-4" />
          </button>
        </template>
      </MapPopup>
    </div>
  </div>
</template>

<style src="./roadmap3d.css"></style>

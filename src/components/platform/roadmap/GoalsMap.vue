<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Trophy } from '../../../icons'
import { currentStepId, progressOf } from '../../../utils/roadmap'

// Every goal on one map, the world map above each goal's own road
// (LevelMap). Read from the bottom up like the roads: a goal that comes after
// another (its `after`) sits higher, joined to it by a road, so the goals
// that lead into each other read as a climb and the ones that run side by
// side stand side by side. A road is in the church's colour once the goal
// below it is reached.
//
// Each goal is a card with how far along its own road it is and its next
// step; opening one opens that road.

const props = defineProps({
  roadmaps: { type: Array, required: true },
})

const emit = defineEmits(['open'])

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

const CARD_H = 140
const ROW = CARD_H + 50
const PAD = 24

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

  const GAP = 16
  // Two across on a phone; on a wider screen, cards at their full width and
  // as many to a row as fit.
  const cardW = clamp((W - GAP * 3) / 2, 120, 184)
  const perRow = Math.max(1, Math.floor((W - GAP) / (cardW + GAP)))

  // Rows from the bottom. Within a row, each goal stands over the middle of
  // the goals it comes after, so its road climbs straight up and a road that
  // skips a row passes beside the goals in it rather than behind them; goals
  // are pushed apart only as far as they would otherwise overlap. A row too
  // full for the width carries on above.
  const placed = new Map()
  const rows = []
  const lo = GAP + cardW / 2
  const hi = W - GAP - cardW / 2
  const spread = (wanted) => {
    const xs = wanted.map((x) => clamp(x, lo, hi))
    for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + cardW + GAP)
    xs[xs.length - 1] = Math.min(xs[xs.length - 1], hi)
    for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - cardW - GAP)
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
  const contentH = rows.length * ROW - (ROW - CARD_H) + PAD * 2
  const height = Math.max(contentH, viewH.value)
  const base = PAD + Math.max(0, (viewH.value - contentH) / 2)

  const cards = goals.map((g) => {
    const p = placed.get(g.id)
    const progress = progressOf(g.stops)
    const nextId = currentStepId(g.stops)
    return {
      ...g,
      x: p.x,
      yb: base + p.row * ROW,
      progress,
      next: g.stops.find((s) => s.id === nextId)?.title || '',
    }
  })
  const cardById = new Map(cards.map((c) => [c.id, c]))

  const roads = []
  cards.forEach((c) => {
    ;(c.after || []).forEach((id) => {
      const from = cardById.get(id)
      if (!from || from.yb >= c.yb) return
      const x1 = from.x
      const y1 = height - (from.yb + CARD_H)
      const x2 = c.x
      const y2 = height - c.yb
      const mid = (y1 + y2) / 2
      roads.push({
        key: `${id}-${c.id}`,
        d: `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`,
        done: from.progress.reached,
      })
    })
  })

  return { W, height, cardW, cards, roads }
})

// The map opens at its foot, where the goals begin.
watch(
  () => [props.roadmaps.length, width.value > 0],
  async () => {
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  }
)

// How far along: a ring round the goal's trophy.
const RING = 2 * Math.PI * 20
const ringOffset = (p) => RING * (1 - (p.steps ? p.done / p.steps : 0))
</script>

<template>
  <div ref="scroller" class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-gray-50 dark:bg-gray-900">
    <div class="relative w-full" :style="{ height: `${layout.height}px` }">
      <svg
        class="pointer-events-none absolute inset-0"
        :width="layout.W"
        :height="layout.height"
        :viewBox="`0 0 ${layout.W} ${layout.height}`"
        aria-hidden="true"
      >
        <defs>
          <pattern :id="`ground-${uid}`" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="11" cy="11" r="1.1" class="fill-gray-300/70 dark:fill-gray-700/70" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" :fill="`url(#ground-${uid})`" />

        <g fill="none" stroke-linecap="round">
          <path
            v-for="road in layout.roads"
            :key="`bed-${road.key}`"
            :d="road.d"
            stroke-width="14"
            :class="road.done ? 'stroke-primary dark:stroke-primary-light' : 'stroke-gray-200 dark:stroke-gray-700'"
          />
          <path
            v-for="road in layout.roads"
            :key="`line-${road.key}`"
            :d="road.d"
            stroke-width="2"
            stroke-dasharray="6 8"
            :class="road.done ? 'stroke-white/60 dark:stroke-gray-900/50' : 'stroke-white dark:stroke-gray-900'"
          />
        </g>
      </svg>

      <button
        v-for="goal in layout.cards"
        :key="goal.id"
        type="button"
        :class="[
          'goal-card absolute flex flex-col items-center rounded-2xl bg-white px-3 py-2.5 text-center ring-1 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-gray-800',
          goal.progress.reached
            ? 'ring-amber-300 hover:ring-amber-400 dark:ring-amber-400/50'
            : 'ring-gray-200 hover:ring-primary/50 dark:ring-gray-700 dark:hover:ring-primary-light/50',
        ]"
        :style="{ left: `${goal.x - layout.cardW / 2}px`, bottom: `${goal.yb}px`, width: `${layout.cardW}px`, height: `${CARD_H}px` }"
        :aria-label="`${goal.title}: ${goal.progress.done} of ${goal.progress.steps} steps done${goal.progress.reached ? ', reached' : ''}`"
        @click="emit('open', goal.id)"
      >
        <span class="relative flex size-10 shrink-0 items-center justify-center">
          <svg viewBox="0 0 48 48" class="absolute inset-0 size-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke-width="4" class="stroke-gray-200 dark:stroke-gray-700" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="RING"
              :stroke-dashoffset="ringOffset(goal.progress)"
              :class="goal.progress.reached ? 'stroke-amber-400' : 'stroke-primary dark:stroke-primary-light'"
              class="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <Trophy
            :class="[
              'size-5',
              goal.progress.reached ? 'text-amber-500' : 'text-primary dark:text-primary-light',
            ]"
          />
        </span>
        <span class="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold text-gray-900 dark:text-white">{{ goal.title }}</span>
        <span class="mt-auto block w-full">
          <span class="block text-[11px] text-gray-500 dark:text-gray-400">
            <template v-if="!goal.progress.steps">No steps yet</template>
            <template v-else>{{ goal.progress.done }} of {{ goal.progress.steps }} steps</template>
          </span>
          <span
            v-if="goal.progress.reached"
            class="block truncate text-[11px] font-semibold text-amber-600 dark:text-amber-400"
          >
            Reached
          </span>
          <span v-else-if="goal.next" class="block truncate text-[11px] font-medium text-primary dark:text-primary-light">
            Next: {{ goal.next }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A goal slides to its new place when the map is rearranged. */
.goal-card {
  transition-property: left, bottom, box-shadow;
  transition-duration: 0.45s, 0.45s, 0.15s;
  transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .goal-card {
    transition: none;
  }
}
</style>

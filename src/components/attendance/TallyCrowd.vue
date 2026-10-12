<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// The room filling up behind the clicker's count (AttendanceTally): one
// character for every tap, dropped from where the finger landed into a crowd
// that piles up from the floor.
//
// Characters rather than people, on purpose: counting heads at the back of a
// service is a chore, and a crowd of jelly beans, round one-eyed fellows and
// little blobs in beanies makes it a small pleasure instead. Six shapes, seven
// things on their heads and the app artwork's colours make every one
// different, and once landed each bobs, wiggles, hops or sways in its own
// time - the one place in Ekkly that idles, because it was asked for, and
// still for anyone who turns motion down.
//
// Each character is fixed by its place in the count, not drawn at random each
// time, so the crowd looks the same when the screen is opened again. The room
// shrinks everyone to fit as it fills, so the last of a hundred and fifty
// still lands on screen.
//
// Drawn in the app artwork's palette (BRAND.md, the app artwork's palette):
// illustration, like the app icons, so it does not follow the church's accent.

const props = defineProps({
  count: { type: Number, default: 0 },
  /** Where the last tap landed, in the box's own pixels, for the newest to drop from. */
  tapAt: { type: Object, default: null },
})

/* ----------------------------------------------------------- the characters */

// Each body colour with the deeper shade of it its feet and arms are drawn in.
const BODIES = [
  ['#FFB21E', '#E08E00'],
  ['#FF7417', '#D9560A'],
  ['#EC4319', '#B83211'],
  ['#3D9DFF', '#1E76D6'],
  ['#1467E8', '#0A4FC4'],
  ['#2BD4C0', '#14A898'],
  ['#0B93AB', '#077083'],
  ['#8E9CB3', '#6B7A93'],
]

const SHAPES = ['bean', 'ball', 'tiny', 'tall', 'square', 'pear']
// Where the top of each shape's head is, so a hat sits on it.
const TOPS = { bean: 12, ball: 21, tiny: 31, tall: 5, square: 16, pear: 14 }
// Most go bare-headed; the rest wear one thing each.
const HATS = ['', '', '', 'beanie', 'bow', 'sprout', 'curl', 'cap', 'antenna']
const MOVES = ['bob', 'wiggle', 'hop', 'sway']

// A small seeded random, so a place in the count is always the same character.
const rand = (n) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
const pick = (list, n) => list[Math.floor(rand(n) * list.length)]

// Idling costs a little on every frame, so past this many only a share of the
// crowd moves - enough that the room still looks alive.
const MOVING = 90

const characterOf = (i, count) => {
  const shape = pick(SHAPES, i * 7 + 1)
  const [body, shade] = pick(BODIES, i * 7 + 2)
  let [acc, acc2] = pick(BODIES, i * 7 + 3)
  if (acc === body) [acc, acc2] = BODIES[(BODIES.findIndex(([c]) => c === body) + 3) % BODIES.length]
  const hat = pick(HATS, i * 7 + 4)
  const length = 1.1 + rand(i * 7 + 5) * 1.3
  const moves = count <= MOVING || rand(i * 7 + 6) < MOVING / count
  return {
    shape,
    hat,
    hatY: (TOPS[shape] - 10) * UNIT,
    move: moves ? pick(MOVES, i * 7 + 6) : '',
    moveStyle: { animationDuration: `${length.toFixed(2)}s`, animationDelay: `-${(rand(i * 7 + 7) * length).toFixed(2)}s` },
    vars: { '--body': body, '--shade': shade, '--acc': acc, '--acc2': acc2 },
  }
}

/* ------------------------------------------------------------------ the room */

const box = ref(null)
const width = ref(0)
const height = ref(0)
let observer = null
onMounted(() => {
  const measure = () => {
    width.value = box.value?.clientWidth || 0
    height.value = box.value?.clientHeight || 0
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(box.value)
  }
})

// A character is 24 by 44 at full size, shown a little larger. Each row stands
// a little more than a head behind the one in front, so the back rows peep
// over the front row.
const UNIT = 1.25
const MARGIN = 6

const geometry = (scale) => {
  const w = 24 * UNIT * scale
  const h = 44 * UNIT * scale
  const colStep = w * 0.8
  const rowStep = h * 0.42
  const cols = Math.max(1, Math.floor((width.value - MARGIN * 2 - w) / colStep) + 1)
  return { scale, w, h, colStep, rowStep, cols }
}

// As large as fits: shrink a tenth at a time until every row is in the room.
const layoutFor = (count) => {
  const n = Math.max(1, count)
  let scale = 1.5
  let g = geometry(scale)
  while (scale > 0.25) {
    const rows = Math.ceil(n / g.cols)
    if ((rows - 1) * g.rowStep + g.h <= height.value - 4) break
    scale *= 0.9
    g = geometry(scale)
  }
  return g
}
const layout = computed(() => layoutFor(props.count))

// Each row fills in its own order rather than left to right, the way people
// find seats.
const order = new Map()
const seatsIn = (row, cols) => {
  const key = `${row}|${cols}`
  if (!order.has(key)) {
    order.set(
      key,
      [...Array(cols).keys()].sort((a, b) => rand(row * 131 + a) - rand(row * 131 + b))
    )
  }
  return order.get(key)
}

const place = (i, g = layout.value) => {
  const row = Math.floor(i / g.cols)
  const seat = seatsIn(row, g.cols)[i % g.cols]
  const offset = row % 2 ? g.colStep / 2 : 0
  const jx = (rand(i * 3 + 11) - 0.5) * g.colStep * 0.35
  const jy = (rand(i * 3 + 12) - 0.5) * g.rowStep * 0.3
  const x = Math.min(width.value - g.w, Math.max(0, MARGIN + seat * g.colStep + offset + jx))
  const y = height.value - g.h - row * g.rowStep + jy
  return { row, x, y }
}

// Drawn back to front: the higher a row, the further back it stands, and the
// room fills from the floor, so the newest is always furthest back and comes
// first. Kept in that one order so a newcomer is only ever added, never moved:
// a moved character would drop into the room all over again. Past fifteen
// hundred the room is full enough; the count still goes on.
const SHOWN = 1500
const crowd = computed(() => {
  if (!width.value || !height.value) return []
  const g = layout.value
  const n = Math.min(props.count, SHOWN)
  const people = []
  for (let i = n - 1; i >= 0; i--) people.push({ i, ...place(i, g), ...characterOf(i, n) })
  return people
})

/* -------------------------------------------------------- arriving and leaving */

// Those already counted when the screen opens file in quickly, a few at a
// time; anyone counted after drops from where the tap landed.
const opened = props.count
const arrival = (person) => {
  if (person.i < opened) return { '--dx': '0px', '--dy': '-40px', animationDelay: `${Math.min(person.i * 12, 700)}ms` }
  const from = props.tapAt
  if (!from || person.i !== props.count - 1) return { '--dx': '0px', '--dy': '-60px' }
  // In the character's own scaled space, so divided back out of it.
  const { scale, w, h } = layout.value
  return {
    '--dx': `${(from.x - person.x - w / 2) / scale}px`,
    '--dy': `${(from.y - person.y - h / 2) / scale}px`,
    '--s0': Math.min(2, 1 / scale),
  }
}

// Who is on their way out: the one taken back, who floats off, or everyone
// when the count starts again, who tumble out of the room.
const leaving = ref([])
let nextLeave = 0
const timers = new Set()

watch(
  () => props.count,
  (now, before) => {
    if (now >= before || !width.value) return
    // Placed where they stood, in the room as it was before it re-fitted.
    const g = layoutFor(before)
    const gone = []
    for (let i = now; i < Math.min(before, SHOWN); i++) {
      gone.push({
        id: nextLeave++,
        ...place(i, g),
        ...characterOf(i, before),
        scale: g.scale,
        all: now === 0,
        delay: now === 0 ? rand(i) * 250 : 0,
        spin: `${Math.round((rand(i + 5) - 0.5) * 120)}deg`,
      })
    }
    leaving.value = [...leaving.value, ...gone]
    const ids = new Set(gone.map((p) => p.id))
    const timer = setTimeout(() => {
      leaving.value = leaving.value.filter((p) => !ids.has(p.id))
      timers.delete(timer)
    }, 1000)
    timers.add(timer)
  }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  timers.forEach(clearTimeout)
})

const placeStyle = (p, scale) => ({ transform: `translate(${p.x}px, ${p.y}px) scale(${scale})` })
</script>

<template>
  <div ref="box" class="pointer-events-none absolute inset-0" aria-hidden="true">
    <svg v-if="width && height" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="absolute inset-0 overflow-visible">
      <defs>
        <!-- Every character is 24 wide and stands with its feet at 44, so a
             row lines up on the floor whatever its shape. The colours come
             from the character (--body, --shade, --acc, --acc2), so one
             drawing serves every one of them. -->
        <symbol id="tally-bean" viewBox="0 0 24 44">
          <ellipse cx="9" cy="42.4" rx="2.6" ry="1.5" fill="var(--shade)" />
          <ellipse cx="15" cy="42.4" rx="2.6" ry="1.5" fill="var(--shade)" />
          <ellipse cx="4.4" cy="28" rx="1.6" ry="3" fill="var(--shade)" />
          <ellipse cx="19.6" cy="28" rx="1.6" ry="3" fill="var(--shade)" />
          <rect x="5" y="12" width="14" height="30" rx="7" fill="var(--body)" />
          <ellipse cx="8.6" cy="17.6" rx="1.6" ry="3" fill="#fff" fill-opacity=".3" />
          <circle cx="9.6" cy="20.4" r="2.6" fill="#fff" />
          <circle cx="14.4" cy="20.4" r="2.6" fill="#fff" />
          <circle cx="10.1" cy="20.9" r="1.3" fill="#0B2A6B" />
          <circle cx="14.9" cy="20.9" r="1.3" fill="#0B2A6B" />
          <path d="M9.4 25.6q2.6 2.4 5.2 0" fill="none" stroke="#0B2A6B" stroke-width="1.2" stroke-linecap="round" />
        </symbol>

        <symbol id="tally-ball" viewBox="0 0 24 44">
          <ellipse cx="8.4" cy="42.6" rx="2.6" ry="1.4" fill="var(--shade)" />
          <ellipse cx="15.6" cy="42.6" rx="2.6" ry="1.4" fill="var(--shade)" />
          <ellipse cx="1.8" cy="33" rx="1.6" ry="2.6" fill="var(--shade)" />
          <ellipse cx="22.2" cy="33" rx="1.6" ry="2.6" fill="var(--shade)" />
          <circle cx="12" cy="31.5" r="10.5" fill="var(--body)" />
          <ellipse cx="7.6" cy="26" rx="1.8" ry="2.8" fill="#fff" fill-opacity=".3" />
          <circle cx="12" cy="29" r="4.4" fill="#fff" />
          <circle cx="12.7" cy="29.6" r="2.2" fill="#0B2A6B" />
          <circle cx="13.4" cy="28.8" r=".75" fill="#fff" />
          <path d="M10 35.6q2 1.7 4 0" fill="none" stroke="#0B2A6B" stroke-width="1.2" stroke-linecap="round" />
        </symbol>

        <symbol id="tally-tiny" viewBox="0 0 24 44">
          <ellipse cx="9.6" cy="42.9" rx="1.8" ry="1.1" fill="var(--shade)" />
          <ellipse cx="14.4" cy="42.9" rx="1.8" ry="1.1" fill="var(--shade)" />
          <circle cx="12" cy="37" r="6.2" fill="var(--body)" />
          <circle cx="10" cy="36" r="1.7" fill="#fff" />
          <circle cx="14" cy="36" r="1.7" fill="#fff" />
          <circle cx="10.3" cy="36.3" r=".9" fill="#0B2A6B" />
          <circle cx="14.3" cy="36.3" r=".9" fill="#0B2A6B" />
          <ellipse cx="8.2" cy="38.8" rx="1.2" ry=".7" fill="#FF8FA3" fill-opacity=".8" />
          <ellipse cx="15.8" cy="38.8" rx="1.2" ry=".7" fill="#FF8FA3" fill-opacity=".8" />
          <path d="M11 39.4q1 .9 2 0" fill="none" stroke="#0B2A6B" stroke-width=".9" stroke-linecap="round" />
        </symbol>

        <symbol id="tally-tall" viewBox="0 0 24 44">
          <ellipse cx="9.4" cy="42.5" rx="2.4" ry="1.4" fill="var(--shade)" />
          <ellipse cx="14.6" cy="42.5" rx="2.4" ry="1.4" fill="var(--shade)" />
          <rect x="3.8" y="19" width="2.2" height="13" rx="1.1" fill="var(--shade)" />
          <rect x="18" y="19" width="2.2" height="13" rx="1.1" fill="var(--shade)" />
          <rect x="6.5" y="5" width="11" height="37" rx="5.5" fill="var(--body)" />
          <ellipse cx="9.4" cy="10.6" rx="1.3" ry="2.6" fill="#fff" fill-opacity=".3" />
          <circle cx="10" cy="12.4" r="2" fill="#fff" />
          <circle cx="14" cy="12.4" r="2" fill="#fff" />
          <circle cx="10" cy="12.9" r="1" fill="#0B2A6B" />
          <circle cx="14" cy="12.9" r="1" fill="#0B2A6B" />
          <circle cx="12" cy="17.4" r="1" fill="#0B2A6B" />
        </symbol>

        <symbol id="tally-square" viewBox="0 0 24 44">
          <ellipse cx="8.6" cy="42.5" rx="2.6" ry="1.4" fill="var(--shade)" />
          <ellipse cx="15.4" cy="42.5" rx="2.6" ry="1.4" fill="var(--shade)" />
          <ellipse cx="3" cy="31" rx="1.5" ry="2.6" fill="var(--shade)" />
          <ellipse cx="21" cy="31" rx="1.5" ry="2.6" fill="var(--shade)" />
          <rect x="4" y="16" width="16" height="26" rx="5" fill="var(--body)" />
          <circle cx="9.3" cy="24" r="2.9" fill="#fff" stroke="#0B2A6B" stroke-width="1" />
          <circle cx="14.7" cy="24" r="2.9" fill="#fff" stroke="#0B2A6B" stroke-width="1" />
          <path d="M12.2 24h-.4" stroke="#0B2A6B" stroke-width="1" />
          <circle cx="9.6" cy="24.3" r="1.1" fill="#0B2A6B" />
          <circle cx="15" cy="24.3" r="1.1" fill="#0B2A6B" />
          <path d="M10 30.4h4" stroke="#0B2A6B" stroke-width="1.2" stroke-linecap="round" />
        </symbol>

        <symbol id="tally-pear" viewBox="0 0 24 44">
          <ellipse cx="8.6" cy="42.6" rx="2.6" ry="1.4" fill="var(--shade)" />
          <ellipse cx="15.4" cy="42.6" rx="2.6" ry="1.4" fill="var(--shade)" />
          <path d="M12 14c3.4 0 5 3.2 5.8 7.2.9 4.2 3.2 6.8 3.2 11.8 0 5.6-4 9-9 9s-9-3.4-9-9c0-5 2.3-7.6 3.2-11.8C7 17.2 8.6 14 12 14Z" fill="var(--body)" />
          <ellipse cx="9.4" cy="19.6" rx="1.2" ry="2.4" fill="#fff" fill-opacity=".3" />
          <circle cx="10.2" cy="23" r="2" fill="#fff" />
          <circle cx="13.8" cy="23" r="2" fill="#fff" />
          <circle cx="10.5" cy="23.4" r="1" fill="#0B2A6B" />
          <circle cx="14.1" cy="23.4" r="1" fill="#0B2A6B" />
          <ellipse cx="7.8" cy="27" rx="1.3" ry=".8" fill="#FF8FA3" fill-opacity=".8" />
          <ellipse cx="16.2" cy="27" rx="1.3" ry=".8" fill="#FF8FA3" fill-opacity=".8" />
          <path d="M9.6 27.6q2.4 2.4 4.8 0" fill="none" stroke="#0B2A6B" stroke-width="1.1" stroke-linecap="round" />
        </symbol>

        <!-- What sits on a head, drawn with the top of the head at (12, 10)
             and moved to each shape's own height (TOPS). -->
        <symbol id="tally-beanie" viewBox="0 0 24 44">
          <path d="M6.6 11.6c0-3.4 2.4-5.8 5.4-5.8s5.4 2.4 5.4 5.8Z" fill="var(--acc)" />
          <rect x="6" y="10.2" width="12" height="2.2" rx="1.1" fill="var(--acc2)" />
          <circle cx="12" cy="5.2" r="1.7" fill="var(--acc2)" />
        </symbol>
        <symbol id="tally-bow" viewBox="0 0 24 44">
          <path d="M14 10 9.6 7.2v5.6Zm0 0 4.4-2.8v5.6Z" fill="var(--acc)" />
          <circle cx="14" cy="10" r="1.3" fill="var(--acc2)" />
        </symbol>
        <symbol id="tally-sprout" viewBox="0 0 24 44">
          <path d="M12 11V6.4" stroke="#0B93AB" stroke-width="1.2" stroke-linecap="round" />
          <path d="M12 7.6c-1.2-2.4-3.6-2.8-4.8-2 .8 1.8 2.8 2.6 4.8 2Z" fill="#2BD4C0" />
          <path d="M12 7c1-2.2 3.2-2.8 4.4-2.1-.7 1.7-2.5 2.5-4.4 2.1Z" fill="#2BD4C0" />
        </symbol>
        <symbol id="tally-curl" viewBox="0 0 24 44">
          <path d="M11.6 10.8c-.2-2.6 2.6-3.4 3.2-1.6.4 1.3-1.3 1.8-1.6.8" fill="none" stroke="var(--shade)" stroke-width="1.4" stroke-linecap="round" />
        </symbol>
        <symbol id="tally-cap" viewBox="0 0 24 44">
          <path d="M7 11.4c0-3 2.2-5 5-5s5 2 5 5Z" fill="var(--acc)" />
          <rect x="12" y="10" width="7" height="1.8" rx=".9" fill="var(--acc2)" />
        </symbol>
        <symbol id="tally-antenna" viewBox="0 0 24 44">
          <path d="M12 11V5.8" stroke="var(--shade)" stroke-width="1.2" stroke-linecap="round" />
          <circle cx="12" cy="4.8" r="1.8" fill="var(--acc)" />
        </symbol>
      </defs>

      <g v-for="person in crowd" :key="person.i" class="seat" :style="placeStyle(person, layout.scale)">
        <g class="arrive" :style="arrival(person)">
          <g :class="person.move ? `move-${person.move}` : null" :style="person.move ? person.moveStyle : null">
            <use :href="`#tally-${person.shape}`" width="30" height="55" :style="person.vars" />
            <use v-if="person.hat" :href="`#tally-${person.hat}`" :y="person.hatY" width="30" height="55" :style="person.vars" />
          </g>
        </g>
      </g>

      <g v-for="person in leaving" :key="`gone-${person.id}`" :style="placeStyle(person, person.scale)">
        <g :class="person.all ? 'tumble' : 'float'" :style="{ animationDelay: `${person.delay}ms`, '--spin': person.spin }">
          <use :href="`#tally-${person.shape}`" width="30" height="55" :style="person.vars" />
          <use v-if="person.hat" :href="`#tally-${person.hat}`" :y="person.hatY" width="30" height="55" :style="person.vars" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Everything here turns and squashes about its feet. */
.arrive,
[class^='move-'],
.float,
.tumble {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

/* Re-fitting the room as it fills slides everyone into their new place. */
.seat {
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
}

/* Dropped in from where the tap landed: falls, lands with a squash, and
   springs back up to its own shape. */
.arrive {
  animation: arrive 0.6s backwards;
}

@keyframes arrive {
  0% {
    transform: translate(var(--dx), var(--dy)) scale(var(--s0, 1));
    opacity: 0;
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  20% {
    opacity: 1;
  }
  62% {
    transform: translate(0, 0) scale(1.18, 0.8);
    animation-timing-function: ease-out;
  }
  80% {
    transform: translate(0, 0) scale(0.92, 1.1);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

/* Idling, each in its own time. */
.move-bob {
  animation: bob ease-in-out infinite;
}
@keyframes bob {
  0%,
  100% {
    transform: translateY(0) scale(1.04, 0.96);
  }
  50% {
    transform: translateY(-3px) scale(0.98, 1.03);
  }
}

.move-wiggle {
  animation: wiggle ease-in-out infinite;
}
@keyframes wiggle {
  0%,
  100% {
    transform: rotate(-6deg);
  }
  50% {
    transform: rotate(6deg);
  }
}

/* Mostly still, then a little jump. */
.move-hop {
  animation: hop ease-out infinite;
}
@keyframes hop {
  0%,
  70%,
  100% {
    transform: translateY(0) scale(1);
  }
  76% {
    transform: translateY(0) scale(1.1, 0.88);
  }
  86% {
    transform: translateY(-7px) scale(0.94, 1.08);
  }
  94% {
    transform: translateY(0) scale(1.06, 0.94);
  }
}

.move-sway {
  animation: sway ease-in-out infinite;
}
@keyframes sway {
  0%,
  100% {
    transform: translateX(-1.5px) skewX(4deg);
  }
  50% {
    transform: translateX(1.5px) skewX(-4deg);
  }
}

/* One fewer: the last one counted floats up and away with a turn. */
.float {
  animation: float 0.7s ease-out forwards;
}
@keyframes float {
  to {
    transform: translateY(-46px) rotate(var(--spin)) scale(0.7);
    opacity: 0;
  }
}

/* Starting again: everyone tumbles out of the room. */
.tumble {
  animation: tumble 0.7s cubic-bezier(0.5, 0, 0.9, 0.5) forwards;
}
@keyframes tumble {
  to {
    transform: translateY(140px) rotate(var(--spin));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seat {
    transition: none;
  }
  .arrive,
  [class^='move-'],
  .float,
  .tumble {
    animation: none;
  }
  .float,
  .tumble {
    opacity: 0;
  }
}
</style>

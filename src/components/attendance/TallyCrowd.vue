<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// The room filling up behind the clicker's count (AttendanceTally): one person
// for every tap, dropped from where the finger landed into a crowd that piles
// up from the floor. Men, women, boys, girls, toddlers, grandparents - a
// church is all of them, and a row of identical pins read as a queue.
//
// Each person is fixed by their place in the count, not drawn at random each
// time, so the crowd looks the same when the screen is opened again and the
// thirtieth person is always the same grandmother. The room shrinks everyone
// to fit as it fills, so the last of a hundred and fifty still lands on screen.
//
// Drawn in the app artwork's palette (BRAND.md, the app artwork's palette):
// these are illustration, like the app icons, not interface colours, so they
// do not follow the church's accent.

const props = defineProps({
  count: { type: Number, default: 0 },
  /** Where the last tap landed, in the box's own pixels, for the newest to drop from. */
  tapAt: { type: Object, default: null },
})

/* ---------------------------------------------------------------- the people */

const SKIN = ['#F6D3B8', '#EBB894', '#D39B72', '#B07650', '#8A5638', '#5E3A26']
const HAIR = ['#1F1A17', '#3B2A20', '#5C3B24', '#8A5A2B', '#1F1A17', '#2B2420']
const GREY = ['#D5D9E0', '#E9EBEF', '#B9BFC9']
// The app artwork's ramp: orange, blue, teal and navy, light to deep.
const CLOTHES = ['#FFB21E', '#FF7417', '#EC4319', '#3D9DFF', '#1467E8', '#0A4FC4', '#2BD4C0', '#0B93AB', '#0B2A6B', '#8E9CB3']

// How often each turns up: a congregation is mostly grown-ups, with children
// and the elderly among them.
const KINDS = [
  ['man', 3],
  ['woman', 3],
  ['boy', 2],
  ['girl', 2],
  ['toddler', 1],
  ['grandpa', 1],
  ['grandma', 1],
]
const BAG = KINDS.flatMap(([kind, n]) => Array(n).fill(kind))

// A small seeded random, so a place in the count is always the same person.
const rand = (n) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
const pick = (list, n) => list[Math.floor(rand(n) * list.length)]

const personOf = (i) => {
  const kind = pick(BAG, i * 7 + 1)
  const old = kind === 'grandpa' || kind === 'grandma'
  let top = pick(CLOTHES, i * 7 + 2)
  let bottom = pick(CLOTHES, i * 7 + 3)
  if (bottom === top) bottom = CLOTHES[(CLOTHES.indexOf(top) + 4) % CLOTHES.length]
  return {
    kind,
    vars: {
      '--skin': pick(SKIN, i * 7 + 4),
      '--hair': old ? pick(GREY, i * 7 + 5) : pick(HAIR, i * 7 + 5),
      '--top': top,
      '--bottom': bottom,
      '--cane': '#0B2A6B',
    },
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

// A person is 24 by 44 at full size, shown a little larger. Each row stands
// a little more than a head and shoulders behind the one in front, so the
// back rows show as faces over the front row's shoulders.
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
// a moved person would drop into the room all over again. Past fifteen
// hundred the room is full enough; the count still goes on.
const SHOWN = 1500
const crowd = computed(() => {
  if (!width.value || !height.value) return []
  const g = layout.value
  const n = Math.min(props.count, SHOWN)
  const people = []
  for (let i = n - 1; i >= 0; i--) people.push({ i, ...place(i, g), ...personOf(i) })
  return people
})

/* -------------------------------------------------------- arriving and leaving */

// The people already counted when the screen opens file in quickly, a few
// at a time; anyone counted after drops from where the tap landed.
const opened = props.count
const arrival = (person) => {
  if (person.i < opened) return { '--dx': '0px', '--dy': '-40px', animationDelay: `${Math.min(person.i * 12, 700)}ms` }
  const from = props.tapAt
  if (!from || person.i !== props.count - 1) return { '--dx': '0px', '--dy': '-60px' }
  // In the person's own scaled space, so divided back out of it.
  const { scale, w, h } = layout.value
  return {
    '--dx': `${(from.x - person.x - w / 2) / scale}px`,
    '--dy': `${(from.y - person.y - h / 2) / scale}px`,
    '--s0': Math.min(2, 1 / scale),
  }
}

// Who is on their way out: the one taken back, or everyone when the count
// starts again.
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
      gone.push({ id: nextLeave++, ...place(i, g), ...personOf(i), scale: g.scale, all: now === 0, delay: now === 0 ? rand(i) * 250 : 0 })
    }
    leaving.value = [...leaving.value, ...gone]
    const ids = new Set(gone.map((p) => p.id))
    const timer = setTimeout(() => {
      leaving.value = leaving.value.filter((p) => !ids.has(p.id))
      timers.delete(timer)
    }, 900)
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
        <!-- Every person is 24 wide and stands with their feet at 44; the
             children are shorter inside the same box, so a row lines up on
             the floor. The colours come from the person (--skin, --hair,
             --top, --bottom), so one drawing serves every one of them. -->
        <symbol id="tally-man" viewBox="0 0 24 44">
          <rect x="7.6" y="26" width="3.9" height="17.5" rx="1.6" fill="var(--bottom)" />
          <rect x="12.5" y="26" width="3.9" height="17.5" rx="1.6" fill="var(--bottom)" />
          <rect x="4" y="13" width="3.4" height="13" rx="1.7" fill="var(--top)" />
          <rect x="16.6" y="13" width="3.4" height="13" rx="1.7" fill="var(--top)" />
          <rect x="6.4" y="12" width="11.2" height="16" rx="3.6" fill="var(--top)" />
          <circle cx="5.7" cy="26.6" r="1.6" fill="var(--skin)" />
          <circle cx="18.3" cy="26.6" r="1.6" fill="var(--skin)" />
          <circle cx="12" cy="7.2" r="4.6" fill="var(--skin)" />
          <path d="M7.4 6.6C7.4 3.4 9.6 1.8 12 1.8s4.6 1.6 4.6 4.8C15.2 5.3 13.6 4.7 12 4.7S8.8 5.3 7.4 6.6Z" fill="var(--hair)" />
        </symbol>

        <symbol id="tally-woman" viewBox="0 0 24 44">
          <path d="M6.6 8.2C6.6 4.2 9 2 12 2s5.4 2.2 5.4 6.2v9H6.6Z" fill="var(--hair)" />
          <rect x="8.8" y="32" width="2.6" height="11.5" rx="1.3" fill="var(--skin)" />
          <rect x="12.6" y="32" width="2.6" height="11.5" rx="1.3" fill="var(--skin)" />
          <rect x="4.4" y="13.5" width="3" height="12" rx="1.5" fill="var(--skin)" />
          <rect x="16.6" y="13.5" width="3" height="12" rx="1.5" fill="var(--skin)" />
          <path d="M8.2 12h7.6c1 0 1.6.6 1.8 1.6L20.4 33H3.6l2.8-19.4c.2-1 .8-1.6 1.8-1.6Z" fill="var(--top)" />
          <circle cx="12" cy="7.6" r="4.4" fill="var(--skin)" />
          <path d="M7.6 7.4C8 4.4 9.8 2.8 12 2.8s4 1.6 4.4 4.6C14.8 6.2 13.5 5.6 12 5.6S9.2 6.2 7.6 7.4Z" fill="var(--hair)" />
        </symbol>

        <symbol id="tally-boy" viewBox="0 0 24 44">
          <rect x="8.6" y="36" width="2.8" height="7.6" rx="1.4" fill="var(--skin)" />
          <rect x="12.6" y="36" width="2.8" height="7.6" rx="1.4" fill="var(--skin)" />
          <rect x="7.8" y="31.6" width="8.4" height="6.2" rx="1.6" fill="var(--bottom)" />
          <rect x="5.2" y="23" width="2.8" height="9" rx="1.4" fill="var(--top)" />
          <rect x="16" y="23" width="2.8" height="9" rx="1.4" fill="var(--top)" />
          <rect x="7.6" y="22" width="8.8" height="11" rx="3" fill="var(--top)" />
          <circle cx="12" cy="17.6" r="3.9" fill="var(--skin)" />
          <path d="M8.1 17.1c0-2.7 1.7-4.3 3.9-4.3s3.9 1.6 3.9 4.3Z" fill="var(--bottom)" />
          <rect x="11" y="15.9" width="6.8" height="1.7" rx=".85" fill="var(--bottom)" />
        </symbol>

        <symbol id="tally-girl" viewBox="0 0 24 44">
          <circle cx="7.3" cy="18.6" r="2.2" fill="var(--hair)" />
          <circle cx="16.7" cy="18.6" r="2.2" fill="var(--hair)" />
          <circle cx="12" cy="18" r="4.1" fill="var(--hair)" />
          <rect x="9.2" y="36" width="2.4" height="7.6" rx="1.2" fill="var(--skin)" />
          <rect x="12.4" y="36" width="2.4" height="7.6" rx="1.2" fill="var(--skin)" />
          <rect x="6" y="24" width="2.4" height="8" rx="1.2" fill="var(--skin)" />
          <rect x="15.6" y="24" width="2.4" height="8" rx="1.2" fill="var(--skin)" />
          <path d="M9.6 23h4.8c.8 0 1.3.4 1.5 1.2l2.4 12.4H5.7l2.4-12.4c.2-.8.7-1.2 1.5-1.2Z" fill="var(--top)" />
          <circle cx="12" cy="18.8" r="3.5" fill="var(--skin)" />
          <path d="M8.6 18.2c.3-2.2 1.6-3.5 3.4-3.5s3.1 1.3 3.4 3.5c-1.1-.8-2.2-1.2-3.4-1.2s-2.3.4-3.4 1.2Z" fill="var(--hair)" />
        </symbol>

        <symbol id="tally-toddler" viewBox="0 0 24 44">
          <rect x="9" y="38.4" width="2.5" height="5.2" rx="1.25" fill="var(--skin)" />
          <rect x="12.5" y="38.4" width="2.5" height="5.2" rx="1.25" fill="var(--skin)" />
          <rect x="6.4" y="33" width="2.4" height="5.6" rx="1.2" fill="var(--skin)" />
          <rect x="15.2" y="33" width="2.4" height="5.6" rx="1.2" fill="var(--skin)" />
          <rect x="8.2" y="31.8" width="7.6" height="8.4" rx="3.6" fill="var(--top)" />
          <circle cx="12" cy="27.6" r="4.5" fill="var(--skin)" />
          <path d="M11 23.4c.7-1.1 2-1.3 2.7-.4-.9 0-1.5.3-1.8 1Z" fill="var(--hair)" />
        </symbol>

        <symbol id="tally-grandpa" viewBox="0 0 24 44">
          <rect x="19.6" y="24" width="1.3" height="19.6" rx=".65" fill="var(--cane)" />
          <rect x="7.8" y="27" width="3.8" height="16.6" rx="1.6" fill="var(--bottom)" />
          <rect x="12.4" y="27" width="3.8" height="16.6" rx="1.6" fill="var(--bottom)" />
          <rect x="4.2" y="13.5" width="3.2" height="12.5" rx="1.6" fill="var(--top)" />
          <rect x="16.6" y="13.5" width="3.2" height="11" rx="1.6" fill="var(--top)" />
          <rect x="6.5" y="12.4" width="11" height="16" rx="3.6" fill="var(--top)" />
          <rect x="11.6" y="13" width=".8" height="15" fill="#000" fill-opacity=".14" />
          <circle cx="5.8" cy="26.4" r="1.5" fill="var(--skin)" />
          <circle cx="19.9" cy="24.4" r="1.6" fill="var(--skin)" />
          <circle cx="12" cy="7.4" r="4.5" fill="var(--skin)" />
          <ellipse cx="7.8" cy="7.6" rx="1.2" ry="2" fill="var(--hair)" />
          <ellipse cx="16.2" cy="7.6" rx="1.2" ry="2" fill="var(--hair)" />
        </symbol>

        <symbol id="tally-grandma" viewBox="0 0 24 44">
          <rect x="19.2" y="26" width="1.3" height="17.6" rx=".65" fill="var(--cane)" />
          <circle cx="12" cy="2.6" r="2.4" fill="var(--hair)" />
          <rect x="9" y="35" width="2.4" height="8.6" rx="1.2" fill="var(--skin)" />
          <rect x="12.6" y="35" width="2.4" height="8.6" rx="1.2" fill="var(--skin)" />
          <rect x="5.4" y="14.5" width="2.6" height="11" rx="1.3" fill="var(--skin)" />
          <rect x="16" y="14.5" width="2.6" height="11" rx="1.3" fill="var(--skin)" />
          <path d="M8.4 13h7.2c.9 0 1.5.5 1.7 1.4L19.2 35H4.8l1.9-20.6c.2-.9.8-1.4 1.7-1.4Z" fill="var(--top)" />
          <path d="M7.2 13h9.6l-1.6 6.2H8.8Z" fill="var(--bottom)" />
          <circle cx="19.8" cy="26" r="1.5" fill="var(--skin)" />
          <circle cx="12" cy="8" r="4.3" fill="var(--skin)" />
          <path d="M7.5 7.6c0-3.1 2-4.9 4.5-4.9s4.5 1.8 4.5 4.9C15.1 6.3 13.6 5.7 12 5.7S8.9 6.3 7.5 7.6Z" fill="var(--hair)" />
        </symbol>
      </defs>

      <g v-for="person in crowd" :key="person.i" class="seat" :style="placeStyle(person, layout.scale)">
        <g class="arrive" :style="arrival(person)">
          <use :href="`#tally-${person.kind}`" width="30" height="55" :style="person.vars" />
        </g>
      </g>

      <g v-for="person in leaving" :key="`gone-${person.id}`" :style="placeStyle(person, person.scale)">
        <g :class="person.all ? 'fall' : 'lift'" :style="{ animationDelay: `${person.delay}ms` }">
          <use :href="`#tally-${person.kind}`" width="30" height="55" :style="person.vars" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Re-fitting the room as it fills slides everyone into their new place. */
.seat {
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
}

/* Dropped in from where the tap landed, landing with a small settle. */
.arrive {
  animation: arrive 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.15) backwards;
}

@keyframes arrive {
  0% {
    transform: translate(var(--dx), var(--dy)) scale(var(--s0, 1));
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}

/* One fewer: the last one counted rises and fades. */
.lift {
  animation: lift 0.6s ease-out forwards;
}

@keyframes lift {
  to {
    transform: translateY(-36px);
    opacity: 0;
  }
}

/* Starting again: everyone drops out of the room. */
.fall {
  animation: fall 0.6s cubic-bezier(0.5, 0, 0.9, 0.5) forwards;
}

@keyframes fall {
  to {
    transform: translateY(120px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seat {
    transition: none;
  }
  .arrive,
  .lift,
  .fall {
    animation: none;
  }
  .lift,
  .fall {
    opacity: 0;
  }
}
</style>

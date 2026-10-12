<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// The room filling up behind the clicker's count (AttendanceTally): one person
// for every tap, dropped from where the finger landed into a crowd that piles
// up from the floor.
//
// Silhouettes of a congregation: tall and short, broad and slight, men and
// women, toddlers, children, a teen with a backpack, grandparents with a cane
// or a handbag, someone in a wheelchair - and people in the middle of
// something: waving, hands raised, carrying a baby, on the phone, reading,
// under an umbrella, the worker still in a hard hat, the guitarist. Once
// landed each bobs, sways or shifts on their feet in their own time - the one
// place in Ekkly that idles, because it was asked for, and still for anyone
// who turns motion down.
//
// Each person is fixed by their place in the count, not drawn at random each
// time, so the crowd looks the same when the screen is opened again. The room
// shrinks everyone to fit as it fills, so the last of a hundred and fifty
// still lands on screen.

const props = defineProps({
  count: { type: Number, default: 0 },
  /** Where the last tap landed, in the box's own pixels, for the newest to drop from. */
  tapAt: { type: Object, default: null },
})

/* --------------------------------------------------------------- the people */

// Each silhouette is one flat shade of the church's own colour, mixed toward
// black or white, so the crowd belongs to whichever church is counting and
// still reads as many people rather than one stamp repeated.
const SHADES = [
  'var(--color-primary)',
  'color-mix(in srgb, var(--color-primary) 82%, black)',
  'color-mix(in srgb, var(--color-primary) 66%, black)',
  'color-mix(in srgb, var(--color-primary) 52%, black)',
  'color-mix(in srgb, var(--color-primary) 78%, white)',
  'color-mix(in srgb, var(--color-primary) 60%, white)',
  'color-mix(in srgb, var(--color-primary) 46%, white)',
]

// Who comes in, and how often: mostly grown-ups standing about, with
// children, the elderly, and people mid-something among them.
const KINDS = [
  ['man', 3],
  ['woman', 3],
  ['tall', 2],
  ['broad', 2],
  ['ponytail', 2],
  ['grandpa', 1],
  ['grandma', 1],
  ['teen', 2],
  ['boy', 2],
  ['girl', 2],
  ['toddler', 1],
  ['carrying', 1],
  ['waving', 1],
  ['praising', 1],
  ['guitar', 1],
  ['worker', 1],
  ['reading', 1],
  ['phone', 1],
  ['umbrella', 1],
  ['wheelchair', 1],
]
const BAG = KINDS.flatMap(([kind, n]) => Array(n).fill(kind))
// The wheelchair stays put rather than hopping.
const STILL = new Set(['wheelchair'])
const MOVES = ['bob', 'sway', 'hop', 'shift']

// A small seeded random, so a place in the count is always the same person.
const rand = (n) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
const pick = (list, n) => list[Math.floor(rand(n) * list.length)]

// Idling costs a little on every frame, so past this many only a share of the
// crowd moves - enough that the room still looks alive.
const MOVING = 90

const personOf = (i, count) => {
  const kind = pick(BAG, i * 7 + 1)
  const length = 1.2 + rand(i * 7 + 5) * 1.4
  const moves = !STILL.has(kind) && (count <= MOVING || rand(i * 7 + 6) < MOVING / count)
  return {
    kind,
    move: moves ? pick(MOVES, i * 7 + 6) : '',
    moveStyle: { animationDuration: `${length.toFixed(2)}s`, animationDelay: `-${(rand(i * 7 + 7) * length).toFixed(2)}s` },
    // Mirrored half the time, so the wavers and the carriers face both ways.
    flip: rand(i * 7 + 8) < 0.5,
    vars: { '--fill': pick(SHADES, i * 7 + 2) },
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

// A person is 24 by 44 at full size, shown a little larger. Each row stands a
// little more than a head and shoulders behind the one in front, so the back
// rows show over the front row's shoulders.
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
  for (let i = n - 1; i >= 0; i--) people.push({ i, ...place(i, g), ...personOf(i, n) })
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
  // In the person's own scaled space, so divided back out of it.
  const { scale, w, h } = layout.value
  return {
    '--dx': `${(from.x - person.x - w / 2) / scale}px`,
    '--dy': `${(from.y - person.y - h / 2) / scale}px`,
    '--s0': Math.min(2, 1 / scale),
  }
}

// Who is on their way out: the one taken back, who floats off, or everyone
// when the count starts again, who drop out of the room.
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
        ...personOf(i, before),
        scale: g.scale,
        all: now === 0,
        delay: now === 0 ? rand(i) * 250 : 0,
        spin: `${Math.round((rand(i + 5) - 0.5) * 60)}deg`,
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
// Facing the other way: mirrored across the person's own width.
const MIRROR = 'matrix(-1 0 0 1 30 0)'
</script>

<template>
  <div ref="box" class="pointer-events-none absolute inset-0" aria-hidden="true">
    <!-- Stood on the floor of the box rather than hung from its top: should
         the box change height before it is measured again, everyone still
         stands on the floor and only the back rows' heads are in question. -->
    <svg v-if="width && height" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="absolute bottom-0 left-0 overflow-visible">
      <defs>
        <!-- Every person is 24 wide and stands with their feet at 44, so a row
             lines up on the floor whatever their height. Each is one flat
             shade (--fill): the shapes overlap into a single silhouette. -->
        <symbol id="tally-man" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="6" r="3.3" />
            <rect x="10.8" y="8.4" width="2.4" height="3" />
            <rect x="7.2" y="10.4" width="9.6" height="15" rx="3" />
            <rect x="5" y="11" width="2.8" height="13" rx="1.4" />
            <rect x="16.2" y="11" width="2.8" height="13" rx="1.4" />
            <rect x="7.8" y="23" width="3.8" height="21" rx="1.6" />
            <rect x="12.4" y="23" width="3.8" height="21" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-woman" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <rect x="8.6" y="4.4" width="6.8" height="9" rx="3.4" />
            <circle cx="12" cy="6.8" r="3.1" />
            <path d="M9.2 10.8h5.6c.9 0 1.5.6 1.7 1.4L19.4 31H4.6l2.9-18.8c.2-.8.8-1.4 1.7-1.4Z" />
            <rect x="5.4" y="11.6" width="2.4" height="11" rx="1.2" />
            <rect x="16.2" y="11.6" width="2.4" height="11" rx="1.2" />
            <rect x="8.8" y="30" width="2.6" height="14" rx="1.3" />
            <rect x="12.6" y="30" width="2.6" height="14" rx="1.3" />
          </g>
        </symbol>

        <symbol id="tally-tall" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="3.6" r="3" />
            <rect x="11" y="5.6" width="2" height="3" />
            <rect x="8" y="7.8" width="8" height="16.4" rx="2.6" />
            <rect x="5.8" y="8.4" width="2.4" height="14.6" rx="1.2" />
            <rect x="15.8" y="8.4" width="2.4" height="14.6" rx="1.2" />
            <rect x="8.4" y="22" width="3.2" height="22" rx="1.4" />
            <rect x="12.4" y="22" width="3.2" height="22" rx="1.4" />
          </g>
        </symbol>

        <symbol id="tally-broad" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="7.4" r="3.4" />
            <rect x="5.6" y="11.2" width="12.8" height="15.6" rx="6" />
            <rect x="3.2" y="12.4" width="2.9" height="12" rx="1.45" />
            <rect x="17.9" y="12.4" width="2.9" height="12" rx="1.45" />
            <rect x="7.4" y="25" width="4.4" height="19" rx="1.8" />
            <rect x="12.2" y="25" width="4.4" height="19" rx="1.8" />
          </g>
        </symbol>

        <symbol id="tally-ponytail" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <ellipse cx="15.4" cy="8.2" rx="1.5" ry="3.4" transform="rotate(-18 15.4 8.2)" />
            <circle cx="12" cy="6.4" r="3.1" />
            <rect x="11" y="8.6" width="2" height="2.6" />
            <rect x="7.8" y="10.6" width="8.4" height="14" rx="3" />
            <rect x="5.6" y="11.2" width="2.4" height="12" rx="1.2" />
            <rect x="16" y="11.2" width="2.4" height="12" rx="1.2" />
            <rect x="8.2" y="23" width="3.4" height="21" rx="1.5" />
            <rect x="12.4" y="23" width="3.4" height="21" rx="1.5" />
          </g>
        </symbol>

        <symbol id="tally-grandpa" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <rect x="7.4" y="4.6" width="7" height="2" rx="1" />
            <circle cx="10.9" cy="8.2" r="3.1" />
            <rect x="7" y="11.6" width="9" height="14.4" rx="3" transform="rotate(8 11.5 18.8)" />
            <rect x="13.8" y="12.6" width="2.6" height="11.4" rx="1.3" transform="rotate(-24 15 13)" />
            <rect x="19" y="22" width="1.4" height="22" rx=".7" />
            <rect x="8.2" y="24.6" width="3.6" height="19.4" rx="1.6" />
            <rect x="12.4" y="24.6" width="3.6" height="19.4" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-grandma" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="4.4" r="1.9" />
            <circle cx="12" cy="8" r="3.1" />
            <path d="M9.4 11.6h5.2c.9 0 1.5.6 1.7 1.4L19 33H5l2.7-20c.2-.8.8-1.4 1.7-1.4Z" />
            <rect x="5.4" y="12.4" width="2.4" height="10.4" rx="1.2" />
            <rect x="16.2" y="12.4" width="2.4" height="9.6" rx="1.2" />
            <rect x="16.4" y="21.4" width="5" height="4" rx="1" />
            <path d="M17.6 21.6a1.3 1.3 0 0 1 2.6 0" fill="none" stroke="var(--fill)" stroke-width="1" />
            <rect x="9" y="32" width="2.5" height="12" rx="1.25" />
            <rect x="12.5" y="32" width="2.5" height="12" rx="1.25" />
          </g>
        </symbol>

        <symbol id="tally-teen" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <rect x="4.4" y="12.6" width="4.6" height="9.4" rx="1.8" />
            <circle cx="12" cy="8.2" r="3" />
            <rect x="11" y="10.4" width="2" height="2.4" />
            <rect x="7.8" y="12" width="8.4" height="13.4" rx="2.8" />
            <rect x="15.8" y="12.6" width="2.4" height="11.4" rx="1.2" />
            <rect x="8.2" y="24" width="3.4" height="20" rx="1.5" />
            <rect x="12.4" y="24" width="3.4" height="20" rx="1.5" />
          </g>
        </symbol>

        <symbol id="tally-boy" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <path d="M9.2 19.4a2.8 2.8 0 0 1 5.6 0Z" />
            <rect x="12" y="18.6" width="4.6" height="1.2" rx=".6" />
            <circle cx="12" cy="20" r="2.7" />
            <rect x="8.6" y="23" width="6.8" height="10" rx="2.4" />
            <rect x="6.6" y="23.4" width="2.2" height="8.4" rx="1.1" />
            <rect x="15.2" y="23.4" width="2.2" height="8.4" rx="1.1" />
            <rect x="9" y="32" width="2.8" height="12" rx="1.3" />
            <rect x="12.2" y="32" width="2.8" height="12" rx="1.3" />
          </g>
        </symbol>

        <symbol id="tally-girl" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="8.8" cy="20" r="1.4" />
            <circle cx="15.2" cy="20" r="1.4" />
            <circle cx="12" cy="20.4" r="2.7" />
            <path d="M10.2 23.2h3.6c.6 0 1 .3 1.2.9L17.4 34H6.6l2.4-9.9c.2-.6.6-.9 1.2-.9Z" />
            <rect x="7.2" y="23.6" width="2" height="7.6" rx="1" />
            <rect x="14.8" y="23.6" width="2" height="7.6" rx="1" />
            <rect x="9.6" y="33" width="2.2" height="11" rx="1.1" />
            <rect x="12.2" y="33" width="2.2" height="11" rx="1.1" />
          </g>
        </symbol>

        <symbol id="tally-toddler" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="31.6" r="2.6" />
            <rect x="9.4" y="34.2" width="5.2" height="5.8" rx="2.2" />
            <rect x="14" y="29.6" width="1.7" height="5.4" rx=".85" transform="rotate(28 14.8 34.6)" />
            <rect x="7.6" y="34.6" width="1.7" height="4.4" rx=".85" />
            <rect x="9.8" y="39" width="2" height="5" rx="1" />
            <rect x="12.2" y="39" width="2" height="5" rx="1" />
          </g>
        </symbol>

        <symbol id="tally-carrying" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="11" cy="6" r="3.3" />
            <rect x="9.8" y="8.4" width="2.4" height="3" />
            <rect x="6.2" y="10.4" width="9.6" height="15" rx="3" />
            <rect x="4" y="11" width="2.8" height="13" rx="1.4" />
            <circle cx="18.2" cy="12.6" r="2.2" />
            <rect x="15.4" y="14.4" width="5.6" height="6.4" rx="2.6" />
            <rect x="13.4" y="18.6" width="7.6" height="2.6" rx="1.3" />
            <rect x="6.8" y="23" width="3.8" height="21" rx="1.6" />
            <rect x="11.4" y="23" width="3.8" height="21" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-waving" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="11" cy="7" r="3.3" />
            <rect x="9.8" y="9.4" width="2.4" height="3" />
            <rect x="6.2" y="11.4" width="9.6" height="14.6" rx="3" />
            <rect x="4" y="12" width="2.8" height="12.4" rx="1.4" />
            <rect x="15" y="1.6" width="2.6" height="11" rx="1.3" transform="rotate(22 16.3 12)" />
            <circle cx="19.4" cy="2.8" r="1.7" />
            <rect x="6.8" y="24" width="3.8" height="20" rx="1.6" />
            <rect x="11.4" y="24" width="3.8" height="20" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-praising" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="9" r="3.2" />
            <rect x="10.8" y="11.4" width="2.4" height="2.6" />
            <rect x="7.4" y="13.2" width="9.2" height="13.6" rx="3" />
            <rect x="6.2" y="3" width="2.4" height="11.4" rx="1.2" transform="rotate(-16 7.4 14)" />
            <rect x="15.4" y="3" width="2.4" height="11.4" rx="1.2" transform="rotate(16 16.6 14)" />
            <rect x="8" y="25" width="3.6" height="19" rx="1.6" />
            <rect x="12.4" y="25" width="3.6" height="19" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-guitar" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="11" cy="6" r="3.3" />
            <rect x="9.8" y="8.4" width="2.4" height="3" />
            <rect x="6.2" y="10.4" width="9.6" height="15" rx="3" />
            <rect x="4" y="11" width="2.8" height="12" rx="1.4" />
            <ellipse cx="9" cy="22.4" rx="5" ry="3.8" transform="rotate(-28 9 22.4)" />
            <rect x="12" y="12" width="1.6" height="12" rx=".8" transform="rotate(52 12.8 18)" />
            <rect x="19.6" y="11.6" width="2.6" height="1.8" rx=".6" transform="rotate(-38 20.9 12.5)" />
            <rect x="6.8" y="23" width="3.8" height="21" rx="1.6" />
            <rect x="11.4" y="23" width="3.8" height="21" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-worker" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <path d="M7.6 5.6a4.4 4.4 0 0 1 8.8 0Z" />
            <rect x="6.6" y="5" width="10.8" height="1.5" rx=".75" />
            <circle cx="12" cy="7" r="3" />
            <rect x="10.8" y="9" width="2.4" height="2.6" />
            <rect x="7.2" y="10.8" width="9.6" height="14.6" rx="3" />
            <rect x="5" y="11.4" width="2.8" height="12.6" rx="1.4" />
            <rect x="16.2" y="11.4" width="2.8" height="12" rx="1.4" />
            <rect x="15.2" y="24" width="6.4" height="4.2" rx=".8" />
            <path d="M16.8 24.2v-1.4h3.2v1.4" fill="none" stroke="var(--fill)" stroke-width=".9" />
            <rect x="7.8" y="23" width="3.8" height="21" rx="1.6" />
            <rect x="12.4" y="23" width="3.8" height="21" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-reading" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <rect x="8.4" y="5.4" width="6.6" height="8.4" rx="3.3" />
            <circle cx="11.8" cy="7.6" r="3.1" />
            <path d="M9.2 11.6h5.6c.9 0 1.5.6 1.7 1.4L19.4 31.4H4.6l2.9-18.4c.2-.8.8-1.4 1.7-1.4Z" />
            <rect x="13.6" y="13.6" width="2.4" height="7" rx="1.2" transform="rotate(-60 14.8 14)" />
            <path d="M15.4 13.4l3.2-.8 3 .8v4.6l-3-.8-3.2.8Z" />
            <rect x="5.4" y="12.4" width="2.4" height="10.4" rx="1.2" />
            <rect x="8.8" y="30.4" width="2.6" height="13.6" rx="1.3" />
            <rect x="12.6" y="30.4" width="2.6" height="13.6" rx="1.3" />
          </g>
        </symbol>

        <symbol id="tally-phone" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="12" cy="6" r="3.3" />
            <rect x="10.8" y="8.4" width="2.4" height="3" />
            <rect x="7.2" y="10.4" width="9.6" height="15" rx="3" />
            <rect x="5" y="11" width="2.8" height="13" rx="1.4" />
            <rect x="15.4" y="4.6" width="2.6" height="8" rx="1.3" transform="rotate(-14 16.7 11.6)" />
            <rect x="14.6" y="3.4" width="2" height="3.6" rx=".6" />
            <rect x="7.8" y="23" width="3.8" height="21" rx="1.6" />
            <rect x="12.4" y="23" width="3.8" height="21" rx="1.6" />
          </g>
        </symbol>

        <symbol id="tally-umbrella" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <path d="M2.4 6.6a9.6 5.8 0 0 1 19.2 0c-1-.8-2.2-.8-3.2 0-1-.8-2.2-.8-3.2 0-1-.8-2.2-.8-3.2 0-1-.8-2.2-.8-3.2 0-1-.8-2.2-.8-3.2 0-1-.8-2.2-.8-3.2 0Z" />
            <rect x="11.4" y="1" width="1.2" height="16" rx=".6" />
            <circle cx="10.6" cy="11" r="3" />
            <rect x="9.4" y="13.2" width="2.4" height="2.6" />
            <rect x="6.2" y="15" width="9.2" height="13.4" rx="3" />
            <rect x="12.6" y="14.6" width="2.4" height="5" rx="1.2" transform="rotate(-50 13.8 17)" />
            <rect x="4" y="15.6" width="2.6" height="11" rx="1.3" />
            <rect x="6.8" y="27" width="3.6" height="17" rx="1.5" />
            <rect x="11.2" y="27" width="3.6" height="17" rx="1.5" />
          </g>
        </symbol>

        <symbol id="tally-wheelchair" viewBox="0 0 24 44">
          <g fill="var(--fill)">
            <circle cx="11.2" cy="15.4" r="3" />
            <rect x="8.6" y="18.6" width="6.4" height="10" rx="2.6" />
            <rect x="12.6" y="19.4" width="2.4" height="8" rx="1.2" transform="rotate(-30 13.8 19.6)" />
            <rect x="8.6" y="26.4" width="9.6" height="3" rx="1.4" />
            <rect x="15.6" y="27.4" width="2.6" height="9.6" rx="1.2" />
            <rect x="15.4" y="36" width="4.4" height="1.8" rx=".9" />
            <rect x="6.4" y="19" width="1.6" height="12.6" rx=".8" />
            <circle cx="10.2" cy="36.6" r="6.6" fill="none" stroke="var(--fill)" stroke-width="1.6" />
            <circle cx="10.2" cy="36.6" r="1.2" />
            <circle cx="19.2" cy="41.8" r="1.8" />
          </g>
        </symbol>
      </defs>

      <g v-for="person in crowd" :key="person.i" class="seat" :style="placeStyle(person, layout.scale)">
        <g class="arrive" :style="arrival(person)">
          <g :class="person.move ? `move-${person.move}` : null" :style="person.move ? person.moveStyle : null">
            <use :href="`#tally-${person.kind}`" width="30" height="55" :style="person.vars" :transform="person.flip ? MIRROR : null" />
          </g>
        </g>
      </g>

      <g v-for="person in leaving" :key="`gone-${person.id}`" :style="placeStyle(person, person.scale)">
        <g :class="person.all ? 'tumble' : 'float'" :style="{ animationDelay: `${person.delay}ms`, '--spin': person.spin }">
          <use :href="`#tally-${person.kind}`" width="30" height="55" :style="person.vars" :transform="person.flip ? MIRROR : null" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Everyone turns and squashes about their feet. */
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

/* Dropped in from where the tap landed: falls, lands with a little squash,
   and straightens up. */
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
    transform: translate(0, 0) scale(1.1, 0.88);
    animation-timing-function: ease-out;
  }
  80% {
    transform: translate(0, 0) scale(0.96, 1.05);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

/* Standing about, each in their own time. */
.move-bob {
  animation: bob ease-in-out infinite;
}
@keyframes bob {
  0%,
  100% {
    transform: translateY(0) scale(1.02, 0.98);
  }
  50% {
    transform: translateY(-2px) scale(0.99, 1.02);
  }
}

.move-sway {
  animation: sway ease-in-out infinite;
}
@keyframes sway {
  0%,
  100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}

/* Mostly still, then a little bounce on the toes. */
.move-hop {
  animation: hop ease-out infinite;
}
@keyframes hop {
  0%,
  72%,
  100% {
    transform: translateY(0) scale(1);
  }
  78% {
    transform: translateY(0) scale(1.06, 0.93);
  }
  87% {
    transform: translateY(-5px) scale(0.97, 1.04);
  }
  95% {
    transform: translateY(0) scale(1.03, 0.97);
  }
}

/* Weight from one foot to the other. */
.move-shift {
  animation: shift ease-in-out infinite;
}
@keyframes shift {
  0%,
  100% {
    transform: translateX(-1px) skewX(3deg);
  }
  50% {
    transform: translateX(1px) skewX(-3deg);
  }
}

/* One fewer: the last one counted floats up and away. */
.float {
  animation: float 0.7s ease-out forwards;
}
@keyframes float {
  to {
    transform: translateY(-46px) rotate(var(--spin)) scale(0.8);
    opacity: 0;
  }
}

/* Starting again: everyone drops out of the room. */
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

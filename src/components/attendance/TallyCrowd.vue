<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CHARACTERS, COLOURS, pick, rand } from './tallyCharacters'

// The room filling up behind the clicker's count (AttendanceTally): one person
// for every tap, dropped from where the finger landed into the crowd.
//
// The simplest people: a round head over a rounded body, each one flat
// colour, grown-ups and children, told apart by their build and colour
// (tallyCharacters.js). They stand still once they have landed.
//
// A crowd seen from the front, not a stack. Everyone stands on the one floor;
// those further back stand a little higher in the picture and a little
// smaller, and whoever is in front covers them. So a full room is people
// overlapping, some at the front, most partly hidden behind them - never
// anyone standing on someone else's head.
//
// Each person is fixed by their place in the count, not drawn at random each
// time, so the crowd looks the same when the screen is opened again. Where
// they stand across the room and how far back are fixed too; as it fills,
// everyone grows a little smaller and the crowd reaches further back, so the
// last of a few hundred still lands on screen.

const props = defineProps({
  count: { type: Number, default: 0 },
  /** Where the last tap landed, in the box's own pixels, for the newest to drop from. */
  tapAt: { type: Object, default: null },
})

/* --------------------------------------------------------------- the people */

// Shape and colour are chosen apart, so any of the forty can come in any of
// the colours, and two neighbours are rarely the same twice over.
const personOf = (i) => ({
  kind: pick(CHARACTERS, i * 7 + 1).id,
  vars: { '--fill': pick(COLOURS, i * 7 + 2) },
})

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

// A person is 24 by 44, shown a little larger.
const UNIT = 1.25
const MARGIN = 6

// How big everyone is for a count: large, and only smaller once there are
// more than about ten - but never so small that a full room turns into
// confetti. Past that they simply overlap more, which is what a full room
// looks like.
const sizeFor = (count) => Math.min(3, Math.max(1.3, 3 * Math.sqrt(10 / Math.max(1, count))))
const size = computed(() => sizeFor(props.count))

// How far back the crowd reaches: nowhere with a handful, who all stand at
// the front, and deeper into the room as it fills, up to a little over half
// the box, so the count above it stays clear.
const spanFor = (count) => height.value * Math.min(0.55, Math.max(1, count) / 300)
const span = computed(() => spanFor(props.count))

// Where each one stands, spread evenly rather than at random: the golden
// ratio steps across the width and a second irrational steps through the
// depth, so a handful of people never bunch up in one corner and the next one
// always lands somewhere with room.
const GOLDEN = 0.6180339887
const PLASTIC = 0.7548776662
const frac = (n) => n - Math.floor(n)

const place = (i, s = size.value, reach = span.value) => {
  // 0 at the back of the room, 1 at the very front.
  const depth = frac(i * PLASTIC + rand(i * 3 + 11) * 0.2)
  const scale = s * (0.72 + 0.28 * depth)
  const w = 24 * UNIT * scale
  const h = 44 * UNIT * scale
  const across = frac(i * GOLDEN + rand(i * 3 + 12) * 0.08)
  const x = MARGIN + across * Math.max(0, width.value - MARGIN * 2 - w)
  // Further back is higher in the picture, the floor receding, and smaller
  // (the scale above), so those behind show over and between those in front
  // rather than standing on them.
  const y = height.value - h - 2 - (1 - depth) * reach
  return { x, y, depth, scale }
}

// Drawn back to front, so whoever is in front covers those behind. A
// newcomer is only ever added into that order, never moving anyone else: a
// moved person would drop into the room all over again. Past fifteen hundred
// the room is full enough; the count still goes on.
const SHOWN = 1500
const crowd = computed(() => {
  if (!width.value || !height.value) return []
  const s = size.value
  const reach = span.value
  const n = Math.min(props.count, SHOWN)
  const people = []
  for (let i = 0; i < n; i++) people.push({ i, ...place(i, s, reach), ...personOf(i) })
  return people.sort((a, b) => a.depth - b.depth)
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
  const { scale } = person
  const w = 24 * UNIT * scale
  const h = 44 * UNIT * scale
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
    // Placed where they stood, in the room as it was before.
    const s = sizeFor(before)
    const reach = spanFor(before)
    const gone = []
    for (let i = now; i < Math.min(before, SHOWN); i++) {
      gone.push({
        id: nextLeave++,
        ...place(i, s, reach),
        ...personOf(i),
        all: now === 0,
        delay: now === 0 ? rand(i) * 250 : 0,
        spin: `${Math.round((rand(i + 5) - 0.5) * 60)}deg`,
      })
    }
    leaving.value = [...leaving.value, ...gone].sort((a, b) => a.depth - b.depth)
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

const placeStyle = (p) => ({ transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})` })
</script>

<template>
  <div ref="box" class="pointer-events-none absolute inset-0" aria-hidden="true">
    <!-- Stood on the floor of the box rather than hung from its top: should
         the box change height before it is measured again, everyone still
         stands on the floor. -->
    <svg v-if="width && height" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="absolute bottom-0 left-0 overflow-visible">
      <defs>
        <!-- Every person is 24 wide and stands with their feet at 44, so all
             of them stand on the same floor whatever their height. Built in
             tallyCharacters.js; each brings its own colour (--fill). -->
        <symbol v-for="c in CHARACTERS" :id="`tally-${c.id}`" :key="c.id" viewBox="0 0 24 44" overflow="visible" v-html="c.svg" />
      </defs>

      <g v-for="person in crowd" :key="person.i" class="seat" :style="placeStyle(person)">
        <g class="arrive" :style="arrival(person)">
          <use :href="`#tally-${person.kind}`" width="30" height="55" :style="person.vars" />
        </g>
      </g>

      <g v-for="person in leaving" :key="`gone-${person.id}`" :style="placeStyle(person)">
        <g :class="person.all ? 'tumble' : 'float'" :style="{ animationDelay: `${person.delay}ms`, '--spin': person.spin }">
          <use :href="`#tally-${person.kind}`" width="30" height="55" :style="person.vars" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Everyone moves about their feet. */
.arrive,
.float,
.tumble {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}

/* As the room fills everyone grows a little smaller and steps back. */
.seat {
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
}

/* Dropped in from where the tap landed, straight down into place - no
   bounce, no squash. */
.arrive {
  animation: arrive 0.45s cubic-bezier(0.5, 0, 0.75, 0.9) backwards;
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

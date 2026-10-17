<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from 'vue'
import { ArrowDown, ArrowRight, HandWaving, PauseFill, PlayFill, SpeakerHigh, SpeakerSlash } from '../../../icons'
import AppArt from '../../common/AppArt.vue'
import ChurchOutside from './ChurchOutside.vue'
import ChurchInside from './ChurchInside.vue'
import ChurchMeeting from './ChurchMeeting.vue'
import SundaySchool from './SundaySchool.vue'
import SundayNote from './SundayNote.vue'
import { THROUGH } from './hall'
import { SEATED, VISITOR } from './pews'
import { alongKeys, blend, cameraFor, regionOf, toScreen, viewBoxOf } from './camera'
import { VOICE } from './voice'
import { BEATS, INSIDE_KEYS, LENGTH, ORDER, OUTSIDE, ROOMS, SUNDAY_LABEL, WORDS, beatAt, churchAt, clockAt, lerp, phase, span } from './timeline'

// The front door's Sunday (the second front door, /v2): one service, told by
// the scroll, from the doors opening in the morning to the lights going off
// at night. It opens on a title: the camera close on the church's great
// window - Ekkly's mark - with the name beside it as the logo has it, and
// under it what Ekkly is for and what a visitor can do here. Scrolling, or
// pressing Watch, draws back from the mark to the church: one picture, not one
// faded into another. The section is OPENING + LENGTH screens tall and its
// stage is pinned while the reader scrolls through it; every picture on the stage is worked out from how far they have
// got (timeline.js), so it plays backwards as well as forwards and holds
// still when they stop.
//
// The story's words are in the picture, where the eye is: subtitles at its
// foot, following the narrator when it plays and the scroll when it does not.
// Beside it (under it, on a phone) the card shows what Ekkly shows at each
// part - the apps in use, and a look at them - with the way to start at its
// foot. The camera frames each part in what the card and subtitles leave free.

const props = defineProps({
  // The church on the banner and the screen: the visitor's, once named.
  church: { type: String, default: '' },
  // The platform's name, from the console.
  name: { type: String, default: 'Ekkly' },
  // What the main button says and the line under it, as the hero has them.
  call: { type: String, required: true },
  note: { type: Object, default: null },
  // The app names from the console, by key.
  apps: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['start', 'hello'])

const churchName = computed(() => props.church.trim() || 'Grace Fellowship')

/* ------------------------------------------------------------- scrolling */

// The title and the move from it to the church take the first OPENING screens
// of scroll; the Sunday's own clock (timeline.js) starts where they end.
const OPENING = 0.9
const TOTAL = OPENING + LENGTH

const root = ref(null)
const panel = ref(null)
const t = ref(0)
// Whether the story fills the screen, its stage pinned.
const pinned = ref(false)
const size = reactive({ width: 1280, height: 800, head: 65, phone: false })
const panelBox = reactive({ top: 600, right: 440 })

// Asked for less motion, the camera cuts from part to part instead of flying,
// and each part is shown as it looks finished.
const still = ref(false)

let frame = 0
const read = () => {
  frame = 0
  const box = root.value?.getBoundingClientRect()
  if (!box) return
  const travel = box.height - window.innerHeight
  t.value = travel > 0 ? Math.min(1, Math.max(0, -box.top / travel)) * TOTAL : 0
  pinned.value = box.top <= 1 && box.bottom >= window.innerHeight - 1
}
const onScroll = () => {
  if (!frame) frame = requestAnimationFrame(read)
}

const measure = () => {
  size.width = window.innerWidth
  size.height = window.innerHeight
  size.phone = window.innerWidth < 1024
  size.head = document.querySelector('header')?.offsetHeight || 65
  // Measured against the stage rather than the window, so it is right
  // wherever the page happens to be scrolled when it is measured.
  const box = panel.value
  if (box) {
    panelBox.top = box.offsetTop
    panelBox.right = box.offsetLeft + box.offsetWidth
  }
  read()
}

let resizer = null
let wordResizer = null
let titleResizer = null
let motion = null
const onMotion = () => (still.value = !!motion?.matches)

onMounted(async () => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null
  onMotion()
  motion?.addEventListener?.('change', onMotion)
  await nextTick()
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  if (typeof ResizeObserver !== 'undefined' && panel.value) {
    resizer = new ResizeObserver(measure)
    resizer.observe(panel.value)
  }
  if (typeof ResizeObserver !== 'undefined' && wordmark.value) {
    wordResizer = new ResizeObserver(() => (wordW.value = wordmark.value?.offsetWidth || 0))
    wordResizer.observe(wordmark.value)
  }
  if (typeof ResizeObserver !== 'undefined' && title.value) {
    titleResizer = new ResizeObserver(() => (titleH.value = title.value?.offsetHeight || 0))
    titleResizer.observe(title.value)
  }
  // How long it plays, for the button that starts it.
  loadVoices().then((lines) => {
    const seconds = Object.values(lines).reduce((sum, line) => sum + line.seconds + BREATH, 0)
    if (seconds) length.value = `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', measure)
  motion?.removeEventListener?.('change', onMotion)
  resizer?.disconnect()
  wordResizer?.disconnect()
  cancelAnimationFrame(frame)
  titleResizer?.disconnect()
  document.documentElement.classList.remove('sunday-opening')
  document.documentElement.style.removeProperty('--chat-lift')
  stop()
})

// `t` runs over the whole section, the opening included; `sunday` is the
// Sunday's own clock, which starts once the opening is over.
const sunday = computed(() => Math.max(0, t.value - OPENING))
const beat = computed(() => beatAt(sunday.value))
// The time the pictures are drawn at: the scroll itself, or for anyone who
// asked for less motion, the finished look of the part they are in.
const at = computed(() => (still.value ? beat.value.rest : sunday.value))
// The church's own clock, which stands still while a room of its own plays.
const church = computed(() => churchAt(at.value))

/* --------------------------------------------------------------- opening */

// How far through the opening the reader is, from 0 (the title) to 1 (the
// church, and the card beside it). Asked for less motion, it cuts from one to
// the other half way.
const opening = computed(() => (still.value ? Number(t.value >= OPENING / 2) : span(t.value, 0, OPENING)))
// The title's words and buttons go first, as soon as the reader moves on.
const titleOut = computed(() => phase(opening.value, 0.02, 0.2))
// The name fades as the camera starts to draw back, the navy lifts off the
// church as it does, and the card and the subtitles come in last.
const wordOut = computed(() => phase(opening.value, 0.06, 0.32))
const pull = computed(() => phase(opening.value, 0.08, 0.95))
const veil = computed(() => 1 - phase(opening.value, 0.18, 0.78))
const cardIn = computed(() => phase(opening.value, 0.6, 1))

// While the title is up, the bar above holds back (FrontDoorHeader): the
// title has the logo and the ways on, so they are on the screen once; and while the story fills a desktop's screen, the chat
// bubble sits above the subtitles rather than over them.
watchEffect(() => document.documentElement.classList.toggle('sunday-opening', opening.value < 0.5))
watchEffect(() => {
  if (pinned.value && !size.phone) document.documentElement.style.setProperty('--chat-lift', `${CAPTION_ROOM}px`)
  else document.documentElement.style.removeProperty('--chat-lift')
})

// The camera the opening starts from: close on the great window, its panes
// (MARK, in the outside picture's units) the size of a logo on the screen,
// and set left of the middle so that it and the name beside it are centred
// together. The proportions are the header's logo (PlatformLogo): the name
// 0.8 of the mark's height, and a third of it between the two.
const MARK = { x: 800, y: 542.5, w: 91.5, h: 102.5 }
const markPx = computed(() => Math.max(56, Math.min(150, size.height * 0.17, (size.width * 0.8) / 3.3)))
const wordmark = ref(null)
const wordW = ref(0)
// The title under the logo, and the logo and it centred on the screen as one.
const TITLE_GAP = 28
const title = ref(null)
const titleH = ref(0)
const logoY = computed(() => Math.max(markPx.value / 2 + 24, (size.height - (markPx.value + TITLE_GAP + titleH.value)) / 2 + markPx.value / 2))
const titleTop = computed(() => logoY.value + markPx.value / 2 + TITLE_GAP)
const logoCamera = computed(() => {
  const s = markPx.value / MARK.h
  const markW = MARK.w * s
  const total = markW + markPx.value * 0.33 + wordW.value
  return { cx: MARK.x, cy: MARK.y, s, ax: size.width / 2 - total / 2 + markW / 2, ay: logoY.value }
})
const cardStyle = computed(() => {
  const x = cardIn.value
  if (x >= 1) return null
  return {
    opacity: x,
    pointerEvents: x < 0.6 ? 'none' : null,
    transform: size.phone ? `translateY(${(1 - x) * 48}px)` : `translateX(${(1 - x) * -40}px)`,
  }
})

/** Scroll to a part of the service, as it looks finished. */
const go = (key) => {
  // Jumping to a part is the reader taking over from the player.
  stop()
  const target = BEATS.find((item) => item.key === key)
  const box = root.value?.getBoundingClientRect()
  if (!target || !box) return
  const travel = box.height - window.innerHeight
  const top = window.scrollY + box.top + ((OPENING + target.rest) / TOTAL) * travel
  window.scrollTo({ top, behavior: still.value ? 'auto' : 'smooth' })
}

/* ---------------------------------------------------------------- player */

// The Sunday can play itself: the page scrolls from part to part while a
// narrator reads each one's line (voice.js, spoken into public/voice/sunday by
// scripts/make-sunday-voice.mjs). Each part takes as long as its line and a
// breath after, so the pictures move under the words being said. Anything the
// reader does to scroll - the wheel, a touch, a key - hands the page back to
// them, as does the pause button. With the voice off it still plays.

const PLAYLIST = ['hero', ...ORDER, 'night']
// The breath held after each line before the next part.
const BREATH = 0.7
const playing = ref(false)
const sound = ref(true)
const length = ref('')
let voices = null
let audio = null
let run = 0

// What is being said, for the subtitles: which part's line, and how far
// through it, read off the voice itself once it has started.
const spoken = reactive({ key: null, f: 0 })
let lineStart = 0
let lineSeconds = 1
let spokenFrame = 0
const follow = () => {
  const heard = audio && !audio.paused && audio.currentTime > 0 ? audio.currentTime : (performance.now() - lineStart) / 1000
  spoken.f = Math.min(1, heard / lineSeconds)
  spokenFrame = playing.value ? requestAnimationFrame(follow) : 0
}

const loadVoices = async () => {
  if (!voices) {
    voices = await fetch('/voice/sunday/index.json')
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
  }
  return voices
}

/** Where the page has to be scrolled to for `screens` into the section. */
const topOf = (screens) => {
  const box = root.value.getBoundingClientRect()
  const travel = box.height - window.innerHeight
  return window.scrollY + box.top + (screens / TOTAL) * travel
}
/** Where the page has to be scrolled to for the Sunday's time `time`. */
const topAt = (time) => topOf(OPENING + time)

// From the title: down to the cover, the camera drawing back on the way.
const explore = () => window.scrollTo({ top: topAt(0), behavior: still.value ? 'auto' : 'smooth' })
// Someone tabbing past the title into the card is brought to the cover, so
// what has their focus is in view.
const reveal = () => {
  if (opening.value < 1) window.scrollTo({ top: topAt(0), behavior: 'instant' })
}

/**
 * Scrolls the page to `time` over `ms`; resolves when there or stopped, with
 * the speed it arrived at. It sets off and arrives at the speeds given, in
 * pixels a millisecond, and at rest unless told otherwise, so one glide can
 * carry on from another without the page stopping between them.
 */
const glide = (time, ms, id, { start = 0, end = 0 } = {}) =>
  new Promise((resolve) => {
    const from = window.scrollY
    const to = topAt(time)
    if (still.value || ms <= 0) {
      window.scrollTo({ top: to, behavior: 'instant' })
      return resolve(0)
    }
    const distance = to - from
    // Hermite's cubic from 0 to 1 with these slopes at its ends: both at rest,
    // it is the same ease in and out as everything else here.
    const slope = (speed) => (distance ? Math.min(2, Math.max(0, (speed * ms) / distance)) : 0)
    const m0 = slope(start)
    const m1 = slope(end)
    const curve = (x) => (x ** 3 - 2 * x ** 2 + x) * m0 + (3 * x ** 2 - 2 * x ** 3) + (x ** 3 - x ** 2) * m1
    const begun = performance.now()
    const step = (now) => {
      if (id !== run) return resolve(0)
      const x = Math.min(1, (now - begun) / ms)
      window.scrollTo({ top: from + distance * curve(x), behavior: 'instant' })
      if (x < 1) requestAnimationFrame(step)
      else resolve(end)
    }
    requestAnimationFrame(step)
  })

/**
 * The cover's part, while its line is said: on through it at an even pace as
 * the family walk in from off the picture, arriving at that pace so the
 * doors' part carries on from it rather than stopping them on the path. With
 * less motion the cover stays.
 */
const walk = (part, ms, id) => {
  if (still.value) return Promise.resolve(0)
  const pace = (topAt(part.to) - window.scrollY) / ms
  return glide(part.to, ms, id, { start: pace, end: pace })
}

const wait = (ms, id) =>
  new Promise((resolve) => {
    const end = performance.now() + ms
    const tick = () => (id !== run || performance.now() >= end ? resolve() : requestAnimationFrame(tick))
    tick()
  })

/** Starts a part's line, and its subtitles with it. */
const narrate = (key, seconds) => {
  audio?.pause()
  const line = voices?.[key]
  audio = line ? new Audio(`/voice/sunday/${line.file}`) : null
  if (audio) {
    audio.muted = !sound.value
    audio.play().catch(() => {})
  }
  spoken.key = key
  spoken.f = 0
  lineStart = performance.now()
  lineSeconds = seconds
  if (!spokenFrame) spokenFrame = requestAnimationFrame(follow)
}

// Pressing play starts the pictures, not a voice talking over them: from the
// title the camera draws back to the church in silence and the narrator
// begins once it is in view; from anywhere else the first line waits LEAD
// seconds as the camera sets off. The subtitles wait with the voice.
const LEAD = 0.8

async function play() {
  const id = ++run
  playing.value = true
  spoken.key = null
  await loadVoices()
  // From the part they are on, or from the top if the Sunday is over.
  let from = PLAYLIST.indexOf(beat.value.key)
  if (from < 0 || beat.value.key === 'night') from = 0
  // Started over from the night, it goes back to the title first.
  if (from === 0 && t.value > OPENING + 0.5) window.scrollTo({ top: topOf(0), behavior: 'instant' })
  let pace = 0
  for (const [i, key] of PLAYLIST.slice(from).entries()) {
    if (id !== run) return
    const target = BEATS.find((item) => item.key === key)
    const seconds = voices?.[key]?.seconds || 3
    let lead = i === 0 ? LEAD * 1000 : 0
    if (key === 'hero') {
      // Down from the title to the church, which is the lead itself; or
      // straight back to the cover, if the reader had gone on.
      const fromTitle = window.scrollY < topAt(0) - 1
      await glide(0, fromTitle ? 2400 : 0, id)
      if (id !== run) return
      if (fromTitle) lead = 0
    }
    // Each part is flown to while its line is said, setting off at the pace
    // the last one arrived at, then held a breath after it; the cover's line
    // is said as the family walk in.
    const move =
      key === 'hero' ? walk(target, lead + (seconds + BREATH) * 1000, id) : glide(target.rest, lead + seconds * 900, id, { start: pace })
    await wait(lead, id)
    if (id !== run) return
    narrate(key, seconds)
    const [arrived] = await Promise.all([move, wait((seconds + BREATH) * 1000, id)])
    pace = arrived
  }
  if (id === run) playing.value = false
}

function stop() {
  run++
  playing.value = false
  cancelAnimationFrame(spokenFrame)
  spokenFrame = 0
  audio?.pause()
  audio = null
}

const toggle = () => (playing.value ? stop() : play())
const toggleSound = () => {
  sound.value = !sound.value
  if (audio) audio.muted = !sound.value
}

// The reader taking the page back, by any of the ways a person scrolls.
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])
const takeBack = (event) => {
  if (!playing.value) return
  if (event.type === 'keydown' && !SCROLL_KEYS.has(event.key)) return
  stop()
}
onMounted(() => {
  window.addEventListener('wheel', takeBack, { passive: true })
  window.addEventListener('touchstart', takeBack, { passive: true })
  window.addEventListener('keydown', takeBack)
})
onBeforeUnmount(() => {
  window.removeEventListener('wheel', takeBack)
  window.removeEventListener('touchstart', takeBack)
  window.removeEventListener('keydown', takeBack)
})

/* ---------------------------------------------------------------- camera */

// The part of the screen the pictures are framed in: right of the card on a
// desktop, above it on a phone, and under the header either way. On a desktop
// the subtitles have the foot of it (CAPTION_ROOM), so nothing that matters
// is framed behind them; a phone's picture is too short to give up the room,
// and its subtitles sit over the ground at its foot.
const CAPTION_ROOM = 104
const free = computed(() => {
  if (size.phone) {
    const y = size.head + 4
    return { x: 8, y, w: size.width - 16, h: Math.max(120, panelBox.top - y - 8) }
  }
  const x = panelBox.right + 24
  const y = size.head + 16
  return { x, y, w: Math.max(200, size.width - x - 24), h: size.height - y - 24 - CAPTION_ROOM }
})

const outsideAt = (name) => cameraFor(regionOf(OUTSIDE[name], size.phone), free.value)

const outCamera = computed(() => {
  const x = church.value
  if (x < 0.85) return pull.value < 1 ? blend(logoCamera.value, outsideAt('whole'), pull.value) : outsideAt('whole')
  if (x < 1.05) return blend(outsideAt('whole'), outsideAt('near'), phase(x, 0.85, 1.05))
  if (x < 9.3) return blend(outsideAt('near'), outsideAt('door'), phase(x, 1.05, 1.6))
  if (x < 9.75) return blend(outsideAt('door'), outsideAt('near'), phase(x, 9.3, 9.75))
  return blend(outsideAt('near'), outsideAt('whole'), phase(x, 9.75, 10.25))
})

// The room as seen through the doorway: as tall as about one and a half
// doorways, centred in it, so it grows more slowly than the church around it
// as the camera comes in — it is further away. The cover's glow draws its
// glimpse of the room the same way (hall.js), so the cross seen through the
// doors stays where it is as the glow gives way to the room.
const throughDoor = (camera) => {
  const door = toScreen(camera, ...THROUGH.door)
  return { cx: THROUGH.room[0], cy: THROUGH.room[1], s: THROUGH.scale * camera.s, ax: door.x, ay: door.y }
}

const inCamera = computed(() => {
  const x = church.value
  const inside = (time) => alongKeys(INSIDE_KEYS, time, free.value, size.phone)
  // Seen through the doorway, the room stays put in it until the camera
  // stands at the door. Going through, it comes on to its own first view in
  // step with the camera on the door (the same phase), from how it looked
  // from the step: so it grows more slowly than the doorway, as what is
  // further off does, and the cross in it never slides up behind the arch.
  // At night the same, the other way.
  const step = () => throughDoor(outsideAt('near'))
  if (x < 1.05) return throughDoor(outCamera.value)
  if (x < 1.6) return blend(step(), inside(1.6), phase(x, 1.05, 1.6))
  if (x <= 9.3) return inside(x)
  if (x < 9.75) return blend(inside(9.3), step(), phase(x, 9.3, 9.75))
  return throughDoor(outCamera.value)
})

const outBox = computed(() => viewBoxOf(outCamera.value, size.width, size.height))

// The name beside the mark rides with it as the camera draws back, scaled as
// the mark is, until it has faded. Scaled by a transform, not its font size,
// so its measured width (wordW) holds still while it moves.
const wordStyle = computed(() => {
  const camera = outCamera.value
  const k = camera.s / logoCamera.value.s
  const edge = toScreen(camera, MARK.x + MARK.w / 2, MARK.y)
  return {
    left: `${edge.x + markPx.value * 0.33 * k}px`,
    top: `${edge.y}px`,
    fontSize: `${markPx.value * 0.8}px`,
    transform: `translateY(-50%) scale(${k})`,
    transformOrigin: 'left center',
    opacity: 1 - wordOut.value,
    visibility: opening.value < 1 ? null : 'hidden',
  }
})
// 1 at the cover's view of the church, smaller as the camera closes on the door.
const outDepth = computed(() => outsideAt('whole').s / outCamera.value.s)
const inBox = computed(() => viewBoxOf(inCamera.value, size.width, size.height))

/* ------------------------------------------------------------ the church */

const outside = computed(() => {
  const x = church.value
  const evening = x > 5
  return {
    opacity: evening ? span(x, 9.3, 9.42) : 1 - span(x, 1.42, 1.58),
    open: evening ? 1 - phase(x, 10.15, 10.5) : phase(x, 0.5, 0.95),
    dusk: phase(x, 9.45, 9.95),
    night: phase(x, 9.9, 10.45),
    // The family walk in from off the foot of the picture as the reader goes
    // on from the cover. With less motion nothing walks: the cover shows them
    // partway up the path, as the cover art has them.
    walkIn: still.value ? Number(x >= 0.5) || 0.6 : span(x, 0, 0.92),
    walkOut: span(x, 10, 10.9),
  }
})

/* ----------------------------------------------------------------- rooms */

// Sunday school and the meeting, each in a room of its own laid over the
// church: it fades in as its part starts and out as it ends, and the camera
// leans in a little across it, from the whole room to what matters in it. A
// phone is too narrow for the whole of Sunday school, so it starts on the
// lesson laid out on the tables and pans to the door the kids are counted at.
const ROOM_VIEWS = {
  kids: {
    from: { at: [800, 500, 1600, 1000], phone: [600, 520, 1000, 1000] },
    to: { at: [900, 540, 1250, 780], phone: [880, 580, 860, 760] },
  },
  meeting: {
    from: { at: [800, 520, 1600, 1000], phone: [800, 640, 1000, 900] },
    to: { at: [800, 660, 1300, 760], phone: [800, 720, 700, 640] },
  },
}

const rooms = computed(() =>
  Object.fromEntries(
    ROOMS.map((room) => {
      const u = span(at.value, room.from, room.to)
      const shown = still.value
        ? Number(beat.value.key === room.key)
        : phase(at.value, room.from, room.from + 0.2) * (1 - phase(at.value, room.to - 0.2, room.to))
      const view = ROOM_VIEWS[room.key]
      const camera = blend(cameraFor(regionOf(view.from, size.phone), free.value), cameraFor(regionOf(view.to, size.phone), free.value), phase(u, 0.05, 0.85))
      return [room.key, { u, shown, viewBox: viewBoxOf(camera, size.width, size.height) }]
    })
  )
)
// The church under a room is not drawn while the room covers it.
const covered = computed(() => ROOMS.some((room) => rooms.value[room.key].shown >= 1))

const insideShown = computed(() => !covered.value && (outside.value.opacity < 1 || outside.value.open > 0))

const scene = computed(() => {
  const x = church.value
  const fill = phase(x, 1.65, 2.75)
  const seated = lerp(6, SEATED, fill) * (1 - phase(x, 8.55, 9.25))
  const worship = phase(x, 3.05, 3.25) * (1 - phase(x, 4.1, 4.3))
  const prayer = phase(x, 5.45, 5.7) * (1 - phase(x, 6.25, 6.45))
  const welcomeEnds = 1 - phase(x, 2.95, 3.1)
  const screen =
    x < 3 ? 'welcome' : x < 4.25 ? 'lyrics' : x < 5.45 ? 'reading' : x < 6.45 ? 'pray' : x < 7.45 ? 'offering' : x < 8.35 ? 'notices' : 'bye'
  return {
    seated,
    count: Math.round(seated),
    stand: Math.min(1, worship + phase(x, 8.35, 8.5)),
    bow: phase(x, 5.5, 5.7) * (1 - phase(x, 6.25, 6.4)),
    dim: Math.max(worship * 0.1, prayer),
    band: 1 - phase(x, 4.2, 4.4),
    preacher: phase(x, 4.35, 4.55) * (1 - phase(x, 6.3, 6.5)),
    // The band plays as the reader scrolls, and only then.
    play: x * 9,
    screen,
    lyric: span(x, 3, 4.2) < 0.5 ? 0 : 1,
    basket: x > 6.6 && x < 7.35 ? span(x, 6.6, 7.35) : -1,
    usher: phase(x, 1.5, 1.7) * welcomeEnds,
    visitor: Math.min(1, Math.max(0, seated - VISITOR.rank)) * welcomeEnds,
    // Hands raised in worship as the songs swell, after the room stands.
    praise: phase(x, 3.2, 3.8) * (1 - phase(x, 4, 4.2)),
    // The sermon's two sentences (ChurchInside), and how far it is shown.
    sermon: span(x, 4.55, 5.35),
    sermonShown: phase(x, 4.5, 4.65) * (1 - phase(x, 5.3, 5.45)),
  }
})

/* -------------------------------------------------------------- subtitles */

// The narration (voice.js), each part's line as its sentences, with the
// platform's own name in it.
const LINES = computed(() =>
  Object.fromEntries(Object.entries(VOICE).map(([key, line]) => [key, line.replaceAll('Ekkly', props.name).split(/(?<=[.!?])\s+/)]))
)

// The sentence on the screen, and how many of its words have been reached:
// while it plays, the line being spoken, as far as the voice has got; else
// the line of the part the reader is in, as far as they have scrolled into
// it. The cover and the night have their words in the card, so they have
// none here unless the narrator is reading them.
const caption = computed(() => {
  const key = playing.value ? spoken.key : beat.value.key
  if (!key || (!playing.value && (key === 'hero' || key === 'night'))) return null
  const sentences = LINES.value[key]
  if (!sentences) return null
  // Asked for less motion, the whole line at once, nothing lighting.
  if (still.value && !playing.value) {
    const words = sentences.join(' ').split(' ')
    return { key, words, lit: words.length }
  }
  // Each sentence takes a share of the line as long as it is.
  const f = playing.value ? spoken.f : local.value
  const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  let along = f * total
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    if (along <= sentence.length || i === sentences.length - 1) {
      const words = sentence.split(' ')
      return { key: `${key}-${i}`, words, lit: Math.ceil(Math.min(1, along / sentence.length) * words.length) }
    }
    along -= sentence.length
  }
  return null
})

// Where the subtitles sit: across the foot of the picture on a desktop, in the
// room the camera leaves them; on a phone, just above the card.
const captionBox = computed(() =>
  size.phone
    ? { left: '12px', right: '12px', bottom: `${size.height - panelBox.top + 10}px` }
    : { left: `${free.value.x}px`, width: `${free.value.w}px`, bottom: '24px' }
)

/* --------------------------------------------------------------- bulletin */

const clock = computed(() => clockAt(at.value))
const local = computed(() => (still.value ? 1 : span(sunday.value, beat.value.from, beat.value.to)))
const words = computed(() => WORDS[beat.value.key] || null)
const say = (line) => line.replaceAll('{name}', props.name)
const step = computed(() => ORDER.indexOf(beat.value.key))

// "9:15", the time each part of the service starts.
const startsAt = (key) => {
  const minutes = BEATS.find((item) => item.key === key).clock[0]
  const hour = Math.floor(minutes / 60)
  return `${((hour + 11) % 12) + 1}:${String(minutes % 60).padStart(2, '0')}`
}

const appName = (key) => props.apps[key] || key
</script>

<template>
  <section
    id="sunday"
    ref="root"
    class="relative"
    :style="{ height: `${(TOTAL + 1) * 100}svh`, marginTop: `-${size.head}px` }"
    :aria-label="`A Sunday with ${name}`"
  >
    <div class="sticky top-0 h-dvh overflow-hidden bg-[var(--sunday-ground)]">
      <ChurchInside v-show="insideShown" class="absolute inset-0 h-full w-full" :view-box="inBox" :scene="scene" :church="churchName" />
      <ChurchOutside
        v-show="outside.opacity > 0 && !covered"
        class="absolute inset-0 h-full w-full"
        :style="{ opacity: outside.opacity }"
        :view-box="outBox"
        :open="outside.open"
        :dusk="outside.dusk"
        :night="outside.night"
        :walk-in="outside.walkIn"
        :walk-out="outside.walkOut"
        :depth="outDepth"
        :veil="veil"
      />
      <SundaySchool
        v-if="rooms.kids.shown > 0"
        class="absolute inset-0 h-full w-full"
        :style="{ opacity: rooms.kids.shown }"
        :view-box="rooms.kids.viewBox"
        :u="rooms.kids.u"
      />
      <ChurchMeeting
        v-if="rooms.meeting.shown > 0"
        class="absolute inset-0 h-full w-full"
        :style="{ opacity: rooms.meeting.shown }"
        :view-box="rooms.meeting.viewBox"
        :u="rooms.meeting.u"
        :name="name"
      />

      <!-- The opening: the name beside the mark, which is the church's window
           (ChurchOutside draws it). -->
      <span
        ref="wordmark"
        class="wordmark pointer-events-none absolute whitespace-nowrap font-medium text-white"
        :style="wordStyle"
        aria-hidden="true"
      >{{ name }}</span>

      <!-- The title, under the logo: what Ekkly is for, and what a visitor can
           do here - watch the Sunday told, start their church, scroll
           through it themselves, see the price, or read the questions. It
           waits for them; it goes as they scroll or press Watch. -->
      <div
        ref="title"
        class="absolute inset-x-0 flex flex-col items-center px-6 text-center"
        :style="{
          top: `${titleTop}px`,
          opacity: 1 - titleOut,
          transform: `translateY(${-titleOut * 24}px)`,
          visibility: opening < 1 ? null : 'hidden',
          pointerEvents: titleOut > 0.5 ? 'none' : null,
          '--color-primary': 'inherit',
          '--color-primary-hover': 'inherit',
        }"
      >
        <p class="max-w-2xl text-balance text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.4rem]">
          Sunday takes a lot of lists. Let {{ name }} keep them.
        </p>
        <p class="mt-3 max-w-xl text-balance text-sm leading-relaxed text-white/70 sm:text-base">
          A ministry to churches: we keep the lists, so your people can share the gospel, make disciples and worship God.
        </p>
        <div class="mt-7 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <button
            type="button"
            class="flex h-14 items-center justify-center gap-3 rounded-xl bg-white pr-6 pl-2.5 text-base font-bold text-slate-900 transition-colors hover:bg-slate-100"
            @click="play"
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"><PlayFill class="h-4 w-4" /></span>
            <span class="text-left leading-tight">
              Watch the Sunday
              <span class="block text-xs font-semibold text-slate-500">{{ length ? `${length} · ` : '' }}with a voice</span>
            </span>
          </button>
          <button
            type="button"
            class="group flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-white transition-colors hover:bg-primary-hover"
            @click="emit('start')"
          >
            {{ call }}
            <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
        <p v-if="note" class="mt-3 flex items-start gap-1.5 text-sm text-white/60">
          <component :is="note.icon" :class="['mt-0.5 h-4 w-4 shrink-0', note.mark]" />
          {{ note.says }}
        </p>
        <div class="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-white/75">
          <button type="button" class="inline-flex items-center gap-1.5 hover:text-white" @click="explore">
            <ArrowDown class="h-4 w-4" />
            Scroll through it yourself
          </button>
          <a href="#plan" class="hover:text-white">See pricing</a>
          <a href="#faq" class="hover:text-white">Questions</a>
          <a href="#gospel" class="hover:text-white">What is the gospel?</a>
        </div>
      </div>

      <!-- The picture's own words. On the cover, the way to watch it; after
           that, the subtitles - a sentence at a time, its words lighting as
           they are reached - with the controls beside them. They keep the
           page's own brand colour (the card's dark styles would not). -->
      <div
        v-show="cardIn > 0"
        class="pointer-events-none absolute flex items-end justify-center gap-2"
        :style="[captionBox, { opacity: cardIn, '--color-primary': 'inherit', '--color-primary-hover': 'inherit' }]"
      >
        <template v-if="beat.key === 'hero' && !playing">
          <button
            type="button"
            class="pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-slate-900/90 py-2 pr-6 pl-2 text-left text-white ring-1 ring-white/10 transition-colors hover:bg-slate-900"
            @click="play"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary"><PlayFill class="h-4 w-4" /></span>
            <span class="leading-tight">
              <span class="block text-base font-bold">Watch the Sunday</span>
              <span class="block text-xs font-semibold text-white/60">{{ length ? `${length} · ` : '' }}with a voice</span>
            </span>
          </button>
          <button
            type="button"
            class="pointer-events-auto flex h-9 items-center gap-1 rounded-full bg-slate-900/70 px-3 text-xs font-semibold text-white/85 transition-colors hover:bg-slate-900"
            @click="go('doors')"
          >
            or scroll
            <ArrowDown class="h-3.5 w-3.5" />
          </button>
        </template>
        <template v-else>
          <div class="pointer-events-auto flex shrink-0 flex-col gap-1.5">
            <button
              v-if="playing"
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/85 text-white transition-colors hover:bg-slate-900"
              :aria-label="sound ? 'Turn the voice off' : 'Turn the voice on'"
              :aria-pressed="!sound"
              @click="toggleSound"
            >
              <SpeakerHigh v-if="sound" class="h-4 w-4" />
              <SpeakerSlash v-else class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover"
              :aria-label="playing ? 'Pause the Sunday' : 'Play the Sunday from here, with a voice'"
              @click="toggle"
            >
              <PauseFill v-if="playing" class="h-3.5 w-3.5" />
              <PlayFill v-else class="h-3.5 w-3.5" />
            </button>
          </div>
          <Transition name="caption" mode="out-in">
            <p
              v-if="caption"
              :key="caption.key"
              class="max-w-[40rem] rounded-2xl bg-slate-900/85 px-4 py-2.5 text-center text-[0.95rem] font-semibold leading-snug sm:text-lg lg:px-5 lg:py-3 lg:text-[1.2rem]"
              aria-hidden="true"
            >
              <span
                v-for="(word, i) in caption.words"
                :key="i"
                :class="['transition-colors duration-150', i < caption.lit ? 'text-white' : 'text-white/40']"
              >{{ word }}{{ i < caption.words.length - 1 ? ' ' : '' }}</span>
            </p>
          </Transition>
        </template>
      </div>

      <!-- The bulletin. On a phone it keeps one height from part to part, so
           the picture above it is not reframed every time the words change
           length. -->
      <div
        ref="panel"
        class="dark absolute inset-x-0 bottom-0 flex min-h-[min(21rem,46dvh)] flex-col rounded-t-2xl bg-slate-900 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-white lg:inset-x-auto lg:bottom-6 lg:left-6 lg:min-h-0 lg:w-[min(30vw,32rem)] lg:min-w-[22rem] lg:rounded-2xl lg:p-7"
        :style="[{ '--color-primary': 'inherit', '--color-primary-hover': 'inherit' }, size.phone ? null : { top: `${size.head + 20}px` }, cardStyle]"
        @focusin="reveal"
      >
        <!-- Its head: the church, the day, and the church's clock. -->
        <div class="flex items-center justify-between gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <span v-if="beat.key === 'hero'" class="min-w-0 truncate font-bold uppercase tracking-wider text-primary-light xl:text-sm">A Sunday at your church</span>
          <span v-else class="min-w-0 truncate">{{ churchName }} · {{ SUNDAY_LABEL }}</span>
          <span class="shrink-0 tabular-nums text-gray-900 dark:text-white" aria-hidden="true">{{ clock }}</span>
        </div>


        <!-- Clipped only from side to side, for the page turning over: clipped
             top to bottom too, it cut a part's words off on a short phone. -->
        <div class="relative min-h-0 flex-1 overflow-x-clip">
          <Transition :name="still ? '' : 'turn'" mode="out-in">
            <!-- The cover: what the page is, and the way in. -->
            <div v-if="beat.key === 'hero'" key="hero" class="pt-3 lg:pt-5">
              <h1 class="text-balance text-[1.75rem] font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.6rem] xl:text-[3.1rem]">
                Sunday takes a lot of lists. Let {{ name }} keep them.
              </h1>
              <p class="mt-3 text-sm leading-relaxed text-gray-600 lg:mt-4 lg:text-base xl:text-lg dark:text-gray-300">
                See the work it takes off your church, so your people have more time to share the gospel, make disciples and worship God.
              </p>
              <div class="mt-4 flex flex-col gap-2 lg:mt-6">
                <button
                  type="button"
                  class="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-white transition-colors hover:bg-primary-hover lg:h-14 lg:self-start"
                  @click="emit('start')"
                >
                  {{ call }}
                  <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <p v-if="note" class="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <component :is="note.icon" :class="['mt-0.5 h-4 w-4 shrink-0', note.mark]" />
                  {{ note.says }}
                </p>
              </div>
            </div>

            <!-- Sunday night: the doors shut and the last call. -->
            <div v-else-if="beat.key === 'night'" key="night" class="pt-3 lg:flex lg:h-full lg:flex-col lg:justify-center lg:pt-0">
              <p class="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light">Sunday night</p>
              <h2 class="mt-2 text-balance text-2xl font-black leading-tight tracking-tight lg:text-4xl">
                The lights go off. The lists are already kept.
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-gray-600 lg:text-base dark:text-gray-300">
                That was one Sunday on {{ name }}: every list kept, so your people are free to share the gospel, make disciples and worship God. Your church gets its own link, only the apps it needs, and its first month free.
              </p>
              <div class="mt-4 flex flex-col gap-2 lg:mt-6">
                <button
                  type="button"
                  class="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-white transition-colors hover:bg-primary-hover lg:h-14 lg:self-start"
                  @click="emit('start')"
                >
                  Get your church on {{ name }}
                  <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 self-center text-sm font-semibold text-gray-600 underline-offset-4 hover:underline lg:self-start dark:text-gray-300"
                  @click="emit('hello')"
                >
                  <HandWaving class="h-4.5 w-4.5" />
                  Or say hello, we’ll reach out
                </button>
              </div>
            </div>

            <!-- A part of the service: what Ekkly shows at this moment, the apps
                 in use and a look at them. Its words are in the picture, as
                 its subtitles, so the card shows rather than tells. -->
            <div v-else-if="words" :key="beat.key" class="pt-3 lg:pt-5">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                  {{ startsAt(beat.key) }} · {{ words.label }}
                </p>
                <!-- Where they are in the service, as a row of dots, each a way
                     to jump to its part. On a desktop it used to be the whole
                     order of service down the side, which left too little room
                     for the words and pushed the sample off the panel. -->
                <div class="-mr-1 flex shrink-0 items-center">
                  <button
                    v-for="(key, i) in ORDER"
                    :key="key"
                    type="button"
                    class="flex h-6 items-center px-[3px]"
                    :title="`${startsAt(key)} · ${WORDS[key].label}`"
                    :aria-label="`${startsAt(key)}, ${WORDS[key].label}`"
                    :aria-current="i === step ? 'step' : undefined"
                    @click="go(key)"
                  >
                    <span
                      :class="['h-1.5 rounded-full transition-all', i === step ? 'w-4 bg-primary dark:bg-primary-light' : i < step ? 'w-1.5 bg-gray-400 dark:bg-gray-500' : 'w-1.5 bg-gray-200 dark:bg-gray-700']"
                    ></span>
                  </button>
                </div>
              </div>
              <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <li v-for="key in words.apps" :key="key" class="flex items-center gap-2.5 text-sm font-bold text-white lg:text-base">
                  <AppArt :app-key="key" :play="step" class="h-8 w-8 shrink-0" />
                  {{ appName(key) }}
                </li>
              </ul>
              <SundayNote :beat="beat.key" :u="local" :count="scene.count" class="mt-3" />
            </div>
          </Transition>
        </div>

        <!-- The way to start, at the card's foot all the way through. The cover
             and the night have their own, larger. -->
        <button
          v-if="beat.key !== 'hero' && beat.key !== 'night'"
          type="button"
          class="group mt-4 inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover lg:h-12 lg:w-full lg:text-base"
          @click="emit('start')"
        >
          {{ call }}
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>

    <!-- The whole service in words, for a screen reader, which cannot see
         the pictures change. -->
    <ol class="sr-only">
      <li v-for="key in ORDER" :key="key">{{ startsAt(key) }}, {{ WORDS[key].label }}. {{ say(WORDS[key].still) }} {{ say(WORDS[key].keeps) }} {{ WORDS[key].wins.join('. ') }}.</li>
    </ol>
  </section>
</template>

<style scoped>
/* What shows outside the drawings, should a camera ever see past an edge:
   the inside's back wall. */
section {
  --sunday-ground: #f6eedf;
}

/* The name in the opening, set as the logo's wordmark is (PlatformLogo). */
.wordmark {
  font-family: Poppins, 'Avenir Next', Avenir, 'Segoe UI', system-ui, sans-serif;
  letter-spacing: -0.02em;
  line-height: 1;
  padding-bottom: 0.08em;
}

/* A part of the service gives way to the next like a page of the bulletin
   turning over: the old one leaves to the left, the new one comes in from
   the right. Short, because the reader is still scrolling. */
.turn-enter-active,
.turn-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.turn-enter-from {
  opacity: 0;
  transform: translateX(1rem);
}
.turn-leave-to {
  opacity: 0;
  transform: translateX(-1rem);
}

/* One sentence of the subtitles gives way to the next in a quick fade. */
.caption-enter-active,
.caption-leave-active {
  transition: opacity 0.14s ease;
}
.caption-enter-from,
.caption-leave-to {
  opacity: 0;
}
</style>

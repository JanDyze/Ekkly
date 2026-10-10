<script>
// Counted across every copy on the page, so each one's gradients have names
// of their own and the first YUNIT on a page does not colour all the others.
let copies = 0

// What he can be (a state that lasts while the chat is in it) and what he can
// do (a gesture that plays once).
export const YUNIT_MOODS = ['idle', 'listening', 'thinking', 'talking', 'happy', 'confused', 'sad', 'sleeping']
export const YUNIT_ACTIONS = ['wave', 'jump', 'hop', 'nod', 'shake', 'wink', 'surprise', 'celebrate', 'glance', 'peek']
</script>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// YUNIT, Ekkly's assistant: a round white face held by four petals in
// Ekkly's yellow, orange, teal and blue, standing on two feet, with a burst
// of "!" beside him.
//
// He is a rig, not a set of keyframes. Every part that moves — how high he
// is, how squashed, his lean, his head, each petal, each eye, his mouth, the
// burst beside him — is a spring easing towards where it is wanted. A mood
// says where each part should rest; a gesture moves those resting places
// for a moment; the springs carry him between them. So nothing ever snaps,
// restarts or vanishes: a wave that ends lowers the hand, a mood that changes
// mid-gesture is simply where he heads next, and an interrupted jump lands.
//
// Keyframes could not do this. A CSS animation that is replaced or removed
// jumps to wherever the next rule says, which is what made him look like a
// picture with faulty animations rather than someone moving.
//
// He never breathes or bobs while idle. He blinks at uneven gaps, his eyes
// follow the pointer, and now and then he does one small thing. Anyone who
// asks for less motion gets each pose without the travel between them.

const props = defineProps({
  // One of YUNIT_MOODS. The page sets it from what is happening.
  mood: { type: String, default: 'idle' },
  // Eyes that follow the pointer round the page.
  follow: { type: Boolean, default: true },
  // A tap plays a gesture. Off where he is only a picture.
  interactive: { type: Boolean, default: true },
  // The burst beside him (and the dots, the "?" and the z's that take its
  // place); off where he is small.
  sparks: { type: Boolean, default: true },
  // Small things on his own while idle. Off where several stand together.
  fidget: { type: Boolean, default: true },
})

const id = `yunit${++copies}-`
const PETALS = [
  {
    key: 'yellow',
    light: '#FFCB4A',
    dark: '#F7B12E',
    d: 'M93 40C92 29 86 21 79 24C54 33 21 58 15 95C12 116 22 134 37 131L53 127C55 106 70 89 88 77C96 68 96 55 93 40Z',
    // Where it turns, which way is out, and where it flies in from.
    pivot: [60, 80],
    out: [-1, -0.8],
    from: [-26, -18, -24],
  },
  {
    key: 'orange',
    light: '#FF8D4A',
    dark: '#F26A38',
    d: 'M103 22C130 12 166 18 183 40C196 57 197 79 176 88C168 75 156 67 140 67H115C106 67 102 59 101 48C99 36 98 26 103 22Z',
    pivot: [145, 50],
    out: [0.5, -1],
    from: [18, -26, 24],
  },
  {
    key: 'teal',
    light: '#20B9C2',
    dark: '#0E9AA6',
    d: 'M176 99C188 90 200 98 202 118C205 150 186 182 152 196C138 201 128 189 127 169C126 156 130 148 140 141C152 131 165 113 176 99Z',
    // His hand: it turns where it joins him.
    pivot: [134, 168],
    out: [1, 0.55],
    from: [26, 16, 20],
  },
  {
    key: 'blue',
    light: '#2290FF',
    dark: '#0C6BE4',
    d: 'M34 142C46 134 60 134 70 140C82 146 96 147 108 150C120 154 122 170 120 188C118 204 108 214 92 210C66 206 40 196 30 172C26 160 26 148 34 142Z',
    pivot: [104, 172],
    out: [-0.7, 1],
    from: [-20, 24, -20],
  },
]
const P = ['y', 'o', 't', 'b']

// He stands in a three-quarter pose, his face turned and tipped up to his
// right, as in the logo. So his face is drawn level and then tipped by
// FACE_TILT as one piece: the eyes are a matched pair, the same size and
// level with each other along the face, the mouth is centred under them, and
// a blink closes both alike along the face's own angle rather than the
// page's.
const FACE_TILT = { angle: -16, cx: 118, cy: 110 }
const EYES = [
  { cx: 91, cy: 110 },
  { cx: 145, cy: 110 },
]
const MOUTH = { cx: 118, cy: 134 }

// The colours he throws when he celebrates, round him at even angles.
const CONFETTI = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return {
    d: `M${110 + c * 104} ${122 + s * 104}L${110 + c * 126} ${122 + s * 126}`,
    color: ['#F7B12E', '#F26A38', '#0E9AA6', '#0C6BE4', '#1A85FF'][i % 5],
    i,
  }
})

// ------------------------------------------------------------------ the rig

// Every moving part at rest. y is height (negative is up); sx/sy squash and
// stretch from the feet; lean turns him from the feet; head turns from the
// neck; open is how open an eye is; happy turns the eyes into smiling arcs;
// mouth shows the mouth, smile curves it (−1 a frown) and talk opens it;
// each petal has x, y, turn and opacity; the last four are the burst's forms.
const REST = {
  y: 0, sx: 1, sy: 1, lean: 0, grow: 1, bodyA: 1,
  head: 0, headY: 0,
  openL: 1, openR: 1, eyes: 1, happy: 0, lookX: 0, lookY: 0,
  mouth: 0, smile: 0, talk: 0,
  yX: 0, yY: 0, yR: 0, yA: 1,
  oX: 0, oY: 0, oR: 0, oA: 1,
  tX: 0, tY: 0, tR: 0, tA: 1,
  bX: 0, bY: 0, bR: 0, bA: 1,
  bang: 1, dots: 0, question: 0, zzz: 0,
}

// How each kind of part moves. Stiff and well damped for eyelids, so a blink
// is quick and clean; looser for the body, so a landing settles with a
// little give; no overshoot at all for anything fading.
const SPRINGS = {
  blink: { k: 900, d: 48 },
  look: { k: 160, d: 20 },
  body: { k: 260, d: 17 },
  head: { k: 200, d: 16 },
  petal: { k: 190, d: 15 },
  fade: { k: 160, d: 26 },
  face: { k: 260, d: 24 },
}
const springOf = (key) => {
  if (key === 'openL' || key === 'openR') return SPRINGS.blink
  if (key === 'lookX' || key === 'lookY') return SPRINGS.look
  if (key === 'head' || key === 'headY') return SPRINGS.head
  if (/^[yotb][XYR]$/.test(key)) return SPRINGS.petal
  if (/A$|^(bang|dots|question|zzz|mouth)$/.test(key)) return SPRINGS.fade
  if (key === 'smile' || key === 'talk' || key === 'eyes' || key === 'happy') return SPRINGS.face
  return SPRINGS.body
}

const state = {}
Object.keys(REST).forEach((key) => (state[key] = { x: REST[key], v: 0, spring: springOf(key) }))

// Where each mood wants him, over rest.
const MOODS = {
  idle: {},
  listening: { lean: -4, eyes: 1.1, yX: -4, yY: -3, oX: 2, oY: -5, tX: 4, tY: 2, bang: 0 },
  thinking: { head: 4, lookX: 3, lookY: -3.5, bang: 0, dots: 1 },
  talking: { mouth: 1, smile: 0.25 },
  happy: { happy: 1, mouth: 1, smile: 1, yX: -3, yY: -2, yR: -4, oX: 2, oY: -3, oR: 4 },
  confused: { head: -9, openR: 0.55, tX: 3, tY: -6, tR: -8, bX: -3, bY: -5, bR: 8, mouth: 1, smile: -0.35, bang: 0, question: 1 },
  sad: { sx: 1.04, sy: 0.95, yX: -2, yY: 6, yR: -10, oX: 2, oY: 5, oR: 9, tY: 4, bY: 4, lookX: -1, lookY: 3.5, mouth: 1, smile: -1, bang: 0 },
  sleeping: { sx: 1.03, sy: 0.96, head: 6, openL: 0.06, openR: 0.06, yY: 3, oY: 3, tY: 3, bY: 3, lookY: 1, bang: 0, zzz: 1 },
}
// Moods that steer the eyes themselves rather than letting them follow.
const OWN_GAZE = new Set(['thinking', 'sad', 'sleeping'])
// Moods that keep moving for as long as they last.
const LIVELY = new Set(['listening', 'thinking', 'talking', 'sleeping'])

// --------------------------------------------------------------- gestures

// A gesture is a list of beats: at so many milliseconds in, these parts
// should head here. Between beats and after the last the springs do the
// rest, and when it ends everything heads back to the mood.
const flare = (amount) =>
  Object.fromEntries(PETALS.flatMap((petal, i) => [[`${P[i]}X`, petal.out[0] * amount], [`${P[i]}Y`, petal.out[1] * amount]]))

const GESTURES = {
  wave: {
    length: 1250,
    beats: [
      // Out and up, away from his face, and back, twice.
      [0, { happy: 1, mouth: 1, smile: 1, tR: 26, tX: 6, tY: -10 }],
      [230, { tR: 4 }],
      [460, { tR: 26 }],
      [690, { tR: 4 }],
      [920, { tR: 18 }],
      [1100, { tR: 0, tX: 0, tY: 0 }],
    ],
  },
  jump: {
    length: 950,
    beats: [
      [0, { sx: 1.1, sy: 0.86 }],
      [150, { y: -38, sx: 0.94, sy: 1.08 }],
      [430, { y: 0, sx: 1, sy: 1 }],
      [560, { sx: 1.08, sy: 0.9 }],
      [700, { sx: 1, sy: 1 }],
    ],
  },
  hop: {
    length: 900,
    beats: [
      [0, { sx: 1.05, sy: 0.94 }],
      [110, { y: -12, sx: 0.97, sy: 1.03 }],
      [300, { y: 0, sx: 1.04, sy: 0.95 }],
      [430, { y: -10, sx: 0.98, sy: 1.02 }],
      [620, { y: 0, sx: 1, sy: 1 }],
    ],
  },
  nod: {
    length: 900,
    beats: [
      [0, { headY: 5, head: 1, lookY: 2 }],
      [200, { headY: -1 }],
      [400, { headY: 5 }],
      [600, { headY: 0, head: 0 }],
    ],
  },
  shake: {
    length: 950,
    beats: [
      [0, { head: -9, lookX: -2 }],
      [170, { head: 8, lookX: 2 }],
      [340, { head: -5, lookX: -1 }],
      [510, { head: 3, lookX: 1 }],
      [680, { head: 0, lookX: 0 }],
    ],
  },
  wink: {
    length: 650,
    beats: [
      [0, { openR: 0.04, head: 5, mouth: 1, smile: 0.7 }],
      [420, { openR: 1, head: 0 }],
    ],
  },
  surprise: {
    length: 1100,
    beats: [
      [0, { eyes: 1.3, mouth: 1, smile: 0, talk: 0.75, y: -12, ...flare(9) }],
      [200, { y: 0, ...flare(0) }],
      [800, { eyes: 1, talk: 0 }],
    ],
  },
  celebrate: {
    length: 1700,
    beats: [
      [0, { happy: 1, mouth: 1, smile: 1, sx: 1.1, sy: 0.86 }],
      [150, { y: -40, sx: 0.94, sy: 1.08, tR: 22, bR: -16, ...flare(8) }],
      [450, { y: 0, sx: 1, sy: 1 }],
      [580, { sx: 1.08, sy: 0.9, tR: 0, bR: 0, ...flare(0) }],
      [720, { sx: 1, sy: 1 }],
    ],
  },
  glance: {
    length: 1800,
    beats: [
      [0, { lookX: -5, lookY: 1 }],
      [750, { lookX: 5, lookY: -1 }],
      [1450, { lookX: 0, lookY: 0 }],
    ],
  },
  peek: {
    length: 1500,
    beats: [
      [0, { lookX: 5, lookY: -4.5, head: 3 }],
      [250, { bang: 0 }],
      [450, { bang: 1 }],
      [1200, { lookX: 0, lookY: 0, head: 0 }],
    ],
  },
  // How he arrives: the body lands, the petals close round him one after
  // another from where they rest, he opens his eyes, the "!" goes off.
  arrive: {
    length: 1300,
    beats: [
      [0, { grow: 1, bodyA: 1 }],
      [150, { yX: 0, yY: 0, yR: 0, yA: 1 }],
      [250, { oX: 0, oY: 0, oR: 0, oA: 1 }],
      [350, { tX: 0, tY: 0, tR: 0, tA: 1 }],
      [450, { bX: 0, bY: 0, bR: 0, bA: 1 }],
      [800, { openL: 1, openR: 1 }],
      [1000, { bang: 1 }],
    ],
  },
}

// Where he starts before arriving, held there by the opening beat of
// `arrive` until each part's turn comes.
const UNARRIVED = {
  grow: 0.6, bodyA: 0, openL: 0.05, openR: 0.05, bang: 0,
  ...Object.fromEntries(
    PETALS.flatMap((petal, i) => [
      [`${P[i]}X`, petal.from[0]],
      [`${P[i]}Y`, petal.from[1]],
      [`${P[i]}R`, petal.from[2]],
      [`${P[i]}A`, 0],
    ])
  ),
}

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let gesture = null // { name, start, held }
let confettiAt = -1
const confetti = ref(0)

const play = (name) => {
  const spec = GESTURES[name]
  if (!spec || reduced) return
  gesture = { name, spec, start: performance.now(), held: {} }
  if (name === 'celebrate') confetti.value += 1
  wake()
}

// ------------------------------------------------------------- the inputs

let blinkUntil = 0
let blinkTimer = null
const scheduleBlink = () => {
  blinkTimer = setTimeout(() => {
    if (props.mood !== 'sleeping') {
      blinkUntil = performance.now() + 110
      // Now and then twice, so it never reads as a metronome.
      if (Math.random() < 0.22) setTimeout(() => ((blinkUntil = performance.now() + 110), wake()), 260)
      wake()
    }
    scheduleBlink()
  }, 2400 + Math.random() * 4200)
}

const FIDGETS = ['glance', 'glance', 'wink', 'hop', 'peek', 'wave']
let fidgetTimer = null
const scheduleFidget = () => {
  fidgetTimer = setTimeout(() => {
    if (props.mood === 'idle' && !gesture && props.fidget) play(FIDGETS[Math.floor(Math.random() * FIDGETS.length)])
    scheduleFidget()
  }, 8000 + Math.random() * 9000)
}

const root = ref(null)
const pointerLook = { x: 0, y: 0 }
const onPointerMove = (event) => {
  const el = root.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const dx = event.clientX - (box.left + box.width * 0.45)
  const dy = event.clientY - (box.top + box.height * 0.45)
  const distance = Math.hypot(dx, dy) || 1
  const reach = Math.min(1, distance / (box.width * 1.4)) * 4
  pointerLook.x = (dx / distance) * reach
  pointerLook.y = (dy / distance) * reach * 0.8
  wake()
}

// A tap plays something different from last time.
const TAP = ['wave', 'jump', 'wink', 'celebrate', 'nod', 'surprise', 'hop']
let lastTap = ''
const onTap = () => {
  if (!props.interactive) return
  const choices = TAP.filter((name) => name !== lastTap)
  lastTap = choices[Math.floor(Math.random() * choices.length)]
  play(lastTap)
}

// -------------------------------------------------------------- targets

// Small movements a lively mood keeps making, as a function of time, added
// to where it rests. Smooth curves, so the springs have nothing to catch up.
const smooth = (p) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p) ** 2)

const liveliness = (mood, t, target) => {
  if (mood === 'thinking') {
    // The petals lift one after another round him, like a spinner.
    PETALS.forEach((petal, i) => {
      const phase = ((t / 1700 - i / 4) % 1 + 1) % 1
      const lift = smooth(phase / 0.45) * 6
      target[`${P[i]}X`] += petal.out[0] * lift
      target[`${P[i]}Y`] += petal.out[1] * lift
    })
  } else if (mood === 'talking') {
    // A mouth that opens on an uneven rhythm, as speech does, the head
    // turning a little with it and the hand coming up now and then.
    const syllable = Math.abs(Math.sin(t / 95) * Math.sin(t / 233 + 1.3))
    target.talk = 0.12 + syllable * 0.88
    target.head += Math.sin(t / 520) * 2.2
    target.headY += Math.sin(t / 260) * 0.8
    target.tR += 12 * smooth(((t / 4200) % 1) / 0.3)
  } else if (mood === 'listening') {
    // The orange petal twitches as if catching a word.
    target.oR += 7 * smooth(((t / 2600) % 1 - 0.8) / 0.12)
  } else if (mood === 'sleeping') {
    target.headY += Math.sin(t / 900) * 0.6
  }
}

const targetsAt = (t) => {
  const target = { ...REST, ...(MOODS[props.mood] || {}) }
  if (!props.sparks) Object.assign(target, { bang: 0, dots: 0, question: 0, zzz: 0 })
  if (props.follow && !OWN_GAZE.has(props.mood)) {
    target.lookX += pointerLook.x
    target.lookY += pointerLook.y
  }
  liveliness(props.mood, t, target)

  if (gesture) {
    const elapsed = t - gesture.start
    if (elapsed > gesture.spec.length) {
      gesture = null
    } else {
      // Every beat reached so far, the latest winning, so a part a gesture
      // has moved stays put until the gesture moves it again or ends.
      gesture.spec.beats.forEach(([at, beat]) => {
        if (elapsed >= at) Object.assign(gesture.held, beat)
      })
      Object.assign(target, gesture.held)
    }
  }

  if (t < blinkUntil) {
    target.openL = Math.min(target.openL, 0.05)
    target.openR = Math.min(target.openR, 0.05)
  }
  return target
}

// ------------------------------------------------------------- the frame

const el = {}
const bind = (name) => (node) => {
  el[name] = node
}

const f = (n) => Math.round(n * 100) / 100
const mouthPath = (s) => {
  const { cx, cy } = MOUTH
  const smile = s.smile.x
  const talk = Math.max(0, s.talk.x)
  const half = 9 + talk * 2.5
  const corner = cy - smile * 2
  const top = cy + smile * 4 - talk * 4
  const bottom = cy + smile * 9 + talk * 13
  return `M${f(cx - half)} ${f(corner)}Q${cx} ${f(top)} ${f(cx + half)} ${f(corner)}Q${cx} ${f(bottom)} ${f(cx - half)} ${f(corner)}Z`
}

const draw = (t) => {
  const s = state
  const x = (key) => s[key].x
  if (!el.pose) return

  el.shadow.setAttribute('transform', `translate(112 222) scale(${f(1 + x('y') / 90)} 1) translate(-112 -222)`)
  el.shadow.style.opacity = f(0.35 * x('bodyA') * (1 + x('y') / 120))
  el.pose.setAttribute(
    'transform',
    `translate(0 ${f(x('y'))}) translate(112 221) rotate(${f(x('lean'))}) scale(${f(x('sx') * x('grow'))} ${f(x('sy') * x('grow'))}) translate(-112 -221)`
  )
  el.pose.style.opacity = f(x('bodyA'))
  el.head.setAttribute('transform', `translate(0 ${f(x('headY'))}) rotate(${f(x('head'))} 112 185)`)

  PETALS.forEach((petal, i) => {
    const k = P[i]
    const node = el[`petal${i}`]
    node.setAttribute('transform', `translate(${f(x(`${k}X`))} ${f(x(`${k}Y`))}) rotate(${f(x(`${k}R`))} ${petal.pivot[0]} ${petal.pivot[1]})`)
    node.style.opacity = f(Math.min(1, Math.max(0, x(`${k}A`))))
  })

  el.face.setAttribute('transform', `translate(${f(x('lookX'))} ${f(x('lookY'))})`)
  const happy = Math.min(1, Math.max(0, x('happy')))
  ;['openL', 'openR'].forEach((key, i) => {
    const { cx, cy } = EYES[i]
    const size = x('eyes')
    // The open eye squeezes shut well before the smiling one has faded in,
    // so the two are never seen at once.
    const open = Math.max(0.03, x(key)) * Math.max(0.03, 1 - happy * 1.8)
    el[`eye${i}`].setAttribute('transform', `translate(${cx} ${cy}) scale(${f(size)} ${f(size * open)}) translate(${-cx} ${-cy})`)
  })
  el.happy.style.opacity = f(Math.max(0, happy * 1.4 - 0.4))
  el.happy.setAttribute('transform', `translate(0 ${f((1 - happy) * 3)})`)

  const mouth = Math.min(1, Math.max(0, x('mouth')))
  el.mouth.style.opacity = f(mouth)
  el.mouth.setAttribute('d', mouthPath(s))

  if (el.bang) {
    const bang = Math.min(1, Math.max(0, x('bang')))
    el.bang.style.opacity = f(bang)
    el.bang.setAttribute('transform', `translate(${f((1 - bang) * -8)} ${f((1 - bang) * 6)})`)
    // Talking, the strokes pulse outwards one after another like sound.
    el.sparks.forEach((node, i) => {
      const pulse = props.mood === 'talking' ? 0.35 + 0.65 * smooth(((t / 1200 - i * 0.15) % 1 + 1) % 1) : 1
      node.style.opacity = f(pulse)
    })

    el.dots.style.opacity = f(Math.max(0, x('dots')))
    el.dotNodes.forEach((node, i) => {
      const phase = ((t / 1100 - i * 0.16) % 1 + 1) % 1
      const lift = smooth(phase / 0.5)
      node.setAttribute('transform', `translate(0 ${f(-lift * 5)})`)
      node.style.opacity = f(0.4 + lift * 0.6)
    })

    const question = Math.max(0, x('question'))
    el.question.style.opacity = f(question)
    el.question.setAttribute('transform', `rotate(${f((1 - question) * 25)} 220 48)`)

    el.zzz.style.opacity = f(Math.max(0, x('zzz')))
    el.zNodes.forEach((node, i) => {
      const phase = ((t / 3000 - i / 3) % 1 + 1) % 1
      node.setAttribute('transform', `translate(${f(-6 + phase * 12)} ${f(8 - phase * 18)})`)
      node.style.opacity = f(Math.sin(Math.PI * phase))
    })
  }
}

let frame = 0
let last = 0
const tick = (now) => {
  frame = 0
  const dt = Math.min(0.034, (now - (last || now)) / 1000) || 0.016
  last = now
  const target = targetsAt(now)

  let moving = false
  Object.keys(state).forEach((key) => {
    const part = state[key]
    const goal = target[key]
    if (reduced) {
      part.x = goal
      part.v = 0
      return
    }
    // A damped spring, stepped semi-implicitly so it stays stable at any
    // frame rate.
    const { k, d } = part.spring
    part.v += (k * (goal - part.x) - d * part.v) * dt
    part.x += part.v * dt
    if (Math.abs(goal - part.x) > 0.002 || Math.abs(part.v) > 0.01) moving = true
  })
  draw(now)

  // Rest when nothing is moving and nothing is due to, so a still YUNIT
  // costs nothing.
  if (moving || gesture || LIVELY.has(props.mood) || now < blinkUntil) frame = requestAnimationFrame(tick)
  else last = 0
}

const wake = () => {
  if (!frame) frame = requestAnimationFrame(tick)
}

// A change of mood that deserves a gesture on the way in.
watch(
  () => props.mood,
  (mood, was) => {
    if (mood === 'happy') play('hop')
    else if (mood === 'idle' && was === 'sleeping') play('surprise')
    wake()
  }
)
watch(() => [props.sparks, props.follow], wake)

onMounted(() => {
  if (reduced) {
    wake()
    return
  }
  Object.entries(UNARRIVED).forEach(([key, value]) => (state[key].x = value))
  gesture = { name: 'arrive', spec: { ...GESTURES.arrive, beats: [[0, { ...UNARRIVED, grow: 1, bodyA: 1 }], ...GESTURES.arrive.beats.slice(1)] }, start: performance.now(), held: {} }
  wake()
  scheduleBlink()
  scheduleFidget()
  window.addEventListener('pointermove', onPointerMove, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  clearTimeout(blinkTimer)
  clearTimeout(fidgetTimer)
  window.removeEventListener('pointermove', onPointerMove)
})

defineExpose({ play })
</script>

<template>
  <component
    :is="interactive ? 'button' : 'span'"
    ref="root"
    :type="interactive ? 'button' : undefined"
    :aria-label="interactive ? 'Say hello to YUNIT' : undefined"
    class="yunit"
    @click="onTap"
  >
    <svg viewBox="0 0 250 240" :aria-hidden="interactive ? 'true' : undefined" :role="interactive ? undefined : 'img'">
      <title v-if="!interactive">YUNIT</title>
      <defs>
        <linearGradient v-for="petal in PETALS" :id="id + petal.key" :key="petal.key" x1="0" y1="0" x2="1" y2=".45">
          <stop offset="0" :stop-color="petal.light" />
          <stop offset=".54" :stop-color="petal.light" />
          <stop offset=".54" :stop-color="petal.dark" />
          <stop offset="1" :stop-color="petal.dark" />
        </linearGradient>
      </defs>

      <ellipse :ref="bind('shadow')" class="y-shadow" cx="112" cy="222" rx="78" ry="6" />

      <g :ref="bind('pose')">
        <g class="y-feet">
          <ellipse cx="82" cy="211" rx="16" ry="10" />
          <ellipse cx="142" cy="211" rx="16" ry="10" />
        </g>

        <g :ref="bind('head')">
          <circle class="y-body" cx="110" cy="122" r="60" />

          <g v-for="(petal, i) in PETALS" :key="petal.key" :ref="bind(`petal${i}`)">
            <path :fill="`url(#${id}${petal.key})`" :d="petal.d" />
          </g>

          <g :ref="bind('face')">
            <g :transform="`rotate(${FACE_TILT.angle} ${FACE_TILT.cx} ${FACE_TILT.cy})`">
            <g v-for="(eye, i) in EYES" :key="i" :ref="bind(`eye${i}`)">
              <ellipse class="y-iris" :cx="eye.cx" :cy="eye.cy" rx="10.5" ry="15" />
              <ellipse class="y-glint" :cx="eye.cx + 3.6" :cy="eye.cy - 6.5" rx="2.5" ry="3.5" />
            </g>
            <!-- Smiling eyes, faded in as the open ones squeeze shut. -->
            <g :ref="bind('happy')" style="opacity: 0">
              <path class="y-line" :d="`M${EYES[0].cx - 10} ${EYES[0].cy + 3}Q${EYES[0].cx} ${EYES[0].cy - 10} ${EYES[0].cx + 10} ${EYES[0].cy + 3}`" />
              <path class="y-line" :d="`M${EYES[1].cx - 10} ${EYES[1].cy + 3}Q${EYES[1].cx} ${EYES[1].cy - 10} ${EYES[1].cx + 10} ${EYES[1].cy + 3}`" />
            </g>
            <!-- The logo has no mouth, so he grows one only when he has
                 something to say with it. One shape, bent by smile and
                 opened by talk, so a smile can turn into speech. -->
            <path :ref="bind('mouth')" class="y-mouth" style="opacity: 0" d="" />
            </g>
          </g>
        </g>

        <template v-if="sparks">
          <g :ref="bind('bang')" style="opacity: 0">
            <path
              v-for="(d, i) in ['M207 14L196 31', 'M236 43L212 52', 'M233 77L214 73']"
              :key="i"
              :ref="(node) => ((el.sparks ||= [])[i] = node)"
              class="y-spark"
              :d="d"
            />
          </g>
          <g :ref="bind('dots')" class="y-fill" style="opacity: 0">
            <circle v-for="i in 3" :key="i" :ref="(node) => ((el.dotNodes ||= [])[i - 1] = node)" :cx="190 + i * 16" cy="24" r="5.5" />
          </g>
          <g :ref="bind('question')" style="opacity: 0">
            <path class="y-spark" d="M206 30Q206 14 220 14Q234 14 234 27Q234 36 222 40V48" />
            <circle class="y-fill" cx="222" cy="64" r="5" />
          </g>
          <g :ref="bind('zzz')" class="y-fill y-z" style="opacity: 0">
            <text :ref="(node) => ((el.zNodes ||= [])[0] = node)" x="196" y="66" font-size="22">z</text>
            <text :ref="(node) => ((el.zNodes ||= [])[1] = node)" x="212" y="44" font-size="28">z</text>
            <text :ref="(node) => ((el.zNodes ||= [])[2] = node)" x="230" y="20" font-size="34">z</text>
          </g>
        </template>
      </g>

      <!-- Confetti is the one thing not on the rig: it flies off and is
           gone, so a fresh set is drawn for each celebration. -->
      <g v-if="confetti" :key="confetti" class="y-confetti">
        <path v-for="bit in CONFETTI" :key="bit.i" :style="{ '--i': bit.i, stroke: bit.color }" pathLength="1" :d="bit.d" />
      </g>
    </svg>
  </component>
</template>

<style scoped>
.yunit {
  display: block;
  line-height: 0;
  -webkit-tap-highlight-color: transparent;
  /* His own colours, not tokens: like the app icons he is Ekkly's artwork
     and keeps them on every church's page (BRAND.md). */
  --y-navy: #1d3a66;
  --y-spark: #1a85ff;
  --y-body-edge: #e3e9f3;
}

button.yunit {
  appearance: none;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: 1.5rem;
}

button.yunit:focus-visible {
  outline: 2px solid var(--color-primary, currentColor);
  outline-offset: 4px;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.y-shadow {
  fill: #b9c6dc;
  opacity: 0.35;
}

.y-feet,
.y-iris,
.y-mouth {
  fill: var(--y-navy);
}

.y-body {
  fill: #fff;
  stroke: var(--y-body-edge);
  stroke-width: 1.5;
}

.y-glint {
  fill: #fff;
}

.y-line {
  fill: none;
  stroke: var(--y-navy);
  stroke-width: 7;
  stroke-linecap: round;
}

.y-spark {
  fill: none;
  stroke: var(--y-spark);
  stroke-width: 8;
  stroke-linecap: round;
}

.y-fill {
  fill: var(--y-spark);
}

.y-z {
  font-weight: 800;
}

.y-confetti path {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  animation: y-confetti 1.1s cubic-bezier(0.2, 0.7, 0.3, 1) calc(0.22s + var(--i) * 0.025s) both;
}

@keyframes y-confetti {
  0% {
    opacity: 1;
    stroke-dashoffset: 1;
  }
  45% {
    opacity: 1;
    stroke-dashoffset: 0;
  }
  100% {
    opacity: 0;
    stroke-dashoffset: -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .y-confetti {
    display: none;
  }
}

.dark .y-shadow {
  fill: #000;
}

.dark .yunit {
  --y-body-edge: transparent;
}
</style>

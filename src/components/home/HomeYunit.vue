<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowCounterClockwise, ArrowsOutSimple, ChatCircleDots, PaperPlaneRight, SpeakerHigh, SpeakerSlash, X } from '../../icons'
import YunitMascot, { YUNIT_ACTIONS, YUNIT_MOODS } from '../yunit/YunitMascot.vue'
import YunitThread from '../yunit/YunitThread.vue'
import YunitWordmark from '../yunit/YunitWordmark.vue'
import { useFollowReplies, useYunitChat } from '../../composables/useYunitChat'
import { usePermissions } from '../../composables/usePermissions'
import { useScrollLock } from '../../composables/useScrollLock'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useTheme } from '../../composables/useTheme'
import { isRailCollapsed } from '../../composables/usePresence'
import { tipsFor } from '../../data/yunitTips'
import { feel, setYunitSound, yunitSound } from '../../utils/yunitFeedback'

// YUNIT on the home of all apps: a character standing on it, not a card on
// it. He says hello, and is talked to without leaving the home.
//
// On a phone he stands at the foot of the screen, in the church's room to the
// left of the church so it stays whole. On a desktop he stands in his place
// on the board (`anchor`), wherever among the panels he has been put, at its
// right-hand end (`side`); to begin with at the foot of the last column, next
// to the people rail — so when the rail opens it shoves him along with the
// column, and he is seen to be bowled over (below). Either way he stands
// large, so he is the thing seen there, with only a button to talk to him
// beside him: the box to write in comes with the conversation.
// The first time the home opens in a visit he arrives, waves and says hello
// in a speech bubble, with one thing he can be asked; tapping him has him say
// another.
//
// Writing to him, the home dims behind him and the conversation rises from
// where he stands as speech bubbles: no sheet, no panel, nothing round it.
// He stays where he was, beside the box, listening while you type, thinking
// while he looks through the records, talking as his answer comes up. A tap
// on the dimmed home, or the cross, puts the conversation away, and he
// carries on at the foot with an answer still on its way.
//
// The box is one element at rest and in conversation, unseen at rest and
// shown in it, so the keyboard the button brings up (by focusing it) stays up
// as the conversation opens round it: a box swapped for another would lose
// the focus, and on a phone the keyboard with it.
//
// Before anything is said, his hello is the conversation's first line, with
// things to ask him under it (data/yunitTips.js). The quick actions are not
// his: they are the "+" on the day's card, phone and desktop alike
// (QuickActionsMenu), since they only open a form, which he does not do.
//
// It is the same conversation as his page (useYunitChat), so it carries on at
// /yunit, which the button above it opens.
//
// He moves only because something happened (BRAND.md): arriving, a hello, a
// tap, the conversation. Left alone a long while he falls asleep; a tap on
// him wakes him with a start, and being talked to wakes him gently.

const props = defineProps({
  // Whom he is greeting.
  name: { type: String, default: '' },
  // On a desktop, his place on the board, where he stands. On a phone he
  // stands at the foot of the screen without one.
  anchor: { default: null },
  // Which end of his place he stands at, his box on his other side: 'left'
  // on a phone, beside the church; 'right' on a desktop, beside the rail.
  side: { type: String, default: 'left' },
  // In the column next to the people rail, which bowls him over as it opens.
  besideRail: { type: Boolean, default: false },
  // He can be picked up and stood in another column (a desktop's board).
  movable: { type: Boolean, default: false },
  // On a desktop, where his place is just above the church: a spot on the
  // church's hill for him to stand on (Apps.vue), his bubble and its buttons
  // staying in his place above it. Null anywhere else.
  perch: { default: null },
  // The live sky over the church, { phase, weather, rainbow }, when the person follows
  // it (useLiveSky); null when they do not, and he goes by the theme.
  sky: { type: Object, default: null },
})

// `drag` while he is carried, and `place` where he is put down, each with the
// pointer's x and y, for the board to say where among its panels that is.
const emit = defineEmits(['drag', 'place'])

const { messages, draft, sending, focused, mood, doing, cue, send, ask, clear, stir, speak } = useYunitChat()
const { canView } = usePermissions()

const open = ref(false)
const chatting = computed(() => messages.value.length > 0)
const tips = computed(() => tipsFor(canView))

const root = ref(null)
const mascot = ref(null)
const scroller = ref(null)
const input = ref(null)

const status = computed(() => {
  if (doing.value) return `Looking at ${doing.value.toLowerCase()}…`
  if (sending.value) return mood.value === 'talking' ? 'Answering…' : 'Thinking…'
  return 'Your church’s assistant'
})

const placeholder = computed(() => (chatting.value ? 'Reply to YUNIT…' : 'Ask or tell YUNIT…'))

/* ------------------------------------------------------- where he stands */

// On a phone, the foot of the screen, clear of the home indicator or above
// the bottom bar (--yunit-foot, which the home sets), by the classes alone.
// On a desktop, his place on the board, measured, and measured again as the
// window or the column changes — every frame of
// the rail opening, so he travels with the column rather than jumping.
const right = computed(() => props.side === 'right')
const spot = ref(null)
const place = () => {
  const el = props.anchor
  if (!el) {
    spot.value = null
    return
  }
  const box = el.getBoundingClientRect()
  // Beside the church he keeps in from the edge its room runs out to.
  const inset = right.value ? 0 : 24
  spot.value = {
    left: Math.round(box.left + inset),
    right: Math.round(window.innerWidth - box.right),
    width: Math.round(Math.max(0, box.width - inset)),
    bottom: Math.round(Math.max(16, window.innerHeight - box.bottom)),
  }
}
// At rest on a desktop he is in his place (inPlace, the template), so nothing
// needs measuring for him to stand in it, however the panels round it move.
// It is measured only for what lifts him out over the home: the conversation
// rising from where he stood, measured as it opens and again if the window
// changes while it is open.
const inPlace = computed(() => !!props.anchor && !open.value && !carried.value)
// Standing on the church's hill: at rest in his place, where it has one.
const onHill = computed(() => inPlace.value && !!props.perch)
// His place on the board is as tall as he and his bubble are. Lifted out of
// it, to be talked to or carried, it keeps that height until he is back, so
// the panels round it do not close up and open again under him.
let kept = null
const keepRoom = (on) => {
  if (on && props.anchor && !kept) {
    kept = props.anchor
    kept.style.minHeight = `${kept.offsetHeight}px`
  } else if (!on && kept) {
    kept.style.minHeight = ''
    kept = null
  }
}
watch(() => [props.anchor, props.side], place, { immediate: true })
onMounted(() => window.addEventListener('resize', place))

// Picked up. On a desktop he can be moved anywhere on the board (`movable`):
// pressed and moved a little, he is lifted with his box, startled, and
// carried under the pointer while the board shows where he would land
// (`drag`); let go, he stands there (`place`), landing with a
// jump. A press that does not move is still a tap on him, and he cannot be
// carried off in the middle of a conversation.
const stage = ref(null)
const carried = ref(null)
let grab = null
const onCarry = (event) => {
  if (!grab) return
  if (!carried.value) {
    if (Math.hypot(event.clientX - grab.x, event.clientY - grab.y) < 6) return
    hideBubble()
    stir()
    keepRoom(true)
    mascot.value?.play('surprise')
    feel('pickup')
  }
  event.preventDefault()
  grab.lastX = event.clientX
  grab.lastY = event.clientY
  carried.value = { left: event.clientX - grab.dx, top: event.clientY - grab.dy, width: grab.width }
  emit('drag', { x: event.clientX, y: event.clientY })
}
const onPutDown = () => {
  window.removeEventListener('pointermove', onCarry)
  window.removeEventListener('pointerup', onPutDown)
  window.removeEventListener('pointercancel', onPutDown)
  if (carried.value) {
    // The click this press ends on is not a tap on him.
    const stop = (event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
    carried.value = null
    keepRoom(false)
    emit('place', { x: grab.lastX, y: grab.lastY })
    nextTick(() => mascot.value?.play('jump'))
    feel('putdown')
  }
  grab = null
}
// He is taken by himself or by the button beside him (`by`). Either way the
// press is his, not the board's, which would otherwise start dragging his
// place as a panel from under him. A press on the button that never moves is
// a click on it, which opens the conversation (talk); one that carries him
// off is not (onPutDown swallows that click).
const onGrab = (event, by = 'him') => {
  if (!props.movable || roaming.value || open.value || event.button !== 0 || event.pointerType === 'touch' || !stage.value) return
  event.stopPropagation()
  const box = stage.value.getBoundingClientRect()
  grab = { by, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, dx: event.clientX - box.left, dy: event.clientY - box.top, width: box.width }
  window.addEventListener('pointermove', onCarry)
  window.addEventListener('pointerup', onPutDown)
  window.addEventListener('pointercancel', onPutDown)
}
// "Talk to YUNIT": the box, unseen beside him, takes the focus there and
// then, which opens the conversation round it (onFocus). In the click itself,
// not after, or a phone would not bring its keyboard up.
const talk = () => {
  input.value?.focus()
  openChat()
}

// Open, the conversation takes the whole height above him, he having come
// down to the foot of the screen (openChat), and on a desktop as wide as
// reads well, reaching away from the end of his column he stands at.
const stageStyle = computed(() => {
  if (carried.value) return { left: `${carried.value.left}px`, top: `${carried.value.top}px`, width: `${carried.value.width}px` }
  const at = spot.value
  if (!at || inPlace.value) return null
  const edge = right.value ? { right: `${at.right}px` } : { left: `${at.left}px` }
  const from = right.value ? at.right : at.left
  return open.value
    ? { ...edge, bottom: '1.25rem', top: '1.5rem', width: `max(${at.width}px, min(28rem, calc(100vw - ${from + 24}px)))` }
    : { ...edge, bottom: `${at.bottom}px`, width: `${at.width}px` }
})

// Pushed. Beside the people rail, he goes wherever its opening or closing
// takes the column: opening, it comes in from the right and knocks him off
// his feet, and he rolls over and over along the foot of the screen as the
// column carries him, lands dizzy and glares back at it; closing, it goes
// from beside him and he stumbles after it. The "!" goes off for it, and he
// yelps if his sounds are on (it follows a click, so it may).
const railShown = useMediaQuery('(min-width: 1280px)')
const startled = ref(false)
let startledTimer = null
watch(isRailCollapsed, (collapsed) => {
  if (!props.besideRail || !props.anchor || !railShown.value || open.value || carried.value) return
  mascot.value?.play(collapsed ? 'stumbleRight' : 'rollLeft')
  feel(collapsed ? 'stumble' : 'knocked')
  startled.value = true
  clearTimeout(startledTimer)
  startledTimer = setTimeout(() => (startled.value = false), 2100)
  stir()
})

/* ------------------------------------------------------------ what he says */

// Kept on the device, whatever might go wrong with it: at worst he says
// hello again, or introduces himself twice.
const readStore = (kind, key) => {
  try {
    return window[kind].getItem(key)
  } catch {
    return null
  }
}
const writeStore = (kind, key, value) => {
  try {
    window[kind].setItem(key, value)
  } catch {
    // Said again next time; no harm in that.
  }
}

// He says who he is the first time ever on this device (MET), and hello once
// a visit (GREETED): back on the home later in the same visit, he is simply
// there, without arriving again.
const MET = 'ekkly:yunit-met'
const GREETED = 'ekkly:yunit-greeted'
const firstThisVisit = readStore('sessionStorage', GREETED) !== '1'

const INTRO = 'Ask me about the church, or tell me what to change. I’ll check with you first.'
const hi = computed(() => (props.name ? `Hi, ${props.name}!` : 'Hi!'))

// One thing he can be asked: a different one each day to start with, then the
// next each time he is tapped.
const today = Math.floor(Date.now() / 86400000)
let tipAt = today
const todaysTip = () => (tips.value.length ? tips.value[today % tips.value.length] : null)
const nextTip = () => {
  tipAt += 1
  return tips.value.length ? tips.value[tipAt % tips.value.length] : null
}

// What he last said: a hello in bold, a line, and the question it offers
// (`tip`). Before he has said anything, the conversation opens on hello and
// what he is for. Shallow, since it is only ever replaced whole: deep, the
// tip's icon (a component) was made reactive too, which Vue warns against.
const said = shallowRef(null)
const toWords = ({ hello, line }) => [
  ...(hello ? hello.split(' ').map((text) => ({ text, strong: true })) : []),
  ...line.split(' ').map((text) => ({ text, strong: false })),
]
const words = computed(() => toWords(said.value || { hello: hi.value, line: INTRO }))

// His words come up one at a time while he talks. The whole line is laid out
// from the start, the words still to come only unseen, so the bubble is its
// full size at once rather than growing under them.
const STEP = 70
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const shown = ref(Infinity)
let revealTimer = null

// At rest, said in a bubble over where he stands, which goes once it has
// been read. On the first visit his first line waits for him to arrive.
const bubble = ref(false)
const waiting = ref(firstThisVisit)
let bubbleTimer = null

const hideBubble = () => {
  clearTimeout(bubbleTimer)
  bubble.value = false
}

// On a desktop he says it in the bubble beside him instead (the template),
// which never goes: while he is saying something, that, and between times
// the last thing he offered to be asked (`offered`, kept by say), or, before
// he has offered anything, today's, or what he is for. So what a tap on him
// brought up stays until he offers something else; a tap elsewhere, or the
// moment passing, only drops a hello said over it ("Oh! I must have nodded
// off."), never the question.
const offered = shallowRef(null)
const speaking = computed(() => bubble.value && !!said.value)
const docked = computed(() => {
  if (speaking.value) return said.value
  if (offered.value) return offered.value
  const tip = todaysTip()
  return tip ? { hello: '', line: tip.line, tip } : { hello: '', line: INTRO }
})
const dockWords = computed(() => toWords(docked.value))

// Said aloud (`voice`, a line of public/voice/yunit/index.json), he talks for
// as long as his voice does and the words come up across it; otherwise at
// his reading pace.
let clip = null
const hush = () => {
  clip?.pause()
  clip = null
}
const say = (next, voice = null) => {
  said.value = next
  if (next.tip) offered.value = { hello: '', line: next.line, tip: next.tip }
  waiting.value = false
  clearInterval(revealTimer)
  hush()
  const total = words.value.length
  const length = voice ? Math.round(voice.seconds * 1000) : total * STEP
  if (reduced) shown.value = total
  else {
    shown.value = 0
    revealTimer = setInterval(() => {
      shown.value += 1
      if (shown.value >= total) clearInterval(revealTimer)
    }, length / total)
  }
  speak(length)
  if (voice) {
    clip = new Audio(`/voice/yunit/${voice.file}`)
    clip.volume = 0.9
    // Before anyone has touched the page, the browser keeps it quiet; he still
    // says it in his bubble.
    clip.play().catch(() => {})
  }
  if (!open.value) {
    bubble.value = true
    clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => (bubble.value = false), length + 6500)
  }
}

// Now and then, while someone is on the home, he pipes up with one thing he
// can be asked, aloud as well as in his bubble, if his sounds are on: the
// first a couple of minutes in, then every few minutes, and no more than a
// few times a visit, so he is company and not a nag. Only to someone there —
// the home showing and someone moving on it lately — and never over a
// conversation, a hello still showing, or while he is being carried. Asleep,
// he wakes first.
const PROMPTS = 3
const PROMPTED = 'ekkly:yunit-prompts'
const FIRST = [120, 210]
const NEXT = [240, 420]
let promptTimer = null
let lastActive = Date.now()
const markActive = () => {
  lastActive = Date.now()
}
let voices = null
const voiceFor = async (key) => {
  if (!voices) {
    try {
      voices = await (await fetch('/voice/yunit/index.json')).json()
    } catch {
      voices = {}
    }
  }
  return voices[key] || null
}
const schedulePrompt = ([min, max]) => {
  clearTimeout(promptTimer)
  promptTimer = setTimeout(pipeUp, (min + Math.random() * (max - min)) * 1000)
}
const pipeUp = async () => {
  const count = Number(readStore('sessionStorage', PROMPTED) || 0)
  if (count >= PROMPTS) return
  const away = document.hidden || Date.now() - lastActive > 120000
  if (away || open.value || carried.value || bubble.value || sending.value) return schedulePrompt(NEXT)
  const tip = nextTip()
  if (!tip) return
  writeStore('sessionStorage', PROMPTED, String(count + 1))
  const voice = yunitSound.value ? await voiceFor(tip.key) : null
  const line = { hello: '', line: tip.line, tip }
  schedulePrompt(NEXT)
  clearTimeout(wakeTimer)
  if (mood.value === 'sleeping') {
    stir()
    wakeTimer = setTimeout(() => say(line, voice), 900)
  } else say(line, voice)
}
let wakeTimer = null
// Turned quiet, he stops mid-word rather than finishing aloud.
watch(yunitSound, (on) => !on && hush())

// In the dark (dark mode) he has a lantern, lit, its light round him. Coming
// onto the home in the dark, it is simply lit. When the dark comes while he
// is there, he notices: a start, "Oh! It's gone dark", and a moment later
// the lantern catches. When the light comes back he squints, and it goes
// out. In the middle of a conversation that is showing, he only lights or
// puts it out, rather than talking over it.
//
// Following the live sky, it is the sky's dark he goes by, not the theme's:
// night over the church, whatever the page is drawn in. And in the rain he
// has an umbrella up.
const { isDark } = useTheme()
const dark = computed(() => (props.sky ? props.sky.phase === 'night' : isDark.value))
// Read off the page rather than the theme, which only settles once the app
// has mounted: the page was made dark before anything was drawn (index.html),
// so this is already the truth, and the theme settling is not news to him.
const lantern = ref(props.sky ? props.sky.phase === 'night' : document.documentElement.classList.contains('dark'))
let lanternTimer = null
watch(dark, (dark) => {
  clearTimeout(lanternTimer)
  if (dark === lantern.value) return
  if (chatting.value && open.value) {
    lantern.value = dark
    return
  }
  stir()
  if (dark) {
    mascot.value?.play('surprise')
    say({ hello: props.sky ? 'Oh! Night’s fallen.' : 'Oh! It’s gone dark.', line: 'Hang on, I’ve got a lantern.' })
    lanternTimer = setTimeout(() => {
      lantern.value = true
      mascot.value?.play('thereWeGo')
      feel('lamp')
    }, 1200)
  } else {
    lantern.value = false
    mascot.value?.play('squint')
    feel('squint')
    say({ hello: 'Ah,', line: props.sky ? 'the sun’s up.' : 'the lights are back on.' })
  }
})

// The rain over the church (live sky): on goes his raincoat and up goes his
// umbrella. Coming onto the
// home in the rain, it is simply up; rain starting or stopping while he is
// there, he says so, unless a conversation that is showing would be talked
// over.
const raining = computed(() => props.sky?.weather === 'rain' || props.sky?.weather === 'storm')
const umbrella = ref(raining.value)
// How far his umbrella stands above his box, as a share of his height.
const UMBRELLA_ROOM = 0.32
watch(raining, (wet) => {
  umbrella.value = wet
  if (chatting.value && open.value) return
  stir()
  if (wet) {
    mascot.value?.play('surprise')
    feel('rain')
    say({ hello: 'Oh! Rain.', line: 'Good thing I brought an umbrella.' })
  } else if (!rainbow.value) say({ hello: '', line: 'The rain’s stopped.' })
})

// A rainbow over the church, just after the rain (live sky): he notices it,
// pleased, and says so — when it comes out while he is there, or a moment
// after the home opens under one, once any hello has been said.
const rainbow = computed(() => !!props.sky?.rainbow)
const noticeRainbow = () => {
  if (chatting.value && open.value) return
  stir()
  mascot.value?.play('whoa')
  feel('wonder')
  say({ hello: 'Look, a rainbow!', line: 'After the rain, God’s promise.' })
}
watch(rainbow, (out) => out && noticeRainbow())
let rainbowTimer = null
onMounted(() => {
  if (rainbow.value) rainbowTimer = setTimeout(noticeRainbow, firstThisVisit ? 6000 : 1500)
})

// A tap anywhere else puts the bubble away.
// He and his box may be in his place on the board rather than in `root`, and
// the bubble is on the page itself: a tap on any of the three is not
// "elsewhere".
const bubbleEl = ref(null)
const onOutside = (event) => {
  const t = event.target
  if (!root.value?.contains(t) && !stage.value?.contains(t) && !bubbleEl.value?.contains(t)) hideBubble()
}

// Where his bubble goes while it shows: just over his head, its corner to
// him, followed frame by frame (he may be carried, or the board change
// under him), and only while it shows.
const bubbleAt = ref(null)
let bubbleFrame = 0
const followBubble = () => {
  const el = mascot.value?.$el
  if (el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect()
    // His umbrella stands above his box (UMBRELLA_ROOM): the bubble goes
    // over it, not on it.
    const bottom = `${Math.round(window.innerHeight - r.top + 6 + (umbrella.value ? r.height * UMBRELLA_ROOM : 0))}px`
    bubbleAt.value = right.value
      ? { right: `${Math.round(window.innerWidth - r.right + 8)}px`, bottom }
      : { left: `${Math.round(r.left + 20)}px`, bottom }
  }
  bubbleFrame = requestAnimationFrame(followBubble)
}
watch(bubble, (on) => {
  document[on ? 'addEventListener' : 'removeEventListener']('pointerdown', onOutside, true)
  cancelAnimationFrame(bubbleFrame)
  if (on) followBubble()
})

// Tapped, he does something of his own (YunitMascot) and says the next thing
// he can be asked. Tapped awake, he says so instead. In the middle of a
// conversation that is showing, he only answers the tap: a hello there would
// be talking over it.
let wokeAt = -1
const quiet = () => chatting.value && open.value
const onWake = () => {
  wokeAt = performance.now()
  stir()
  if (quiet()) return
  const tip = todaysTip()
  say({ hello: 'Oh! I must have nodded off.', line: tip?.line || INTRO, tip })
}
const onTap = () => {
  // Away behind a card, a click brings him home.
  if (roaming.value) return comeHome()
  // Cross from being tapped too much (YunitMascot), he is not answering, and
  // stops whatever he was saying.
  if (mascot.value?.cross) {
    hideBubble()
    hush()
    return
  }
  if (performance.now() - wokeAt < 400) return
  stir()
  if (quiet()) return
  const tip = nextTip()
  if (tip) say({ hello: '', line: tip.line, tip })
}

let helloTimer = null
onMounted(() => {
  stir()
  // Someone moving on the page is someone there, for his piping up.
  ;['pointermove', 'keydown', 'wheel', 'touchstart'].forEach((type) => window.addEventListener(type, markActive, { passive: true }))
  schedulePrompt(FIRST)
  schedulePlay()
  if (!firstThisVisit) return
  writeStore('sessionStorage', GREETED, '1')
  const met = readStore('localStorage', MET) === '1'
  writeStore('localStorage', MET, '1')
  // Once he has arrived (a little over a second): a wave, and hello.
  helloTimer = setTimeout(() => {
    waiting.value = false
    mascot.value?.play('wave')
    // Heard only where the page has been touched already; a browser keeps a
    // page quiet until then.
    feel(met ? 'greet' : 'arrive')
    if (quiet()) return
    const tip = todaysTip()
    say(met ? { hello: hi.value, line: tip?.line || INTRO, tip } : { hello: `${hi.value} I’m YUNIT.`, line: INTRO, tip })
  }, 1300)
})

/* ------------------------------------------------------ playing, idle */

// Left alone on the home, he plays rather than only waiting to doze: every
// twenty to forty-five seconds, one thing — a jump, a wave, a peek, a look
// about, or hide-and-seek. Only while someone is there (the page showing,
// moved on lately) and nothing else is going on (no conversation, nothing
// being said, not carried, not asleep), and silently but for hide-and-seek's
// "ta-da!", so it never gets noisy. One thing, then still: never a loop
// (BRAND.md). Asking for less motion, he does none of it.
const PLAYS = ['jump', 'wave', 'peek', 'glance', 'jump', 'roam', 'roam']
let playTimer = null
let popTimer = null
const free = () =>
  !open.value &&
  !carried.value &&
  !roaming.value &&
  !bubble.value &&
  !sending.value &&
  mood.value === 'idle' &&
  !document.hidden &&
  Date.now() - lastActive < 120000

// Hide-and-seek behind a card (a desktop's board): he curls into a ball,
// shrinks away to nothing where he stands, and appears beside a card chosen
// at random, a ball again growing back, then uncurls and slides behind its
// edge until only the side of his head and one eye show, his hand round the
// edge holding it, and whispers "psst". There he stays until he is clicked;
// then he lets go, curls up, shrinks away, and appears back home, popping out
// "Ta-da!". He is drawn over the page while away (roamEl), cut where the card
// is (clip-path), so he looks to be behind it and only the part of him that
// shows takes a click. On a card's right he is turned round, so it is always
// his face that peeks, never the back of his head.
const roaming = ref(false)
const curled = ref(false)
const roamEl = ref(null)
const roamAt = ref(null)
const ROAM_SIZE = 64
// How much of him shows past the card's edge: the petal round that side of
// his head, his near eye and a little of the face beside it, the rest of him
// behind the card.
const PEEKS = 0.56
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
// Shrinking away where he is, spinning as a ball does, and kept gone (not
// back at full size for a frame) while he is moved.
const vanish = async (el) => {
  const run = el.animate(
    [{ transform: 'scale(1) rotate(0deg)' }, { transform: 'scale(0.82) rotate(-90deg)', offset: 0.3 }, { transform: 'scale(0) rotate(-420deg)' }],
    { duration: 460, easing: 'cubic-bezier(0.55, 0, 0.75, 0.25)', fill: 'forwards' }
  )
  await run.finished
  el.style.opacity = '0'
  run.cancel()
}
// Growing back out of nothing where he has arrived, a little past his size
// and settling, as a ball dropped in would.
const appear = (el) => {
  el.style.opacity = ''
  return el.animate(
    [{ transform: 'scale(0) rotate(360deg)' }, { transform: 'scale(1.12) rotate(-12deg)', offset: 0.72 }, { transform: 'scale(1) rotate(0deg)' }],
    { duration: 540, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  ).finished
}
const roamStyle = computed(() => {
  const at = roamAt.value
  if (!at) return { display: 'none' }
  return { left: `${at.left}px`, top: `${at.top}px`, width: `${ROAM_SIZE}px`, height: `${ROAM_SIZE}px`, clipPath: at.clip || 'none' }
})
// His hand round the card's edge, in front of it, at his cheek.
const gripStyle = computed(() => {
  const at = roamAt.value
  if (!at?.grip) return { display: 'none' }
  return { left: `${at.grip.left}px`, top: `${at.grip.top}px`, width: '13px', height: '26px', transform: at.right ? 'scaleX(-1)' : 'none' }
})
const roam = async () => {
  if (!props.anchor || reduced || roaming.value) return
  const cards = [...document.querySelectorAll('[data-panel]')].filter((el) => el.dataset.panel !== 'yunit' && el.offsetHeight > 80)
  if (!cards.length) return
  const card = cards[Math.floor(Math.random() * cards.length)].getBoundingClientRect()
  // Out of whichever side of the card has room, part way down it.
  const right = card.right + ROAM_SIZE * PEEKS + 8 < window.innerWidth
  const top = Math.round(card.top + (card.height - ROAM_SIZE) * (0.2 + Math.random() * 0.6))
  const left = Math.round(right ? card.right - ROAM_SIZE * (1 - PEEKS) : card.left - ROAM_SIZE * PEEKS)
  const clip = right ? `inset(-40% -40% -40% ${Math.round(card.right - left)}px)` : `inset(-40% ${Math.round(left + ROAM_SIZE - card.left)}px -40% -40%)`
  const out = (right ? 1 : -1) * ROAM_SIZE * 0.8
  // The fingers wrap the edge: most of them on the card's face, their tips
  // just past it, at his cheek, under the eye that peeks.
  const grip = { left: Math.round(right ? card.right - 10 : card.left - 3), top: Math.round(top + ROAM_SIZE * 0.5) }

  hideBubble()
  curled.value = true
  await pause(380)
  const el = mascot.value?.$el
  if (!el) return
  // Away where he stands...
  await vanish(el)
  roamAt.value = { left, top, right }
  roaming.value = true
  await nextTick()
  // ...and back beside the card, a ball growing out of nothing, turned round
  // on a card's right so his face is the side that will peek.
  el.style.translate = `${out}px 0`
  el.style.scale = right ? '-1 1' : ''
  await appear(el)
  // Uncurled, and slid behind the edge until only a peek of him shows.
  curled.value = false
  roamAt.value = { left, top, right, clip }
  await pause(320)
  await el.animate([{ translate: `${out}px 0` }, { translate: '0 0' }], { duration: 560, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }).finished
  el.style.translate = ''
  // His hand comes round the edge to hold the card.
  roamAt.value = { left, top, right, clip, grip }
  mascot.value?.play('peek')
  feel('psst')
}
// Clicked while away, or wanted at home (the conversation opened): he lets go
// of the card, curls up, shrinks away, and appears home, popping out
// "Ta-da!"; at once, without the trip, when the conversation is opening.
const comeHome = async (quick = false) => {
  if (!roaming.value) return
  const el = mascot.value?.$el
  if (quick || !el) {
    roaming.value = false
    roamAt.value = null
    curled.value = false
    if (el) el.style.scale = ''
    return
  }
  roamAt.value = { ...roamAt.value, grip: null }
  curled.value = true
  await pause(320)
  await vanish(el)
  roaming.value = false
  roamAt.value = null
  el.style.scale = ''
  await nextTick()
  await appear(mascot.value.$el)
  curled.value = false
  mascot.value?.play('celebrate')
  feel('peekaboo')
  say({ hello: 'Ta-da!', line: '' })
}
const schedulePlay = () => {
  clearTimeout(playTimer)
  previewTimers.forEach(clearTimeout)
  playTimer = setTimeout(
    () => {
      if (free() && !reduced) {
        const what = PLAYS[Math.floor(Math.random() * PLAYS.length)]
        if (what === 'roam') roam()
        else mascot.value?.play(what)
      }
      schedulePlay()
    },
    20000 + Math.random() * 25000
  )
}

/* ------------------------------------------------ played from the address */

// For seeing what he does without waiting for it, as `?weather=` and
// `?sky=` are for the sky (useLiveSky): on the address,
//   ?yunit=wave,roam,jump   his actions, one after another, a moment apart
//                           (any of YUNIT_ACTIONS, or `roam` for peeking
//                           from behind a card),
//                           each with its sound
//   ?yunit-mood=sleeping    held in a mood (any of YUNIT_MOODS)
//   ?yunit-say=Hello there  a line said in his bubble
// That page only; nothing is kept. Played again whenever they change.
const route = useRoute()
// Each action's sound, where it is not named the same (yunitFeedback).
const SOUND_OF = { rollLeft: 'knocked', rollRight: 'knocked', stumbleLeft: 'stumble', stumbleRight: 'stumble' }
const shownMood = computed(() => (YUNIT_MOODS.includes(route.query['yunit-mood']) ? route.query['yunit-mood'] : mood.value))
let previewTimers = []
const playFromAddress = () => {
  previewTimers.forEach(clearTimeout)
  previewTimers = []
  const asked = String(route.query.yunit || '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name === 'roam' || YUNIT_ACTIONS.includes(name))
  asked.forEach((name, i) => {
    previewTimers.push(
      setTimeout(() => {
        if (name === 'roam') return roam()
        mascot.value?.play(name)
        feel(SOUND_OF[name] || name)
      }, 1600 + i * 2800)
    )
  })
  const line = route.query['yunit-say']
  if (line) previewTimers.push(setTimeout(() => say({ hello: '', line: String(line) }), 1600 + asked.length * 2800))
}
onMounted(playFromAddress)
watch(() => [route.query.yunit, route.query['yunit-say']], playFromAddress)

// Gestures the conversation asks for (a nod on sending, a celebration).
watch(cue, (next) => next && mascot.value?.play(next.name))

/* ------------------------------------------------- the conversation, open */

// On a desktop, talked to, he comes down from his place on the board to the
// foot of the screen, in his own column, so the conversation rises the whole
// height above him wherever his place is; put away, he goes back up to it.
// He is seen to make the trip (glide, from where he was to where he is now)
// rather than jump. A phone's box is at the foot already, and never moves.
const form = ref(null)
const glideFrom = (before) => {
  const node = form.value
  const after = node?.getBoundingClientRect()
  if (!before || !after || reduced) return
  const dx = before.left - after.left
  const dy = before.top - after.top
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
  node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
}

const openChat = async () => {
  if (open.value) return
  comeHome(true)
  feel('listen')
  hideBubble()
  hush()
  place()
  const typing = document.activeElement === input.value
  const before = props.anchor ? form.value?.getBoundingClientRect() : null
  keepRoom(true)
  open.value = true
  await nextTick()
  // On a desktop his box has just been lifted out of his place on the board
  // to over the home, and moving it took the focus off it: it goes back, for
  // whoever had started to type. (A phone's never moves, and keeps it.)
  if (props.anchor && typing) input.value?.focus()
  glideFrom(before)
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

const close = async () => {
  const before = props.anchor ? form.value?.getBoundingClientRect() : null
  open.value = false
  input.value?.blur()
  await nextTick()
  keepRoom(false)
  glideFrom(before)
}

// A tap on the open space above the bubbles is a tap on the home behind
// them, and puts the conversation away as the dimmed home itself does.
const onBlank = (event) => {
  if (event.target === event.currentTarget) close()
}

const onFocus = () => {
  focused.value = true
  stir()
  openChat()
}

// The question his bubble offers, asked from where he stands.
const askTip = (tip) => {
  openChat()
  ask(tip.ask)
}

useFollowReplies(scroller)
// The home holds still under the conversation. Not useFocusTrap, which would
// do that too but then move the focus to the first button, taking it off the
// box the person has just tapped, and the keyboard down with it. So Escape
// is its own, below.
useScrollLock(open)

// The box grows with what is typed, up to a few lines, then scrolls; at rest
// it is one line again.
const fit = () => {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  if (open.value) el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  else el.style.height = ''
}
watch([draft, open], () => nextTick(fit))

// Enter sends; Shift+Enter is a new line, as in any chat.
const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

// Open, it keeps to the part of the screen the keyboard leaves: a phone's
// keyboard covers the page rather than shortening it, so the conversation is
// fitted to what can still be seen (as PeopleDock is lifted), and he stands
// on the keyboard rather than a bar it has covered.
const viewport = ref({ top: 0, bottom: 0 })
const keyboard = computed(() => viewport.value.bottom > 0)
const measure = () => {
  const vv = window.visualViewport
  if (!vv) return
  viewport.value = {
    top: Math.max(0, Math.round(vv.offsetTop)),
    bottom: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)),
  }
}
const onKey = (event) => {
  if (event.key !== 'Escape') return
  event.stopPropagation()
  close()
}
const follow = (on) => {
  const vv = window.visualViewport
  document[on ? 'addEventListener' : 'removeEventListener']('keydown', onKey, true)
  if (!vv) return
  if (on) {
    measure()
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
  } else {
    vv.removeEventListener('resize', measure)
    vv.removeEventListener('scroll', measure)
    viewport.value = { top: 0, bottom: 0 }
  }
}
watch(open, follow)

onBeforeUnmount(() => {
  follow(false)
  window.removeEventListener('resize', place)
  window.removeEventListener('pointermove', onCarry)
  window.removeEventListener('pointerup', onPutDown)
  window.removeEventListener('pointercancel', onPutDown)
  clearTimeout(startledTimer)
  clearTimeout(lanternTimer)
  clearTimeout(rainbowTimer)
  clearTimeout(playTimer)
  clearTimeout(popTimer)
  clearTimeout(helloTimer)
  clearTimeout(promptTimer)
  clearTimeout(wakeTimer)
  hush()
  ;['pointermove', 'keydown', 'wheel', 'touchstart'].forEach((type) => window.removeEventListener(type, markActive))
  clearTimeout(bubbleTimer)
  clearInterval(revealTimer)
  cancelAnimationFrame(bubbleFrame)
  document.removeEventListener('pointerdown', onOutside, true)
})
</script>

<template>
  <!-- Over the whole home, but letting every touch through to it until he is
       written to: only he, his box and his bubble take one. -->
  <section
    ref="root"
    aria-label="YUNIT"
    :role="open ? 'dialog' : undefined"
    :aria-modal="open ? 'true' : undefined"
    :class="['fixed inset-x-0 top-0 bottom-0', open ? 'z-80' : 'pointer-events-none z-30']"
    :style="open ? { top: `${viewport.top}px`, bottom: `${viewport.bottom}px` } : null"
  >
    <!-- The home behind the conversation, dimmed; a tap on it closes. -->
    <div v-if="open" class="yunit-dim absolute inset-0 bg-gray-950/55 backdrop-blur-sm" aria-hidden="true" @click="close" />

    <!-- Where he stands, and above him, open, the conversation. On a desktop,
         at rest, that is inside his place on the board itself (`anchor`), in
         the page's own flow, so wherever the panels round it go, he goes
         with them, and is never left standing on one; he is lifted out over
         the home only while carried or talked to. -->
    <Teleport defer :to="anchor || 'body'" :disabled="!inPlace">
    <div
      ref="stage"
      :class="[
        inPlace ? 'relative z-30 flex h-full flex-col justify-end' : 'absolute flex flex-col',
        !anchor && 'yunit-foot inset-x-4 mx-auto max-w-2xl',
        !anchor && open && 'top-[calc(env(safe-area-inset-top)+0.75rem)]',
        !anchor && open && keyboard && 'yunit-on-keyboard',
        open ? '' : 'justify-end',
      ]"
      :style="stageStyle"
    >
      <!-- Open: his name, what he is doing, and the way out, floating over
           the dimmed home like everything else here. -->
      <header v-if="open" class="yunit-rise flex shrink-0 items-center gap-1.5 pb-2">
        <div class="min-w-0 flex-1 text-white">
          <h2 class="text-base font-black tracking-tight"><YunitWordmark /></h2>
          <p class="truncate text-xs text-white/75" aria-live="polite">{{ status }}</p>
        </div>
        <!-- His sounds, off for whoever is asking him things in a quiet room. -->
        <button
          type="button"
          class="yunit-round"
          :aria-label="yunitSound ? 'Turn YUNIT’s sounds off' : 'Turn YUNIT’s sounds on'"
          :title="yunitSound ? 'Sounds on' : 'Sounds off'"
          :aria-pressed="yunitSound"
          @click="setYunitSound(!yunitSound)"
        >
          <SpeakerHigh v-if="yunitSound" class="size-4.5" />
          <SpeakerSlash v-else class="size-4.5" />
        </button>
        <button v-if="chatting" type="button" class="yunit-round disabled:opacity-50" aria-label="New chat" title="New chat" :disabled="sending" @click="clear">
          <ArrowCounterClockwise class="size-4.5" />
        </button>
        <RouterLink to="/yunit" class="yunit-round" aria-label="Open YUNIT’s page" title="Open YUNIT’s page" @click="close">
          <ArrowsOutSimple class="size-4.5" />
        </RouterLink>
        <button type="button" class="yunit-round" aria-label="Close" title="Close" @click="close">
          <X class="size-5" />
        </button>
      </header>

      <!-- The conversation, rising from him and fading out at the top as it
           scrolls. -->
      <div v-if="open" ref="scroller" class="yunit-rise yunit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none]" @click="onBlank">
        <!-- Before anything is said: his hello and things to ask him. Kept to
             the foot, by him. -->
        <div v-if="!chatting" class="flex min-h-full flex-col justify-end gap-4 pt-8 pb-3" @click="onBlank">
          <p v-if="!waiting" class="yunit-ring max-w-[92%] self-start rounded-3xl rounded-bl-lg px-4 py-3 text-[15px] leading-relaxed text-gray-800 dark:text-gray-100">
            <template v-for="(word, i) in words" :key="i">
              <span :class="[word.strong ? 'font-semibold text-gray-900 dark:text-white' : '', i < shown ? '' : 'opacity-0']">{{ word.text }}</span>{{ ' ' }}
            </template>
          </p>

          <div v-if="tips.length" class="flex flex-wrap gap-2" @click="onBlank">
            <button
              v-for="tip in tips"
              :key="tip.key"
              type="button"
              :title="tip.ask"
              class="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              @click="ask(tip.ask)"
            >
              <component :is="tip.icon" class="size-4 shrink-0 text-primary dark:text-primary-light" />
              {{ tip.label }}
            </button>
          </div>

        </div>

        <div v-else class="flex min-h-full flex-col justify-end pt-8 pb-4" @click="onBlank">
          <YunitThread floating />
        </div>
      </div>


      <!-- Him, and beside him, at rest, a button to talk to him; talking, the
           box to write to him in. The box is there at rest too, only unseen,
           so the button can give it the focus there and then (talk), and the
           keyboard comes up with the conversation. -->
      <form
        ref="form"
        :class="['pointer-events-auto shrink-0', !open && anchor ? ['yunit-dock', onHill && 'yunit-dock-perched'] : ['flex items-end gap-2', right ? 'flex-row-reverse' : '']]"
        @submit.prevent="send"
      >
        <!-- On the church's hill (perch) he stands there, out of his place;
             anywhere else, here. Moved, not made again, so nothing he is
             doing is lost on the way. -->
        <Teleport defer :to="roaming ? roamEl : perch || 'body'" :disabled="!roaming && !onHill">
        <YunitMascot
          ref="mascot"
          :mood="shownMood"
          :arrive="firstThisVisit"
          :fidget="false"
          :curled="curled"
          :taps-off="roaming"
          :sparks="mood !== 'idle' || startled"
          :lantern="lantern"
          :umbrella="umbrella"
          :raincoat="umbrella"
          :class="[
            'yunit-dock-him shrink-0 transition-[width,height] duration-300 ease-out motion-reduce:transition-none',
            // Drawn over his bubble, so his umbrella, which stands above his
            // box, lies over it rather than under it.
            'relative z-10',
            open ? 'size-14' : roaming || onHill ? 'pointer-events-auto size-full' : anchor ? 'size-24' : 'size-20',
            movable && !open ? (carried ? 'cursor-grabbing' : 'cursor-grab') : '',
          ]"
          @click="onTap"
          @pointerdown="onGrab"
          @wake="onWake"
        />
        </Teleport>
        <!-- His place kept while he is away behind a card, so his bubble
             does not spread into it. -->
        <span v-if="roaming" class="yunit-dock-him size-24 shrink-0" aria-hidden="true" />
        <!-- On a desktop, at rest: what he has to say, in a bubble, and
             beside him what can be done with it — the question it offers and
             "Talk to YUNIT" — rather than a button alone in a band of
             nothing. What he is saying now, or else one thing he can be
             asked today; the bubble opens the conversation, its question
             asks him straight away. Laid out by the width of his place
             (yunit-dock, below): in a narrow column the bubble runs the full
             width above him and the buttons stand beside him; in a wide one
             the bubble stands beside him, the buttons under it. -->
        <template v-if="!open && anchor">
          <div
            :class="[
              'yunit-ring yunit-dock-bubble relative z-[5] min-w-0 cursor-pointer rounded-3xl px-4 py-3',
              right ? 'rounded-br-lg' : 'rounded-bl-lg',
              movable ? (carried ? 'cursor-grabbing' : 'cursor-grab') : '',
            ]"
            @pointerdown="onGrab($event, 'button')"
            @click="talk"
          >
            <p class="line-clamp-3 text-[15px] leading-snug text-gray-800 dark:text-gray-100" :aria-live="speaking ? 'polite' : undefined">
              <template v-for="(word, i) in dockWords" :key="i">
                <span :class="[word.strong ? 'font-semibold text-gray-900 dark:text-white' : '', speaking && i >= shown ? 'opacity-0' : '']">{{ word.text }}</span>{{ ' ' }}
              </template>
            </p>
          </div>
          <!-- Beside him: one above the other in a narrow column, filling his
               height there with room for each whole label; side by side in a
               wide one (yunit-dock-actions, below). -->
          <div class="yunit-dock-actions flex min-w-0 gap-1.5">
            <button
              v-if="docked.tip"
              type="button"
              :title="docked.tip.label"
              class="flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-2 text-sm font-semibold text-primary ring-1 ring-white/70 backdrop-blur-md transition-colors hover:bg-white dark:bg-gray-900/75 dark:text-primary-light dark:ring-white/10 dark:hover:bg-gray-900/90"
              @click="askTip(docked.tip)"
            >
              <component :is="docked.tip.icon" class="size-4 shrink-0" />
              <span class="truncate">{{ docked.tip.label }}</span>
            </button>
            <button
              type="button"
              title="Talk to YUNIT"
              class="flex shrink-0 items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-2 text-sm font-semibold text-gray-700 ring-1 ring-white/70 backdrop-blur-md transition-colors hover:bg-white hover:text-gray-900 dark:bg-gray-900/75 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-gray-900/90 dark:hover:text-white"
              @click="talk"
            >
              <ChatCircleDots class="size-4.5 shrink-0" />
              <span>Talk to YUNIT</span>
            </button>
          </div>
        </template>
        <!-- On a phone, at rest: a button to talk to him. -->
        <button
          v-else-if="!open"
          type="button"
          :class="[
            'mb-2 flex h-11 shrink-0 items-center gap-2 rounded-full bg-white/85 px-4 text-[15px] font-semibold text-gray-900 ring-1 ring-white/70 backdrop-blur-md transition-colors hover:bg-white dark:bg-gray-900/75 dark:text-white dark:ring-white/10 dark:hover:bg-gray-900/90',
            movable ? (carried ? 'cursor-grabbing' : 'cursor-grab') : '',
          ]"
          @pointerdown="onGrab($event, 'button')"
          @click="talk"
        >
          <ChatCircleDots class="size-5 text-primary dark:text-primary-light" />
          Talk to YUNIT
        </button>
        <div
          :class="
            open
              ? 'mb-1 flex min-w-0 flex-1 items-end gap-1 rounded-3xl bg-white p-1 ring-1 ring-white/40 transition-colors focus-within:ring-2 focus-within:ring-primary/60 dark:bg-gray-800 dark:ring-white/15 dark:focus-within:ring-primary-light/60'
              : 'sr-only'
          "
        >
          <label for="home-yunit-input" class="sr-only">Message YUNIT</label>
          <textarea
            id="home-yunit-input"
            ref="input"
            v-model="draft"
            rows="1"
            maxlength="4000"
            :tabindex="open ? undefined : -1"
            :placeholder="placeholder"
            class="yunit-input max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
            @keydown="onKeydown"
            @input="stir"
            @focus="onFocus"
            @blur="focused = false"
          ></textarea>
          <button
            v-if="open"
            type="submit"
            :disabled="!draft.trim() || sending"
            aria-label="Send"
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
          >
            <PaperPlaneRight class="size-5" />
          </button>
        </div>
      </form>
      <p v-if="open" class="pt-1 text-center text-[11px] text-white/60">YUNIT can be wrong. Nothing changes until you confirm it.</p>
    </div>
    </Teleport>

    <!-- Where he is while away, peeking from behind a card (roam): drawn
         over the page, cut where the card is. -->
    <Teleport to="body">
      <div ref="roamEl" class="pointer-events-none fixed z-[60]" :style="roamStyle" />
      <!-- His hand, holding the card he is behind: three fingertips round
           its edge, on its face, in his teal (the petal that is his hand). -->
      <svg v-if="roamAt?.grip" class="yunit-grip pointer-events-none fixed z-[61]" :style="gripStyle" viewBox="0 0 13 26" aria-hidden="true">
        <rect v-for="y in [0, 8.5, 17]" :key="y" x="0" :y="y" width="13" height="8" rx="4" fill="#20B9C2" stroke="#0E9AA6" stroke-width="1.2" />
      </svg>
    </Teleport>

    <!-- At rest: what he is saying, over where he stands, its corner nearest
         him. Drawn on the page itself, following him (bubbleAt), and over
         the top bar, so it is never cut off by the top of the home or hidden
         under the bar when he stands high on the board. On a phone it keeps
         to the same left part of the home as he does (and the verse does),
         so the church beside him, cross and all, is never under it. -->
    <Teleport to="body">
      <Transition enter-active-class="yunit-pop-in" leave-active-class="yunit-pop-out">
        <div
          v-if="!anchor && !open && bubble && said && bubbleAt"
          ref="bubbleEl"
          :class="[
            'yunit-said yunit-ring fixed w-max max-w-[min(17rem,66vw)] rounded-3xl px-4 py-3',
            right ? 'origin-bottom-right rounded-br-lg' : 'origin-bottom-left rounded-bl-lg',
          ]"
          :style="bubbleAt"
          aria-live="polite"
        >
          <p class="text-[15px] leading-snug text-gray-800 dark:text-gray-100">
            <template v-for="(word, i) in words" :key="i">
              <span :class="[word.strong ? 'font-semibold text-gray-900 dark:text-white' : '', i < shown ? '' : 'opacity-0']">{{ word.text }}</span>{{ ' ' }}
            </template>
          </p>
          <button
            v-if="said.tip"
            type="button"
            class="mt-2.5 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 dark:bg-primary-light/15 dark:text-primary-light dark:hover:bg-primary-light/25"
            @click="askTip(said.tip)"
          >
            <component :is="said.tip.icon" class="size-4 shrink-0" />
            {{ said.tip.label }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
/* Where he stands on a phone: clear of the home indicator, or above the
   bottom bar when it is on (the home keeps this room free, --yunit-foot in
   Apps.vue). With the keyboard up he stands on it instead. */
.yunit-foot {
  bottom: var(--yunit-foot, max(0.75rem, env(safe-area-inset-bottom)));
}
.yunit-foot.yunit-on-keyboard {
  bottom: 0.5rem;
}

/* His box shows its focus by its own ring (focus-within, above), so the
   app's keyboard-focus outline (style.css, which a textarea always meets
   when focused) does not draw a second frame inside it. */
.yunit-input:focus-visible {
  outline: none;
}

/* His place on a desktop, at rest: the bubble, him, and the two buttons, by
   the width of the column he stands in (his place is a size container,
   Apps.vue). Narrow, the bubble runs the full width above him and the
   buttons stand beside him, at his foot; wide, the bubble stands beside him
   and the buttons under it. He is at the end of his place nearest the rail. */
.yunit-dock {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'bubble bubble'
    'actions him';
  align-items: end;
  gap: 0.5rem;
}
@container (min-width: 30rem) {
  .yunit-dock {
    grid-template-areas:
      'bubble him'
      'actions him';
  }
}
/* Standing on the church's hill below his place, he is not in it: the
   bubble above the hill, the buttons in a row under it. */
.yunit-dock-perched,
.yunit-dock-perched.yunit-dock {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'bubble'
    'actions';
}
.yunit-dock-perched .yunit-dock-actions {
  flex-direction: column;
  align-items: flex-start;
}
@container (min-width: 20rem) {
  .yunit-dock-perched .yunit-dock-actions {
    flex-direction: row;
    align-items: center;
  }
}
.yunit-dock-bubble {
  grid-area: bubble;
}
.yunit-dock-actions {
  grid-area: actions;
  flex-direction: column;
  align-items: flex-start;
  padding-bottom: 0.25rem;
}
@container (min-width: 30rem) {
  .yunit-dock-actions {
    flex-direction: row;
    align-items: center;
  }
}
.yunit-dock :deep(.yunit-dock-him),
.yunit-dock .yunit-dock-him {
  grid-area: him;
}

/* What he says, ringed in his own four colours, as his petals go round him:
   yellow, orange, teal, blue. The petals' colours are his, not the church's,
   so they are fixed here as they are in YunitMascot rather than tokens. The
   ring is the bubble's border, the fill laid over it inside. */
.yunit-ring {
  --ring-fill: var(--color-white);
  border: 3px solid transparent;
  background:
    linear-gradient(var(--ring-fill), var(--ring-fill)) padding-box,
    conic-gradient(from 200deg, #ffcb4a, #ff8d4a, #20b9c2, #2290ff, #ffcb4a) border-box;
}
/* Dark, the fill goes dark under its light words. Written whole inside
   :global(): `:global(.dark) .yunit-ring` compiles to a bare `.dark`, which
   left the bubble white under words made pale for the dark. */
:global(html.dark .yunit-ring) {
  --ring-fill: var(--color-gray-800);
}

/* The round buttons over the dimmed home, as the app preview's are. */
.yunit-round {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  color: #fff;
  background: rgb(255 255 255 / 0.15);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.2);
  transition: background-color 150ms;
}
.yunit-round:hover:not(:disabled) {
  background: rgb(255 255 255 / 0.25);
}

/* The conversation fades out at its top edge as it scrolls up, rather than
   stopping at a line: there is nothing round it to stop at. */
.yunit-scroll {
  mask-image: linear-gradient(to bottom, transparent, #000 2.5rem);
}

/* It rises from where he stands, over the home dimming behind it. */
.yunit-rise {
  animation: yunit-rise 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.yunit-dim {
  animation: yunit-dim 200ms ease-out;
}
@keyframes yunit-rise {
  from {
    transform: translateY(2.5rem);
    opacity: 0;
  }
}
@keyframes yunit-dim {
  from {
    opacity: 0;
  }
}

/* His bubble, on the page itself: over the top bar (z-70), so it is never
   hidden under it when he stands high on the board, and under anything that
   opens over the home (drawers from 80 up). */
.yunit-said {
  z-index: 75;
}

/* His bubble opens out of the corner nearest him, and folds back into it. */
.yunit-pop-in {
  animation: yunit-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.yunit-pop-out {
  animation: yunit-pop 160ms ease-in reverse;
}
@keyframes yunit-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .yunit-rise,
  .yunit-dim,
  .yunit-pop-in,
  .yunit-pop-out {
    animation: none;
  }
}

/* His fingers coming round the card's edge to hold it. */
.yunit-grip {
  animation: yunit-grip-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes yunit-grip-in {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
  }
}
</style>

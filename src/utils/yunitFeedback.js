// What YUNIT sounds and feels like: a short sound and a buzz for each moment
// of a conversation with him, so a reply or a finished change is noticed with
// the phone at arm's length.
//
// Most are his own voice, recorded (src/assets/sounds/yunit, cut from a few
// takes): "hi!" with a wave, "whee!" in a jump, "mm-hmm" in a nod, "woohoo!"
// celebrating, "ooh" surprised, "uhmmmm" as he starts thinking, "okay." or
// "found it!" as his answer comes, "done!" when a change is made, "oops"
// when something fails, "huh?" when he is lost,
// "yes?" when talked to, "no" when he will not fit, "ouch" knocked over,
// "oops" stumbling, "whee!" picked up and carried, "phew" put down again, "hello" on the
// first hello of a visit ("ta-da!" the very first time), a yawn woken, "ah,
// bright" when the lights come back, "there we go" as his lantern catches,
// "brr" or "drip drop" when the rain starts, "whoa!" at a rainbow, "nuh-uh" or a
// groan when tapped too much and cross, "psst" peeking from behind a card,
// a snore
// dozing off. The rest are
// drawn notes. All quiet: a sound under the page, not over it. All in this
// one file, so they can be changed wholesale without touching the chat or
// him (useYunitChat.js, YunitMascot.vue and HomeYunit.vue call feel() and
// nothing else).
//
// The moments:
//   send     a message sent to him
//   reply    his answer starting to come up
//   done     a change confirmed and carried out
//   cancel   a change turned down
//   sorry    something that failed
//   clear    starting the conversation over
//
// And one for each thing he does when tapped, so poking him answers back:
// wave, jump, wink, celebrate, nod, surprise, hop, and startle (tapped awake
// from a doze). And what happens to him on the home: knocked (bowled over by
// the people rail), stumble (after it), listen (talked to), wonder (a
// rainbow), refuse (carried to a column he will not fit in).
//
// The sound can be turned off from YUNIT's header (yunitSound), and the phone
// remembers; the buzz stays, because it is felt rather than heard by the room.

import { ref } from 'vue'
import ooh from '../assets/sounds/yunit/ooh.mp3'
import no from '../assets/sounds/yunit/no.mp3'
import oops from '../assets/sounds/yunit/oops.mp3'
import umm from '../assets/sounds/yunit/umm.mp3'
import ouch from '../assets/sounds/yunit/ouch.mp3'
import yes from '../assets/sounds/yunit/yes.mp3'
import hello from '../assets/sounds/yunit/hello.mp3'
import hi from '../assets/sounds/yunit/hi.mp3'
import whoa from '../assets/sounds/yunit/whoa.mp3'
import tada from '../assets/sounds/yunit/tada.mp3'
import whee from '../assets/sounds/yunit/whee.mp3'
import huh from '../assets/sounds/yunit/huh.mp3'
import mmhmm from '../assets/sounds/yunit/mmhmm.mp3'
import okay from '../assets/sounds/yunit/okay.mp3'
import woohoo from '../assets/sounds/yunit/woohoo.mp3'
import hmm from '../assets/sounds/yunit/hmm.mp3'
import yawn from '../assets/sounds/yunit/yawn.mp3'
import bright from '../assets/sounds/yunit/bright.mp3'
import foundit from '../assets/sounds/yunit/foundit.mp3'
import done from '../assets/sounds/yunit/done.mp3'
import snore from '../assets/sounds/yunit/snore.mp3'
import therewego from '../assets/sounds/yunit/therewego.mp3'
import brr from '../assets/sounds/yunit/brr.mp3'
import dripdrop from '../assets/sounds/yunit/dripdrop.mp3'
import phew from '../assets/sounds/yunit/phew.mp3'
import nuhuh from '../assets/sounds/yunit/nuhuh.mp3'
import psst from '../assets/sounds/yunit/psst.mp3'

// His recorded voice, by what he says.
const VOICE = { ooh, no, oops, umm, ouch, yes, hello, hi, whoa, tada, whee, huh, mmhmm, okay, woohoo, hmm, yawn, bright, foundit, done, snore, therewego, brr, dripdrop, phew, nuhuh, psst,
  // The same take as his yawn, which is as much a groan as a yawn.
  groan: yawn }

// The sound, made on the first moment, which is always a tap or a key - a
// browser only lets sound start from inside one - and kept for the visit.
let audio = null

const SOUND_KEY = 'ekkly:yunit-sound'
const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Whether YUNIT makes sounds on this device. */
export const yunitSound = ref(readSound())

export const setYunitSound = (on) => {
  yunitSound.value = Boolean(on)
  try {
    localStorage.setItem(SOUND_KEY, yunitSound.value ? 'on' : 'off')
  } catch {
    // Not remembered this time; the switch itself still happened.
  }
}

// Notes as [frequency, start, length] in seconds, with an optional frequency
// to slide to by the note's end, and a buzz pattern in ms; or `voice`, one of
// his recorded sounds, in place of notes.
const MOMENTS = {
  send: { voice: 'umm', buzz: 8 },
  reply: { voice: ['okay', 'foundit'], buzz: [6, 40, 10] },
  done: { voice: 'done', buzz: [12, 60, 18] },
  cancel: { notes: [[440, 0, 0.1], [370, 0.07, 0.14]], buzz: 6 },
  sorry: { voice: 'oops', buzz: [30, 50, 30] },
  clear: { notes: [[988, 0, 0.08], [784, 0.06, 0.08], [659, 0.12, 0.14]], buzz: 10 },

  // Tapped. Short and light, since someone may tap him again and again.
  wave: { voice: 'hi', buzz: 6 },
  jump: { voice: 'whee', buzz: 10 },
  wink: { notes: [[1175, 0, 0.07], [1568, 0.06, 0.1]], buzz: 5 },
  celebrate: { voice: 'woohoo', buzz: [8, 40, 8] },
  nod: { voice: 'mmhmm', buzz: 6 },
  surprise: { voice: 'ooh', buzz: 12 },
  hop: { notes: [[523, 0, 0.08, 784], [659, 0.1, 0.08, 988]], buzz: [5, 50, 5] },
  startle: { voice: 'ooh', buzz: [14, 30, 8] },

  // On the home.
  knocked: { voice: 'ouch', buzz: [14, 30, 8] },
  stumble: { voice: 'oops', buzz: [5, 50, 5] },
  listen: { voice: 'yes', buzz: 5 },
  wonder: { voice: 'whoa', buzz: [8, 40, 8] },
  whoa: { voice: 'whoa', buzz: 8 },
  grumpy: { voice: ['nuhuh', 'groan'], buzz: [20, 40, 20] },
  thereWeGo: { voice: 'therewego', buzz: 0 },
  refuse: { voice: 'no', buzz: [10, 40, 10] },
  pickup: { voice: 'whee', buzz: 8 },
  putdown: { voice: 'phew', buzz: 6 },
  greet: { voice: 'hello', buzz: 0 },
  arrive: { voice: 'tada', buzz: 0 },
  peekaboo: { voice: 'tada', buzz: 0 },
  psst: { voice: 'psst', buzz: 0 },
  // His trip to a card and back (hide-and-seek): a swirl as he spins away to
  // nothing, falling, and another as he spins back out of nothing, rising.
  vanish: { swirl: 'down', buzz: 0 },
  appear: { swirl: 'up', buzz: 0 },
  waken: { voice: 'yawn', buzz: 0 },
  squint: { voice: 'bright', buzz: 0 },
  lamp: { voice: 'therewego', buzz: 0 },
  rain: { voice: ['brr', 'dripdrop'], buzz: 0 },
  puzzled: { voice: 'huh', buzz: 6 },
  doze: { voice: 'snore', buzz: 0 },
}

// His voice, played through the same sound as his notes, so it sits with
// them rather than over them: a third faster, which raises it, smaller and
// brighter, as his size is; its harsh top taken off; and no louder than the
// notes. Each recording is fetched once, on first use, and kept; one plays
// at a time, a new one cutting the last off rather than talking over it.
const VOICE_PITCH = 1.32
const VOICE_LEVEL = 0.28
const VOICE_SOFTEN = 5200
const recordings = {}
let speaking = null
const recordingOf = (name) =>
  (recordings[name] ||= fetch(VOICE[name])
    .then((res) => res.arrayBuffer())
    .then((data) => audio.decodeAudioData(data)))
const speak = async (name) => {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
    const buffer = await recordingOf(name)
    speaking?.stop()
    const source = audio.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = VOICE_PITCH
    const soften = audio.createBiquadFilter()
    soften.type = 'lowpass'
    soften.frequency.value = VOICE_SOFTEN
    const level = audio.createGain()
    level.gain.value = VOICE_LEVEL
    source.connect(soften).connect(level).connect(audio.destination)
    source.start()
    speaking = source
  } catch {
    // No sound on this device; the buzz and the screen still say it.
  }
}


const play = (notes) => {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
    const now = audio.currentTime + 0.01
    for (const [freq, start, length, slideTo] of notes) {
      const t = now + start
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + length + 0.05)
    }
  } catch {
    // No sound on this device; the buzz and the screen still say it.
  }
}

// A swirl: two soft tones, a fifth apart, gliding the whole way down (or up)
// while a quick warble runs through them, the way something spinning sounds
// as it goes, and fading in and out so it never starts or stops with a click.
// As quiet as his notes.
const swirl = (way) => {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
    const t = audio.currentTime + 0.01
    const length = 0.5
    const [from, to] = way === 'up' ? [260, 1250] : [1250, 260]
    const warble = audio.createOscillator()
    warble.frequency.setValueAtTime(9, t)
    warble.frequency.linearRampToValueAtTime(18, t + length)
    for (const [ratio, type, level] of [[1, 'sine', 0.05], [1.5, 'triangle', 0.018]]) {
      const osc = audio.createOscillator()
      const depth = audio.createGain()
      const gain = audio.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(from * ratio, t)
      osc.frequency.exponentialRampToValueAtTime(to * ratio, t + length)
      depth.gain.value = 45 * ratio
      warble.connect(depth).connect(osc.frequency)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(level, t + 0.08)
      gain.gain.setValueAtTime(level, t + length * 0.6)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + length + 0.05)
    }
    warble.start(t)
    warble.stop(t + length + 0.05)
  } catch {
    // No sound on this device; the screen still shows him go.
  }
}

/** Plays the moment's sound and buzz. Unknown moments do nothing. */
// A browser keeps a page silent until it has been tapped or typed in, so a
// moment that comes before then (the home opening under a rainbow, say)
// waits for that first touch and is heard then, if it is still fresh (within
// LATE ms); older than that, it would only puzzle.
const LATE = 8000
let waiting = null
const sound = (it) => {
  if (it.voice) speak(Array.isArray(it.voice) ? it.voice[Math.floor(Math.random() * it.voice.length)] : it.voice)
  else if (it.swirl) swirl(it.swirl)
  else play(it.notes)
}
const onFirstTouch = () => {
  window.removeEventListener('pointerdown', onFirstTouch, true)
  window.removeEventListener('keydown', onFirstTouch, true)
  if (waiting && Date.now() - waiting.at < LATE && yunitSound.value) sound(waiting.it)
  waiting = null
}

export const feel = (moment) => {
  const it = MOMENTS[moment]
  if (!it) return
  if (yunitSound.value) {
    if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      if (!waiting) {
        window.addEventListener('pointerdown', onFirstTouch, true)
        window.addEventListener('keydown', onFirstTouch, true)
      }
      waiting = { it, at: Date.now() }
    } else sound(it)
  }
  try {
    if (it.buzz) navigator.vibrate?.(it.buzz)
  } catch {
    // Some browsers refuse to buzz outside a tap; the sound still plays.
  }
}

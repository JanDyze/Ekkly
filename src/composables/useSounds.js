import { ref } from 'vue'
import cardSwipeUrl from '../assets/sounds/card-swipe.mp3'

// The small sounds the app makes as things move: a card swiped off the deck,
// the card tucking in under it, a card put away.
//
// The swipe is a recording (src/assets/sounds/card-swipe.mp3), decoded once
// when the sounds first wake. The rest are drawn with the Web Audio API, so
// there is nothing more to download. Either way each sound goes through the
// same graph and can follow the gesture — a swipe to the left is heard on the
// left. Until the recording has loaded, or if it cannot be, the swipe falls
// back to a drawn whoosh rather than going silent. They are quiet on purpose: a sound under a
// finger confirms what the eye already saw, and one loud enough to notice on
// its own would be one too many on a Sunday morning in a pew.
//
// On an iPhone the sounds are marked ambient (the Audio Session API, where the
// browser has it), so they obey the silent switch and never pause somebody's
// music or podcast. Browsers only let a page make sound after it has been
// touched, so `prime` is called from the first touch of anything that sounds.
//
// They can be turned off, per device, from the account menu beside the theme:
// how a phone should sound is the person holding it's choice, not the
// church's.

const STORE = 'ekkly:sounds'

const readEnabled = () => {
  try {
    return localStorage.getItem(STORE) !== 'off'
  } catch {
    return true
  }
}

const enabled = ref(readEnabled())

let ctx = null
let master = null
let noiseBuffer = null
let swipeBuffer = null
let swipeLoading = null

/**
 * Fetches and decodes the recorded swipe, once. The callback form of
 * decodeAudioData is the one older Safari understands. A failure is forgotten
 * so the next wake tries again.
 */
const loadSwipe = (c) => {
  if (swipeBuffer || swipeLoading) return
  swipeLoading = fetch(cardSwipeUrl)
    .then((res) => res.arrayBuffer())
    .then((data) => new Promise((resolve, reject) => c.decodeAudioData(data, resolve, reject)))
    .then((buffer) => {
      swipeBuffer = buffer
    })
    .catch(() => {
      swipeLoading = null
    })
}

/** The audio context, made on first use and woken if the browser put it to sleep. */
const audio = () => {
  if (!enabled.value || typeof window === 'undefined') return null
  if (!ctx) {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) return null
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'ambient'
    } catch {
      // Not every browser lets the session type be set; the sounds still play.
    }
    ctx = new Context()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  loadSwipe(ctx)
  return ctx
}

/** Half a second of white noise, made once: the raw stuff of a whoosh. */
const noise = (c) => {
  if (noiseBuffer) return noiseBuffer
  const length = Math.floor(c.sampleRate * 0.5)
  noiseBuffer = c.createBuffer(1, length, c.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

/** Left or right in the stereo field, where the browser can place a sound. */
const panned = (c, node, pan) => {
  if (!pan || typeof c.createStereoPanner !== 'function') return node
  const panner = c.createStereoPanner()
  panner.pan.value = pan
  node.connect(panner)
  return panner
}

/** A swipe: the recorded card swipe, on the side it went. */
const swipe = (dir = -1) => {
  const c = audio()
  if (!c) return
  if (!swipeBuffer) return whoosh(c, dir)
  const source = c.createBufferSource()
  source.buffer = swipeBuffer
  const gain = c.createGain()
  gain.gain.value = 0.8
  source.connect(gain)
  panned(c, gain, dir * 0.55).connect(master)
  source.start()
}

/** The drawn stand-in for the swipe: air rushing past, falling in pitch. */
const whoosh = (c, dir) => {
  const t = c.currentTime
  const source = c.createBufferSource()
  source.buffer = noise(c)

  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.9
  band.frequency.setValueAtTime(2600, t)
  band.frequency.exponentialRampToValueAtTime(650, t + 0.2)

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.28, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)

  source.connect(band)
  band.connect(gain)
  panned(c, gain, dir * 0.55).connect(master)
  source.start(t)
  source.stop(t + 0.25)
}

/** A card landing at the bottom of the deck: a soft, low thud with a whisper of paper. */
const tuck = () => {
  const c = audio()
  if (!c) return
  const t = c.currentTime

  const tone = c.createOscillator()
  tone.type = 'sine'
  tone.frequency.setValueAtTime(170, t)
  tone.frequency.exponentialRampToValueAtTime(95, t + 0.09)
  const body = c.createGain()
  body.gain.setValueAtTime(0.0001, t)
  body.gain.exponentialRampToValueAtTime(0.16, t + 0.006)
  body.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  tone.connect(body)
  body.connect(master)
  tone.start(t)
  tone.stop(t + 0.16)

  const rustle = c.createBufferSource()
  rustle.buffer = noise(c)
  const low = c.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 1100
  const hush = c.createGain()
  hush.gain.setValueAtTime(0.0001, t)
  hush.gain.exponentialRampToValueAtTime(0.06, t + 0.004)
  hush.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  rustle.connect(low)
  low.connect(hush)
  hush.connect(master)
  rustle.start(t)
  rustle.stop(t + 0.06)
}

/** A card put away: a light lift, rising. */
const lift = () => {
  const c = audio()
  if (!c) return
  const t = c.currentTime
  const tone = c.createOscillator()
  tone.type = 'triangle'
  tone.frequency.setValueAtTime(480, t)
  tone.frequency.exponentialRampToValueAtTime(860, t + 0.09)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.09, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
  tone.connect(gain)
  gain.connect(master)
  tone.start(t)
  tone.stop(t + 0.18)
}

/** Wakes the audio from inside a touch, the only time a browser allows it. */
const prime = () => {
  audio()
}

const setEnabled = (on) => {
  enabled.value = on
  try {
    localStorage.setItem(STORE, on ? 'on' : 'off')
  } catch {
    // Not remembered past this page; the switch still took.
  }
  // Heard as it is switched on, so the switch says what it did.
  if (on) lift()
}

export function useSounds() {
  return {
    soundsOn: enabled,
    setSounds: setEnabled,
    toggleSounds: () => setEnabled(!enabled.value),
    prime,
    swipe,
    tuck,
    lift,
  }
}

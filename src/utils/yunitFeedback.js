// What YUNIT sounds and feels like: a short sound and a buzz for each moment
// of a conversation with him, so a reply or a finished change is noticed with
// the phone at arm's length.
//
// A stand-in. These are drawn notes rather than recorded sounds, kept in this
// one file so they can be replaced wholesale - by recorded sounds, or by
// nothing - without touching the chat or him (useYunitChat.js and
// YunitMascot.vue call feel() and nothing else).
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
// from a doze).
//
// The sound can be turned off from YUNIT's header (yunitSound), and the phone
// remembers; the buzz stays, because it is felt rather than heard by the room.

import { ref } from 'vue'

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
// to slide to by the note's end, and a buzz pattern in ms.
const MOMENTS = {
  send: { notes: [[660, 0, 0.09], [880, 0.05, 0.1]], buzz: 8 },
  reply: { notes: [[784, 0, 0.12], [1047, 0.09, 0.16]], buzz: [6, 40, 10] },
  done: { notes: [[523, 0, 0.14], [659, 0.08, 0.14], [784, 0.16, 0.14], [1047, 0.24, 0.3]], buzz: [12, 60, 18] },
  cancel: { notes: [[440, 0, 0.1], [370, 0.07, 0.14]], buzz: 6 },
  sorry: { notes: [[494, 0, 0.16], [392, 0.14, 0.28]], buzz: [30, 50, 30] },
  clear: { notes: [[988, 0, 0.08], [784, 0.06, 0.08], [659, 0.12, 0.14]], buzz: 10 },

  // Tapped. Short and light, since someone may tap him again and again.
  wave: { notes: [[740, 0, 0.08], [880, 0.08, 0.08], [740, 0.16, 0.1]], buzz: 6 },
  jump: { notes: [[392, 0, 0.18, 1047]], buzz: 10 },
  wink: { notes: [[1175, 0, 0.07], [1568, 0.06, 0.1]], buzz: 5 },
  celebrate: { notes: [[784, 0, 0.08], [988, 0.06, 0.08], [1175, 0.12, 0.08], [1568, 0.18, 0.18]], buzz: [8, 40, 8] },
  nod: { notes: [[587, 0, 0.08], [494, 0.1, 0.1]], buzz: 6 },
  surprise: { notes: [[523, 0, 0.14, 1319]], buzz: 12 },
  hop: { notes: [[523, 0, 0.08, 784], [659, 0.1, 0.08, 988]], buzz: [5, 50, 5] },
  startle: { notes: [[330, 0, 0.06], [880, 0.05, 0.16, 1397]], buzz: [14, 30, 8] },
}

// Made on the first moment, which is always a tap or a key - a browser only
// lets sound start from inside one - and kept for the rest of the visit.
let audio = null

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
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + length + 0.05)
    }
  } catch {
    // No sound on this device; the buzz and the screen still say it.
  }
}

/** Plays the moment's sound and buzz. Unknown moments do nothing. */
export const feel = (moment) => {
  const it = MOMENTS[moment]
  if (!it) return
  if (yunitSound.value) play(it.notes)
  try {
    navigator.vibrate?.(it.buzz)
  } catch {
    // Some browsers refuse to buzz outside a tap; the sound still plays.
  }
}

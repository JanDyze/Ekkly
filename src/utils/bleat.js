import baaUrl from '../assets/sounds/yunit/baa.mp3'

// YUNIT the Sheep's "baa", on the lost page (LostYunit): his own, small and
// bright as his voice is, rather than a real lamb's (src/assets/sounds/
// yunit/baa.mp3, drawn to sound so: a soft "b" into a wavering "aaa"). Quiet,
// as all his sounds are. Should it not play, a drawn one stands in, so a tap
// is never met with silence. The caller decides whether sounds are on
// (useSounds). Returns how long it lasts, in ms, for a mouth to stay open
// over: the recording's own length once known, near enough before.

let recording = null
let audio = null

const drawnBleat = () => {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
    const t = audio.currentTime + 0.01
    // A buzzy voice that wavers as it falls, through a throat-like filter:
    // near enough to a lamb to make anyone smile.
    const voice = audio.createOscillator()
    voice.type = 'sawtooth'
    voice.frequency.setValueAtTime(520, t)
    voice.frequency.linearRampToValueAtTime(430, t + 0.6)
    const waver = audio.createOscillator()
    waver.frequency.value = 9
    const depth = audio.createGain()
    depth.gain.value = 28
    waver.connect(depth).connect(voice.frequency)
    const throat = audio.createBiquadFilter()
    throat.type = 'bandpass'
    throat.frequency.value = 1250
    throat.Q.value = 2.5
    const level = audio.createGain()
    level.gain.setValueAtTime(0, t)
    level.gain.linearRampToValueAtTime(0.14, t + 0.05)
    level.gain.setValueAtTime(0.14, t + 0.38)
    level.gain.exponentialRampToValueAtTime(0.0001, t + 0.66)
    voice.connect(throat).connect(level).connect(audio.destination)
    voice.start(t)
    waver.start(t)
    voice.stop(t + 0.7)
    waver.stop(t + 0.7)
  } catch {
    // No sound to be had; the "Baa!" is still said.
  }
}

export const bleat = () => {
  try {
    recording ||= new Audio(baaUrl)
    recording.currentTime = 0
    recording.volume = 0.45
    recording.play().catch(drawnBleat)
  } catch {
    drawnBleat()
  }
  const length = recording?.duration && Number.isFinite(recording.duration) ? recording.duration * 1000 : 800
  return Math.min(length, 2000)
}

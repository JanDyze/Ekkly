// The music under an announcement video.
//
// The built-in tracks are not recordings. They are written here, note by note,
// and played into an OfflineAudioContext the length of the video, so there is
// no file to license, nothing to download, and a track that always ends with
// the video instead of being cut off mid-phrase. The same seed gives the same
// performance every time, so the preview and the exported video agree.
//
// A church's own track is uploaded to its file store, decoded, looped if it
// is shorter than the video, and faded in and out the same way.

export const TRACKS = [
  { key: 'morning', label: 'Morning', hint: 'Gentle piano over soft strings' },
  { key: 'uplift', label: 'Uplift', hint: 'Bright and moving, with a light beat' },
  { key: 'still', label: 'Still', hint: 'Slow and reflective, for a quieter month' },
  { key: 'none', label: 'No music', hint: 'Silent, for adding a voice-over later' },
]

// `ownUrl` and `ownName` are the church's own song, when it has one.
export const DEFAULT_MUSIC = { track: 'morning', volume: 70, start: 0, ownUrl: '', ownName: '' }

const SAMPLE_RATE = 44100

// Each track: tempo, chords as MIDI notes (root first), and which parts play.
const SONGS = {
  morning: {
    bpm: 76,
    beatsPerChord: 8,
    chords: [
      [50, 62, 66, 69], // D
      [45, 61, 64, 69], // A/C#-ish
      [47, 62, 66, 71], // Bm
      [43, 62, 67, 71], // G
    ],
    pad: 0.05,
    arp: { gain: 0.11, pattern: [0, 2, 1, 3, 2, 1, 3, 2], per: 0.5 },
    bass: 0.1,
    seed: 7,
  },
  uplift: {
    bpm: 98,
    beatsPerChord: 8,
    chords: [
      [48, 60, 64, 67], // C
      [45, 60, 64, 69], // Am
      [41, 60, 65, 69], // F
      [43, 62, 67, 71], // G
    ],
    pad: 0.04,
    arp: { gain: 0.1, pattern: [0, 1, 2, 3, 2, 1, 2, 3], per: 0.5 },
    bass: 0.12,
    drums: true,
    seed: 11,
  },
  still: {
    bpm: 58,
    beatsPerChord: 8,
    chords: [
      [41, 60, 65, 69], // F
      [48, 60, 64, 67], // C
      [50, 62, 65, 69], // Dm
      [46, 62, 65, 70], // Bb
    ],
    pad: 0.07,
    arp: { gain: 0.08, pattern: [3, -1, 2, -1, 1, -1, -1, -1], per: 1 },
    bass: 0.07,
    seed: 3,
  },
}

const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

/** A small seeded random, so the same track plays the same way twice. */
const seeded = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A room for the notes to ring in: decaying noise, a little wider on the right. */
const makeReverb = (ctx, seconds = 2.8) => {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  const random = seeded(99)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (random() * 2 - 1) * Math.pow(1 - i / length, 3.2)
  }
  const node = ctx.createConvolver()
  node.buffer = impulse
  return node
}

const playPad = (ctx, out, notes, start, length, level) => {
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  filter.Q.value = 0.4
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(level, start + Math.min(1.6, length * 0.4))
  gain.gain.setValueAtTime(level, start + length)
  gain.gain.linearRampToValueAtTime(0, start + length + 1.8)
  filter.connect(gain).connect(out)
  notes.slice(1).forEach((note) => {
    ;[-7, 7].forEach((cents) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq(note)
      osc.detune.value = cents
      osc.connect(filter)
      osc.start(start)
      osc.stop(start + length + 2)
    })
  })
}

/** Something like a felt piano: a quick strike that dies away. */
const playPluck = (ctx, out, note, start, level) => {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(level, start + 0.006)
  gain.gain.exponentialRampToValueAtTime(level * 0.3, start + 0.35)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.2)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3200, start)
  filter.frequency.exponentialRampToValueAtTime(900, start + 1.2)
  gain.connect(filter).connect(out)
  ;[
    ['triangle', 1, 1],
    ['sine', 2, 0.35],
  ].forEach(([type, multiple, share]) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq(note) * multiple
    const g = ctx.createGain()
    g.gain.value = share
    osc.connect(g).connect(gain)
    osc.start(start)
    osc.stop(start + 2.3)
  })
}

const playBass = (ctx, out, note, start, length, level) => {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq(note - 12 >= 28 ? note - 12 : note)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(level, start + 0.04)
  gain.gain.setValueAtTime(level * 0.8, start + length * 0.8)
  gain.gain.linearRampToValueAtTime(0, start + length)
  osc.connect(gain).connect(out)
  osc.start(start)
  osc.stop(start + length + 0.05)
}

const playKick = (ctx, out, start, level) => {
  const osc = ctx.createOscillator()
  osc.frequency.setValueAtTime(115, start)
  osc.frequency.exponentialRampToValueAtTime(42, start + 0.16)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(level, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32)
  osc.connect(gain).connect(out)
  osc.start(start)
  osc.stop(start + 0.35)
}

const playShaker = (ctx, out, noise, start, level) => {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(level, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07)
  src.connect(filter).connect(gain).connect(out)
  src.start(start)
  src.stop(start + 0.08)
}

/** In and out, so the video neither starts nor stops on a hard edge. */
const fadeEnvelope = (ctx, node, seconds, fadeIn = 1.2, fadeOut = 2.5) => {
  node.gain.setValueAtTime(0, 0)
  node.gain.linearRampToValueAtTime(1, Math.min(fadeIn, seconds / 3))
  node.gain.setValueAtTime(1, Math.max(0, seconds - fadeOut))
  node.gain.linearRampToValueAtTime(0, seconds)
}

const composeSong = (ctx, song, seconds) => {
  const random = seeded(song.seed)
  const beat = 60 / song.bpm
  const chordLength = beat * song.beatsPerChord

  const master = ctx.createGain()
  fadeEnvelope(ctx, master, seconds)
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  const dry = ctx.createGain()
  dry.gain.value = 0.85
  dry.connect(master)
  const reverb = makeReverb(ctx)
  const wet = ctx.createGain()
  wet.gain.value = 0.4
  reverb.connect(wet).connect(master)
  const bus = ctx.createGain()
  bus.connect(dry)
  bus.connect(reverb)

  let noise = null
  if (song.drums) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1
  }

  for (let start = 0, i = 0; start < seconds; start += chordLength, i++) {
    const chord = song.chords[i % song.chords.length]
    playPad(ctx, bus, chord, start, chordLength, song.pad)
    if (song.bass) {
      playBass(ctx, dry, chord[0], start, chordLength / 2, song.bass)
      playBass(ctx, dry, chord[0], start + chordLength / 2, chordLength / 2, song.bass * 0.85)
    }

    // The melody: the chord's own notes an octave up, broken into a pattern,
    // each struck a little differently so it does not sound like a machine.
    const upper = chord.slice(1).map((n) => n + 12)
    const step = beat * song.arp.per
    const steps = Math.round(chordLength / step)
    for (let s = 0; s < steps; s++) {
      const index = song.arp.pattern[s % song.arp.pattern.length]
      if (index < 0) continue
      const note = upper[index % upper.length] + (index >= upper.length ? 12 : 0)
      const when = start + s * step + (random() - 0.5) * 0.012
      if (when >= seconds) break
      playPluck(ctx, bus, note, Math.max(0, when), song.arp.gain * (0.7 + random() * 0.3))
    }

    if (song.drums) {
      for (let b = 0; b < song.beatsPerChord; b++) {
        const when = start + b * beat
        if (when >= seconds) break
        // Held back for the first bars, so the beat arrives rather than starts.
        if (start >= chordLength) playKick(ctx, dry, when, b % 2 === 0 ? 0.32 : 0.2)
        playShaker(ctx, dry, noise, when + beat / 2, 0.05 + random() * 0.02)
      }
    }
  }
}

/** A church's own track, looped to length from where it chose to start. */
const arrangeFile = (ctx, buffer, seconds, start = 0) => {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = buffer.duration < seconds + start
  const gain = ctx.createGain()
  fadeEnvelope(ctx, gain, seconds, 0.8, 2.5)
  src.connect(gain).connect(ctx.destination)
  src.start(0, Math.min(Math.max(0, start), Math.max(0, buffer.duration - 1)))
}

const cache = new Map()

/**
 * The music for a video of `seconds`, as an AudioBuffer, or null for none.
 * `file` is a decoded AudioBuffer of the church's own track, when that is the
 * choice.
 */
export const renderMusic = async ({ track, seconds, file = null, start = 0 }) => {
  if (!seconds || track === 'none') return null
  const length = Math.ceil(seconds * 10) / 10
  const key = `${track}|${length}|${start}|${file ? file.length : 0}`
  if (cache.has(key)) return cache.get(key)

  const ctx = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * length), SAMPLE_RATE)
  if (track === 'upload' && file) arrangeFile(ctx, file, length, start)
  else composeSong(ctx, SONGS[track] || SONGS.morning, length)

  const rendered = ctx.startRendering()
  cache.set(key, rendered)
  if (cache.size > 12) cache.delete(cache.keys().next().value)
  return rendered
}

/* --------------------------------------------------- the church's own track */

// Kept with the church, in its file store under <church>/videos/music/, so
// every phone and computer that makes the video plays the same song. The
// settings hold its address and name (`music.ownUrl`, `music.ownName`).
//
// This browser keeps a copy as well, under that address, so a song is not
// downloaded again each time the studio opens. A song chosen before songs were
// uploaded (0.30.0) has no address: it lives only in the browser that chose
// it, under the church's id, and is still read from there.

const DB_NAME = 'ekkly-video'
const STORE = 'music'

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const withStore = async (mode, work) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const result = work(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result)
    tx.onerror = () => reject(tx.error)
  })
}

const cacheKey = (url) => `url:${url}`

/** Keeps a song just uploaded in this browser too, so it plays without a download. */
export const cacheOwnTrack = (url, file) =>
  withStore('readwrite', (store) => store.put({ name: file.name, type: file.type, blob: file }, cacheKey(url))).catch(
    () => null
  )

/**
 * The church's song as `{ name, blob }`, or null when there is none or it
 * cannot be had: this browser's copy when it has one, otherwise downloaded
 * from the file store and copied here for next time.
 */
export const loadOwnTrack = async (music, churchId) => {
  try {
    if (music?.ownUrl) {
      const cached = await withStore('readonly', (store) => store.get(cacheKey(music.ownUrl))).catch(() => null)
      if (cached?.blob) return cached
      const response = await fetch(music.ownUrl)
      if (!response.ok) return null
      const blob = await response.blob()
      const record = { name: music.ownName || 'Your own music', type: blob.type, blob }
      withStore('readwrite', (store) => store.put(record, cacheKey(music.ownUrl))).catch(() => null)
      return record
    }
    // Chosen before songs were uploaded: only on the device that chose it.
    return (await withStore('readonly', (store) => store.get(churchId))) || null
  } catch {
    return null
  }
}

/** Drops this browser's copy of a song the church no longer uses. */
export const forgetOwnTrack = (music, churchId) =>
  withStore('readwrite', (store) => {
    if (music?.ownUrl) store.delete(cacheKey(music.ownUrl))
    if (churchId) store.delete(churchId)
  }).catch(() => null)

const decoded = new Map()

/** The stored track as an AudioBuffer, decoded once per visit. */
export const decodeOwnTrack = async (stored) => {
  if (!stored?.blob) return null
  const key = `${stored.name}|${stored.blob.size}`
  if (!decoded.has(key)) {
    const bytes = await stored.blob.arrayBuffer()
    const ctx = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE)
    const decoding = ctx.decodeAudioData(bytes)
    // A file that will not decode is not kept, so picking it again tries again.
    decoding.catch(() => decoded.delete(key))
    decoded.set(key, decoding)
  }
  return decoded.get(key)
}

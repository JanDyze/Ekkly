// Speaks what YUNIT says aloud when he pipes up on the home
// (src/data/yunitVoice.js) into public/voice/yunit/, one MP3 a line, and
// writes index.json beside them with each line's file and length, which he
// talks for (HomeYunit).
//
// The voice is Kokoro (Apache 2.0), the one the front door's narration and
// the ads in marketing/ use, run here in Node, in a man's voice for him. It
// and the MP3 encoder are only needed to make the files, so they are not in
// package.json; install them for the run:
//
//   npm i --no-save kokoro-js@1.2.1 @breezystack/lamejs
//   node scripts/make-yunit-voice.mjs
//
// A line that has not changed since it was last made is left alone, so only a
// changed line takes the time (several seconds each) to speak again.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/voice/yunit')
// Bright and friendly, and a little quicker than a narrator: he is chatty.
const VOICE_NAME = 'am_michael'
const SPEED = 1.08
// A spoken voice needs little: mono, at the voice's own rate, 48 kbps.
const KBPS = 48

const { YUNIT_LINES } = await import(pathToFileURL(resolve(ROOT, 'src/data/yunitVoice.js')).href)

const hash = (text) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}

// What the voice is handed: straight quotes and plain commas, as curly ones
// and dashes read as noise.
const speakable = (line) => line.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/—/g, ', ')

// The voice leaves a breath of silence either end, which would only delay
// his mouth from moving with it, so it is trimmed to a few hundredths.
function trim(samples, rate) {
  const floor = 0.01
  let a = samples.findIndex((v) => Math.abs(v) > floor)
  if (a < 0) return samples
  let b = samples.length - 1
  while (b > a && Math.abs(samples[b]) < floor) b--
  a = Math.max(0, a - Math.round(rate * 0.04))
  b = Math.min(samples.length, b + Math.round(rate * 0.12))
  return samples.slice(a, b)
}

async function mp3(samples, rate) {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const encoder = new Mp3Encoder(1, rate, KBPS)
  const pcm = Int16Array.from(samples, (v) => Math.max(-1, Math.min(1, v)) * 0x7fff)
  const parts = []
  for (let i = 0; i < pcm.length; i += 1152) parts.push(encoder.encodeBuffer(pcm.subarray(i, i + 1152)))
  parts.push(encoder.flush())
  return Buffer.concat(parts.map((part) => Buffer.from(part)))
}

mkdirSync(OUT, { recursive: true })
const indexPath = resolve(OUT, 'index.json')
const before = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {}
const index = {}

let tts = null
for (const [key, line] of Object.entries(YUNIT_LINES)) {
  const id = hash(`${VOICE_NAME}|${SPEED}|${speakable(line)}`)
  const file = `${key}-${id}.mp3`
  if (before[key]?.file === file && existsSync(resolve(OUT, file))) {
    index[key] = before[key]
    console.log(`kept   ${key}`)
    continue
  }
  if (!tts) {
    const { KokoroTTS } = await import('kokoro-js')
    tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
  }
  const spoken = await tts.generate(speakable(line), { voice: VOICE_NAME, speed: SPEED })
  const samples = trim(Array.from(spoken.audio), spoken.sampling_rate)
  writeFileSync(resolve(OUT, file), await mp3(samples, spoken.sampling_rate))
  index[key] = { file, seconds: Math.round((samples.length / spoken.sampling_rate) * 100) / 100 }
  console.log(`spoken ${key} (${index[key].seconds}s)`)
}

// Old files of lines that have since changed are left for whoever runs this
// to delete, so nothing is removed without being seen; they are listed here.
for (const [key, entry] of Object.entries(before)) {
  if (index[key]?.file !== entry.file) console.log(`stale  public/voice/yunit/${entry.file}`)
}

writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
console.log(`\n${Object.keys(index).length} lines in public/voice/yunit/index.json`)

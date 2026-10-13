#!/usr/bin/env node
/**
 * Real-looking photos for the home's made-up preview cards (`?cards=10` under
 * `npm run dev`, src/data/sampleTodayCards.js): a picture for each made-up
 * gathering and a face for each made-up person, so the desktop's cards can be
 * judged with what a church's own would hold rather than drawings.
 *
 * Where they come from: the gatherings from Pixabay, with PIXABAY_API_KEY from
 * .env (free; the key shows on pixabay.com/api/docs once signed in), and the
 * faces from randomuser.me, which exists for mock people — a stock search for
 * "portrait" turns up cropped chins and faces too famous to pass as a member
 * (scripts/seed-video-mocks.mjs found the same). Pixabay asks that its
 * pictures be downloaded rather than linked to, so each is downloaded, shrunk
 * to a small WebP and kept in src/assets/mock-photos/home/, with the page it
 * came from written beside it in credits.json.
 *
 * They are only ever imported by the preview's sample cards, which a church's
 * build leaves out, so none of them ships.
 *
 *   node scripts/fetch-home-mock-photos.mjs           # prints what it would fetch
 *   node scripts/fetch-home-mock-photos.mjs --write   # fetches and saves them
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src/assets/mock-photos/home')
const WRITE = process.argv.includes('--write')

const loadEnv = () => {
  const file = path.join(ROOT, '.env')
  if (!fs.existsSync(file)) throw new Error('No .env file found')
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

// One photo for each made-up gathering, by the name the sample cards use.
const GATHERINGS = [
  ['sunday-service', 'church worship service'],
  ['youth-night', 'youth group friends'],
  ['prayer-meeting', 'people praying together'],
  ['bible-study', 'bible study group'],
  ['choir', 'church choir singing'],
  ['outreach', 'volunteers community'],
  ['leaders-meeting', 'small group meeting table'],
]

// A face for each made-up person, by first name.
const FACES = [
  ['ana', 'women/44'],
  ['ben', 'men/32'],
  ['maria', 'women/65'],
  ['joy', 'women/21'],
  ['paolo', 'men/75'],
  ['carla', 'women/12'],
  ['david', 'men/46'],
]

const pixabay = async (key, query) => {
  const url = new URL('https://pixabay.com/api/')
  url.search = new URLSearchParams({ key, q: query, image_type: 'photo', safesearch: 'true', orientation: 'horizontal', per_page: '10' })
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Pixabay said ${response.status} to "${query}"`)
  const hit = ((await response.json()).hits || [])[0]
  if (!hit) throw new Error(`Pixabay found nothing for "${query}"`)
  return { url: hit.webformatURL, page: hit.pageURL, by: hit.user }
}

/** Downloads a picture and keeps it as a small square WebP. */
const keep = async (url, file, size) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`)
  const input = Buffer.from(await response.arrayBuffer())
  const output = await sharp(input).rotate().resize(size, size, { fit: 'cover' }).webp({ quality: 78 }).toBuffer()
  fs.writeFileSync(path.join(OUT, file), output)
  return output.length
}

const main = async () => {
  const key = loadEnv().PIXABAY_API_KEY
  if (!key) throw new Error('No PIXABAY_API_KEY in .env')

  const credits = {}
  const plan = []
  for (const [name, query] of GATHERINGS) {
    const found = await pixabay(key, query)
    credits[`${name}.webp`] = { from: 'Pixabay', page: found.page, by: found.by }
    plan.push({ file: `${name}.webp`, url: found.url, size: 240 })
  }
  for (const [name, who] of FACES) {
    const url = `https://randomuser.me/api/portraits/${who}.jpg`
    credits[`face-${name}.webp`] = { from: 'randomuser.me', page: url }
    plan.push({ file: `face-${name}.webp`, url, size: 128 })
  }

  for (const item of plan) console.log(`${item.file.padEnd(24)} ${item.url}`)
  if (!WRITE) {
    console.log('\nNothing saved. Run again with --write to fetch and save them.')
    return
  }

  fs.mkdirSync(OUT, { recursive: true })
  let total = 0
  for (const item of plan) total += await keep(item.url, item.file, item.size)
  fs.writeFileSync(path.join(OUT, 'credits.json'), `${JSON.stringify(credits, null, 2)}\n`)
  console.log(`\nSaved ${plan.length} pictures (${Math.round(total / 1024)} KB) to ${path.relative(ROOT, OUT)}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

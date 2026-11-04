#!/usr/bin/env node
/**
 * Mock roadmaps for the platform console's Roadmaps section, one per goal, so
 * both maps have something to show. The goals join up (`after`): your own
 * church using it leads to selling it to a church, which with the mobile app
 * leads to a hundred churches. The hundred is the long road, with steps done,
 * a flag part way up, sidetracks taken and dropped, and the steps still
 * ahead; the others are shorter.
 *
 * Safe by default:
 *   - prints what it would do, and writes nothing, unless --write is given;
 *   - each roadmap has an id of its own (mock-…) and carries `mock: true`,
 *     so --remove takes out exactly these, and no roadmap anyone made;
 *   - each run that changes anything leaves one line in the console's
 *     Activity (platformLog).
 *
 *   node scripts/seed-mock-roadmap.mjs
 *   node scripts/seed-mock-roadmap.mjs --write
 *   node scripts/seed-mock-roadmap.mjs --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEED = 'seed-mock-roadmap'
const MARK = { mock: true, mockSeed: SEED }
const WRITE = process.argv.includes('--write')
const REMOVE = process.argv.includes('--remove')

const loadEnv = () => {
  const file = path.join(ROOT, '.env')
  if (!fs.existsSync(file)) throw new Error('No .env file found')
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1)
  }
  return env
}

// A stop as lib/platform/roadmaps.js keeps one.
let n = 0
const stop = (kind, title, status, { stars = 0, doneOn = '', note = '' } = {}) => ({
  id: `mock-${++n}`,
  kind,
  title,
  note,
  status,
  stars: status === 'done' ? stars : 0,
  doneOn: status === 'done' ? doneOn : '',
})
const step = (title, status, more) => stop('step', title, status, more)
const side = (title, status, more) => stop('side', title, status, more)

const ROADMAPS = [
  {
    id: 'mock-hundred-churches',
    title: 'A hundred churches on Ekkly',
    why: 'Every one of them spared the lists kept twice and the notes nobody can find, so its people have more time for the ministry itself.',
    after: ['mock-first-sale', 'mock-mobile-app'],
    stops: [
      step('One church runs on it', 'done', { stars: 3, doneOn: '2025-06-14', note: 'UEC, every Sunday.' }),
      step('Many churches from one deployment', 'done', { stars: 2, doneOn: '2026-09-15', note: 'Each church at an address of its own, its records apart.' }),
      side('Sign-in at every church’s own address', 'done', { note: 'Google sign-in had to learn each address.' }),
      side('A desktop app for the projector', 'dropped', { note: 'Presenting from the browser turned out to be enough.' }),
      step('Every app an app of its own', 'done', { stars: 3, doneOn: '2026-10-24' }),
      side('YUNIT, the assistant', 'done'),
      step('Each church pays only for the apps it uses', 'done', { stars: 1, doneOn: '2026-10-30', note: 'Works, but the prices page still confuses people.' }),
      step('Card payments for every church', 'next', { note: 'Monthly, by card, without anyone sending a receipt.' }),
      side('Ads on Facebook and Instagram', 'open', { note: 'Seeing which churches find us that way.' }),
      step('A church can sign up on its own, start to finish', 'next'),
      step('Ten churches paying', 'next'),
      step('Ekkly in Tagalog and Cebuano', 'next'),
      step('Fifty churches', 'next'),
    ],
  },
  {
    id: 'mock-mobile-app',
    title: 'Ekkly as a mobile app',
    why: 'Most of a church’s people only ever have a phone.',
    after: [],
    stops: [
      step('Installable from the browser', 'done', { stars: 2, doneOn: '2026-07-20' }),
      step('Works with no signal', 'next', { note: 'Songs and the Bible first, then attendance.' }),
      side('Try wrapping it for the stores', 'open'),
      step('In the Play Store', 'next'),
      step('In the App Store', 'next'),
    ],
  },
  {
    id: 'mock-first-sale',
    title: 'Sell Ekkly to a church',
    why: 'The first church that pays is the proof it is worth paying for.',
    after: ['mock-my-church'],
    stops: [
      step('A front door that says what it does', 'done', { stars: 2, doneOn: '2026-10-05' }),
      step('A price for each app', 'done', { stars: 1, doneOn: '2026-10-30' }),
      step('Show it to a pastor', 'next'),
      side('A printed flyer for the district meeting', 'dropped', { note: 'Nobody took one home.' }),
      step('The first church pays', 'next'),
    ],
  },
  {
    id: 'mock-my-church',
    title: 'My church uses it every week',
    why: 'If it does not serve our own Sundays, it will not serve anyone else’s.',
    after: [],
    stops: [
      step('Sunday line-ups in Schedules', 'done', { stars: 3, doneOn: '2026-08-10' }),
      step('Attendance counted every Sunday', 'done', { stars: 2, doneOn: '2026-09-07' }),
      side('A paper sheet for the ushers, just in case', 'done'),
      step('The books kept in Finances', 'next'),
      step('Every ministry head signed in', 'next'),
    ],
  },
]

async function main() {
  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()
  const roadmaps = db.collection('roadmaps')

  const log = (action, label) =>
    db.collection('platformLog').doc().set({
      at: FieldValue.serverTimestamp(),
      actorUid: SEED,
      actorEmail: '',
      actorName: 'Mock data',
      action,
      churchId: '',
      target: '',
      label,
      details: {},
    })

  if (REMOVE) {
    const found = (await roadmaps.where('mock', '==', true).get()).docs
    console.log(`${found.length} mock roadmap(s).`)
    if (!WRITE) return console.log('Dry run. Add --write to remove them.')
    const batch = db.batch()
    found.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    await log('roadmap.delete', `Removed ${found.length} mock roadmaps`)
    return console.log('Removed.')
  }

  const existing = await Promise.all(ROADMAPS.map((r) => roadmaps.doc(r.id).get()))
  if (existing.some((d) => d.exists)) {
    return console.log('The mock roadmaps are already there. Run with --remove --write first to start again.')
  }

  for (const r of ROADMAPS) {
    const steps = r.stops.filter((s) => s.kind === 'step')
    console.log(`${r.title}: ${steps.filter((s) => s.status === 'done').length} of ${steps.length} steps done, ${r.stops.length - steps.length} sidetracks`)
  }
  if (!WRITE) return console.log('\nDry run. Add --write to add them.')

  const now = FieldValue.serverTimestamp()
  const batch = db.batch()
  ROADMAPS.forEach(({ id, ...r }) =>
    batch.set(roadmaps.doc(id), { ...r, ...MARK, createdAt: now, updatedAt: now, updatedBy: 'Mock data' })
  )
  await batch.commit()
  await log('roadmap.new', `Added ${ROADMAPS.length} mock roadmaps`)
  console.log('\nAdded. Open /platform?section=roadmaps.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

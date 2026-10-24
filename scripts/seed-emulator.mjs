#!/usr/bin/env node
/**
 * A whole sample church in Firebase's emulators, for trying Ekkly on this
 * machine without touching the live project: `npm run emulators` in one
 * terminal, this once, then `npm run dev:emulator` and
 * http://localhost:5173/login?church=sample.
 *
 * The live project is shared by every church, and its daily reads are shared
 * with them too: signing in as each role and opening every screen against it
 * spent a whole day's reads in an hour, and every church's app stopped
 * reading until midnight Pacific. The emulators have no quota, no
 * congregation, and start empty each time.
 *
 * It makes the church and what a church sets up first (its names, ministries
 * and what each may do, tags, the week's gatherings), then runs the mock
 * scripts against it: people, a year of everything, Sunday line-ups, links,
 * and a test account for every ministry, all with the password `test1234`.
 *
 * Refuses to run unless the emulators are the target, so it can never write a
 * sample church into the live project.
 *
 *   npm run seed:emulator
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHURCH = 'sample'
const PASSWORD = 'test1234'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8085'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'

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

// What a church sets up first, as the reviewed roles at UEC Canubing II have
// it (Settings → Roles).
const MINISTRIES = {
  Instrumentalist: ['Keyboard, guitar and drums for the worship set.', 'MusicNotes', []],
  'Song Leader': ['Leads the congregation in worship on Sunday.', 'MicrophoneStage', ['songs.manage', 'worship.manage', 'events.view']],
  Usher: ['Welcomes people, seats them and takes the offering.', 'HandWaving', ['attendance.manage', 'ushers.manage', 'consolidation.view', 'events.view']],
  Preacher: ['Brings the message and teaches the Word.', 'BookOpen', ['preaching.manage', 'teaching.manage', 'minutes.manage', 'events.manage', 'prayer.manage', 'tasks.manage', 'members.view']],
  'SG Leader': ['Shepherds a small group through the week.', 'UsersThree', ['smallgroups.manage', 'members.view', 'prayer.manage', 'tasks.view']],
  'Sunday School Teacher': ['Teaches the children during the service.', 'Student', ['teaching.manage', 'members.view', 'events.view']],
  Treasurer: ['Keeps the ledger and reports the finances.', 'Coins', ['finances.manage', 'inventory.view']],
  'Welcome Team': ['Greets newcomers on Sunday and follows them up in the week.', 'HandWaving', ['consolidation.manage', 'members.view', 'smallgroups.view']],
  Secretary: ['Keeps the roll and the minutes of the church’s meetings.', 'Notebook', ['members.manage', 'minutes.manage', 'tasks.manage', 'events.view']],
  Media: ['Takes the photos and keeps the church’s links and pages current.', 'Camera', ['gallery.manage', 'links.manage', 'events.view']],
  Facilities: ['Looks after the building and the church’s equipment.', 'Wrench', ['inventory.manage', 'tasks.view']],
}

const run = (script, ...args) => {
  console.log(`\n▸ ${script} ${args.join(' ')}`)
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), '--church', CHURCH, ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
    env: process.env,
    encoding: 'utf8',
  })
  // The mock scripts list everything they make; the last lines are enough.
  console.log(String(result.stdout || '').trim().split('\n').slice(-3).join('\n'))
  if (result.status !== 0) throw new Error(`${script} failed`)
}

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Only for the emulators: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set.')
  }
  const env = loadEnv()
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  // Is anyone listening? A clear answer beats a minute of retries.
  await Promise.race([
    db.collection('churches').limit(1).get(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('The emulators are not running: start them with `npm run emulators`.')), 8000)),
  ])

  const church = db.collection('churches').doc(CHURCH)
  await church.set({ name: 'Grace Fellowship', status: 'active', timezone: 'Asia/Manila', createdAt: FieldValue.serverTimestamp() })
  await church.collection('appSettings').doc('church').set({
    church: {
      shortName: 'Grace Fellowship',
      fullName: 'Grace Fellowship Church (sample)',
      branch: 'Main',
      mission: 'To know Christ and make Him known.',
      address: '12 Mabini Street, Calapan City',
    },
    setup: { done: true },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  const batch = db.batch()
  for (const [name, [description, icon, capabilities]] of Object.entries(MINISTRIES)) {
    batch.set(church.collection('ministries').doc(), { name, description, icon, imageUrl: '', createdAt: FieldValue.serverTimestamp() })
    if (capabilities.length) batch.set(church.collection('rolePermissions').doc(name), { capabilities, updatedBy: 'seed', updatedAt: FieldValue.serverTimestamp() })
  }
  for (const name of ['First Timer', 'Youth', 'Choir']) {
    batch.set(church.collection('memberTags').doc(), { name, icon: '', imageUrl: '', createdAt: FieldValue.serverTimestamp() })
  }
  await batch.commit()
  console.log(`Church "${CHURCH}" set up with ${Object.keys(MINISTRIES).length} ministries.`)

  run('seed-schedules.mjs', '--write')
  run('seed-mock-data.mjs', '--write')
  // Tasks before the accounts: each account's own task is a mock task too,
  // and the task script will not add to a list that already has some.
  run('seed-task-mocks.mjs', '--write')
  run('seed-test-accounts.mjs', '--write', '--password', PASSWORD)
  run('seed-link-mocks.mjs', '--write')
  run('seed-attendance.mjs', '--weeks', '26', '--write')
  const month = (offset) => {
    const d = new Date()
    d.setMonth(d.getMonth() + offset, 1)
    return d.toISOString().slice(0, 7)
  }
  run('seed-lineups.mjs', '--months', [-1, 0, 1, 2].map(month).join(','), '--write')
  run('sync-caps.mjs', '--write')

  console.log(`\nReady. npm run dev:emulator, then http://localhost:5173/login?church=${CHURCH}`)
  console.log(`Sign in as admin@${CHURCH}.test (or any ministry, e.g. treasurer@${CHURCH}.test), password ${PASSWORD}.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

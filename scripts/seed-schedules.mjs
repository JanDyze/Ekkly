#!/usr/bin/env node
/**
 * Mock standing gatherings for one church, for trying the calendar, the
 * public page's "When we gather", the Upcoming dock and attendance against a
 * believable week instead of an empty one.
 *
 * A schedule is a rule, not a date (Settings > Schedule): "every Sunday at
 * nine", "the first Saturday of the month". The calendar expands each one onto
 * real days, so a handful of documents fills every week from here on.
 *
 * What goes in is an ordinary congregation's week: Sunday school and the
 * Sunday service with communion on the first Sunday, prayer on Wednesday,
 * Bible study on Thursday, youth on Saturday afternoon, worship-team practice
 * before it, and a leaders' meeting on the first Saturday, which keeps
 * minutes. The types are the app's own, so the public page publishes the
 * services and leaves the meetings and the practice behind the sign-in, as it
 * would for real ones.
 *
 * Safe by default:
 *   - reads only, and prints what it would write, unless --write is given;
 *   - never adds a gathering the church already has — one by the same title,
 *     or one of the same type on the same day, so a church with its own
 *     "Sunday Service" is not given a second — so a real schedule always wins
 *     and running it twice adds nothing the second time;
 *   - every document it writes carries `mock: true`, and --remove deletes
 *     those and nothing else;
 *   - each run that changes anything leaves one entry in the church's audit
 *     log saying so.
 *
 *   node scripts/seed-schedules.mjs --church uec-c2
 *   node scripts/seed-schedules.mjs --church uec-c2 --write
 *   node scripts/seed-schedules.mjs --church uec-c2 --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AUDIT_COLLECTION } from '../lib/auditEntry.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}
const flag = (name) => process.argv.includes(`--${name}`)

const CHURCH_ID = arg('church')
const WRITE = flag('write')
const REMOVE = flag('remove')

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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// The same fields the Schedule editor writes (normalizeSchedule in
// src/api/recurringSchedulesService.js), so the app reads these exactly as it
// reads its own. `occurrences` is which weeks of the month: empty is every
// week, [1] the first, 'last' whichever is the last.
const GATHERINGS = [
  {
    title: 'Sunday School',
    type: 'fellowship',
    weekday: 0,
    time: '08:00',
    location: 'Fellowship hall',
    description: 'Classes for every age before the service. Children meet by age group; adults study through a book of the Bible together.',
    icon: 'Student',
    showBefore: 60,
  },
  {
    title: 'Sunday Worship Service',
    type: 'worship',
    weekday: 0,
    time: '09:30',
    location: 'Main sanctuary',
    description: "Praise, prayer and preaching from the Word. Kids' church runs at the same time for ages 4 to 11.",
    icon: 'Church',
    showBefore: 60,
    // What the service also is on certain weeks.
    occasions: [
      { label: 'Communion Sunday', occurrences: [1], dates: [] },
      { label: 'Fellowship lunch', occurrences: ['last'], dates: [] },
    ],
  },
  {
    title: 'Midweek Prayer Meeting',
    type: 'prayer',
    weekday: 3,
    time: '19:00',
    location: 'Main sanctuary',
    description: 'An hour of prayer for the church, the city and one another. Come as you are, straight from work.',
    icon: 'HandsPraying',
    showBefore: 120,
  },
  {
    title: 'Bible Study',
    type: 'training',
    weekday: 4,
    time: '19:00',
    location: 'Fellowship hall',
    description: 'Working through a book of the Bible chapter by chapter, with time for questions.',
    icon: 'BookOpen',
    showBefore: 120,
  },
  {
    title: 'Worship Team Practice',
    type: 'training',
    weekday: 6,
    time: '14:00',
    location: 'Main sanctuary',
    description: "Run-through of Sunday's songs with the band and singers.",
    icon: 'MusicNotes',
    showBefore: 60,
  },
  {
    title: 'Youth Fellowship',
    type: 'fellowship',
    weekday: 6,
    time: '17:00',
    location: 'Fellowship hall',
    description: 'Games, worship and a short talk for ages 13 and up, with merienda after.',
    icon: 'Users',
    showBefore: 120,
  },
  {
    title: "Leaders' Meeting",
    type: 'meeting',
    weekday: 6,
    time: '09:00',
    occurrences: [1],
    location: "Pastor's office",
    description: 'Ministry heads and elders: the month ahead, needs in the congregation, and prayer.',
    icon: 'ClipboardText',
    showBefore: 1440,
    keepsMinutes: true,
  },
]

const describe = (g) => {
  const weeks = g.occurrences?.length
    ? ` (${g.occurrences.map((o) => (o === 'last' ? 'last' : `week ${o}`)).join(', ')})`
    : ''
  return `${WEEKDAYS[g.weekday].padEnd(9)} ${g.time}  ${g.title}${weeks}  [${g.type}]`
}

const main = async () => {
  if (!CHURCH_ID) {
    console.error('Usage: node scripts/seed-schedules.mjs --church <id> [--write] [--remove]')
    process.exit(1)
  }

  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  const church = db.collection('churches').doc(CHURCH_ID)
  const churchSnap = await church.get()
  if (!churchSnap.exists) throw new Error(`No church "${CHURCH_ID}" in project ${sa.project_id}`)
  const churchName = churchSnap.data()?.name || churchSnap.data()?.shortName || CHURCH_ID

  console.log(`Project:  ${sa.project_id}`)
  console.log(`Church:   ${churchName} (${CHURCH_ID})`)
  console.log(`Mode:     ${REMOVE ? 'remove mock schedules' : 'add mock schedules'}${WRITE ? '' : ' - dry run, nothing written'}`)
  console.log('')

  const schedules = church.collection('recurringSchedules')

  const audit = (action, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: 'recurringSchedules',
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-schedules',
      source: 'script',
    })

  if (REMOVE) {
    const snap = await schedules.where('mock', '==', true).get()
    console.log(`${snap.size} mock schedule${snap.size === 1 ? '' : 's'} found.`)
    snap.docs.forEach((d) => console.log(`  - ${describe(d.data())}`))
    if (!WRITE || !snap.size) return
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    await audit('delete', `Removed ${snap.size} mock schedules`, ['mock'])
    console.log('\nRemoved.')
    return
  }

  const existing = await schedules.get()
  const taken = new Set(existing.docs.map((d) => String(d.data().title || '').trim().toLowerCase()))
  const slots = new Set(existing.docs.map((d) => `${d.data().weekday}:${d.data().type}`))
  const clash = (g) =>
    taken.has(g.title.toLowerCase())
      ? 'the church already has one by that name'
      : slots.has(`${g.weekday}:${g.type}`)
        ? `the church already has a ${g.type} gathering on ${WEEKDAYS[g.weekday]}`
        : ''
  console.log(`${existing.size} schedule${existing.size === 1 ? '' : 's'} already on the church.`)
  existing.docs.forEach((d) => console.log(`  = ${describe({ weekday: 0, time: '', type: '', ...d.data() })}`))
  console.log('')

  const toAdd = GATHERINGS.filter((g) => !clash(g))
  GATHERINGS.filter(clash).forEach((g) => console.log(`  skip ${g.title} - ${clash(g)}`))
  toAdd.forEach((g) => console.log(`  + ${describe(g)}`))

  if (!toAdd.length) {
    console.log('\nNothing to add.')
    return
  }
  if (!WRITE) {
    console.log(`\n${toAdd.length} would be added. Run again with --write to add them.`)
    return
  }

  const now = Timestamp.now()
  const batch = db.batch()
  for (const g of toAdd) {
    batch.set(schedules.doc(), {
      title: g.title,
      type: g.type,
      weekday: g.weekday,
      occurrences: g.occurrences || [],
      occasions: g.occasions || [],
      time: g.time,
      location: g.location,
      description: g.description,
      icon: g.icon,
      audienceTags: [],
      excludeTags: [],
      enabled: true,
      showBefore: g.showBefore,
      keepsMinutes: g.keepsMinutes === true,
      showInProfile: g.type === 'worship',
      mock: true,
      createdAt: now,
      updatedAt: now,
    })
  }
  await batch.commit()
  await audit('create', `Added ${toAdd.length} mock schedules`, toAdd.map((g) => g.title))
  console.log(`\nAdded ${toAdd.length}.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

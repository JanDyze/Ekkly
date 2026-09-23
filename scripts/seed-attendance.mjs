#!/usr/bin/env node
/**
 * Mock Sunday service attendance for one church, for trying the Attendance
 * page, the dashboard and the profile turnout against a year of history
 * instead of a fortnight.
 *
 * Each record is one past Sunday, counted against the church's Sunday service
 * schedule when it has one (Settings > Schedule), so the mock lands on the
 * same rows a real count would and the page reads it exactly as it reads its
 * own. Who came is drawn from the church's real members: some are there
 * almost every week, some most weeks, some now and then, and the whole church
 * turns out for Easter and Christmas and thins in the rainy months. The draw
 * is seeded by the church id, so running it twice gives the same year.
 *
 * Safe by default:
 *   - reads only, and prints what it would write, unless --write is given;
 *   - never writes over a Sunday that already has a record - a real count
 *     always wins - and never touches a Sunday from the day attendance went
 *     into use onward, which the church is expected to record for real;
 *   - every document it writes carries `mock: true`, and --remove deletes
 *     those and nothing else;
 *   - each run that changes anything leaves one entry in the church's audit
 *     log saying so.
 *
 *   node scripts/seed-attendance.mjs --church uec
 *   node scripts/seed-attendance.mjs --church uec --weeks 104 --write
 *   node scripts/seed-attendance.mjs --church uec --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AUDIT_COLLECTION } from '../lib/auditEntry.js'
import { ATTENDANCE_START_DATE } from '../lib/attendance.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}
const flag = (name) => process.argv.includes(`--${name}`)

const CHURCH_ID = arg('church')
const WEEKS = Number(arg('weeks') || 52)
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

/* ------------------------------------------------------------- the draw */

// A small seeded generator (mulberry32), so the same church gets the same
// year every time and a rerun after --remove puts back what was there.
const seededRandom = (text) => {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 'YYYY-MM-DD' in local time, the way the app writes dates.
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Easter Sunday (Anonymous Gregorian algorithm).
const easterOf = (year) => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// How full a given Sunday runs, against an ordinary week. Easter and the
// Sunday before Christmas are the big ones; the first Sunday of the year and
// the height of the rainy season (July to September) run thin.
const turnoutFor = (date, rand) => {
  const key = ymd(date)
  let factor = 1
  if (key === ymd(easterOf(date.getFullYear()))) factor = 1.3
  const christmas = new Date(date.getFullYear(), 11, 25)
  const daysToChristmas = (christmas - date) / 86400000
  if (daysToChristmas >= 0 && daysToChristmas < 7) factor = 1.25
  if (date.getMonth() === 0 && date.getDate() <= 7) factor = 0.85
  if (date.getMonth() >= 6 && date.getMonth() <= 8) factor *= 0.9
  // Ordinary week-to-week wobble.
  return factor * (0.92 + rand() * 0.16)
}

// Every member gets a habit: regulars, most-weeks, and now-and-then.
const habitFor = (rand) => {
  const roll = rand()
  if (roll < 0.45) return 0.8 + rand() * 0.15
  if (roll < 0.75) return 0.4 + rand() * 0.25
  return 0.08 + rand() * 0.17
}

/* ------------------------------------------------------------------ run */

const main = async () => {
  if (!CHURCH_ID) {
    console.log('Usage: node scripts/seed-attendance.mjs --church <id> [--weeks 52] [--remove] [--write]')
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
  console.log(`Mode:     ${REMOVE ? 'remove mock records' : 'add mock records'}${WRITE ? '' : ' - dry run, nothing written'}`)
  console.log('')

  const attendance = church.collection('attendance')

  const audit = (action, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: 'attendance',
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-attendance',
      source: 'script',
    })

  if (REMOVE) {
    const snap = await attendance.where('mock', '==', true).get()
    console.log(`Mock records found: ${snap.size}`)
    if (!WRITE || !snap.size) return
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch()
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
    await audit('delete', `Removed ${snap.size} mock Sunday attendance records`, ['mock'])
    console.log(`Removed ${snap.size}.`)
    return
  }

  const [membersSnap, schedulesSnap, existingSnap] = await Promise.all([
    church.collection('members').get(),
    church.collection('recurringSchedules').get(),
    attendance.get(),
  ])

  const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (!members.length) throw new Error('This church has no members to mark present')

  // The Sunday service: an enabled Sunday schedule, a worship one first, one
  // named for Sunday or worship before any other.
  const sundays = schedulesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => (s.weekday ?? 0) === 0 && s.enabled !== false)
    .sort((a, b) => {
      const score = (s) =>
        ((s.type || 'worship') === 'worship' ? 2 : 0) + (/sunday|worship|service/i.test(s.title || '') ? 1 : 0)
      return score(b) - score(a)
    })
  const schedule = sundays[0] || null

  const title = schedule?.title || 'Sunday Service'
  const audienceTags = Array.isArray(schedule?.audienceTags) ? schedule.audienceTags : []
  const excludeTags = Array.isArray(schedule?.excludeTags) ? schedule.excludeTags : []

  // Who the service is for: everyone unless the schedule names tags. Tags live
  // on a member as `ministries` and `tags` both.
  const tagsOf = (m) => [...(m.ministries || []), ...(m.tags || [])].map(String)
  const audience = members.filter((m) => {
    const tags = tagsOf(m)
    if (excludeTags.some((t) => tags.includes(t))) return false
    return !audienceTags.length || audienceTags.some((t) => tags.includes(t))
  })

  console.log(`Members:  ${members.length} (${audience.length} expected at the service)`)
  console.log(
    `Schedule: ${schedule ? `"${title}" (${schedule.id}) - records join its Sunday rows` : 'none on Sundays - records are one-offs titled "Sunday Service"'}`
  )

  // Sundays already accounted for, real or mock, so nothing is written twice
  // and no real count is ever replaced.
  const taken = new Set()
  existingSnap.docs.forEach((d) => {
    const r = d.data()
    if (r.occurrenceKey) taken.add(r.occurrenceKey)
    if (!schedule && r.date && /worship|service/i.test(`${r.eventType} ${r.eventTitle}`)) taken.add(r.date)
  })

  const rand = seededRandom(CHURCH_ID)
  const habits = new Map(audience.map((m) => [m.id, habitFor(rand)]))

  // The WEEKS Sundays before attendance went into use (ATTENDANCE_START_DATE).
  // From that day on every Sunday is a real gathering the church is expected
  // to record, and the page prompts for it; a mock count there would quietly
  // mark real work as done. Before it is history nobody was going to record,
  // which is exactly the room mock data needs.
  const [sy, sm, sd] = ATTENDANCE_START_DATE.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const today = new Date()
  const before = start < today ? start : today
  const lastSunday = new Date(before.getFullYear(), before.getMonth(), before.getDate() - 1)
  lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay())
  const records = []
  let skipped = 0
  for (let w = 0; w < WEEKS; w++) {
    const date = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - 7 * w)
    const day = ymd(date)
    const key = schedule ? `recurring-${schedule.id}-${day}` : null
    if (taken.has(key || day)) {
      skipped++
      continue
    }
    const factor = turnoutFor(date, rand)
    const attendees = audience
      .filter((m) => rand() < Math.min(0.99, habits.get(m.id) * factor))
      .map((m) => m.id)
    records.push({
      source: schedule ? 'schedule' : 'adhoc',
      sourceId: schedule ? schedule.id : null,
      occurrenceKey: key,
      eventId: key || '',
      eventType: schedule?.type || 'worship',
      eventTitle: title,
      date: day,
      time: schedule?.time || '09:00',
      location: schedule?.location || '',
      attendees,
      totalAttendees: attendees.length,
      expectedAttendees: audience.length,
      audienceTags,
      excludeTags,
      notes: '',
      skipped: false,
      createdBy: 'mock-seed',
      // Written as though counted that Sunday at midday.
      createdAt: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)),
      updatedAt: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)),
      mock: true,
    })
  }

  if (!records.length) {
    console.log(`\nNothing to add: all ${WEEKS} Sundays already have a record.`)
    return
  }

  const oldest = records[records.length - 1].date
  const newest = records[0].date
  const average = Math.round(records.reduce((n, r) => n + r.totalAttendees, 0) / records.length)
  console.log(`\nSundays:  ${records.length} to add, ${newest} back to ${oldest} (${skipped} already recorded, left alone)`)
  console.log(`Turnout:  about ${average} of ${audience.length} on an ordinary week`)
  console.log('\nFirst few:')
  records.slice(0, 6).forEach((r) => console.log(`  ${r.date}  ${String(r.totalAttendees).padStart(4)} present`))

  if (!WRITE) {
    console.log('\nDry run. Add --write to save these.')
    return
  }

  for (let i = 0; i < records.length; i += 400) {
    const batch = db.batch()
    records.slice(i, i + 400).forEach((r) => batch.set(attendance.doc(), r))
    await batch.commit()
  }
  await audit('create', `Added ${records.length} mock Sunday attendance records (${oldest} to ${newest})`, [
    'mock',
    'attendees',
    'date',
  ])
  console.log(`\nSaved ${records.length}. Remove them any time with --remove --write.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

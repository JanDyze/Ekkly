#!/usr/bin/env node
/**
 * Mock tasks for one church, for trying the Tasks app (src/apps/tasks) with
 * something on every list: late ones, today's, this week's, later and
 * undated; some given to people on the roll and some to nobody; spread over
 * the church's own ministries with a few filed under none; and done ones,
 * both this month and long enough ago to sit behind Done's "show older".
 *
 * Who they are given to is taken from the church's own roll, and which
 * ministry from its own list, so every name and ministry on them is one the
 * app knows. Due dates are counted from today, so the lists look the same
 * whatever day it is run.
 *
 * Safe by default:
 *   - prints what it would do, and writes nothing, unless --write is given;
 *   - every task it adds carries `mock: true`, so --remove takes out exactly
 *     what it put in and nothing the church added itself;
 *   - nobody is notified: it writes the records, not through the app;
 *   - each run that changes anything leaves one entry in the church's audit log.
 *
 *   node scripts/seed-task-mocks.mjs --church uec-c2
 *   node scripts/seed-task-mocks.mjs --church uec-c2 --write
 *   node scripts/seed-task-mocks.mjs --church uec-c2 --remove --write
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

/* -------------------------------------------------------------- the tasks */

// `due`: days from today (negative is late, null is no date). `people`: how
// many from the roll it is given to. `ministry`: words the ministry it
// belongs to would be named by, since every church names its own, or null for
// none; with no ministry named like that, one of the church's in turn.
// `doneDaysAgo`: ticked off that long ago.
const TASKS = [
  // Late
  { title: 'Send the youth camp permission slips home', due: -6, people: 1, ministry: 'youth|outreach|evangel|mission|sg|small', priority: 'high' },
  { title: 'Fix the projector cable in the main hall', due: -3, people: 1, ministry: 'music|instrument|worship|song|media|sound', priority: 'urgent' },
  { title: 'Reply to the parish about the shared parking', due: -2, people: 0, ministry: null },
  { title: 'Return the borrowed chairs to the school', due: -1, people: 2, ministry: 'admin|usher|steward|facilit|preach' },
  // Today
  { title: 'Print the bulletins for Sunday', due: 0, people: 1, ministry: 'music|instrument|worship|song|media|sound', priority: 'high' },
  { title: 'Call the families who missed two Sundays', due: 0, people: 2, ministry: 'care|fellowship|welcome|visit|consolid|pastor|preach' },
  // This week
  { title: 'Order communion bread and juice', due: 1, people: 1, ministry: 'admin|usher|steward|facilit|preach' },
  { title: 'Choose the songs for the thanksgiving service', due: 2, people: 2, ministry: 'music|instrument|worship|song|media|sound' },
  { title: 'Book the van for the hospital visit', due: 3, people: 0, ministry: 'care|fellowship|welcome|visit|consolid|pastor|preach' },
  { title: 'Restock the nursery wipes and snacks', due: 4, people: 1, ministry: 'children|sunday school|kids|nursery' },
  { title: 'Draft the newsletter for November', due: 5, people: 1, ministry: null },
  // Later
  { title: 'Plan the Christmas outreach caroling route', due: 12, people: 2, ministry: 'youth|outreach|evangel|mission|sg|small', priority: 'high' },
  { title: 'Renew the sound system warranty', due: 18, people: 0, ministry: 'music|instrument|worship|song|media|sound' },
  { title: 'Gather volunteers for the year-end clean-up', due: 25, people: 0, ministry: 'admin|usher|steward|facilit|preach' },
  { title: 'Prepare the annual report for the members’ meeting', due: 40, people: 1, ministry: null },
  // No date
  { title: 'Find a new keyboard stand', due: null, people: 0, ministry: 'music|instrument|worship|song|media|sound' },
  { title: 'Label the storage room shelves', due: null, people: 1, ministry: 'admin|usher|steward|facilit|preach' },
  { title: 'Think about a midweek prayer slot for workers', due: null, people: 0, ministry: 'care|fellowship|welcome|visit|consolid|pastor|preach' },
  // Done, this month
  { title: 'Clean the baptismal pool', due: -4, people: 1, ministry: 'admin|usher|steward|facilit|preach', doneDaysAgo: 3 },
  { title: 'Welcome packs for first-time guests', due: -8, people: 2, ministry: 'care|fellowship|welcome|visit|consolid|pastor|preach', doneDaysAgo: 6 },
  { title: 'Tune the acoustic guitars', due: -10, people: 1, ministry: 'music|instrument|worship|song|media|sound', doneDaysAgo: 12 },
  // Done, long ago (behind "show older")
  { title: 'Set up the anniversary photo booth', due: -55, people: 1, ministry: 'youth|outreach|evangel|mission|sg|small', doneDaysAgo: 52 },
  { title: 'Replace the lobby light bulbs', due: -80, people: 0, ministry: 'admin|usher|steward|facilit|preach', doneDaysAgo: 75 },
]

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* ------------------------------------------------------------------- run */

async function main() {
  if (!CHURCH_ID) throw new Error('Say which church: --church <id>')

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
  console.log(`Mode:     ${REMOVE ? 'remove mock tasks' : 'add mock tasks'}${WRITE ? '' : ' - dry run, nothing written'}`)
  console.log('')

  const tasks = church.collection('tasks')

  const audit = (action, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: 'tasks',
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-task-mocks',
      source: 'script',
    })

  if (REMOVE) {
    const mocks = await tasks.where('mock', '==', true).get()
    console.log(`${mocks.size} mock task(s) to remove.`)
    if (!WRITE || !mocks.size) return
    const batch = db.batch()
    mocks.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    await audit('delete', `Removed ${mocks.size} mock tasks`, ['mock'])
    console.log('Removed.')
    return
  }

  const existing = await tasks.where('mock', '==', true).get()
  if (existing.size) {
    console.log(`${existing.size} mock task(s) are already there. Run with --remove --write first to start again.`)
    return
  }

  // The roll, members first, and the church's ministries in their own order.
  const roll = (await church.collection('members').get()).docs
    .map((d) => ({ ...d.data(), key: String(d.data().id ?? d.id) }))
    .filter((m) => m.firstName)
    .sort((a, b) => (a.isMember === false) - (b.isMember === false))
  const ministries = (await church.collection('ministries').orderBy('name').get()).docs.map((d) => d.data().name).filter(Boolean)
  if (!roll.length) throw new Error('This church has nobody on its roll to give tasks to.')

  const nameOf = (m) => [m.firstName, m.lastName].filter(Boolean).join(' ').trim()
  let next = 0
  const take = (n) => Array.from({ length: n }, () => roll[next++ % roll.length])

  const now = Date.now()
  const docs = TASKS.map((t, i) => {
    const people = take(t.people)
    const done = t.doneDaysAgo !== undefined
    const created = new Date(now - ((t.doneDaysAgo ?? 0) + 7 + i) * 86_400_000)
    return {
      title: t.title,
      details: '',
      assigneeIds: people.map((m) => m.key),
      assigneeNames: people.map(nameOf),
      ministry: t.ministry === null || !ministries.length ? '' : ministries.find((name) => new RegExp(t.ministry, 'i').test(name)) || ministries[i % ministries.length],
      dueDate: t.due === null ? '' : dayKey(t.due),
      priority: t.priority || 'normal',
      done,
      ...(done ? { doneAt: Timestamp.fromMillis(now - t.doneDaysAgo * 86_400_000), doneBy: '', doneByName: people[0] ? nameOf(people[0]) : 'Mock data script' } : {}),
      createdBy: '',
      createdByName: 'Mock data script',
      createdAt: Timestamp.fromDate(created),
      updatedAt: Timestamp.fromDate(created),
      mock: true,
    }
  })

  for (const d of docs) {
    const when = d.done ? 'done' : d.dueDate || 'no date'
    console.log(`  ${d.title}\n      ${when} · ${d.assigneeNames.join(', ') || 'nobody'} · ${d.ministry || 'no ministry'} · ${d.priority}`)
  }
  console.log(`\n${docs.length} task(s).`)
  if (!WRITE) return

  const batch = db.batch()
  docs.forEach((d) => batch.set(tasks.doc(), d))
  await batch.commit()
  await audit('create', `Added ${docs.length} mock tasks`, ['mock'])
  console.log('Written.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

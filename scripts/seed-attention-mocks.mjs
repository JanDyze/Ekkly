#!/usr/bin/env node
/**
 * Mock work for the home's Needs attention (src/views/Apps.vue,
 * HomeAttention), so a demonstration opens on a home with something to act
 * on. That panel is fed by three things, and this fills the two the other
 * mock scripts leave nearly empty:
 *
 *   - accounts to link: people who signed in and say a record on the roll is
 *     theirs (memberClaims, pending), each claiming one of the mock people
 *     from seed-mock-data, so approving one only ever links a mock record;
 *   - tasks of yours overdue, and some due today: given to the people named
 *     with --people (their number on the roll), whoever will be signed in.
 *
 * The third, gatherings still to count, already comes from seed-mock-data's
 * past events.
 *
 * Safe by default:
 *   - prints what it would do, and writes nothing, unless --write is given;
 *   - every record carries `mock: true` and `mockSeed: 'seed-attention-mocks'`,
 *     so --remove takes out exactly what it put in;
 *   - --remove also unlinks any mock person a demo approved a claim for;
 *   - nobody is notified: it writes the records, not through the app.
 *
 *   node scripts/seed-attention-mocks.mjs --church uec-c2 --people 16,34
 *   node scripts/seed-attention-mocks.mjs --church uec-c2 --people 16,34 --write
 *   node scripts/seed-attention-mocks.mjs --church uec-c2 --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AUDIT_COLLECTION } from '../lib/auditEntry.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEED = 'seed-attention-mocks'
const MARK = { mock: true, mockSeed: SEED }
// A claim's account is made up, so it can be told from a real one later.
const UID_PREFIX = 'mock-claim-'

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}
const flag = (name) => process.argv.includes(`--${name}`)

const CHURCH_ID = arg('church')
const PEOPLE = arg('people')
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

// Today where the church is, not where the script runs.
const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
const day = (offset, from) => {
  const d = new Date(`${from}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

// Late by a few days to a few weeks, so the rows read "2 days late" through
// "3 weeks late", and a couple due today for the day's own list.
const TASKS = [
  { title: 'Approve the budget for the Christmas program', due: -1, priority: 'urgent' },
  { title: 'Sign the cheque for the electricity bill', due: -2, priority: 'high' },
  { title: 'Reply to the district office about the pastors’ retreat', due: -4, priority: 'normal' },
  { title: 'Review the new members’ class list', due: -6, priority: 'high' },
  { title: 'Check the roof leak quote from the contractor', due: -9, priority: 'normal' },
  { title: 'Finish the quarterly report for the council', due: -15, priority: 'high' },
  { title: 'Return the borrowed sound mixer to the youth camp', due: -21, priority: 'normal' },
  { title: 'Confirm the venue for the year-end thanksgiving', due: 0, priority: 'high' },
  { title: 'Send the Sunday line-up to the worship team', due: 0, priority: 'normal' },
]

async function main() {
  if (!CHURCH_ID) throw new Error('Usage: node scripts/seed-attention-mocks.mjs --church <id> [--people 16,34] [--write] [--remove]')

  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })

  const db = getFirestore()
  const church = db.collection('churches').doc(CHURCH_ID)
  const churchSnap = await church.get()
  if (!churchSnap.exists) throw new Error(`No church "${CHURCH_ID}" in ${sa.project_id}.`)
  const today = todayIn(churchSnap.data().timezone || 'Asia/Manila')

  console.log(`Project:  ${sa.project_id}`)
  console.log(`Church:   ${churchSnap.data().name} (${CHURCH_ID})\n`)

  const audit = (action, label) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(), actorUid: '', actorName: 'Mock data script', actorEmail: '',
      action, collection: '', path: '', docId: '', label, fields: ['mock'], changes: {}, page: '',
    })

  if (REMOVE) {
    const [claims, tasks, linked] = await Promise.all([
      church.collection('memberClaims').where('mockSeed', '==', SEED).get(),
      church.collection('tasks').where('mockSeed', '==', SEED).get(),
      church.collection('members').where('uid', '>=', UID_PREFIX).where('uid', '<', `${UID_PREFIX}`).get(),
    ])
    console.log(`  ${claims.size} claim(s), ${tasks.size} task(s), ${linked.size} mock link(s) on the roll`)
    if (!WRITE) return console.log('\nDry run. Add --write to remove them.')
    const writer = db.bulkWriter()
    claims.docs.forEach((d) => writer.delete(d.ref))
    tasks.docs.forEach((d) => writer.delete(d.ref))
    linked.docs.forEach((d) => writer.update(d.ref, { uid: FieldValue.delete() }))
    await writer.close()
    await audit('delete', `Removed ${claims.size + tasks.size} mock attention records`)
    return console.log('\nRemoved.')
  }

  const already = await church.collection('tasks').where('mockSeed', '==', SEED).limit(1).get()
  if (!already.empty) return console.log('These are already here. Run with --remove --write first to start again.')

  const roll = (await church.collection('members').get()).docs.map((d) => ({ ...d.data(), firestoreId: d.id }))
  const keyOf = (m) => String(m.id ?? m.firestoreId)
  const nameOf = (m) => [m.firstName, m.lastName].filter(Boolean).join(' ')

  // Who the tasks are for, named by their number on the roll: an account is
  // not always linked to its record by uid, so it cannot be worked out from
  // who administers the church.
  const wanted = String(PEOPLE || '').split(',').map((s) => s.trim()).filter(Boolean)
  const owners = roll.filter((m) => wanted.includes(keyOf(m)) || wanted.includes(m.firestoreId))
  if (!owners.length) throw new Error('Nobody to give the tasks to. Name them with --people <number on the roll>,<another>.')

  // Claims are on mock people only, and on nobody already linked to an account.
  const claimable = roll.filter((m) => m.mockSeed === 'seed-mock-data' && !m.uid && m.isMember !== false)
  const claimants = claimable.slice(0, 5)
  if (!claimants.length) console.log('  No mock people from seed-mock-data to claim; run it first for accounts to link.\n')

  const docs = []
  claimants.forEach((m, i) => {
    const name = nameOf(m)
    docs.push({
      col: 'memberClaims',
      data: {
        uid: `${UID_PREFIX}${i + 1}`,
        email: `${m.firstName}.${m.lastName}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.com',
        displayName: name,
        memberId: keyOf(m),
        memberName: name,
        status: 'pending',
        note: '',
        requestedAt: Timestamp.fromDate(new Date(Date.now() - (i + 1) * 5 * 3_600_000)),
        ...MARK,
      },
    })
  })

  const now = Date.now()
  owners.forEach((owner) => {
    TASKS.forEach((t, i) => {
      const created = Timestamp.fromDate(new Date(now - (20 + i) * 86_400_000))
      docs.push({
        col: 'tasks',
        data: {
          title: t.title, details: '', assigneeIds: [keyOf(owner)], assigneeNames: [nameOf(owner)],
          ministry: '', dueDate: day(t.due, today), priority: t.priority, done: false,
          createdBy: '', createdByName: 'Mock data script', createdAt: created, updatedAt: created,
          ...MARK,
        },
      })
    })
  })

  console.log(`  Accounts to link (${claimants.length}): ${claimants.map(nameOf).join(', ') || 'none'}`)
  console.log(`  Tasks (${TASKS.length} each, ${TASKS.filter((t) => t.due < 0).length} overdue): ${owners.map((m) => `${nameOf(m)} (#${keyOf(m)})`).join(', ')}`)
  if (!WRITE) return console.log('\nDry run. Add --write to add them.')

  const writer = db.bulkWriter()
  docs.forEach(({ col, data }) => writer.set(church.collection(col).doc(), data))
  await writer.close()
  await audit('create', `Added ${docs.length} mock attention records`)
  console.log('\nWritten.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

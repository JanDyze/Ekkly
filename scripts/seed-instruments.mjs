#!/usr/bin/env node
/**
 * Mock instruments for one church's band, so the Schedules app has something
 * to show beside each musician's name.
 *
 * Two things, as the app records them (src/data/instruments.js):
 *   - each band member's People record gets what they play, if it says
 *     nothing yet: song leaders sing, instrumentalists take a turn each at
 *     guitar, keys, bass and drums, with a second instrument after it;
 *   - each Sunday of a mock month (one seed-lineups.mjs filled) gets what its
 *     band is playing that week, swapping the instrumentalists round so the
 *     same person is on keys one Sunday and guitar the next.
 *
 * Safe by default:
 *   - reads only, and prints what it would write, unless --write is given;
 *   - never overwrites a record that already says what someone plays, and only
 *     touches Sundays in months marked `mock` by seed-lineups.mjs;
 *   - records it changes carry `mockInstruments: true`, and --remove takes the
 *     instruments back off those records and those Sundays;
 *   - each run that changes anything leaves one entry in the audit log.
 *
 *   node scripts/seed-instruments.mjs --church uec-c2
 *   node scripts/seed-instruments.mjs --church uec-c2 --write
 *   node scripts/seed-instruments.mjs --church uec-c2 --remove --write
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

// Who plays what, turn about: the first instrumentalist alphabetically gets
// guitar then keys, the next keys then drums, and so on round the list.
const KIT = [
  ['guitar', 'keys'],
  ['keys', 'drums'],
  ['bass', 'guitar'],
  ['drums', 'bass'],
]

const has = (doc, ministry) =>
  (doc.data().ministries || []).some((m) => String(m).toLowerCase() === ministry.toLowerCase())

const nameOf = (doc) => {
  const m = doc.data()
  return [m.nickname || m.firstName, m.lastName].filter(Boolean).join(' ') || doc.id
}

const memberKey = (doc) => String(doc.data().id ?? doc.id)

const main = async () => {
  if (!CHURCH_ID) {
    console.error('Usage: node scripts/seed-instruments.mjs --church <id> [--write] [--remove]')
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
  console.log(`Mode:     ${REMOVE ? 'remove mock instruments' : 'add mock instruments'}${WRITE ? '' : ' - dry run, nothing written'}`)
  console.log('')

  const audit = (action, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: 'members',
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-instruments',
      source: 'script',
    })

  const [membersSnap, monthsSnap] = await Promise.all([
    church.collection('members').get(),
    church.collection('worshipLineups').where('mock', '==', true).get(),
  ])

  if (REMOVE) {
    const marked = membersSnap.docs.filter((d) => d.data().mockInstruments === true)
    console.log(`${marked.length} records and ${monthsSnap.size} mock months to clear.`)
    marked.forEach((d) => console.log(`  - ${nameOf(d)}`))
    if (!WRITE) return
    const batch = db.batch()
    marked.forEach((d) => batch.update(d.ref, { instruments: FieldValue.delete(), mockInstruments: FieldValue.delete() }))
    monthsSnap.docs.forEach((d) =>
      batch.update(d.ref, { sundays: (d.data().sundays || []).map(({ instruments: _drop, ...rest }) => rest) })
    )
    await batch.commit()
    await audit('update', 'Removed mock instruments', marked.map(nameOf))
    console.log('\nRemoved.')
    return
  }

  // The band: song leaders sing, instrumentalists play. Somebody who is both
  // plays, and sings as their second.
  const players = membersSnap.docs
    .filter((d) => has(d, 'Instrumentalist'))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
  const singers = membersSnap.docs.filter((d) => has(d, 'Song Leader') && !has(d, 'Instrumentalist'))

  const plan = new Map()
  players.forEach((d, i) => {
    const kit = KIT[i % KIT.length]
    plan.set(d.id, has(d, 'Song Leader') ? [kit[0], 'vocals'] : kit)
  })
  singers.forEach((d) => plan.set(d.id, ['vocals']))

  const updates = [...plan.entries()]
    .map(([id, instruments]) => ({ doc: membersSnap.docs.find((d) => d.id === id), instruments }))
    .filter(({ doc }) => !(Array.isArray(doc.data().instruments) && doc.data().instruments.length))

  console.log('People records:')
  if (!updates.length) console.log('  (everyone in the band already says what they play)')
  updates.forEach(({ doc, instruments }) => console.log(`  + ${nameOf(doc).padEnd(22)} ${instruments.join(', ')}`))

  // On each mock Sunday, the instrumentalists turn round the kit week by week,
  // and anyone who only sings sings.
  const byKey = new Map(membersSnap.docs.map((d) => [memberKey(d), d]))
  const usual = (doc) => plan.get(doc.id) || doc.data().instruments || []
  let week = 0
  const months = monthsSnap.docs
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => ({
      ref: d.ref,
      key: d.id,
      sundays: (d.data().sundays || []).map((sunday) => {
        const turn = week++
        const instruments = {}
        ;(sunday.teamIds || []).forEach((id) => {
          const doc = byKey.get(String(id))
          if (!doc) return
          const kit = usual(doc)
          if (!kit.length) return
          instruments[id] = kit[turn % kit.length]
        })
        return { ...sunday, instruments }
      }),
    }))

  console.log('\nMock Sundays:')
  months.forEach((m) =>
    m.sundays.forEach((s) =>
      console.log(
        `  ${s.date}  ${Object.entries(s.instruments)
          .map(([id, inst]) => `${nameOf(byKey.get(String(id)))}: ${inst}`)
          .join(' · ') || '(no band)'}`
      )
    )
  )

  if (!WRITE) {
    console.log('\nRun again with --write to add them.')
    return
  }

  const batch = db.batch()
  updates.forEach(({ doc, instruments }) => batch.update(doc.ref, { instruments, mockInstruments: true }))
  months.forEach((m) => batch.update(m.ref, { sundays: m.sundays, updatedAt: Timestamp.now() }))
  await batch.commit()
  await audit('update', `Added mock instruments for ${updates.length} people`, updates.map(({ doc }) => nameOf(doc)))
  console.log(`\nAdded instruments for ${updates.length} people and ${months.reduce((n, m) => n + m.sundays.length, 0)} Sundays.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

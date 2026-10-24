#!/usr/bin/env node
/**
 * Moves how to reach each person — their number, email and address — off
 * their member record and into memberPrivate/{the same id}
 * (lib/memberPrivate.js), for every church or one.
 *
 * Everyone in a church reads the roll; the database rules let only those who
 * may see People, and the person themselves, read memberPrivate. Records the
 * app writes now are already split; this moves the ones written before. The
 * app reads either place, so it is safe to run before or after the rules go
 * out, and to run again: a record with nothing left to move is skipped.
 *
 * Safe by default:
 *   - prints what it would move, and writes nothing, unless --write is given;
 *   - a value already in memberPrivate is kept over the record's own copy;
 *   - nobody is notified.
 *
 *   node scripts/split-member-contacts.mjs
 *   node scripts/split-member-contacts.mjs --church uec-c2 --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { PRIVATE_COLLECTION, PRIVATE_FIELDS } from '../lib/memberPrivate.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}
const WRITE = process.argv.includes('--write')
const ONLY = arg('church')

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

async function main() {
  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()

  const churches = ONLY ? [db.collection('churches').doc(ONLY)] : (await db.collection('churches').get()).docs.map((d) => d.ref)
  let total = 0
  for (const church of churches) {
    const [members, existing] = await Promise.all([
      church.collection('members').get(),
      church.collection(PRIVATE_COLLECTION).get(),
    ])
    const already = new Map(existing.docs.map((d) => [d.id, d.data()]))
    const moves = members.docs
      .map((d) => {
        const data = d.data()
        const fields = PRIVATE_FIELDS.filter((key) => key in data)
        return { d, data, fields }
      })
      .filter(({ fields }) => fields.length)

    console.log(`${church.id}: ${moves.length} of ${members.size} records carry contact details to move`)
    total += moves.length
    if (!WRITE || !moves.length) continue

    const writer = db.bulkWriter()
    for (const { d, data, fields } of moves) {
      const kept = already.get(d.id) || {}
      const moved = Object.fromEntries(fields.filter((key) => !(key in kept)).map((key) => [key, data[key]]))
      if (Object.keys(moved).length) writer.set(church.collection(PRIVATE_COLLECTION).doc(d.id), moved, { merge: true })
      writer.update(d.ref, Object.fromEntries(fields.map((key) => [key, FieldValue.delete()])))
    }
    await writer.close()
  }
  console.log(WRITE ? `Moved ${total} records.` : `\nDry run: ${total} records to move. Add --write to move them.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

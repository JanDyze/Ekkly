#!/usr/bin/env node
/**
 * Works out what everyone may see in every church (or one) and stores it on
 * their access document as `caps`, for the database rules (lib/caps.js).
 *
 * The app keeps `caps` current itself — after any change to roles,
 * ministries or account links, and whenever someone's stored caps disagree
 * with their app's own working — so this is for the first time (before the
 * rules that read `caps` go out) and for checking. It changes only documents
 * whose answer differs, so it is safe to run at any time.
 *
 *   node scripts/sync-caps.mjs                 shows what would change
 *   node scripts/sync-caps.mjs --write
 *   node scripts/sync-caps.mjs --church uec-c2 --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { loadAudience } from '../lib/audience.js'
import { syncChurchCaps } from '../lib/caps.js'

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
  for (const church of churches) {
    if (WRITE) {
      const { caps, changed } = await syncChurchCaps(church)
      console.log(`${church.id}: ${Object.keys(caps).length} accounts, ${changed} updated`)
      continue
    }
    const [access, audience] = await Promise.all([church.collection('access').get(), loadAudience(church)])
    const stale = access.docs.filter((d) => {
      const next = [...audience.capabilitiesFor(d.id)].sort().join(' ')
      return (d.data().caps || []).join(' ') !== next
    })
    console.log(`${church.id}: ${access.size} accounts, ${stale.length} to update`)
  }
  if (!WRITE) console.log('\nDry run. Add --write to store them.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

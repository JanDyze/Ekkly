#!/usr/bin/env node
/**
 * Test accounts for one church, signed into with an email and a password, for
 * seeing the app as each kind of person in it sees it: an administrator, a
 * member with no ministry, one person for every ministry the church has
 * granted permissions to (Settings → Roles), and an outsider who has signed in
 * but was never let in, and so sees the join page. Everyone but the outsider
 * is given one task of their own, due in two days, so "My tasks" shows
 * something even to a ministry that may not see the church's whole list.
 *
 * Each ministry account is a member record carrying that one ministry and
 * linked to its account by uid, which is exactly how a real person's access is
 * worked out (usePermissions), so what it sees is what that ministry sees.
 *
 * The password is the same for every account, and is made up afresh on each
 * run unless --password is given. It is printed once and kept nowhere: these
 * accounts can read a real church's records, so the password must not be
 * written into the repo. Running it again sets the new password on the
 * accounts already there.
 *
 * Signing in with a password needs two things this script cannot do:
 *   - Email/Password switched on under Firebase Authentication → Sign-in
 *     method (it was switched off when the app went Google-only);
 *   - the form on the sign-in page, which shows in `npm run dev`, and in a
 *     build only where VITE_TEST_SIGN_IN=true.
 *
 * Safe by default:
 *   - prints what it would do, and writes nothing, unless --write is given;
 *   - every account has an address under <church>.test, which nobody can own,
 *     and every record it adds is marked (`testAccount` on access, `mock` on
 *     the member), so --remove takes out exactly what it put in;
 *   - each run that changes anything leaves one entry in the church's audit log.
 *
 *   node scripts/seed-test-accounts.mjs --church uec-c2
 *   node scripts/seed-test-accounts.mjs --church uec-c2 --write
 *   node scripts/seed-test-accounts.mjs --church uec-c2 --write --password something-long
 *   node scripts/seed-test-accounts.mjs --church uec-c2 --remove --write
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
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
// Readable enough to type on a phone, long enough not to be guessed.
const PASSWORD = arg('password') || `test-${crypto.randomBytes(6).toString('base64url')}`

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

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ----------------------------------------------------------- the accounts */

// Who to make, from the church's own roles. `access: false` is the outsider,
// who has an account and nothing else.
const accountsFor = (churchId, ministries) => [
  { key: 'admin', name: 'Administrator', admin: true, ministries: [] },
  { key: 'member', name: 'Member', ministries: [] },
  ...ministries.map((ministry) => ({ key: slug(ministry), name: ministry, ministries: [ministry] })),
  { key: 'outsider', name: 'Outsider', access: false, ministries: [] },
].map((account) => ({ ...account, email: `${account.key}@${churchId}.test` }))

/* ------------------------------------------------------------------- main */

async function main() {
  if (!CHURCH_ID) throw new Error('Usage: node scripts/seed-test-accounts.mjs --church <id> [--write] [--remove] [--password <pw>]')
  if (PASSWORD.length < 6) throw new Error('Firebase needs a password of at least 6 characters.')

  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })

  const auth = getAuth()
  const db = getFirestore()
  const church = db.collection('churches').doc(CHURCH_ID)
  const churchSnap = await church.get()
  if (!churchSnap.exists) throw new Error(`No church "${CHURCH_ID}" in ${sa.project_id}.`)

  const audit = (action, label) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Test accounts script',
      actorEmail: '',
      action,
      collection: 'access',
      path: '',
      docId: '',
      label,
      fields: ['testAccount'],
      changes: {},
      page: '',
    })

  const members = church.collection('members')

  if (REMOVE) {
    const access = await church.collection('access').where('testAccount', '==', true).get()
    const mocks = (await members.where('mock', '==', true).get()).docs.filter((d) => d.data().testAccount)
    const tasks = await church.collection('tasks').where('testAccount', '==', true).get()
    // The outsider has no access document to be found by, so it is found by
    // its address, as is any account whose records were already taken out.
    const emails = accountsFor(CHURCH_ID, []).map((a) => a.email)
    const users = (await auth.getUsers(emails.map((email) => ({ email })))).users
    const byDomain = (await auth.listUsers(1000)).users.filter((u) => u.email?.endsWith(`@${CHURCH_ID}.test`))
    const uids = new Set([...access.docs.map((d) => d.id), ...users.map((u) => u.uid), ...byDomain.map((u) => u.uid)])

    console.log(`${CHURCH_ID}: ${uids.size} test account(s), ${access.size} access document(s), ${mocks.length} member record(s).`)
    if (!WRITE) return console.log('Dry run. Add --write to remove them.')

    const batch = db.batch()
    access.docs.forEach((d) => batch.delete(d.ref))
    mocks.forEach((d) => batch.delete(d.ref))
    mocks.forEach((d) => batch.delete(church.collection('memberPrivate').doc(d.id)))
    tasks.forEach((d) => batch.delete(d.ref))
    uids.forEach((uid) => batch.delete(church.collection('appAdmins').doc(uid)))
    await batch.commit()
    if (uids.size) await auth.deleteUsers([...uids])
    await audit('delete', `Removed ${uids.size} test accounts`)
    return console.log('Removed.')
  }

  const roles = await church.collection('rolePermissions').get()
  const ministries = roles.docs.filter((d) => (d.data().capabilities || []).length).map((d) => d.id)
  const accounts = accountsFor(CHURCH_ID, ministries)

  console.log(`${churchSnap.data().name} (${CHURCH_ID}), ${ministries.length} ministr${ministries.length === 1 ? 'y' : 'ies'} with permissions:\n`)
  accounts.forEach((a) => {
    const what = a.admin ? 'administrator' : a.access === false ? 'no access (join page)' : a.ministries[0] || 'member, no ministry'
    console.log(`  ${a.email.padEnd(40)} ${what}`)
  })
  if (!WRITE) return console.log('\nDry run. Add --write to make them.')

  // Members take the next number on the roll, as the app numbers them.
  const roll = await members.get()
  let nextId = roll.docs.reduce((max, d) => Math.max(max, Number(d.data().id) || 0), 0) + 1
  const existingByUid = new Map(roll.docs.filter((d) => d.data().uid).map((d) => [d.data().uid, d]))

  // Every account with a record is given one task of its own, due in two
  // days, so "My tasks" and the home's task card have something in them for
  // whoever may not see the church's whole list. Made afresh on every run.
  const oldTasks = await church.collection('tasks').where('testAccount', '==', true).get()
  await Promise.all(oldTasks.docs.map((d) => d.ref.delete()))
  const due = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)

  for (const account of accounts) {
    const displayName = `Test ${account.name}`
    let user
    try {
      user = await auth.getUserByEmail(account.email)
      user = await auth.updateUser(user.uid, { password: PASSWORD, displayName })
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error
      user = await auth.createUser({ email: account.email, emailVerified: true, password: PASSWORD, displayName })
    }

    if (account.access === false) continue

    await church.collection('access').doc(user.uid).set({
      uid: user.uid,
      name: displayName,
      email: account.email,
      grantedBy: 'test-accounts-script',
      grantedByEmail: '',
      grantedAt: FieldValue.serverTimestamp(),
      testAccount: true,
    })

    if (account.admin) {
      await church.collection('appAdmins').doc(user.uid).set({
        email: account.email,
        displayName,
        addedBy: 'test-accounts-script',
        addedByEmail: '',
        addedAt: FieldValue.serverTimestamp(),
      })
    }

    // The member record is what a ministry's permissions hang off. Updated in
    // place on a second run, so the roll never holds two of the same person.
    // The email is how to reach them, so it is kept beside the record
    // (lib/memberPrivate.js), not on it.
    const record = {
      firstName: 'Test',
      lastName: account.name,
      uid: user.uid,
      ministries: account.ministries,
      tags: [],
      instruments: [],
      relatives: [],
      isMember: true,
      mock: true,
      testAccount: true,
    }
    const existing = existingByUid.get(user.uid)
    const memberId = existing ? existing.data().id : nextId++
    const memberRef = existing ? existing.ref : members.doc()
    if (existing) await memberRef.update(record)
    else await memberRef.set({ ...record, id: memberId })
    await church.collection('memberPrivate').doc(memberRef.id).set({ email: account.email }, { merge: true })

    await church.collection('tasks').add({
      title: `Test task for the ${account.name.toLowerCase()}`,
      details: 'Made by the test accounts script, to see a task of your own.',
      assigneeIds: [String(memberId)],
      assigneeNames: [displayName],
      ministry: account.ministries[0] || '',
      dueDate: due,
      priority: 'normal',
      done: false,
      createdBy: '',
      createdByName: 'Test accounts script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      mock: true,
      testAccount: true,
    })
  }

  await audit('create', `Added ${accounts.length} test accounts`)
  console.log(`\nWritten. Password for every account: ${PASSWORD}`)
  console.log(`Sign in at http://localhost:5173/login?church=${CHURCH_ID} (npm run dev).`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * The database rules (firestore.rules), tried as each kind of person a church
 * has: an administrator, a member with no ministry, a treasurer, an usher, a
 * secretary, a teacher, a small group leader, someone with no stored caps
 * (lib/caps.js), and a stranger. Each line says what one of them should be
 * allowed or refused; any that comes out otherwise is printed, and the run
 * fails.
 *
 * Against the Firestore emulator, never the live project:
 *
 *   npm run test:rules           starts the emulator, runs this, stops it
 *   node scripts/test-rules.mjs  with the emulator already running (npm run emulators)
 */
import fs from 'node:fs'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, setDoc, updateDoc, addDoc, collection, deleteDoc, serverTimestamp } from 'firebase/firestore'

const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
const env = await initializeTestEnvironment({
  projectId: 'demo-ekkly-rules',
  firestore: { rules, host: '127.0.0.1', port: 8085 },
})

const C = 'churches/c1'
const BASE = ['dashboard.view', 'events.view', 'gallery.view', 'lineups.view', 'links.view', 'songs.view']
const people = {
  admin: { caps: BASE, admin: true },
  member: { caps: BASE, memberDoc: 'm-member' },
  treasurer: { caps: [...BASE, 'finances.manage', 'finances.view'], memberDoc: 'm-treasurer' },
  usher: { caps: [...BASE, 'attendance.manage', 'attendance.view', 'ushers.manage', 'consolidation.view'] },
  secretary: { caps: [...BASE, 'members.manage', 'members.view', 'minutes.manage', 'minutes.view'] },
  teacher: { caps: [...BASE, 'teaching.manage', 'teaching.view', 'members.view'] },
  sg: { caps: [...BASE, 'smallgroups.manage', 'smallgroups.view', 'prayer.manage', 'prayer.view'] },
  nocaps: { caps: null },
}

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'churches/c1'), { name: 'Test', status: 'active' })
  for (const [uid, p] of Object.entries(people)) {
    await setDoc(doc(db, `${C}/access/${uid}`), p.caps ? { uid, caps: p.caps } : { uid })
    if (p.admin) await setDoc(doc(db, `${C}/appAdmins/${uid}`), { email: '' })
  }
  await setDoc(doc(db, `${C}/members/m-member`), { firstName: 'Mem', uid: 'member', ministries: [], isMember: true })
  await setDoc(doc(db, `${C}/members/m-treasurer`), { firstName: 'Tre', uid: 'treasurer', ministries: ['Treasurer'] })
  await setDoc(doc(db, `${C}/members/m-other`), { firstName: 'Oth', ministries: [] })
  await setDoc(doc(db, `${C}/memberPrivate/m-member`), { contactNumber: '0917' })
  await setDoc(doc(db, `${C}/memberPrivate/m-other`), { contactNumber: '0918' })
  for (const col of ['ledgerEntries', 'prayerConcerns', 'minutes', 'followUps', 'attendance', 'inventory', 'lessons', 'teachingClasses', 'sermons', 'sgSessions', 'smallGroups', 'events', 'tasks', 'rolePermissions', 'auditLog'])
    await setDoc(doc(db, `${C}/${col}/x`), { a: 1 })
  await setDoc(doc(db, 'churches/c2/access/treasurer'), { uid: 'treasurer', caps: BASE })
  await setDoc(doc(db, 'churches/c2/ledgerEntries/x'), { a: 1 })
  await setDoc(doc(db, 'platform/private'), { models: {} })
  await setDoc(doc(db, `${C}/subscription/apps`), { enabled: [] })
})

const as = (uid) => env.authenticatedContext(uid).firestore()
let pass = 0
let fail = 0
const check = async (name, expect, fn) => {
  try {
    await (expect ? assertSucceeds(fn()) : assertFails(fn()))
    pass++
  } catch (e) {
    fail++
    console.log(`FAIL ${name}: expected ${expect ? 'allow' : 'deny'} — ${String(e.message).slice(0, 160)}`)
  }
}
const list = (uid, col) => () => getDocs(collection(as(uid), `${C}/${col}`))
const get = (uid, path) => () => getDoc(doc(as(uid), `${C}/${path}`))

// The books.
await check('treasurer lists ledger', true, list('treasurer', 'ledgerEntries'))
await check('treasurer writes ledger', true, () => addDoc(collection(as('treasurer'), `${C}/ledgerEntries`), { amount: 1 }))
await check('member lists ledger', false, list('member', 'ledgerEntries'))
await check('usher writes ledger', false, () => addDoc(collection(as('usher'), `${C}/ledgerEntries`), { amount: 1 }))
await check('admin lists ledger', true, list('admin', 'ledgerEntries'))
await check('no caps field lists ledger', false, list('nocaps', 'ledgerEntries'))
await check('treasurer of c1 lists c2 ledger', false, () => getDocs(collection(as('treasurer'), 'churches/c2/ledgerEntries')))
await check('stranger lists events', false, list('stranger', 'events'))

// Prayer, minutes, follow-up, attendance, teaching, groups.
await check('sg lists prayer', true, list('sg', 'prayerConcerns'))
await check('member lists prayer', false, list('member', 'prayerConcerns'))
await check('secretary lists minutes', true, list('secretary', 'minutes'))
await check('member lists minutes', false, list('member', 'minutes'))
await check('usher lists followUps', true, list('usher', 'followUps'))
await check('usher writes followUps', false, () => setDoc(doc(as('usher'), `${C}/followUps/y`), { step: 'new' }))
await check('usher writes attendance', true, () => setDoc(doc(as('usher'), `${C}/attendance/y`), { n: 3 }))
await check('member lists attendance', false, list('member', 'attendance'))
await check('teacher lists lessons', true, list('teacher', 'lessons'))
await check('member lists lessons', false, list('member', 'lessons'))
await check('member lists sermons (lineups.view)', true, list('member', 'sermons'))
await check('member writes sermons', false, () => setDoc(doc(as('member'), `${C}/sermons/2026-11-01`), { title: 't' }))
await check('teacher writes sermons', true, () => setDoc(doc(as('teacher'), `${C}/sermons/2026-11-01`), { title: 't' }))
await check('member lists smallGroups', true, list('member', 'smallGroups'))
await check('member writes smallGroups', false, () => setDoc(doc(as('member'), `${C}/smallGroups/y`), { name: 'g' }))
await check('member lists sgSessions', false, list('member', 'sgSessions'))
await check('sg writes sgSessions', true, () => setDoc(doc(as('sg'), `${C}/sgSessions/y`), { a: 1 }))
await check('member lists inventory', false, list('member', 'inventory'))

// Open collections stay open.
await check('member lists events', true, list('member', 'events'))
await check('member writes tasks (tickets)', true, () => addDoc(collection(as('member'), `${C}/tasks`), { title: 't' }))
await check('member reads rolePermissions', true, list('member', 'rolePermissions'))
await check('member writes rolePermissions', false, () => setDoc(doc(as('member'), `${C}/rolePermissions/Usher`), { capabilities: ['finances.manage'] }))
await check('admin writes rolePermissions', true, () => setDoc(doc(as('admin'), `${C}/rolePermissions/Usher`), { capabilities: [] }))
await check('member writes own access caps', false, () => updateDoc(doc(as('member'), `${C}/access/member`), { caps: ['finances.view'] }))

// Audit log.
await check('member lists auditLog', false, list('member', 'auditLog'))
await check('admin lists auditLog', true, list('admin', 'auditLog'))
await check('member writes own audit entry', true, () => addDoc(collection(as('member'), `${C}/auditLog`), { actorUid: 'member', at: serverTimestamp() }))

// The roll and how to reach people.
await check('member lists members', true, list('member', 'members'))
await check('member lists memberPrivate', false, list('member', 'memberPrivate'))
await check('member gets own private', true, get('member', 'memberPrivate/m-member'))
await check('member gets other private', false, get('member', 'memberPrivate/m-other'))
await check('secretary lists memberPrivate', true, list('secretary', 'memberPrivate'))
await check('member writes own private', true, () => setDoc(doc(as('member'), `${C}/memberPrivate/m-member`), { contactNumber: '1' }, { merge: true }))
await check('member writes other private', false, () => setDoc(doc(as('member'), `${C}/memberPrivate/m-other`), { contactNumber: '1' }))
await check('member edits own photo', true, () => updateDoc(doc(as('member'), `${C}/members/m-member`), { image: 'x' }))
await check('member gives self a ministry', false, () => updateDoc(doc(as('member'), `${C}/members/m-member`), { ministries: ['Treasurer'] }))
await check('member edits other record', false, () => updateDoc(doc(as('member'), `${C}/members/m-other`), { firstName: 'X' }))
await check('secretary renames someone', true, () => updateDoc(doc(as('secretary'), `${C}/members/m-other`), { firstName: 'Y' }))
await check('secretary gives a ministry', false, () => updateDoc(doc(as('secretary'), `${C}/members/m-other`), { ministries: ['Treasurer'] }))
await check('secretary links an account', false, () => updateDoc(doc(as('secretary'), `${C}/members/m-other`), { uid: 'secretary' }))
await check('secretary adds a person', true, () => addDoc(collection(as('secretary'), `${C}/members`), { firstName: 'N', ministries: [] }))
await check('secretary adds a person with a ministry', false, () => addDoc(collection(as('secretary'), `${C}/members`), { firstName: 'N', ministries: ['Treasurer'] }))
await check('admin gives a ministry', true, () => updateDoc(doc(as('admin'), `${C}/members/m-other`), { ministries: ['Treasurer'] }))
await check('admin links an account', true, () => updateDoc(doc(as('admin'), `${C}/members/m-other`), { uid: 'usher' }))
await check('member deletes someone', false, () => deleteDoc(doc(as('member'), `${C}/members/m-other`)))

// What TENANCY.md once asked to be checked by hand.
await check('member writes subscription/apps', false, () => setDoc(doc(as('member'), `${C}/subscription/apps`), { enabled: ['finances'] }))
await check('member reads platform/private', false, () => getDoc(doc(as('member'), 'platform/private')))
await check('member asks to join a church they are in', false, () =>
  setDoc(doc(as('member'), `${C}/joinRequests/member`), { uid: 'member', status: 'pending' }))
await check('stranger asks to join', true, () => setDoc(doc(as('stranger'), `${C}/joinRequests/stranger`), { uid: 'stranger', status: 'pending' }))
await check('stranger asks to join as approved', false, () => setDoc(doc(as('stranger2'), `${C}/joinRequests/stranger2`), { uid: 'stranger2', status: 'approved' }))
await check('stranger reads the roll', false, list('stranger', 'members'))

console.log(`${pass} passed, ${fail} failed`)
await env.cleanup()
process.exit(fail ? 1 : 0)

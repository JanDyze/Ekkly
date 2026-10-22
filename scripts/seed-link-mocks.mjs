#!/usr/bin/env node
/**
 * Mock links for one church, for trying the home's Quick links panel
 * (src/components/home/HomeLinks.vue) and the Links page with something in
 * them: the forms, giving page, livestream and shared folders a church hands
 * out. Ten of them, so the panel shows its eight and "All links" has more.
 *
 * Filed under the church's own link categories (Settings), matched by name,
 * so every link sits under a heading the Links page knows. The addresses are
 * made up: each points at the kind of place it would (a form, a channel, a
 * folder) with "ekkly-mock" in it, so none is mistaken for a real one.
 * Added newest first in the order below, so the panel, which shows the
 * newest first, opens on the ones used most.
 *
 * Safe by default:
 *   - prints what it would do, and writes nothing, unless --write is given;
 *   - every link it adds carries `mock: true`, so --remove takes out exactly
 *     what it put in and nothing the church added itself;
 *   - each run that changes anything leaves one entry in the church's audit log.
 *
 *   node scripts/seed-link-mocks.mjs --church uec-c2
 *   node scripts/seed-link-mocks.mjs --church uec-c2 --write
 *   node scripts/seed-link-mocks.mjs --church uec-c2 --remove --write
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

/* -------------------------------------------------------------- the links */

// The categories a church starts with (src/data/appDefaults.js), in case it
// has never saved its own.
const DEFAULT_CATEGORIES = ['Video', 'Social', 'Resource', 'Worship', 'Document', 'Official', 'Design']

// `category`: words the category it belongs under would be named by, since a
// church may rename its own; with none named like that, the church's first.
const LINKS = [
  { title: 'Sunday livestream', url: 'https://www.youtube.com/@ekkly-mock-church/live', category: 'video', description: 'Watch the service live from 9:30 every Sunday.' },
  { title: 'Online giving', url: 'https://give.ekkly-mock.org/tithes-and-offerings', category: 'official|giving', description: 'Tithes, offerings and the building fund.' },
  { title: 'Serve on Sunday sign-up', url: 'https://forms.gle/ekkly-mock-volunteers', category: 'document|form|resource', description: 'Ushers, welcome team, kids and media.' },
  { title: 'Prayer request form', url: 'https://forms.gle/ekkly-mock-prayer', category: 'document|form|resource', description: 'Sent straight to the prayer team.' },
  { title: 'Church Facebook page', url: 'https://www.facebook.com/ekkly.mock.church', category: 'social', description: 'Announcements and photos from the week.' },
  { title: 'Worship set lists and chords', url: 'https://drive.google.com/drive/folders/ekkly-mock-worship', category: 'worship|music', description: 'This month’s songs, keys and charts.' },
  { title: 'Sermon notes archive', url: 'https://drive.google.com/drive/folders/ekkly-mock-sermons', category: 'resource|document', description: 'Outlines from past Sundays.' },
  { title: 'Youth camp registration', url: 'https://forms.gle/ekkly-mock-youth-camp', category: 'document|form|resource', description: 'Closes two weeks before camp.' },
  { title: 'Announcement slide templates', url: 'https://www.canva.com/design/ekkly-mock-announcements', category: 'design', description: 'For the screen before the service.' },
  { title: 'Church worship playlist', url: 'https://open.spotify.com/playlist/ekklymockworship', category: 'worship|music|social', description: 'The songs we sing on Sundays.' },
]

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
  console.log(`Mode:     ${REMOVE ? 'remove mock links' : 'add mock links'}${WRITE ? '' : ' - dry run, nothing written'}`)
  console.log('')

  const links = church.collection('links')

  const audit = (action, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: 'links',
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-link-mocks',
      source: 'script',
    })

  if (REMOVE) {
    const mocks = await links.where('mock', '==', true).get()
    console.log(`${mocks.size} mock link(s) to remove.`)
    if (!WRITE || !mocks.size) return
    const batch = db.batch()
    mocks.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    await audit('delete', `Removed ${mocks.size} mock links`, ['mock'])
    console.log('Removed.')
    return
  }

  const existing = await links.where('mock', '==', true).get()
  if (existing.size) {
    console.log(`${existing.size} mock link(s) are already there. Run with --remove --write first to start again.`)
    return
  }

  // The church's own categories, as Settings keeps them (useAppSettings).
  const settings = (await church.collection('appSettings').doc('church').get()).data()
  const categories = (settings?.categories?.links || DEFAULT_CATEGORIES).filter(Boolean)
  // The words in turn, so a link's first choice wins over the church's order.
  const categoryFor = (words) =>
    words
      .split('|')
      .map((word) => categories.find((name) => name.toLowerCase().includes(word)))
      .find(Boolean) ||
    categories[0] ||
    ''

  // The first is the newest, a minute apart, so the panel keeps this order.
  const now = Date.now()
  const docs = LINKS.map((link, i) => ({
    title: link.title,
    url: link.url,
    category: categoryFor(link.category),
    description: link.description,
    createdAt: Timestamp.fromMillis(now - i * 60_000),
    mock: true,
  }))

  for (const d of docs) console.log(`  ${d.title}\n      ${d.category} · ${d.url}`)
  console.log(`\n${docs.length} link(s).`)
  if (!WRITE) return

  const batch = db.batch()
  docs.forEach((d) => batch.set(links.doc(), d))
  await batch.commit()
  await audit('create', `Added ${docs.length} mock links`, ['mock'])
  console.log('Written.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

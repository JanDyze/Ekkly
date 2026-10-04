#!/usr/bin/env node
/**
 * Mock birthdays and photos for one church, for trying the announcement
 * videos (src/apps/videos) with something to show: faces on the birthday card
 * and a photo behind every card.
 *
 * What goes in:
 *   - fourteen people on the roll with birthdays this month and next, each
 *     with a portrait, so the birthday card has faces and both months' videos
 *     have something to celebrate;
 *   - eight photos added to the videos' own photos (Look and sound), which the
 *     cards take in turn;
 *   - birthdays switched on in the videos, since they start off.
 *
 * Where the pictures come from: the photos behind the cards from Pixabay, when
 * PIXABAY_API_KEY is in .env (free; the key shows on pixabay.com/api/docs once
 * signed in) — church, worship and fellowship scenes — and calm landscapes
 * from picsum.photos without one. Portraits always come from randomuser.me,
 * which exists for mock people: a stock search for "portrait" turned up
 * cropped chins, a dog on a beach and faces too famous to pass as a member.
 * Pixabay asks that its pictures be downloaded rather than linked to, which
 * is what happens here anyway. Either way each picture is
 * downloaded, shrunk and put in the church's own file store, because a canvas
 * can only record a picture whose server allows it, and the church's store
 * does (the image cropper relies on the same thing).
 *
 * Safe by default:
 *   - prints what it would do, and fetches and writes nothing, unless --write
 *     is given;
 *   - every person it adds carries `mock: true`, and the photos and the
 *     birthdays switch are remembered on the video settings, so --remove takes
 *     out exactly what it put in — people, photos, files and the switch — and
 *     nothing the church added itself;
 *   - each run that changes anything leaves one entry in the church's audit log.
 *
 *   node scripts/seed-video-mocks.mjs --church uec-c2
 *   node scripts/seed-video-mocks.mjs --church uec-c2 --write
 *   node scripts/seed-video-mocks.mjs --church uec-c2 --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { put, del } from '@vercel/blob'
import { AUDIT_COLLECTION } from '../lib/auditEntry.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sharp = createRequire(import.meta.url)('sharp')

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

/* ------------------------------------------------------------- the people */

// Birthdays fall on these days of this month and next. Some are past already
// this month on purpose: a month's birthday card lists the whole month.
const PEOPLE = [
  { firstName: 'Maria Lourdes', lastName: 'Santos', nickname: 'Malou', sex: 'Female', born: 1979, month: 0, day: 3 },
  { firstName: 'Jose Miguel', lastName: 'Reyes', nickname: 'Migs', sex: 'Male', born: 1994, month: 0, day: 6 },
  { firstName: 'Kristine', lastName: 'Dela Cruz', nickname: 'Tin', sex: 'Female', born: 2001, month: 0, day: 9 },
  { firstName: 'Ramon', lastName: 'Bautista', nickname: '', sex: 'Male', born: 1958, month: 0, day: 12 },
  { firstName: 'Angelica', lastName: 'Garcia', nickname: 'Gel', sex: 'Female', born: 1988, month: 0, day: 15 },
  { firstName: 'Paolo', lastName: 'Mendoza', nickname: 'Pao', sex: 'Male', born: 2007, month: 0, day: 19 },
  { firstName: 'Teresita', lastName: 'Villanueva', nickname: 'Tess', sex: 'Female', born: 1965, month: 0, day: 23 },
  { firstName: 'Daniel', lastName: 'Aquino', nickname: 'Dan', sex: 'Male', born: 1990, month: 0, day: 27 },
  { firstName: 'Patricia', lastName: 'Ramos', nickname: 'Pat', sex: 'Female', born: 1997, month: 1, day: 2 },
  { firstName: 'Emmanuel', lastName: 'Castillo', nickname: 'Emman', sex: 'Male', born: 1984, month: 1, day: 7 },
  { firstName: 'Rosalinda', lastName: 'Flores', nickname: 'Linda', sex: 'Female', born: 1972, month: 1, day: 11 },
  { firstName: 'Joshua', lastName: 'Navarro', nickname: 'Josh', sex: 'Male', born: 2004, month: 1, day: 16 },
  { firstName: 'Camille', lastName: 'Torres', nickname: 'Cams', sex: 'Female', born: 1999, month: 1, day: 21 },
  { firstName: 'Ernesto', lastName: 'Domingo', nickname: 'Ernie', sex: 'Male', born: 1961, month: 1, day: 26 },
]

/** `YYYY-MM-DD` of a birthday `offset` months from now, kept inside the month. */
const birthday = (born, offset, day) => {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(Math.min(day, last)).padStart(2, '0')
  return `${born}-${m}-${d}`
}

/* ------------------------------------------------------------- the photos */

// What the cards are announcing, more or less: gatherings, worship, groups,
// the building. One photo per search keeps them from all looking alike.
const PIXABAY_SEARCHES = [
  'church worship service',
  'congregation praying',
  'church choir singing',
  'youth group friends',
  'bible study group',
  'church building exterior',
  'community potluck dinner',
  'sunrise over hills',
]

// Calm landscapes from picsum, chosen by eye — no animals, no food.
const PICSUM_IDS = [1015, 1016, 1018, 1039, 1043, 1057, 1067, 28]

/** Pixabay's photos for a search, as `{ large, small }` download URLs. */
const pixabay = async (key, query, params = {}) => {
  const url = new URL('https://pixabay.com/api/')
  url.search = new URLSearchParams({ key, q: query, image_type: 'photo', safesearch: 'true', per_page: '20', ...params })
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Pixabay said ${response.status} to "${query}"`)
  return ((await response.json()).hits || []).map((hit) => ({ large: hit.largeImageURL, small: hit.webformatURL }))
}

const randomPortraits = () =>
  PEOPLE.map((p, i) => `https://randomuser.me/api/portraits/${p.sex === 'Female' ? 'women' : 'men'}/${20 + i * 3}.jpg`)

/** Where each background and each portrait will be downloaded from. */
const pictureSources = async (key) => {
  if (!key) {
    return {
      from: 'picsum.photos and randomuser.me (no PIXABAY_API_KEY in .env)',
      backgrounds: PICSUM_IDS.map((id) => `https://picsum.photos/id/${id}/1920/1080`),
      portraits: randomPortraits(),
    }
  }
  const backgrounds = []
  for (const query of PIXABAY_SEARCHES) {
    const photos = await pixabay(key, query, { orientation: 'horizontal' })
    const fresh = photos.find((p) => !backgrounds.includes(p.large))
    if (fresh) backgrounds.push(fresh.large)
  }
  return { from: 'Pixabay and randomuser.me', backgrounds, portraits: randomPortraits() }
}

/** Downloads a picture, shrinks it and keeps it in the church's file store. */
const store = async (url, folder, maxWidth, token) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`)
  const input = Buffer.from(await response.arrayBuffer())
  const output = await sharp(input).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  const blob = await put(`${CHURCH_ID}/${folder}/mock-${Date.now().toString(36)}.webp`, output, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: true,
    token,
  })
  return blob.url
}

/* ------------------------------------------------------------------ main */

const main = async () => {
  if (!CHURCH_ID) {
    console.error('Usage: node scripts/seed-video-mocks.mjs --church <id> [--write] [--remove]')
    process.exit(1)
  }

  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const token = env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set in .env')
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
  console.log(`Mode:     ${REMOVE ? 'remove mock birthdays and photos' : 'add mock birthdays and photos'}${WRITE ? '' : ' - dry run, nothing fetched or written'}`)
  console.log('')

  const members = church.collection('members')
  const settingsRef = church.collection('announcementVideos').doc('settings')

  const audit = (action, collection, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection,
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-video-mocks',
      source: 'script',
    })

  if (REMOVE) {
    const people = await members.where('mock', '==', true).get()
    const settings = (await settingsRef.get()).data() || {}
    const photos = Array.isArray(settings.mockPhotos) ? settings.mockPhotos : []
    console.log(`${people.size} mock ${people.size === 1 ? 'person' : 'people'} on the roll.`)
    people.docs.forEach((d) => console.log(`  - ${d.data().firstName} ${d.data().lastName}  ${d.data().dateOfBirth}`))
    console.log(`${photos.length} mock photo${photos.length === 1 ? '' : 's'} in the videos.`)
    if (settings.mockBirthdaysOn) console.log('Birthdays were switched on by this script and will be switched off.')
    if (!WRITE) {
      console.log('\nRun again with --write to remove them.')
      return
    }

    const files = [...photos, ...people.docs.map((d) => d.data().image)].filter((u) => typeof u === 'string' && u.startsWith('https://'))
    const batch = db.batch()
    people.docs.forEach((d) => batch.delete(d.ref))
    const style = settings.style || {}
    batch.set(
      settingsRef,
      {
        style: { backgrounds: (style.backgrounds || []).filter((u) => !photos.includes(u)) },
        ...(settings.mockBirthdaysOn ? { sources: { birthdays: false } } : {}),
        mockPhotos: FieldValue.delete(),
        mockBirthdaysOn: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )
    await batch.commit()
    if (files.length) await del(files, { token }).catch((e) => console.warn(`Some files could not be deleted: ${e.message}`))
    await audit('delete', 'members', `Removed ${people.size} mock people and ${photos.length} mock video photos`, ['mock'])
    console.log('\nRemoved.')
    return
  }

  // Never twice: a second run would put a second Malou on the roll.
  const already = await members.where('mock', '==', true).limit(1).get()
  if (!already.empty) {
    console.log('Mock people from this script are already on the roll. Run with --remove first to start again.')
    return
  }

  PEOPLE.forEach((p) => console.log(`  + ${`${p.firstName} ${p.lastName}`.padEnd(28)} born ${birthday(p.born, p.month, p.day)}`))
  console.log(`  + ${PICSUM_IDS.length} photos behind the video cards`)
  console.log(`  + birthdays switched on in the videos`)
  console.log(`\nPictures from: ${env.PIXABAY_API_KEY ? 'Pixabay for the photos (PIXABAY_API_KEY found), randomuser.me for faces' : 'picsum.photos and randomuser.me (set PIXABAY_API_KEY in .env for church photos)'}`)

  if (!WRITE) {
    console.log('\nRun again with --write to add them.')
    return
  }

  const sources = await pictureSources(env.PIXABAY_API_KEY)
  console.log(`\nDownloading from ${sources.from}…`)
  const backgrounds = []
  for (const url of sources.backgrounds) {
    backgrounds.push(await store(url, 'videos', 1920, token))
    process.stdout.write('.')
  }
  const portraits = []
  for (const url of sources.portraits) {
    portraits.push(url ? await store(url, 'members', 480, token) : null)
    process.stdout.write('.')
  }
  console.log('')

  // The roll's numeric ids carry on from the highest already there.
  const existing = await members.select('id').get()
  let nextId = existing.docs.reduce((max, d) => Math.max(max, Number(d.data().id) || 0), 0) + 1

  const settings = (await settingsRef.get()).data() || {}
  const now = Timestamp.now()
  const batch = db.batch()
  PEOPLE.forEach((p, i) => {
    batch.set(members.doc(), {
      id: nextId++,
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: p.nickname,
      sex: p.sex,
      dateOfBirth: birthday(p.born, p.month, p.day),
      civilStatus: p.born < 1992 ? 'Married' : 'Single',
      address: '',
      contactNumber: '',
      occupation: '',
      relatives: {},
      ministries: [],
      instruments: [],
      tags: [],
      isMember: true,
      image: portraits[i] || null,
      mock: true,
      createdAt: now,
    })
  })
  const turnOn = !settings.sources?.birthdays
  batch.set(
    settingsRef,
    {
      style: { backgrounds: [...(settings.style?.backgrounds || []), ...backgrounds] },
      ...(turnOn ? { sources: { birthdays: true } } : {}),
      mockPhotos: backgrounds,
      mockBirthdaysOn: turnOn,
      updatedAt: now,
    },
    { merge: true }
  )
  await batch.commit()
  await audit('create', 'members', `Added ${PEOPLE.length} mock people and ${backgrounds.length} mock video photos`, PEOPLE.map((p) => p.firstName))
  console.log(`\nAdded ${PEOPLE.length} people with birthdays and ${backgrounds.length} photos.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

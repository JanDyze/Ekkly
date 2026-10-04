#!/usr/bin/env node
/**
 * Mock Sunday rosters for one church, for trying the Schedules page, Home's
 * "you're serving" card, the Present page and the digest against months that
 * are filled in rather than blank.
 *
 * A month on the Schedules page is one `worshipLineups` document holding each
 * Sunday: a song leader, the band, the songs and a theme, and the people on
 * every other role (Settings > Schedule roles) — the preacher, the ushers, the
 * Sunday school teacher. Everybody is drawn from the church's real members by
 * the ministry the role asks for, the way the people picker offers them, and
 * the rota turns over week by week so nobody is on every Sunday. Nobody is put
 * on two jobs in one service. Whichever song leader is not leading sings
 * backup, on the backup song leader role. The songs come from the church's own
 * song list.
 *
 * Safe by default:
 *   - reads only, and prints what it would write, unless --write is given;
 *   - only fills a month with no Sundays planned in it — one that does not
 *     exist yet, or an empty draft — so a real roster always wins;
 *   - the months it touches carry `mock: true`, and --remove takes them back:
 *     a month it created is deleted, and a month that was an empty draft is
 *     emptied and put back to how it was;
 *   - publishes nothing to anybody: the app's "schedule published" push is
 *     sent by the app, never from here;
 *   - each run that changes anything leaves one entry in the church's audit
 *     log saying so.
 *
 *   node scripts/seed-lineups.mjs --church uec-c2
 *   node scripts/seed-lineups.mjs --church uec-c2 --months 2026-09,2026-10,2026-11 --write
 *   node scripts/seed-lineups.mjs --church uec-c2 --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AUDIT_COLLECTION } from '../lib/auditEntry.js'
import { BAND_ROLE, SONG_LEADER_ROLE, scheduleRolesFrom } from '../src/data/scheduleRoles.js'

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

/* ------------------------------------------------------------- the months */

const pad = (n) => String(n).padStart(2, '0')
const monthKeyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

// Last month, this month and next: one already sung, one under way, one being
// planned — the three states the Schedules page draws differently.
const defaultMonths = () => {
  const now = new Date()
  return [-1, 0, 1].map((delta) => monthKeyOf(new Date(now.getFullYear(), now.getMonth() + delta, 1)))
}

const MONTHS = (arg('months') ? arg('months').split(',') : defaultMonths()).map((m) => m.trim())

// The same walk as sundaysInMonth in src/utils/lineupUtils.js.
const sundaysInMonth = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number)
  const cursor = new Date(year, month - 1, 1)
  cursor.setDate(1 + ((7 - cursor.getDay()) % 7))
  const out = []
  while (cursor.getMonth() === month - 1) {
    out.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`)
    cursor.setDate(cursor.getDate() + 7)
  }
  return out
}

// A month that has started is one the team is already working from, so it is
// published; next month is still being put together, so it is a draft.
const statusFor = (monthKey) => (monthKey <= monthKeyOf(new Date()) ? 'published' : 'draft')

/* ---------------------------------------------------------- the content */

const THEMES = [
  'Faithful in every season',
  'The God who sees',
  'Rooted and built up',
  'Grace upon grace',
  'A house of prayer',
  'Love one another',
  'Light for the world',
  'Strength for today',
  'Come to the table',
  'Thankful hearts',
  'The good shepherd',
  'Walking by faith',
  'Rejoice always',
  'Hope that does not fail',
]

const KEYS = ['G', 'D', 'C', 'A', 'E', 'F', 'Bb']

/** The key the church writes a member under on a roster: the same as memberKey. */
const memberKey = (doc) => String(doc.data().id ?? doc.id)

const nameOf = (doc) => {
  const m = doc.data()
  return [m.nickname || m.firstName, m.lastName].filter(Boolean).join(' ') || doc.id
}

const servesIn = (doc, ministries) => {
  const wanted = ministries.map((m) => m.toLowerCase())
  return (doc.data().ministries || []).some((m) => wanted.includes(String(m).toLowerCase()))
}

// A role that names no ministries offers the whole roll in the app. For the
// mock, the Sunday school teacher is still a teacher, and a role that has no
// natural pool is left empty rather than given somebody at
// random.
const POOLS = {
  'sunday-school': ['Sunday School Teacher'],
}

/**
 * `count` people from `pool`, turning over by `week`, none in `busy`.
 *
 * `offset` starts each role at a different point in its turn. Without it two
 * roles drawing on the same people stay in step: whoever leads the songs on
 * the weeks the Sunday school rota reaches them is never free to teach, and
 * the other teacher ends up with every Sunday.
 */
const rota = (pool, week, count, busy, offset = 0) => {
  const out = []
  for (let i = 0; i < pool.length && out.length < count; i++) {
    const person = pool[(week * count + offset + i) % pool.length]
    if (!busy.has(person) && !out.includes(person)) out.push(person)
  }
  return out
}

const buildSunday = ({ date, week, roles, poolOf, songs }) => {
  const busy = new Set()
  const take = (ids) => {
    ids.forEach((id) => busy.add(id))
    return ids
  }

  const leaders = poolOf(SONG_LEADER_ROLE)
  const leader = take(rota(leaders, week, 1, busy))[0] ?? null

  // Whichever song leader is not leading sings backup, when the church has the
  // role; then the band, the instrumentalists on rota.
  const backup = leaders.find((id) => id !== leader && !busy.has(id))
  const backups = roles.some((r) => r.id === 'backup-song-leader') && backup ? take([backup]) : []

  const players = poolOf(BAND_ROLE).filter((id) => !leaders.includes(id))
  const team = take(rota(players, week, Math.min(2, players.length), busy))

  const assignments = backups.length ? { 'backup-song-leader': backups } : {}
  roles.forEach((role, index) => {
    if (role.id === SONG_LEADER_ROLE || role.id === BAND_ROLE || role.id === 'backup-song-leader') return
    const pool = poolOf(role.id)
    if (!pool.length) return
    const count = role.id === 'ushers' ? 2 : 1
    const people = take(rota(pool, week, count, busy, index + 1))
    if (people.length) assignments[role.id] = people
  })

  // Four songs, drawn in turn from the church's own list so each Sunday sings
  // something different from the one before.
  const picked = []
  for (let i = 0; picked.length < Math.min(4, songs.length); i++) {
    const song = songs[(week * 3 + i) % songs.length]
    if (!picked.includes(song)) picked.push(song)
  }

  return {
    date,
    leaderId: leader,
    teamIds: team,
    theme: THEMES[week % THEMES.length],
    songs: picked.map((doc, i) => {
      const s = doc.data()
      return {
        songId: doc.id,
        title: s.title || '',
        category: s.category || '',
        key: (leader && s.leaderKeys?.[leader]) || KEYS[(week + i) % KEYS.length],
        note: '',
      }
    }),
    assignments,
  }
}

const main = async () => {
  if (!CHURCH_ID) {
    console.error('Usage: node scripts/seed-lineups.mjs --church <id> [--months YYYY-MM,...] [--write] [--remove]')
    process.exit(1)
  }
  if (!MONTHS.every((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m))) throw new Error(`Months must be YYYY-MM: ${MONTHS.join(', ')}`)

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
  console.log(`Mode:     ${REMOVE ? 'remove mock rosters' : `add mock rosters for ${MONTHS.join(', ')}`}${WRITE ? '' : ' - dry run, nothing written'}`)
  console.log('')

  const lineups = church.collection('worshipLineups')

  const audit = (action, label, fields) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: 'worshipLineups',
      path: '',
      docId: '',
      label,
      fields,
      changes: {},
      page: '',
      tool: 'seed-lineups',
      source: 'script',
    })

  if (REMOVE) {
    const snap = await lineups.where('mock', '==', true).get()
    console.log(`${snap.size} mock month${snap.size === 1 ? '' : 's'} found.`)
    snap.docs.forEach((d) =>
      console.log(`  - ${d.id}: ${d.data().mockCreated ? 'delete' : 'empty it and put it back to a draft'}`)
    )
    if (!WRITE || !snap.size) return
    const batch = db.batch()
    snap.docs.forEach((d) => {
      const data = d.data()
      if (data.mockCreated) batch.delete(d.ref)
      else {
        batch.update(d.ref, {
          sundays: [],
          status: data.mockPreviousStatus || 'draft',
          mock: FieldValue.delete(),
          mockPreviousStatus: FieldValue.delete(),
          updatedBy: 'Mock data script',
          updatedAt: Timestamp.now(),
        })
      }
    })
    await batch.commit()
    await audit('delete', `Removed mock rosters from ${snap.size} months`, snap.docs.map((d) => d.id))
    console.log('\nRemoved.')
    return
  }

  const [membersSnap, songsSnap, settingsSnap] = await Promise.all([
    church.collection('members').get(),
    church.collection('worshipSongs').get(),
    church.collection('appSettings').doc('church').get(),
  ])
  const roles = scheduleRolesFrom(settingsSnap.data()?.scheduleRoles)
  const byKey = new Map(membersSnap.docs.map((d) => [memberKey(d), d]))
  const songs = [...songsSnap.docs].sort((a, b) => String(a.data().title).localeCompare(String(b.data().title)))

  const poolOf = (roleId) => {
    const role = roles.find((r) => r.id === roleId)
    const ministries = POOLS[roleId] || role?.ministries || []
    if (!ministries.length) return []
    return membersSnap.docs
      .filter((d) => servesIn(d, ministries))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
      .map(memberKey)
  }

  console.log(`${membersSnap.size} members, ${songs.length} songs. Who each role draws from:`)
  roles.forEach((role) => {
    const pool = poolOf(role.id)
    console.log(`  ${role.name.padEnd(22)} ${pool.length ? pool.map((id) => nameOf(byKey.get(id))).join(', ') : '(nobody — left empty)'}`)
  })
  console.log('')

  const plans = []
  let week = 0
  for (const month of MONTHS) {
    const snap = await lineups.doc(month).get()
    const planned = snap.exists ? (snap.data().sundays || []).length : 0
    const dates = sundaysInMonth(month)
    if (planned) {
      console.log(`  skip ${month} - ${planned} Sunday${planned === 1 ? '' : 's'} already planned`)
      week += dates.length
      continue
    }
    const sundays = dates.map((date) => buildSunday({ date, week: week++, roles, poolOf, songs }))
    plans.push({ month, exists: snap.exists, previousStatus: snap.data()?.status || '', sundays })
  }

  const label = (ids) => (ids || []).map((id) => nameOf(byKey.get(id))).join(', ') || '—'
  for (const plan of plans) {
    console.log(`  + ${plan.month} (${statusFor(plan.month)}${plan.exists ? ', filling an empty draft' : ''})`)
    for (const s of plan.sundays) {
      console.log(`      ${s.date}  "${s.theme}"`)
      console.log(`        Song leader: ${label([s.leaderId])}   Band: ${label(s.teamIds)}`)
      Object.entries(s.assignments).forEach(([roleId, ids]) =>
        console.log(`        ${roles.find((r) => r.id === roleId)?.name}: ${label(ids)}`)
      )
      console.log(`        Songs: ${s.songs.map((x) => `${x.title} (${x.key})`).join(', ')}`)
    }
  }

  if (!plans.length) {
    console.log('\nNothing to add.')
    return
  }
  if (!WRITE) {
    console.log(`\n${plans.length} month${plans.length === 1 ? '' : 's'} would be filled. Run again with --write to add them.`)
    return
  }

  const batch = db.batch()
  for (const plan of plans) {
    batch.set(
      lineups.doc(plan.month),
      {
        month: plan.month,
        status: statusFor(plan.month),
        sundays: plan.sundays,
        updatedBy: 'Mock data script',
        updatedAt: Timestamp.now(),
        mock: true,
        ...(plan.exists ? { mockPreviousStatus: plan.previousStatus || 'draft' } : { mockCreated: true }),
      },
      { merge: true }
    )
  }
  await batch.commit()
  await audit('create', `Added mock rosters for ${plans.map((p) => p.month).join(', ')}`, plans.map((p) => p.month))
  console.log(`\nFilled ${plans.length} month${plans.length === 1 ? '' : 's'}.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

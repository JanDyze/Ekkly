#!/usr/bin/env node
/**
 * A lot of mock data for one church, across every app at once, so that each
 * test account (scripts/seed-test-accounts.mjs) has full pages to look at and
 * the difference between what one role sees and another's is plain:
 *
 *   - people: members and newcomers of every age, serving in the church's own
 *     ministries and carrying its own tags, with birthdays all through the year;
 *   - events over the last three months and the next four;
 *   - songs, prayer concerns, a year of meeting minutes;
 *   - a year of the books: Sunday offerings, monthly bills, transfers;
 *   - inventory, with a few things out on loan and a few needing repair;
 *   - small groups with weeks of sessions behind them;
 *   - Teaching: classes, lessons, and sermons on the Sundays around today;
 *   - follow-up for every newcomer, and people waiting to be let in.
 *
 * Schedules, attendance, tasks and links have scripts of their own
 * (seed-lineups, seed-attendance, seed-task-mocks, seed-link-mocks); run
 * seed-lineups after this one and its rosters draw on these people too.
 *
 * The same run always makes the same people and records (the randomness is
 * seeded), and dates are counted from today, so the pages look alike whatever
 * day it is run.
 *
 * Safe by default:
 *   - prints what it would do, and writes nothing, unless --write is given;
 *   - every record carries `mock: true` and `mockSeed: 'seed-mock-data'`, so
 *     --remove takes out exactly what it put in, and nothing the church or the
 *     other mock scripts added;
 *   - a sermon is only written on a Sunday that has none;
 *   - nobody is notified: it writes the records, not through the app;
 *   - each run that changes anything leaves one entry in the church's audit log.
 *
 *   node scripts/seed-mock-data.mjs --church uec-c2
 *   node scripts/seed-mock-data.mjs --church uec-c2 --write
 *   node scripts/seed-mock-data.mjs --church uec-c2 --remove --write
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AUDIT_COLLECTION } from '../lib/auditEntry.js'
import { PRIVATE_COLLECTION, splitPrivate } from '../lib/memberPrivate.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEED = 'seed-mock-data'
const MARK = { mock: true, mockSeed: SEED }

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

/* --------------------------------------------------------- randomness, days */

// Seeded, so a second run after --remove makes the same church again.
let state = 20261023
const random = () => {
  state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(random() * list.length)]
const chance = (p) => random() < p
const between = (low, high) => low + Math.floor(random() * (high - low + 1))
const some = (list, n) => [...list].sort(() => random() - 0.5).slice(0, n)

// Today where the church is, not where the script runs.
const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
let TODAY = ''
const day = (offset, from = TODAY) => {
  const d = new Date(`${from}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
const weekday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay()
// The Sunday on or before a date.
const sundayOf = (date) => day(-weekday(date), date)
const stamp = (date) => Timestamp.fromDate(new Date(`${date}T09:00:00+08:00`))
const peso = (amount) => Math.round(amount) * 100

/* ----------------------------------------------------------------- people */

const FEMALE = ['Maria', 'Ana', 'Grace', 'Joy', 'Kristine', 'Lorna', 'Marites', 'Rhea', 'Shiela', 'Jasmine', 'Angelica', 'Camille', 'Divina', 'Elena', 'Faith', 'Hazel', 'Irene', 'Janet', 'Liza', 'Mylene', 'Nerissa', 'Precious', 'Rowena', 'Sarah', 'Teresita', 'Vilma', 'Yolanda', 'Abigail', 'Bea', 'Cherry']
const MALE = ['Jose', 'Juan', 'Mark', 'Paolo', 'Ramon', 'Rodel', 'Arnel', 'Benjie', 'Carlo', 'Dennis', 'Edgar', 'Ferdinand', 'Gilbert', 'Herbert', 'Jayson', 'Kevin', 'Leo', 'Manuel', 'Noel', 'Oscar', 'Pedro', 'Rey', 'Samuel', 'Tomas', 'Vincent', 'Willy', 'Allan', 'Bong', 'Christian', 'Daniel']
const SURNAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Ramos', 'Aquino', 'Castillo', 'Dela Cruz', 'Gonzales', 'Navarro', 'Pascual', 'Salazar', 'Valdez', 'Villanueva', 'Manalo', 'Lopez', 'Fernandez', 'Mercado', 'Domingo', 'Soriano', 'Tolentino', 'Aguilar']
const OCCUPATIONS = ['Teacher', 'Farmer', 'Driver', 'Nurse', 'Vendor', 'Student', 'Housewife', 'Carpenter', 'Office clerk', 'Fisherman', 'Call centre agent', 'Barangay health worker', 'Retired', 'Seaman', 'Sari-sari store owner']
const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6']

// Ages by band, roughly as a small Filipino congregation is made up.
const AGE_SPREAD = [
  [3, 12, 0.18],
  [13, 21, 0.2],
  [22, 59, 0.47],
  [60, 84, 0.15],
]
const anAge = () => {
  let r = random()
  for (const [low, high, share] of AGE_SPREAD) {
    if ((r -= share) <= 0) return between(low, high)
  }
  return between(22, 59)
}

const makePeople = ({ count, firstId, ministries, tags }) => {
  const people = []
  for (let i = 0; i < count; i++) {
    const sex = chance(0.55) ? 'Female' : 'Male'
    const firstName = pick(sex === 'Female' ? FEMALE : MALE)
    const lastName = pick(SURNAMES)
    const age = anAge()
    const born = day(-age * 365 - between(0, 364))
    const adult = age >= 18
    // A quarter of the roll are still attendees, and newcomers are mostly
    // grown-ups who were invited.
    const isMember = !(adult && chance(0.25))
    const serving = isMember && age >= 15 && chance(0.45)
    people.push({
      id: firstId + i,
      firstName,
      lastName,
      nickname: chance(0.3) ? firstName.slice(0, 3) : '',
      sex,
      dateOfBirth: born,
      civilStatus: !adult ? 'Single' : age > 70 && chance(0.4) ? 'Widowed' : chance(0.65) ? 'Married' : 'Single',
      address: `${pick(PUROKS)}, Canubing II, Calapan City`,
      contactNumber: adult ? `09${between(10, 99)}${between(1000000, 9999999)}` : '',
      email: adult && chance(0.4) ? `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, '') + `${between(1, 99)}@example.com` : '',
      occupation: !adult ? 'Student' : pick(OCCUPATIONS),
      relatives: {},
      ministries: serving && ministries.length ? some(ministries, chance(0.25) ? 2 : 1) : [],
      instruments: [],
      tags: tags.length && chance(0.35) ? some(tags, 1) : [],
      isMember,
      image: '',
      ...MARK,
      createdAt: stamp(day(-between(30, 700))),
    })
  }
  return people
}

const fullName = (p) => `${p.firstName} ${p.lastName}`

/* ---------------------------------------------------------------- records */

const EVENTS = [
  ['Youth fellowship night', 'fellowship', '18:00', 'Fellowship hall', 'Games, worship and a short message for the young people.'],
  ['Prayer and fasting', 'prayer', '06:00', 'Sanctuary', 'A morning of prayer for the church and the barangay.'],
  ['Church council meeting', 'meeting', '16:00', "Pastor's office", 'Monthly meeting of the church council.'],
  ['Barangay outreach', 'outreach', '08:00', 'Purok 4 covered court', 'Feeding programme and a short gospel presentation.'],
  ['Worship team training', 'training', '14:00', 'Sanctuary', 'Rehearsal and training for singers and musicians.'],
  ["Women's breakfast", 'fellowship', '07:00', 'Fellowship hall', 'Breakfast and sharing for the women of the church.'],
  ["Men's Bible study", 'training', '19:00', 'Fellowship hall', 'Working through a book of the Bible together.'],
  ['Baptism service', 'celebration', '15:00', 'Calapan River', "Baptism for those who finished the new believers' class."],
  ['Church cleaning day', 'special', '07:00', 'Church grounds', 'Everyone welcome. Bring a broom and a bolo.'],
  ['Kids Bible club', 'training', '15:00', 'Fellowship hall', 'Songs, stories and crafts for the children.'],
  ['Wedding: a couple from the church', 'celebration', '10:00', 'Sanctuary', 'Wedding ceremony, reception to follow.'],
  ['Leaders retreat', 'special', '08:00', 'Puerto Galera', 'Two days of rest and planning for the leaders.'],
  ['Hospital visitation', 'outreach', '13:00', 'Provincial hospital', 'Visiting the sick and praying with families.'],
  ['Thanksgiving potluck', 'fellowship', '12:00', 'Fellowship hall', 'Bring a dish to share after the service.'],
  ['Evangelism training', 'training', '13:00', 'Fellowship hall', 'How to share your faith with a neighbour.'],
  ['Night of worship', 'worship', '18:30', 'Sanctuary', 'An evening of songs and prayer.'],
]

const SONGS = [
  ['Amazing Grace', 'Hymnal'], ['How Great Thou Art', 'Hymnal'], ['It Is Well With My Soul', 'Hymnal'], ['Great Is Thy Faithfulness', 'Hymnal'],
  ['Blessed Assurance', 'Hymnal'], ['To God Be the Glory', 'Hymnal'], ['Holy, Holy, Holy', 'Hymnal'], ['What a Friend We Have in Jesus', 'Hymnal'],
  ['Be Thou My Vision', 'Hymnal'], ['Come Thou Fount of Every Blessing', 'Hymnal'], ['Crown Him with Many Crowns', 'Hymnal'], ['Rock of Ages', 'Hymnal'],
  ['Nothing but the Blood', 'Hymnal'], ['I Surrender All', 'Hymnal'], ['Trust and Obey', 'Hymnal'], ['When I Survey the Wondrous Cross', 'Hymnal'],
  ['10,000 Reasons', 'Worship'], ['Goodness of God', 'Worship'], ['Way Maker', 'Worship'], ['Build My Life', 'Worship'],
  ['Cornerstone', 'Worship'], ['Living Hope', 'Worship'], ['Graves into Gardens', 'Praise'], ['What a Beautiful Name', 'Worship'],
  ['King of Kings', 'Worship'], ['Who You Say I Am', 'Worship'], ['Great Are You Lord', 'Worship'], ['Holy Spirit', 'Worship'],
  ['This Is Amazing Grace', 'Praise'], ['Raise a Hallelujah', 'Praise'], ['Shout to the Lord', 'Praise'], ['Forever', 'Praise'],
  ['Mighty to Save', 'Praise'], ['Our God', 'Praise'], ['Happy Day', 'Praise'], ['Lord I Lift Your Name on High', 'Praise'],
  ['Salamat Panginoon', 'Praise'], ['Ikaw Lamang', 'Worship'], ['Purihin ang Panginoon', 'Praise'], ['Dakilang Katapatan', 'Hymnal'],
]

const PRAYERS = [
  ['Healing after surgery', 'Recovering at home. Prayer for strength and a quick recovery.'],
  ['Work abroad', 'Leaving for a contract overseas next month. Prayer for safety and the family left behind.'],
  ['Board exam', 'Taking the licensure exam. Prayer for a clear mind.'],
  ['Unsaved family', 'Prayer that the family would come to know the Lord.'],
  ['Financial needs', 'Lost a job this month. Prayer for provision and a new job.'],
  ['Safe delivery', 'Due to give birth soon. Prayer for mother and baby.'],
  ['Grieving a loss', 'Lost a parent last week. Prayer for comfort.'],
  ['High blood pressure', 'Under medication. Prayer for healing and discipline with diet.'],
  ['Marriage', 'Going through a hard season. Prayer for patience and reconciliation.'],
  ['Studies', 'Struggling in school this semester. Prayer for focus and good teachers.'],
  ['House repair after the typhoon', 'Roof was damaged in the storm. Prayer for the means to fix it.'],
  ['Dengue', 'Admitted to the hospital with dengue. Prayer for platelets to rise.'],
  ['New business', 'Opening a small store. Prayer for wisdom and honest dealings.'],
  ['Travel', 'Travelling to Manila for a check-up. Prayer for safety.'],
  ['Thanksgiving', 'Giving thanks for answered prayer: a full recovery.'],
]

const MEETINGS = [
  ["Leaders' Meeting", "Pastor's office", ['Programme for the coming month', 'Finances', 'Building repairs', 'Ministry updates']],
  ['Church council', 'Fellowship hall', ['Annual budget', 'Membership', 'Outreach plans']],
  ['Worship team meeting', 'Sanctuary', ['Song list review', 'Sound system', 'New singers']],
  ['Youth leaders meeting', 'Fellowship hall', ['Youth camp', 'Fellowship nights', 'Discipleship']],
]

const DISCUSS = [
  'Discussed at length. Everyone agreed it needs attention before the end of the month.',
  'Reported as on track. No concerns raised.',
  'Two options were put forward and weighed. The council leaned towards the simpler one.',
  'A short update was given. More details to follow at the next meeting.',
]
const DECIDE = ['Approved as presented.', 'To be decided at the next meeting.', 'Approved, with a budget of up to ₱5,000.', 'Assigned to the ministry leader to follow through.']
const ACTIONS = ['Prepare the programme', 'Get two quotes for the repair', 'Contact the families', 'Update the song list', 'Book the venue', 'Draft the announcement', 'Buy the supplies', 'Visit the newcomers']

const INVENTORY = [
  ['Yamaha keyboard', 'Instruments', 'Sanctuary', 1, 2800000], ['Acoustic guitar', 'Instruments', 'Sanctuary', 2, 650000], ['Drum set', 'Instruments', 'Sanctuary', 1, 3500000],
  ['Bass guitar', 'Instruments', 'Sanctuary', 1, 1200000], ['Wireless microphone', 'Sound', 'Sound booth', 4, 450000], ['Mixer, 12 channel', 'Sound', 'Sound booth', 1, 1800000],
  ['Speaker, powered', 'Sound', 'Sanctuary', 2, 1500000], ['Projector', 'Media', 'Sound booth', 1, 2500000], ['Projector screen', 'Media', 'Sanctuary', 1, 600000],
  ['Laptop', 'Media', "Pastor's office", 1, 3200000], ['Monobloc chair', 'Furniture', 'Fellowship hall', 120, 35000], ['Folding table', 'Furniture', 'Fellowship hall', 12, 180000],
  ['Electric fan, stand', 'Appliances', 'Sanctuary', 6, 150000], ['Rice cooker, large', 'Kitchen', 'Kitchen', 2, 250000], ['Cooking pot, big', 'Kitchen', 'Kitchen', 4, 120000],
  ['Communion set', 'Worship', 'Store room', 1, 400000], ['Baptism robes', 'Worship', 'Store room', 10, 50000], ['Bibles, pew', 'Books', 'Sanctuary', 60, 25000],
  ['Hymn books', 'Books', 'Sanctuary', 50, 15000], ['Tent, 10x10', 'Outreach', 'Store room', 2, 450000], ['Generator', 'Equipment', 'Store room', 1, 2200000],
  ['Extension cord', 'Equipment', 'Store room', 8, 30000], ['Whiteboard', 'Teaching', 'Fellowship hall', 3, 90000], ['Kids craft supplies', 'Teaching', 'Store room', 1, 80000],
  ['First aid kit', 'Equipment', 'Kitchen', 2, 60000],
]

const GROUPS = [
  ['Young Professionals', 'Working adults in their twenties and thirties.', 5, '19:30', 'en'],
  ['Purok 2 Bible study', 'Neighbours studying the Gospels together.', 3, '19:00', 'tl'],
  ["Men's fellowship", 'Men of the church, over coffee.', 6, '06:00', 'tl'],
  ['Campus group', 'Students from the college across the highway.', 2, '17:00', 'en'],
  ['Seniors', 'Our lolas and lolos, with merienda.', 4, '15:00', 'tl'],
]
const SG_LESSONS = [
  ['The Good Shepherd', 'John 10:1-18', 'Jesus knows his sheep by name.'], ['Salt and light', 'Matthew 5:13-16', 'Faith is meant to be seen.'],
  ['The prodigal son', 'Luke 15:11-32', 'The Father runs to meet us.'], ['Do not worry', 'Matthew 6:25-34', 'Seek first the kingdom.'],
  ['The fruit of the Spirit', 'Galatians 5:22-26', 'Character grows slowly.'], ['Love one another', 'John 13:31-35', 'Love is how they will know us.'],
  ['The armour of God', 'Ephesians 6:10-18', 'Stand firm.'], ['Faith and works', 'James 2:14-26', 'Belief shows in what we do.'],
  ['The Lord is my shepherd', 'Psalm 23', 'We lack nothing.'], ['Forgiveness', 'Matthew 18:21-35', 'Forgiven people forgive.'],
]

const CLASSES = [
  ['Little Lambs', 'kids', '3–6', 'Room A'], ['Bible Explorers', 'kids', '7–12', 'Room B'],
  ['Youth class', 'youth', '13–21', 'Fellowship hall'], ['Adult class', 'adults', '22 and up', 'Sanctuary'],
]
const LESSONS = [
  ['God made everything', 'kids', 'Genesis 1', 'In the beginning God created the heavens and the earth.', 'Genesis 1:1'],
  ['Noah trusts God', 'kids', 'Genesis 6–9', 'Noah did everything just as God commanded him.', 'Genesis 6:22'],
  ['David and Goliath', 'kids', '1 Samuel 17', 'The battle is the Lord’s.', '1 Samuel 17:47'],
  ['Jesus calms the storm', 'kids', 'Mark 4:35-41', 'Even the wind and the waves obey him!', 'Mark 4:41'],
  ['Who is Jesus?', 'youth', 'John 1:1-18', 'The Word became flesh and made his dwelling among us.', 'John 1:14'],
  ['Identity in Christ', 'youth', 'Ephesians 2:1-10', 'For we are God’s handiwork.', 'Ephesians 2:10'],
  ['Purity', 'youth', '1 Thessalonians 4:1-8', 'God did not call us to be impure, but to live a holy life.', '1 Thessalonians 4:7'],
  ['Friendship', 'youth', 'Proverbs 17:17', 'A friend loves at all times.', 'Proverbs 17:17'],
  ['The Sermon on the Mount', 'adults', 'Matthew 5:1-12', 'Blessed are the poor in spirit.', 'Matthew 5:3'],
  ['Prayer', 'adults', 'Matthew 6:5-15', 'Your will be done, on earth as it is in heaven.', 'Matthew 6:10'],
  ['Stewardship', 'adults', 'Luke 16:1-13', 'Whoever can be trusted with very little can also be trusted with much.', 'Luke 16:10'],
  ['The Holy Spirit', 'adults', 'John 14:15-27', 'The Advocate, the Holy Spirit, will teach you all things.', 'John 14:26'],
]
const SERMONS = [
  ['The God who sees', 'Genesis 16:7-16', 'God sees the overlooked and names them.'],
  ['Come to me', 'Matthew 11:28-30', 'Rest is found in a person, not a place.'],
  ['The vine and the branches', 'John 15:1-11', 'Fruit comes from staying close.'],
  ['A living hope', '1 Peter 1:3-9', 'Our hope is alive because Jesus is.'],
  ['Faithful in little', 'Luke 16:10-13', 'Small faithfulness is not small.'],
  ['The Lord is my shepherd', 'Psalm 23', 'We lack nothing we truly need.'],
  ['Love is patient', '1 Corinthians 13:1-13', 'Love is the more excellent way.'],
  ['Go and make disciples', 'Matthew 28:16-20', 'Every follower is sent.'],
  ['Blessed are the merciful', 'Matthew 5:7', 'Mercy received becomes mercy given.'],
  ['Pressing on', 'Philippians 3:12-14', 'We have not arrived, so we keep going.'],
  ['Be still', 'Psalm 46', 'God is our refuge in the storm.'],
  ['The good Samaritan', 'Luke 10:25-37', 'A neighbour is whoever needs one.'],
]

/* ------------------------------------------------------------------- main */

const COLLECTIONS = ['members', 'events', 'worshipSongs', 'prayerConcerns', 'minutes', 'ledgerEntries', 'inventory', 'smallGroups', 'sgSessions', 'teachingClasses', 'lessons', 'sermons', 'followUps', 'joinRequests']

async function main() {
  if (!CHURCH_ID) throw new Error('Usage: node scripts/seed-mock-data.mjs --church <id> [--write] [--remove]')

  const env = loadEnv()
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in .env')
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  if (sa.private_key.includes('\\n')) sa.private_key = sa.private_key.replace(/\\n/g, '\n')
  initializeApp({ credential: cert(sa) })

  const db = getFirestore()
  const church = db.collection('churches').doc(CHURCH_ID)
  const churchSnap = await church.get()
  if (!churchSnap.exists) throw new Error(`No church "${CHURCH_ID}" in ${sa.project_id}.`)
  TODAY = todayIn(churchSnap.data().timezone || 'Asia/Manila')

  const audit = (action, label) =>
    church.collection(AUDIT_COLLECTION).add({
      at: FieldValue.serverTimestamp(),
      actorUid: '',
      actorName: 'Mock data script',
      actorEmail: '',
      action,
      collection: '',
      path: '',
      docId: '',
      label,
      fields: ['mock'],
      changes: {},
      page: '',
    })

  if (REMOVE) {
    let total = 0
    const writer = db.bulkWriter()
    for (const name of COLLECTIONS) {
      const snap = await church.collection(name).where('mockSeed', '==', SEED).get()
      if (snap.size) console.log(`  ${name.padEnd(18)} ${snap.size}`)
      total += snap.size
      if (WRITE) snap.docs.forEach((d) => writer.delete(d.ref))
      // A person's private part goes with them (lib/memberPrivate.js).
      if (WRITE && name === 'members') snap.docs.forEach((d) => writer.delete(church.collection(PRIVATE_COLLECTION).doc(d.id)))
    }
    // A mock join request someone approved left an access document behind.
    const access = await church.collection('access').get()
    const approved = access.docs.filter((d) => d.id.startsWith('mock-join-'))
    if (WRITE) approved.forEach((d) => writer.delete(d.ref))
    await writer.close()
    console.log(`${total + approved.length} mock record(s) in ${CHURCH_ID}.`)
    if (!WRITE) return console.log('Dry run. Add --write to remove them.')
    await audit('delete', `Removed ${total} mock records`)
    return console.log('Removed.')
  }

  const already = await church.collection('members').where('mockSeed', '==', SEED).limit(1).get()
  if (!already.empty) {
    return console.log('This church already has this mock data. Run with --remove --write first to start again.')
  }

  // The church's own lists, so every ministry and tag on a record is one the
  // app knows.
  const [roll, ministrySnap, tagSnap, sermonSnap, songSnap] = await Promise.all([
    church.collection('members').get(),
    church.collection('ministries').get(),
    church.collection('memberTags').get(),
    church.collection('sermons').get(),
    church.collection('worshipSongs').get(),
  ])
  const ministries = ministrySnap.docs.map((d) => d.data().name).filter(Boolean)
  const tags = tagSnap.docs.map((d) => d.data().name).filter(Boolean)
  const firstId = roll.docs.reduce((max, d) => Math.max(max, Number(d.data().id) || 0), 0) + 1

  const people = makePeople({ count: 80, firstId, ministries, tags })
  const members = people.filter((p) => p.isMember)
  const adults = members.filter((p) => new Date(p.dateOfBirth) < new Date(day(-18 * 365)))
  const newcomers = people.filter((p) => !p.isMember)
  const ref = (p) => String(p.id)

  const docs = {} // collection → [{ id?, data }]
  const add = (name, data, id) => (docs[name] ||= []).push({ id, data: { ...data, ...MARK } })

  // Everyone gets a document id now, so the records that point at a person by
  // it (follow-up) can be written in the same run.
  // How to reach each of them is kept beside their record, as the app keeps
  // it (lib/memberPrivate.js).
  people.forEach((p) => {
    const id = church.collection('members').doc().id
    const { open, closed } = splitPrivate(p)
    add('members', open, id)
    ;(docs[PRIVATE_COLLECTION] ||= []).push({ id, data: closed })
  })

  // One of each behind and one ahead, spread evenly so every week of the
  // calendar, the coming fortnight and the coming month have some.
  EVENTS.forEach(([title, type, time, location, description], i) => {
    for (const offset of [-(5 + i * 5), 2 + i * 4]) {
      add('events', { title, type, date: day(offset), time, location, description, audienceTags: [], excludeTags: [], icon: 'Calendar', attendees: 0, isCancelled: false })
    }
  })

  // A song the church already has is not added a second time.
  const titleKey = (title) => String(title).toLowerCase().replace(/[^a-z0-9]/g, '')
  const songTitles = songSnap.docs.map((d) => titleKey(d.data().title))
  SONGS.filter(([title]) => !songTitles.some((t) => t.startsWith(titleKey(title)) || titleKey(title).startsWith(t))).forEach(([title, category]) => {
    add('worshipSongs', { title, category, youtubeUrl: '', lyrics: '', notes: '', leaderKeys: {}, createdAt: stamp(day(-between(10, 400))) })
  })

  for (let i = 0; i < 36; i++) {
    const [title, description] = PRAYERS[i % PRAYERS.length]
    const who = pick(people)
    const date = day(-between(0, 150))
    const status = i % PRAYERS.length === 14 || chance(0.25) ? 'answered' : chance(0.3) ? 'ongoing' : 'active'
    add('prayerConcerns', {
      title: `${title}: ${who.firstName}`,
      memberId: ref(who),
      memberName: fullName(who),
      description,
      status,
      priority: pick(['low', 'normal', 'normal', 'normal', 'high', 'urgent']),
      date,
      notes: status === 'answered' ? 'Answered. Thank you, Lord.' : '',
      createdBy: 'Mock data',
      createdAt: stamp(date),
      updatedAt: stamp(date),
    })
  }

  for (let month = 0; month < 12; month++) {
    MEETINGS.slice(0, month % 3 === 0 ? 4 : 2).forEach(([title, location, agenda]) => {
      const date = day(-month * 30 - between(1, 25))
      const items = some(agenda, Math.min(agenda.length, between(2, 4)))
      const discussions = Object.fromEntries(items.map((a) => [a, pick(DISCUSS)]))
      const decisions = Object.fromEntries(items.filter(() => chance(0.7)).map((a) => [a, pick(DECIDE)]))
      const actions = some(ACTIONS, between(1, 3)).map((text) => ({ text, assignee: fullName(pick(adults)), due: day(between(7, 30), date) }))
      // Written up the way YUNIT writes a meeting up (api/enhance.js): each
      // item under its heading ending in what was decided, and who does what
      // as a table, which is where the app reads decisions and action items
      // from (utils/minuteDecisions.js, utils/minuteActionItems.js).
      const writeUp = [
        `${items.length} items discussed. ${Object.keys(decisions).length} decided.`,
        ...items.flatMap((a) => ['', `### ${a}`, discussions[a], ...(decisions[a] ? [`**Decided:** ${decisions[a]}`] : [])]),
        '',
        '## Who does what',
        '| Task | Who | By when | Status |',
        '| --- | --- | --- | --- |',
        ...actions.map((x) => `| ${x.text} | ${x.assignee} | ${x.due} | ${chance(0.3) ? 'Done' : 'Pending'} |`),
      ].join('\n')
      add('minutes', {
        title: `${title} — ${new Date(`${date}T00:00:00Z`).toLocaleString('en', { month: 'long', timeZone: 'UTC' })}`,
        date,
        startTime: '16:00',
        endTime: '17:30',
        location,
        attendees: some(adults, between(5, 10)).map(ref),
        headCount: 0,
        attendanceTag: null,
        scheduleId: null,
        occurrenceDate: '',
        content: '',
        structure: {
          agenda: items,
          discussions,
          decisions,
          actionItems: actions,
          overallSummary: writeUp,
          rawDiscussions: {},
        },
        createdBy: '',
        createdAt: stamp(date),
        updatedAt: stamp(date),
      })
    })
  }

  // A year of the books, week by week.
  const entry = (date, direction, category, subcategory, account, amount, description, payee = '', toAccount = '') =>
    add('ledgerEntries', {
      date, description, direction, category, subcategory, account, toAccount, amount: peso(amount), payee, notes: '',
      createdBy: 'mock-seed', createdByName: 'Mock data', updatedBy: 'mock-seed', updatedByName: 'Mock data',
      createdAt: stamp(date), updatedAt: stamp(date),
    })
  for (let sunday = sundayOf(day(-364)); sunday <= TODAY; sunday = day(7, sunday)) {
    entry(sunday, 'in', 'tithes-offering', 'onsite', 'cash', between(6000, 15000), 'Sunday tithes and offering')
    entry(sunday, 'in', 'tithes-offering', 'online', 'bank', between(800, 4500), 'Online giving')
    if (chance(0.25)) entry(sunday, 'in', 'tithes-offering', 'winning-souls', 'cash', between(500, 2500), 'Offering for winning souls')
    if (chance(0.3)) entry(day(2, sunday), 'out', pick(['evangelism', 'worship', 'fellowship', 'consolidation', 'care-concern']), '', 'cash', between(300, 3000), pick(['Snacks for the fellowship', 'Tracts and printing', 'Guitar strings', 'Groceries for a family in need', 'Transport for the outreach']))
    const d = Number(sunday.slice(8))
    if (d <= 7) {
      entry(day(3, sunday), 'out', 'admin', 'utilities', 'cash', between(1800, 3200), 'Electricity bill', 'ORMECO')
      entry(day(3, sunday), 'out', 'admin', 'utilities', 'cash', between(300, 650), 'Water bill', 'Calapan Water District')
      entry(day(4, sunday), 'out', 'admin', 'love-gifts', 'bank', 12000, "Pastor's love gift")
      entry(day(5, sunday), 'transfer', '', '', 'cash', between(15000, 30000), 'Deposit to the bank', '', 'bank')
      if (chance(0.5)) entry(day(5, sunday), 'out', 'admin', 'supplies', 'cash', between(500, 4000), pick(['Cleaning supplies', 'Paint for the fellowship hall', 'Light bulbs', 'Plumbing repair']))
      if (chance(0.3)) entry(day(1, sunday), 'in', 'other-income', 'donation', 'cash', between(1000, 10000), 'Love gift from a visiting family')
    }
    if (d <= 7 && ['01', '04', '07', '10'].includes(sunday.slice(5, 7))) entry(sunday, 'in', 'other-income', 'bank-interest', 'bank', between(20, 90), 'Bank interest')
  }

  INVENTORY.forEach(([name, category, location, quantity, value], i) => {
    const condition = i % 7 === 3 ? 'repair' : i % 5 === 1 ? 'worn' : 'good'
    const loans = i % 6 === 2 ? [{ id: `loan-${i}`, to: '', memberId: ref(pick(adults)), quantity: 1, since: day(-between(3, 40)), due: day(between(-5, 20)), note: 'Borrowed for a family gathering' }] : []
    add('inventory', {
      name, category, location, quantity, condition, conditionSince: condition === 'good' ? '' : day(-between(5, 90)),
      repairNote: condition === 'repair' ? 'Stopped working during the last service.' : '',
      value, acquired: day(-between(100, 2000)), notes: '', photo: '', thumb: '', photoCut: false, loans, history: [],
      createdBy: 'mock-seed', createdByName: 'Mock data', createdAt: stamp(day(-200)), updatedAt: stamp(day(-10)),
    })
  })

  const groupIds = []
  GROUPS.forEach(([name, description, meetingDay, meetingTime, language]) => {
    const id = church.collection('smallGroups').doc().id
    groupIds.push(id)
    const leader = pick(adults)
    const others = some(members.filter((p) => p !== leader), between(5, 10))
    add('smallGroups', {
      name, description, leaderId: ref(leader), coLeaderIds: chance(0.5) ? [ref(others[0])] : [], memberIds: others.map(ref),
      meetingDay, meetingTime, location: `${leader.lastName} residence, ${leader.address.split(',')[0]}`, defaultLanguage: language,
      coverPhoto: '', active: true, createdAt: stamp(day(-300)), updatedAt: stamp(day(-300)),
    }, id)
    // Weeks of sessions behind every group, a few missed.
    for (let week = 1; week <= 10; week++) {
      if (chance(0.15)) continue
      const date = day(-week * 7 + ((meetingDay - weekday(TODAY) + 7) % 7) - 7)
      const present = others.filter(() => chance(0.75))
      const [title, scripture, takeaways] = SG_LESSONS[(week + groupIds.length) % SG_LESSONS.length]
      add('sgSessions', {
        groupId: id, date, startTime: meetingTime, endTime: '', venue: `${leader.lastName} residence`, leaderId: ref(leader), recordedById: ref(leader), language,
        lesson: { title, scripture, takeaways, notes: '' },
        attendance: { presentIds: present.map(ref), absentIds: others.filter((p) => !present.includes(p)).map(ref), guests: chance(0.3) ? ['A neighbour'] : [] },
        createdAt: stamp(date), updatedAt: stamp(date),
      })
    }
  })

  const classIds = {}
  CLASSES.forEach(([name, band, ages, room], order) => {
    const id = church.collection('teachingClasses').doc().id
    classIds[band] ||= []
    classIds[band].push(id)
    add('teachingClasses', { name, band, ages, room, teacherIds: some(adults, 2).map(ref), order, archived: false, createdAt: stamp(day(-200)) }, id)
  })
  const sundays = Array.from({ length: 8 }, (_, i) => day((i - 5) * 7, sundayOf(TODAY)))
  LESSONS.forEach(([title, band, reference, text, verseRef], i) => {
    // Most are on a class's Sunday around today; every third is a plan in the
    // library, with no date, ready to reuse.
    const dated = i % 3 !== 2
    const teachers = some(adults, 1)
    add('lessons', {
      title, series: band === 'adults' ? 'Walking with Jesus' : band === 'youth' ? 'Real faith' : 'God’s big story', band,
      objective: `By the end, everyone can say in their own words what ${reference} teaches.`,
      passages: [{ reference, version: '', verses: [] }],
      memoryVerse: { reference: verseRef, version: '', text },
      activities: '1. Opening song and prayer\n2. Read the passage together\n3. Discussion in pairs\n4. Activity and memory verse\n5. Closing prayer',
      materials: ['Bibles', 'Paper and crayons', 'Whiteboard'].slice(0, between(1, 3)),
      takeHome: 'Read the passage again with your family this week.',
      classId: dated ? pick(classIds[band]) : '', date: dated ? sundays[i % sundays.length] : '',
      teacherIds: teachers.map(ref), teacherNames: teachers.map(fullName),
      review: dated && sundays[i % sundays.length] < TODAY ? 'Went well. The activity ran long; start it earlier next time.' : '',
      fromId: '', createdBy: 'mock-seed', createdByName: 'Mock data', createdAt: stamp(day(-60)), updatedAt: stamp(day(-10)),
    })
  })
  const taken = new Set(sermonSnap.docs.map((d) => d.id))
  Array.from({ length: 12 }, (_, i) => day((i - 8) * 7, sundayOf(TODAY))).forEach((date, i) => {
    if (taken.has(date)) return
    const [title, reference, bigIdea] = SERMONS[i]
    add('sermons', {
      date, title, passages: [{ reference, version: '', verses: [] }],
      points: ['What the passage says', 'What it shows us about God', 'What it asks of us this week'],
      showOutline: false, slides: [], slidesName: '', audio: null, notes: '', bigIdea,
      manuscript: `## ${title}\n\n**${reference}**\n\n${bigIdea}\n\n### 1. What the passage says\n\n### 2. What it shows us about God\n\n### 3. What it asks of us this week\n`,
      updatedBy: 'Mock data', updatedAt: stamp(day(-1, date)),
    }, date)
  })

  const welcomers = adults.slice(0, 4)
  docs.members.forEach(({ id, data }) => {
    if (data.isMember) return
    const step = pick(['new', 'new', 'contacted', 'visited', 'connected'])
    add('followUps', {
      memberId: id, step, caretakerId: step === 'new' ? '' : ref(pick(welcomers)),
      notes: step === 'new' ? '' : pick(['Called after the service. Glad to come again.', 'Visited at home with a small gift.', 'Invited to the Thursday Bible study.', 'Now in a small group.']),
      lastContact: step === 'new' ? '' : day(-between(1, 30)), updatedBy: 'Mock data', updatedAt: stamp(day(-between(1, 30))),
    }, id)
  })

  ;[['Lea', 'Ocampo', 'We moved to Canubing last month and visited on Sunday.'], ['Joel', 'Mangubat', ''], ['Trina', 'Sevilla', 'A friend from work invited me.'], ['Marco', 'Dizon', 'I used to attend years ago.']].forEach(([first, last, message], i) => {
    const uid = `mock-join-${i + 1}`
    add('joinRequests', { uid, email: `${first}.${last}@example.com`.toLowerCase(), displayName: `${first} ${last}`, photoURL: '', message, status: 'pending', requestedAt: stamp(day(-i - 1)) }, uid)
  })

  console.log(`${churchSnap.data().name} (${CHURCH_ID}), counting from ${TODAY}:\n`)
  for (const [name, list] of Object.entries(docs)) console.log(`  ${name.padEnd(18)} ${list.length}`)
  console.log(`\n  ${newcomers.length} of the ${people.length} people are newcomers; ${people.filter((p) => p.ministries.length).length} serve in a ministry.`)
  if (!WRITE) return console.log('\nDry run. Add --write to add them.')

  const writer = db.bulkWriter()
  for (const [name, list] of Object.entries(docs)) {
    const col = church.collection(name)
    list.forEach(({ id, data }) => writer.set(id ? col.doc(id) : col.doc(), data))
  }
  await writer.close()
  const total = Object.values(docs).reduce((sum, list) => sum + list.length, 0)
  await audit('create', `Added ${total} mock records`)
  console.log('\nWritten.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

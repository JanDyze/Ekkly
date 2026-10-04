// What a month's announcement video says, worked out from the church's own
// records: the calendar, the weekly services, the small groups and the serving
// schedule. Plain functions with no Vue and no Firestore, so the home's summary
// and the studio's player read one answer.
//
// A scene is one card of the video. Three layouts cover everything:
//   title    the opening and the closing card
//   feature  one thing happening — a date, a name, where and a line about it
//   list     several short rows — the small groups, the Sundays, birthdays
//
// Every scene has an id that stays the same from one visit to the next
// (`event-<docId>`, `groups`), because the church's changes to it — hidden,
// moved, reworded — are stored against that id. A new event added to the
// calendar later simply arrives as a new scene.

import {
  formatTime,
  occasionsOn,
  occurrenceTitle,
  parseDateString,
  scheduleFallsOn,
  weekdayName,
} from '../../../lib/occurrences'
import { EVENT_STATUS } from '../../../lib/eventStatus'
import { isSundayPlanned } from '../../composables/useLineups'
import { SONG_LEADER_ROLE, assignmentsOf } from '../../data/scheduleRoles'
import { findRosterMember } from '../lineupUtils'
import { getAvatarUrl, getDisplayName } from '../memberUtils'

/* ---------------------------------------------------------------- defaults */

// What a church gets before it has chosen anything. Birthdays are off: a
// video tends to be posted publicly, and a list of members' birthdays is the
// church's to decide to publish, not ours.
export const DEFAULT_SOURCES = {
  events: true,
  occasions: true,
  changes: true,
  weekly: true,
  groups: true,
  sundays: true,
  birthdays: false,
}

export const SOURCE_OPTIONS = [
  { key: 'events', label: 'Events', hint: 'Each one-off event on the calendar gets a card of its own.' },
  { key: 'occasions', label: 'Special Sundays', hint: 'Communion, dedications and other occasions on a service.' },
  { key: 'changes', label: 'Changes of plan', hint: 'Anything called off, postponed or moved.' },
  { key: 'weekly', label: 'Weekly services', hint: 'When the church meets every week.' },
  { key: 'groups', label: 'Small groups', hint: 'Where and when each group meets.' },
  { key: 'sundays', label: 'Serving schedule', hint: 'Each Sunday’s theme and who is preaching or leading.' },
  { key: 'birthdays', label: 'Birthdays', hint: 'Members celebrating this month. Check before posting publicly.' },
]

// Whether the people on a list card each get a card of their own. 'auto' is
// one each while there are few enough to give each a moment — four — and the
// list once there are more, so a month with eleven birthdays does not run a
// minute of faces.
export const SPLIT_LIMIT = 4
export const DEFAULT_SPLIT = { birthdays: 'auto', sundays: 'auto', groups: 'together' }

export const SPLIT_OPTIONS = [
  { key: 'birthdays', label: 'Birthdays', each: 'One card per person' },
  { key: 'sundays', label: 'Serving schedule', each: 'One card per Sunday' },
  { key: 'groups', label: 'Small groups', each: 'One card per group' },
]

export const SPLIT_MODES = [
  { key: 'auto', label: 'Auto' },
  { key: 'together', label: 'Together' },
  { key: 'each', label: 'One each' },
]

const splits = (mode, count) => mode === 'each' || (mode === 'auto' && count <= SPLIT_LIMIT)

export const DEFAULT_WORDS = {
  introLine: 'Here’s what is happening this month',
  outroTitle: 'See you on Sunday',
  outroLine: '',
  showLink: true,
}

/* ------------------------------------------------------------------ dates */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', last: 'last' }

export const monthName = (monthKey) => MONTHS[Number(String(monthKey).slice(5, 7)) - 1] || ''

/** Every `YYYY-MM-DD` in the month. */
const daysOf = (monthKey) => {
  const [year, month] = String(monthKey).split('-').map(Number)
  const days = []
  for (let d = new Date(year, month - 1, 1); d.getMonth() === month - 1; d.setDate(d.getDate() + 1)) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return days
}

/** "Saturday, 18 October" — the year is in the opening card already. */
export const spokenDate = (iso) => {
  const date = parseDateString(iso)
  if (!date) return iso || ''
  return `${weekdayName(date.getDay())}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** "Saturday, 18 October · 9:00 AM" */
const whenOf = (date, time) => [spokenDate(date), formatTime(time)].filter(Boolean).join(' · ')

/** "Every Sunday", "1st and 3rd Fridays", "Last Saturday of the month". */
export const rhythmOf = (schedule) => {
  const day = weekdayName(typeof schedule?.weekday === 'number' ? schedule.weekday : 0)
  const weeks = Array.isArray(schedule?.occurrences) ? schedule.occurrences : []
  if (!weeks.length) return `Every ${day}`
  const named = weeks.map((w) => ORDINALS[w] || String(w))
  const joined = named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : named[0]
  const sentence = `${joined} ${day}${weeks.length > 1 ? 's' : ''}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/** A long description cut at a sentence or word, for the body of a card. */
const shorten = (text, max = 160) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const stop = cut.lastIndexOf('. ')
  if (stop > max * 0.5) return cut.slice(0, stop + 1)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

/* ------------------------------------------------------------ the sources */

const oneOffEvents = (events, days, from) =>
  events
    .filter((e) => !e.overrideOf && !e.hidden && !e.isBirthday && days.has(e.date) && e.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

const eventScene = (event) => ({
  id: `event-${event.firestoreId || event.id}`,
  kind: 'event',
  layout: 'feature',
  date: event.date,
  eyebrow: 'Coming up',
  title: event.title || 'Untitled',
  when: whenOf(event.date, event.time),
  where: event.location || '',
  body: shorten(event.description),
})

const changeScene = (event, schedule) => {
  const called = event.status === EVENT_STATUS.CANCELLED || event.isCancelled
  const postponed = event.status === EVENT_STATUS.POSTPONED
  const title = event.title || schedule?.title || 'A gathering'
  let eyebrow = 'Change of plans'
  let when = whenOf(event.date, event.time)
  let body = shorten(event.statusNote)
  if (called) {
    eyebrow = 'Called off'
    if (!body) body = `${title} on ${spokenDate(event.date)} will not take place.`
  } else if (postponed) {
    eyebrow = 'Postponed'
    when = event.postponedTo ? `Now ${whenOf(event.postponedTo, event.time)}` : 'New date to follow'
  } else {
    eyebrow = 'New time or place'
  }
  return {
    id: `change-${event.firestoreId || event.id}`,
    kind: 'change',
    layout: 'feature',
    date: event.date,
    eyebrow,
    title,
    when,
    where: called ? '' : event.location || '',
    body,
  }
}

/** True when an override says something the regular schedule does not. */
const overrideDiffers = (event, schedule) =>
  event.status === EVENT_STATUS.CANCELLED ||
  event.status === EVENT_STATUS.POSTPONED ||
  event.isCancelled ||
  (schedule && ((event.time || '') !== (schedule.time || '') || (event.location || '') !== (schedule.location || '')))

/**
 * Occasions that make one service unlike the others — Communion on the first
 * Sunday. An occasion that marks every service of the month is not news, so
 * it is left out rather than repeated four times.
 */
const occasionScenes = (schedules, monthDays, from, overridden) => {
  const scenes = []
  schedules.forEach((schedule) => {
    const dates = monthDays.filter((d) => scheduleFallsOn(schedule, d))
    if (!dates.length) return
    const marks = dates.map((d) => occasionsOn(schedule, parseDateString(d)))
    dates.forEach((date, i) => {
      const special = marks[i].filter((label) => !marks.every((m) => m.includes(label)))
      if (!special.length || date < from) return
      if (overridden.has(`recurring-${schedule.id}-${date}`)) return
      scenes.push({
        id: `occasion-${schedule.id}-${date}`,
        kind: 'occasion',
        layout: 'feature',
        date,
        // The occasion is the news, so it heads the card; the service it
        // happens at is the headline.
        eyebrow: special.join(' · '),
        title: schedule.title || occurrenceTitle('', special),
        when: whenOf(date, schedule.time),
        where: schedule.location || '',
        body: shorten(schedule.description),
      })
    })
  })
  return scenes
}

const weeklyScene = (schedules) => {
  if (!schedules.length) return null
  return {
    id: 'weekly',
    kind: 'weekly',
    layout: 'list',
    eyebrow: 'Every week',
    title: 'Worship with us',
    rows: schedules.map((s) => ({
      label: s.title || 'Service',
      value: [rhythmOf(s), formatTime(s.time)].filter(Boolean).join(' · '),
      detail: s.location || '',
    })),
  }
}

const groupsScenes = (groups, mode) => {
  const meeting = groups
    .filter((g) => g.active !== false && typeof g.meetingDay === 'number')
    .sort((a, b) => a.meetingDay - b.meetingDay || (a.meetingTime || '').localeCompare(b.meetingTime || ''))
  if (!meeting.length) return []
  if (splits(mode, meeting.length)) {
    return meeting.map((g) => ({
      id: `group-${g.firestoreId || g.id || g.name}`,
      kind: 'group',
      group: 'groups',
      layout: 'person',
      eyebrow: 'Small groups',
      title: g.name || 'Small group',
      when: [`${weekdayName(g.meetingDay)}s`, formatTime(g.meetingTime)].filter(Boolean).join(' · '),
      where: g.location || '',
      body: shorten(g.description, 120),
      photo: g.coverPhoto || '',
      // A cover is a picture of a room of people, not a face: a rounded
      // square, not a circle.
      square: true,
    }))
  }
  // Covers only when some group has one; a list of empty circles says less
  // than the plain rows do.
  const covers = meeting.some((g) => g.coverPhoto)
  return [{
    id: 'groups',
    kind: 'groups',
    group: 'groups',
    layout: 'list',
    eyebrow: 'Small groups',
    title: 'Find your group',
    rows: meeting.map((g) => ({
      label: g.name || 'Small group',
      value: [`${weekdayName(g.meetingDay)}s`, formatTime(g.meetingTime)].filter(Boolean).join(' · '),
      detail: g.location || '',
      ...(covers ? { photo: g.coverPhoto || '' } : {}),
    })),
  }]
}

const sundaysScenes = (monthKey, lineups, members, from, mode, serviceTime) => {
  const month = lineups.find((l) => l.month === monthKey)
  // A draft month is the planners' and nobody else's, and a video is for
  // everyone.
  if (!month || month.status !== 'published') return []
  const sundays = (month.sundays || [])
    .filter((s) => s.date && s.date >= from && isSundayPlanned(s))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!sundays.length) return []
  const nameOf = (id) => {
    const member = findRosterMember(members, id)
    return member ? getDisplayName(member) : ''
  }
  const faceOf = (id) => {
    const member = findRosterMember(members, id)
    return member ? getAvatarUrl(member) : ''
  }
  if (splits(mode, sundays.length)) {
    return sundays.map((s) => {
      const assignments = assignmentsOf(s)
      const preacherId = assignments.preacher?.[0]
      const leaderId = assignments[SONG_LEADER_ROLE]?.[0]
      const preacher = nameOf(preacherId)
      const leader = nameOf(leaderId)
      const date = parseDateString(s.date)
      return {
        id: `sunday-${s.date}`,
        kind: 'sunday',
        group: 'sundays',
        layout: 'person',
        date: s.date,
        eyebrow: date ? `Sunday · ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}` : 'Sunday',
        title: s.theme || (preacher ? `${preacher} preaching` : 'Sunday service'),
        when: whenOf(s.date, serviceTime),
        where: [preacher && s.theme ? `${preacher} preaching` : '', leader ? `${leader} leading worship` : '']
          .filter(Boolean)
          .join(' · '),
        photo: faceOf(preacherId || leaderId),
      }
    })
  }
  return [{
    id: 'sundays',
    kind: 'sundays',
    group: 'sundays',
    layout: 'list',
    eyebrow: 'Sundays',
    title: `Sundays in ${monthName(monthKey)}`,
    rows: sundays.map((s) => {
      const assignments = assignmentsOf(s)
      const preacher = nameOf(assignments.preacher?.[0])
      const leader = nameOf(assignments[SONG_LEADER_ROLE]?.[0])
      const date = parseDateString(s.date)
      const speaking = assignments.preacher?.[0] || assignments[SONG_LEADER_ROLE]?.[0]
      return {
        photo: faceOf(speaking),
        label: date ? `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}` : s.date,
        value: s.theme || (preacher ? `${preacher} preaching` : leader ? `${leader} leading worship` : 'Sunday service'),
        detail: [s.theme && preacher ? `${preacher} preaching` : '', leader && (s.theme || preacher) ? `${leader} leading worship` : '']
          .filter(Boolean)
          .join(' · '),
      }
    }),
  }]
}

const birthdaysScenes = (monthKey, members, mode) => {
  const month = String(monthKey).slice(5, 7)
  const rows = members
    .filter((m) => String(m.dateOfBirth || '').slice(5, 7) === month)
    .map((m) => ({
      id: m.firestoreId || m.id,
      day: Number(String(m.dateOfBirth).slice(8, 10)),
      name: getDisplayName(m),
      photo: getAvatarUrl(m),
    }))
    .filter((r) => r.day && r.name)
    .sort((a, b) => a.day - b.day)
  if (!rows.length) return []
  if (splits(mode, rows.length)) {
    return rows.map((r) => ({
      id: `birthday-${r.id}`,
      kind: 'birthday',
      group: 'birthdays',
      layout: 'person',
      eyebrow: 'Happy birthday',
      title: r.name,
      when: `${r.day} ${monthName(monthKey)}`,
      photo: r.photo,
    }))
  }
  return [{
    id: 'birthdays',
    kind: 'birthdays',
    group: 'birthdays',
    layout: 'list',
    eyebrow: 'Celebrating',
    title: 'Happy birthday',
    rows: rows.map((r) => ({ label: r.name, value: `${monthName(monthKey).slice(0, 3)} ${r.day}`, detail: '', photo: r.photo })),
  }]
}

/* ------------------------------------------------------------- the video */

/**
 * The scenes a month's video would have before anyone touches it.
 *
 * `from` is the first date still worth announcing: today, for the month we
 * are in — an event last Tuesday is not news — and the first of the month for
 * one still to come.
 */
export const automaticScenes = ({
  monthKey,
  today,
  events = [],
  schedules = [],
  groups = [],
  lineups = [],
  members = [],
  church = {},
  sources = DEFAULT_SOURCES,
  words = DEFAULT_WORDS,
  split = DEFAULT_SPLIT,
  link = '',
}) => {
  const days = daysOf(monthKey)
  const daySet = new Set(days)
  const from = today && today.slice(0, 7) === monthKey ? today : days[0]
  const use = { ...DEFAULT_SOURCES, ...sources }
  const say = { ...DEFAULT_WORDS, ...words }
  const year = monthKey.slice(0, 4)
  const enabled = schedules.filter((s) => s.enabled !== false)
  const scheduleById = new Map(enabled.map((s) => [s.id, s]))
  const each = { ...DEFAULT_SPLIT, ...split }
  // The closing card names the main service when there is one: what a
  // visitor watching on Facebook most needs to know.
  const main = enabled.find((s) => s.weekday === 0) || enabled[0]

  const scenes = [
    {
      id: 'intro',
      kind: 'intro',
      layout: 'title',
      eyebrow: church.shortName || church.fullName || '',
      title: `${monthName(monthKey)} ${year}`,
      body: say.introLine,
    },
  ]

  // The calendar, in date order: events, special Sundays and changes of plan
  // interleaved the way the month will actually unfold.
  const dated = []
  const stored = events.filter((e) => daySet.has(e.date))
  const overridden = new Set(stored.map((e) => e.overrideOf).filter(Boolean))

  if (use.events || use.changes) {
    oneOffEvents(stored, daySet, from).forEach((event) => {
      const off = event.status === EVENT_STATUS.CANCELLED || event.status === EVENT_STATUS.POSTPONED || event.isCancelled
      if (off && use.changes) dated.push(changeScene(event))
      else if (!off && use.events) dated.push(eventScene(event))
    })
  }

  if (use.changes) {
    stored
      .filter((e) => e.overrideOf?.startsWith('recurring-') && !e.hidden && e.date >= from)
      .forEach((event) => {
        const schedule = [...scheduleById.values()].find((s) => event.overrideOf.startsWith(`recurring-${s.id}-`))
        if (overrideDiffers(event, schedule)) dated.push(changeScene(event, schedule))
      })
  }

  if (use.occasions) dated.push(...occasionScenes(enabled, days, from, overridden))

  dated.sort((a, b) => a.date.localeCompare(b.date))
  scenes.push(...dated)

  if (use.sundays) {
    scenes.push(...sundaysScenes(monthKey, lineups, members, from, each.sundays, main?.weekday === 0 ? main.time : ''))
  }
  if (use.groups) scenes.push(...groupsScenes(groups, each.groups))
  if (use.birthdays) scenes.push(...birthdaysScenes(monthKey, members, each.birthdays))
  if (use.weekly) scenes.push(weeklyScene(enabled))

  scenes.push({
    id: 'outro',
    kind: 'outro',
    layout: 'title',
    eyebrow: church.fullName || church.shortName || '',
    title: say.outroTitle,
    body:
      say.outroLine ||
      (main ? [rhythmOf(main), formatTime(main.time), main.location].filter(Boolean).join(' · ') : ''),
    footer: say.showLink ? link : '',
  })

  return scenes.filter(Boolean)
}

/* ------------------------------------------------------- the church's edits */

// What a person can change on any scene. Rows stay automatic: a list that
// needs rewriting is better hidden and replaced with an announcement of their
// own, which can say anything.
// `background` is the card's own photo behind it: a URL, 'none' for no photo
// at all, or nothing to take the next of the video's photos.
export const EDITABLE_FIELDS = ['eyebrow', 'title', 'when', 'where', 'body', 'footer', 'image', 'background', 'seconds']

export const blankCustomScene = () => ({
  id: `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  kind: 'custom',
  layout: 'feature',
  eyebrow: 'Announcement',
  title: '',
  when: '',
  where: '',
  body: '',
  image: '',
})

/**
 * The automatic scenes with a month's changes laid over them: the church's own
 * announcements added, the wording edited, the order it chose, and a `hidden`
 * flag on what it left out — kept in the list so it can be brought back.
 *
 * A scene that is new since the order was saved goes just before the closing
 * card, where something added late most naturally belongs.
 */
export const applyEdits = (auto, month = {}) => {
  const edits = month.edits || {}
  const hidden = new Set(month.hidden || [])
  const custom = (month.custom || []).map((scene) => ({ ...scene, kind: 'custom', layout: 'feature' }))
  const all = [...auto.filter((s) => s.id !== 'outro'), ...custom, ...auto.filter((s) => s.id === 'outro')]
  const byId = new Map(all.map((scene) => [scene.id, scene]))

  let ordered = all
  if (Array.isArray(month.order) && month.order.length) {
    const known = month.order.filter((id) => byId.has(id))
    const placed = new Set(known)
    ordered = known.map((id) => byId.get(id))
    all.forEach((scene) => {
      if (placed.has(scene.id)) return
      const outroAt = ordered.findIndex((s) => s.id === 'outro')
      if (scene.id === 'outro' || outroAt < 0) ordered.push(scene)
      else ordered.splice(outroAt, 0, scene)
    })
  }

  return ordered.map((scene) => {
    const edit = edits[scene.id] || {}
    const merged = { ...scene }
    EDITABLE_FIELDS.forEach((field) => {
      if (edit[field] !== undefined && edit[field] !== null) merged[field] = edit[field]
    })
    return { ...merged, edited: Boolean(edits[scene.id]), hidden: hidden.has(scene.id) }
  })
}

/** How long a scene stays up, in seconds: longer lists get longer to read. */
export const secondsFor = (scene, base = 6) => {
  if (Number(scene.seconds) > 0) return Number(scene.seconds)
  if (scene.kind === 'intro') return Math.max(3.5, base - 1.5)
  if (scene.kind === 'outro') return Math.max(4, base - 1)
  // A face and a name is quick to take in; a run of them should not drag.
  if (scene.layout === 'person') return Math.max(3.5, base - 2)
  if (scene.layout === 'list') return base + Math.max(0, (scene.rows?.length || 0) - 3) * 0.7
  return base + (String(scene.body || '').length > 90 ? 1 : 0)
}

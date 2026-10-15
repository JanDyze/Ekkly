// One Sunday, told by the scroll: the church on its hill in the morning, the
// doors opening, the service from the welcome to the last cup of coffee, and
// the doors shutting again at night. Each part of the service is a beat, and
// each beat is the moment one of the apps takes a piece of the week's paperwork
// off somebody — never the moment it does their job for them (BRAND.md, "What
// Ekkly is for"), which is why every title says what the person still does
// before it says what Ekkly keeps.
//
// Scroll is measured in screens: `t` is how many window heights the reader has
// scrolled into the story, from 0 to LENGTH. Everything the pictures do is a
// function of `t`, so scrolling back plays the Sunday backwards.

import { SUNDAY } from '../sceneDates'

export const LENGTH = 11

// `rest` is where the beat looks finished. Somebody who has asked for less
// motion sees each beat at its rest, cut to rather than flown to.
export const BEATS = [
  { key: 'hero', from: 0, to: 0.5, rest: 0, clock: [8 * 60 + 30, 8 * 60 + 40] },
  { key: 'doors', from: 0.5, to: 1.6, rest: 1.05, clock: [8 * 60 + 40, 8 * 60 + 58] },
  { key: 'welcome', from: 1.6, to: 3, rest: 2.85, clock: [9 * 60, 9 * 60 + 12] },
  { key: 'worship', from: 3, to: 4.2, rest: 3.85, clock: [9 * 60 + 15, 9 * 60 + 45] },
  { key: 'word', from: 4.2, to: 5.4, rest: 5, clock: [9 * 60 + 50, 10 * 60 + 30] },
  { key: 'prayer', from: 5.4, to: 6.4, rest: 6, clock: [10 * 60 + 32, 10 * 60 + 45] },
  { key: 'offering', from: 6.4, to: 7.4, rest: 7.1, clock: [10 * 60 + 48, 11 * 60] },
  { key: 'notices', from: 7.4, to: 8.3, rest: 8, clock: [11 * 60 + 2, 11 * 60 + 12] },
  { key: 'after', from: 8.3, to: 9.3, rest: 9.1, clock: [11 * 60 + 20, 12 * 60 + 30] },
  { key: 'night', from: 9.3, to: LENGTH, rest: LENGTH, clock: [12 * 60 + 30, 19 * 60 + 30] },
]

export const beatAt = (t) => BEATS.find((beat) => t < beat.to) || BEATS[BEATS.length - 1]

/** How far through a stretch of the story `t` is, from 0 to 1. */
export const span = (t, from, to) => Math.min(1, Math.max(0, (t - from) / (to - from)))

/** Eased in and out, so nothing starts or stops with a jolt. */
export const ease = (x) => x * x * (3 - 2 * x)

export const lerp = (a, b, x) => a + (b - a) * x

/** A span, eased. */
export const phase = (t, from, to) => ease(span(t, from, to))

/** The church's clock: the minutes of the day as "9:15 AM". */
export const clockAt = (t) => {
  const beat = beatAt(t)
  // The evening is fast-forwarded through the stepping out, then holds.
  const local = beat.key === 'night' ? span(t, 9.3, 10.4) : span(t, beat.from, beat.to)
  const minutes = Math.round(lerp(beat.clock[0], beat.clock[1], local))
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  return `${((hour + 11) % 12) + 1}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
}

export const SUNDAY_LABEL = `Sunday, ${SUNDAY}`

/* --------------------------------------------------------------- camera */

// What each beat looks at, as a region of the picture [centre x, centre y,
// width, height] that is fitted inside whatever part of the screen the
// bulletin leaves free. A phone's free part is nearly square and a desktop's
// is wide, so a region can say what a phone sees instead (`phone`).
//
// Both pictures are drawn on a 1600 × 1000 canvas: the church's front is
// centred on x 800 with its door at y 700–850, and inside, the back wall runs
// from x 360 to 1240 with the window at its top and the stage at its foot.
export const OUTSIDE = {
  whole: { at: [800, 560, 820, 700], phone: [800, 600, 640, 680] },
  near: { at: [800, 720, 380, 300], phone: [800, 730, 260, 300] },
  // Tighter than the doorway in both directions, so the door fills the screen
  // on any shape of window.
  door: { at: [800, 795, 36, 36], phone: [800, 795, 30, 30] },
}

// The camera moves between keyframes, each holding still until the next.
export const INSIDE_KEYS = [
  { t: 1.6, at: [800, 520, 1500, 900], phone: [800, 600, 1000, 860] },
  { t: 2.7, at: [800, 600, 1300, 760], phone: [800, 680, 900, 760] },
  { t: 3.35, at: [810, 340, 980, 520], phone: [760, 380, 620, 560] },
  { t: 4.25, at: [810, 340, 980, 520], phone: [760, 380, 620, 560] },
  { t: 4.6, at: [880, 390, 780, 500], phone: [860, 400, 520, 500] },
  { t: 5.45, at: [880, 390, 780, 500], phone: [860, 400, 520, 500] },
  { t: 5.75, at: [800, 450, 1560, 940], phone: [800, 470, 1000, 940] },
  { t: 6.45, at: [800, 450, 1560, 940], phone: [800, 470, 1000, 940] },
  { t: 6.8, at: [800, 790, 1300, 620], phone: [620, 790, 760, 620] },
  { t: 7.45, at: [800, 790, 1300, 620], phone: [620, 790, 760, 620] },
  { t: 7.8, at: [1050, 250, 700, 440], phone: [1100, 178, 300, 280] },
  { t: 8.35, at: [1050, 250, 700, 440], phone: [1100, 178, 300, 280] },
  { t: 8.7, at: [800, 520, 1500, 900], phone: [800, 600, 1000, 860] },
  { t: 9.3, at: [800, 520, 1500, 900], phone: [800, 600, 1000, 860] },
]

/* ----------------------------------------------------------------- words */

// What the bulletin says at each beat. `apps` are the catalogue's keys
// (lib/apps.js), shown with their artwork; the names come from the console.
export const WORDS = {
  doors: {
    label: 'Doors open',
    title: 'Someone still unlocks early. They knew it was their turn on Wednesday.',
    body: 'Whoever is on welcome, ushering and sound this week saw it on their phone days ago, so nobody spent Saturday night texting around.',
    apps: ['lineups'],
  },
  welcome: {
    label: 'Welcome',
    title: 'The ushers still say good morning. Ekkly keeps the count.',
    body: 'Heads counted once on a phone and kept beside every Sunday before, so you can see who has gone quiet. A first-timer’s name goes on the roll, not on a scrap of paper.',
    apps: ['attendance', 'members'],
  },
  worship: {
    label: 'Worship',
    title: 'The band still leads. The lineup, the keys and the lyrics are sorted.',
    body: 'Who plays, which songs and in which key were planned on one schedule, and the words go up on the screen from the same list, line by line.',
    apps: ['lineups', 'songs'],
  },
  word: {
    label: 'The word',
    title: 'The pastor still preaches. The notes and the reading are in one place.',
    body: 'Sermon notes sit on the Sunday the preaching team planned, the reading is ready for the screen, and the whole series is there to look back on.',
    apps: ['teaching', 'bible'],
  },
  prayer: {
    label: 'Prayer',
    title: 'The church still prays. Ekkly keeps the list.',
    body: 'Every concern written down once, seen by the people meant to see it, and kept when it is answered — so nobody is forgotten, and every answer is remembered.',
    apps: ['prayer'],
  },
  offering: {
    label: 'Offering',
    title: 'The treasurer still counts. The book is already written.',
    body: 'Two people count, one types it in, and the month’s book, its statement and the totals are done — not a spreadsheet only one person can open.',
    apps: ['finances'],
  },
  notices: {
    label: 'Announcements',
    title: 'Someone still reads the notices. The calendar already knows them.',
    body: 'Every event goes on one calendar, so the screen, the announcement video and everyone’s phone all say the same thing.',
    apps: ['events'],
  },
  after: {
    label: 'After the service',
    title: 'People stay for coffee. The meeting’s to-dos don’t get lost.',
    body: 'The board’s minutes are typed once and each action item gets a name, so “who has the projector?” has an answer by Monday. Small groups know who is coming on Wednesday.',
    apps: ['minutes', 'tasks', 'smallgroups'],
  },
}

// The order of service, as the bulletin lists it.
export const ORDER = ['doors', 'welcome', 'worship', 'word', 'prayer', 'offering', 'notices', 'after']

// What goes up on the screen at the front. Words in the public domain only:
// "Amazing Grace" (John Newton, 1779) and Psalm 118:24 in the King James.
export const LYRICS = [
  ['Amazing grace! how sweet the sound,', 'That saved a wretch like me!'],
  ['I once was lost, but now am found,', 'Was blind, but now I see.'],
]
export const READING = {
  text: ['This is the day which the LORD', 'hath made; we will rejoice', 'and be glad in it.'],
  ref: 'Psalm 118:24',
}

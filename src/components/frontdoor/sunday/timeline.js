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

export const LENGTH = 13.2


// `rest` is where the beat looks finished. Somebody who has asked for less
// motion sees each beat at its rest, cut to rather than flown to.
export const BEATS = [
  { key: 'hero', from: 0, to: 0.5, rest: 0, clock: [8 * 60 + 30, 8 * 60 + 40] },
  { key: 'doors', from: 0.5, to: 1.6, rest: 1.05, clock: [8 * 60 + 40, 8 * 60 + 58] },
  { key: 'welcome', from: 1.6, to: 3, rest: 2.85, clock: [9 * 60, 9 * 60 + 12] },
  { key: 'worship', from: 3, to: 4.2, rest: 3.85, clock: [9 * 60 + 15, 9 * 60 + 45] },
  { key: 'kids', from: 4.2, to: 5.3, rest: 5, clock: [9 * 60 + 46, 9 * 60 + 50] },
  { key: 'word', from: 5.3, to: 6.5, rest: 6.1, clock: [9 * 60 + 50, 10 * 60 + 30] },
  { key: 'prayer', from: 6.5, to: 7.5, rest: 7.1, clock: [10 * 60 + 32, 10 * 60 + 45] },
  { key: 'offering', from: 7.5, to: 8.5, rest: 8.2, clock: [10 * 60 + 48, 11 * 60] },
  { key: 'notices', from: 8.5, to: 9.4, rest: 9.1, clock: [11 * 60 + 2, 11 * 60 + 12] },
  { key: 'after', from: 9.4, to: 10.4, rest: 10.2, clock: [11 * 60 + 20, 12 * 60 + 15] },
  { key: 'meeting', from: 10.4, to: 11.5, rest: 11.2, clock: [12 * 60 + 30, 13 * 60 + 30] },
  { key: 'night', from: 11.5, to: LENGTH, rest: LENGTH, clock: [13 * 60 + 30, 19 * 60 + 30] },
]

// The parts told in a room of their own rather than in the church: Sunday
// school, seen from above, and the leaders' meeting, seen from a seat at the
// table. While one plays, the church holds where it was, so the church's
// pictures are drawn on their own clock (`churchAt`), which simply stops for
// the length of each room. `at` is where on that clock the room comes in.
export const ROOMS = [
  { key: 'kids', from: 4.2, to: 5.3, at: 4.2 },
  { key: 'meeting', from: 10.4, to: 11.5, at: 9.3 },
]

/** The church's clock at story time `t`: the story, less the rooms passed. */
export const churchAt = (t) => {
  let x = t
  for (const room of ROOMS) {
    const length = room.to - room.from
    if (x <= room.at) return x
    if (x < room.at + length) return room.at
    x -= length
  }
  return x
}

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
  const local = beat.key === 'night' ? span(t, beat.from, beat.from + 1.1) : span(t, beat.from, beat.to)
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
  whole: { at: [800, 665, 1040, 660], phone: [800, 668, 600, 640] },
  near: { at: [800, 720, 380, 300], phone: [800, 730, 260, 300] },
  // Tighter than the doorway in both directions, so the door fills the screen
  // on any shape of window.
  door: { at: [800, 795, 36, 36], phone: [800, 795, 30, 30] },
}

// The camera moves between keyframes, each holding still until the next.
// On a desktop each is framed above the subtitles (SundayStory's CAPTION_ROOM),
// and the welcome and the sermon are framed tall enough that the cross at
// the top of the back wall stays in view.
export const INSIDE_KEYS = [
  { t: 1.6, at: [800, 520, 1500, 900], phone: [800, 600, 1000, 860] },
  { t: 2.7, at: [800, 500, 1300, 800], phone: [800, 680, 900, 760] },
  { t: 3.35, at: [810, 340, 980, 520], phone: [760, 380, 620, 560] },
  { t: 4.25, at: [810, 340, 980, 520], phone: [760, 380, 620, 560] },
  { t: 4.6, at: [860, 370, 780, 540], phone: [860, 400, 520, 500] },
  { t: 5.45, at: [860, 370, 780, 540], phone: [860, 400, 520, 500] },
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

// What the bulletin says at each beat, kept to what can be read in the moment
// someone stops scrolling: the one thing the people still do, in small type,
// then what Ekkly keeps, large, then three wins of a few words each. `{name}`
// is the platform's name. `apps` are the catalogue's keys (lib/apps.js),
// shown with their artwork; the names come from the console.
export const WORDS = {
  doors: {
    label: 'Doors open',
    still: 'Someone still unlocks early.',
    keeps: 'They knew it was their turn on Wednesday.',
    wins: ['Every roster on every phone', 'Reminders sent for you', 'No Saturday-night texting'],
    apps: ['lineups'],
  },
  welcome: {
    label: 'Welcome',
    still: 'The ushers still say good morning.',
    keeps: '{name} keeps the count.',
    wins: ['Heads counted in a few taps', 'First-timers on the roll', 'See who has gone quiet'],
    apps: ['attendance', 'members'],
  },
  worship: {
    label: 'Worship',
    still: 'The band still leads.',
    keeps: 'The lineup, keys and lyrics are ready.',
    wins: ['One plan for the whole team', 'The key beside every song', 'Lyrics straight to the screen'],
    apps: ['lineups', 'songs'],
  },
  kids: {
    label: 'Sunday school',
    still: 'The teachers still teach the kids.',
    keeps: 'The lesson and the class list are ready.',
    wins: ['Lessons planned, and reused', 'Who came to each class', 'Every class in one place'],
    apps: ['teaching'],
  },
  word: {
    label: 'The word',
    still: 'The pastor still preaches.',
    keeps: 'The notes and the reading are in one place.',
    wins: ['Notes on the Sunday they planned', 'The reading ready for the screen', 'The whole series to look back on'],
    apps: ['teaching', 'bible'],
  },
  prayer: {
    label: 'Prayer',
    still: 'The church still prays.',
    keeps: '{name} keeps the list.',
    wins: ['Every request written once', 'Seen by the right people', 'Every answer remembered'],
    apps: ['prayer'],
  },
  offering: {
    label: 'Offering',
    still: 'The treasurer still counts.',
    keeps: 'The month’s book is already written.',
    wins: ['Typed in once', 'The statement ready', 'Not one person’s spreadsheet'],
    apps: ['finances'],
  },
  notices: {
    label: 'Announcements',
    still: 'Someone still reads the notices.',
    keeps: 'The calendar already knows them.',
    wins: ['One calendar for everything', 'The same news on every phone', 'The announcement video made for you'],
    apps: ['events'],
  },
  after: {
    label: 'After the service',
    still: 'People still stay for coffee.',
    keeps: 'Small groups know who is coming.',
    wins: ['Every group and who is in it', 'Who came to each meeting', 'The next one on the calendar'],
    apps: ['smallgroups'],
  },
  meeting: {
    label: 'Church meeting',
    still: 'The leaders still decide.',
    keeps: '{name} keeps the minutes.',
    wins: ['Typed once, shared at once', 'Every action item has a name', 'Decisions easy to find again'],
    apps: ['minutes', 'tasks'],
  },
}

// The order of service, as the bulletin lists it.
export const ORDER = ['doors', 'welcome', 'worship', 'kids', 'word', 'prayer', 'offering', 'notices', 'after', 'meeting']

// What goes up on the screen at the front. Words in the public domain only:
// "Amazing Grace" (John Newton, 1779), and Romans 5:8 in the World English
// Bible for the sermon.
export const LYRICS = [
  ['Amazing grace! how sweet the sound,', 'That saved a wretch like me!'],
  ['I once was lost, but now am found,', 'Was blind, but now I see.'],
]
export const READING = {
  // The verse the sermon is on (ChurchInside has the preacher say it), in the
  // World English Bible, as the gospel section below the story quotes it.
  text: ['But God commends his own love', 'toward us, in that while we were', 'yet sinners, Christ died for us.'],
  ref: 'Romans 5:8',
}

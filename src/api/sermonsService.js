import { db } from './firebase'
import { collection, deleteDoc, doc, onSnapshot, setDoc, Timestamp } from './firestore'

// What is preached each Sunday: the preaching team's own record, one document
// per date.
//
// Apart from the month's schedule on purpose. The schedule says who preaches
// and what the Sunday's theme is — the rota everyone reads — and is planned by
// whoever runs the rota. The message itself is the preacher's: its title, the
// passages, an outline, the slides. Keeping it here means a preacher writing
// up Sunday never rewrites the month, and the rota planner never disturbs the
// sermon.
//
// The passages are stored with their verses, looked up when they were added,
// the way the run sheet stores a reading: a sermon's Scripture should still go
// up on the screen when the church wifi does not.
//
// Two apps write this record. Schedules' preaching sheet writes what goes up
// on the screen — the slides, the recording, the outline as slides, the
// team's notes. The Teaching app writes what the preacher prepares ahead: the
// one thing to take home (`bigIdea`) and the notes they preach from
// (`manuscript`), with the title, passages and outline both share. So every
// write merges, and each names only the fields it owns: the preaching sheet
// saving the slides can never wipe the notes a preacher wrote in Teaching,
// and the notes can never take the slides off the screen.

const SERMONS_COLLECTION = 'sermons'

// The fields only Teaching writes. A save that does not carry one leaves it as
// it is on file.
const TEACHING_FIELDS = ['bigIdea', 'manuscript']

const normalizePassage = (passage = {}) => ({
  reference: String(passage.reference || ''),
  version: String(passage.version || ''),
  verses: Array.isArray(passage.verses)
    ? passage.verses.map((v) => ({
        chapter: Number(v?.chapter) || 0,
        verse: Number(v?.verse) || 0,
        text: String(v?.text || ''),
      }))
    : [],
})

const normalizeSermon = (id, data = {}) => ({
  date: data.date || id,
  title: data.title || '',
  passages: Array.isArray(data.passages) ? data.passages.map(normalizePassage) : [],
  // The outline, one point to a line. Projected as slides of its own when
  // `showOutline` is on, for a preacher without a deck.
  points: Array.isArray(data.points) ? data.points.map(String).filter(Boolean) : [],
  showOutline: data.showOutline === true,
  // A deck, as one picture per slide: a PDF is turned into pictures when it
  // is added, so the screen shows exactly what the preacher made.
  slides: Array.isArray(data.slides) ? data.slides.filter((s) => s?.url).map((s) => ({ url: s.url })) : [],
  slidesName: data.slidesName || '',
  // The message as it was preached, to listen back to: `{ url, name }`.
  audio: data.audio?.url ? { url: data.audio.url, name: data.audio.name || '' } : null,
  notes: data.notes || '',
  // What the preacher prepares ahead, in the Teaching app: the one sentence
  // the message is for, and the notes they preach from, in Markdown.
  bigIdea: data.bigIdea || '',
  manuscript: data.manuscript || '',
  updatedBy: data.updatedBy || '',
  updatedAt: data.updatedAt?.toDate?.() || null,
})

/** Whether anything has been prepared for a message yet: a title, an outline or notes. */
export const hasSermonNotes = (sermon) =>
  Boolean(sermon && (sermon.title || sermon.points?.length || sermon.manuscript || sermon.bigIdea))

export const blankSermon = (date) => normalizeSermon(date)

/** Every Sunday's message, keyed by date. A church preaches one a week, so this stays small. */
export const subscribeToSermons = (callback) =>
  onSnapshot(
    collection(db, SERMONS_COLLECTION),
    (snapshot) => {
      const byDate = {}
      snapshot.docs.forEach((d) => {
        byDate[d.id] = normalizeSermon(d.id, d.data())
      })
      callback(byDate)
    },
    (error) => {
      console.error('Error subscribing to sermons:', error)
      callback({})
    }
  )

/**
 * Writes one Sunday's message: every field the preaching sheet edits, whole.
 * Merged, so what Teaching keeps on the same record (TEACHING_FIELDS) stays
 * unless this save carries it too.
 */
export const saveSermon = (date, sermon, by) =>
  setDoc(
    doc(db, SERMONS_COLLECTION, date),
    {
      date,
      title: String(sermon.title || '').trim(),
      passages: (sermon.passages || []).map(normalizePassage),
      points: (sermon.points || []).map((p) => String(p).trim()).filter(Boolean),
      showOutline: sermon.showOutline === true,
      slides: (sermon.slides || []).filter((s) => s?.url).map((s) => ({ url: s.url })),
      slidesName: sermon.slidesName || '',
      audio: sermon.audio?.url ? { url: sermon.audio.url, name: sermon.audio.name || '' } : null,
      notes: String(sermon.notes || '').trim(),
      ...Object.fromEntries(
        TEACHING_FIELDS.filter((field) => sermon[field] !== undefined).map((field) => [field, String(sermon[field] || '').trim()])
      ),
      updatedBy: by?.email || by?.uid || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )

/**
 * What the preacher prepares in the Teaching app: the title, the passages and
 * the outline (shared with the preaching sheet), the big idea and the notes.
 * Nothing about the screen — the slides, the recording and the team's notes
 * are the preaching sheet's, and a merge leaves them exactly as they are.
 */
export const saveSermonNotes = (date, notes, by) =>
  setDoc(
    doc(db, SERMONS_COLLECTION, date),
    {
      date,
      title: String(notes.title || '').trim(),
      passages: (notes.passages || []).map(normalizePassage),
      points: (notes.points || []).map((p) => String(p).trim()).filter(Boolean),
      bigIdea: String(notes.bigIdea || '').trim(),
      manuscript: String(notes.manuscript || '').trim(),
      updatedBy: by?.email || by?.uid || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )

export const deleteSermon = (date) => deleteDoc(doc(db, SERMONS_COLLECTION, date))

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

const SERMONS_COLLECTION = 'sermons'

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
  updatedBy: data.updatedBy || '',
  updatedAt: data.updatedAt?.toDate?.() || null,
})

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

/** Writes one Sunday's message whole; it is one person's at a time. */
export const saveSermon = (date, sermon, by) =>
  setDoc(doc(db, SERMONS_COLLECTION, date), {
    date,
    title: String(sermon.title || '').trim(),
    passages: (sermon.passages || []).map(normalizePassage),
    points: (sermon.points || []).map((p) => String(p).trim()).filter(Boolean),
    showOutline: sermon.showOutline === true,
    slides: (sermon.slides || []).filter((s) => s?.url).map((s) => ({ url: s.url })),
    slidesName: sermon.slidesName || '',
    audio: sermon.audio?.url ? { url: sermon.audio.url, name: sermon.audio.name || '' } : null,
    notes: String(sermon.notes || '').trim(),
    updatedBy: by?.email || by?.uid || '',
    updatedAt: Timestamp.now(),
  })

export const deleteSermon = (date) => deleteDoc(doc(db, SERMONS_COLLECTION, date))

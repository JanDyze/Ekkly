import { db } from './firebase'
import { collection, deleteDoc, doc, onSnapshot, setDoc, Timestamp } from './firestore'
import { DEFAULT_SOURCES, DEFAULT_SPLIT, DEFAULT_WORDS } from '../utils/video/scenes'
import { DEFAULT_STYLE } from '../utils/video/render'
import { DEFAULT_MUSIC } from '../utils/video/music'

// The announcement videos a church has shaped.
//
// Nothing here stores a video. The video is drawn afresh from the calendar
// every time it is opened, which is what keeps it up to date; what is stored
// is what the church changed about it. One document, `settings`, holds the
// look and the music for every month. One per month, keyed `YYYY-MM`, holds
// that month's changes: the announcements it added, the wording it changed,
// the order and what it left out.

const COLLECTION = 'announcementVideos'
export const SETTINGS_ID = 'settings'

const normalizeSettings = (data = {}) => ({
  style: { ...DEFAULT_STYLE, ...(data.style || {}) },
  music: { ...DEFAULT_MUSIC, ...(data.music || {}) },
  sources: { ...DEFAULT_SOURCES, ...(data.sources || {}) },
  words: { ...DEFAULT_WORDS, ...(data.words || {}) },
  split: { ...DEFAULT_SPLIT, ...(data.split || {}) },
})

const normalizeMonth = (id, data = {}) => ({
  id,
  hidden: Array.isArray(data.hidden) ? data.hidden : [],
  order: Array.isArray(data.order) ? data.order : [],
  edits: data.edits && typeof data.edits === 'object' ? data.edits : {},
  custom: Array.isArray(data.custom) ? data.custom : [],
  // This month's own answer to "one card each or all together", where it
  // differs from the church's usual.
  split: data.split && typeof data.split === 'object' ? data.split : {},
})

export const blankMonth = (id) => normalizeMonth(id)
export const defaultSettings = () => normalizeSettings()

/** Calls back with `{ settings, months: { 'YYYY-MM': month } }` on every change. */
export const subscribeToAnnouncementVideos = (callback) =>
  onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      let settings = normalizeSettings()
      const months = {}
      snapshot.docs.forEach((d) => {
        if (d.id === SETTINGS_ID) settings = normalizeSettings(d.data())
        else months[d.id] = normalizeMonth(d.id, d.data())
      })
      callback({ settings, months })
    },
    (error) => {
      console.error('Error subscribing to announcement videos:', error)
      callback({ settings: normalizeSettings(), months: {} })
    }
  )

/**
 * Replaces the named sections of the settings outright — `style`, `music`,
 * `sources`, `words` — so a choice turned off is stored as off rather than
 * merged back in from what was there.
 */
export const saveVideoSettings = (partial) => {
  const fields = Object.keys(partial)
  return setDoc(
    doc(db, COLLECTION, SETTINGS_ID),
    { ...partial, updatedAt: Timestamp.now() },
    { mergeFields: [...fields, 'updatedAt'] }
  )
}

/** The same for one month's changes: each field named is replaced whole. */
export const saveMonthVideo = (monthKey, partial) => {
  const fields = Object.keys(partial)
  return setDoc(
    doc(db, COLLECTION, monthKey),
    { ...partial, updatedAt: Timestamp.now() },
    { mergeFields: [...fields, 'updatedAt'] }
  )
}

/** Back to what the calendar says, with every change to the month dropped. */
export const resetMonthVideo = (monthKey) => deleteDoc(doc(db, COLLECTION, monthKey))

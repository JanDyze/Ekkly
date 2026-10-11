import { db } from './firebase'
import { addDoc, collection, deleteDoc, doc, onSnapshot, Timestamp, updateDoc } from './firestore'

// Lessons: what is taught in Sunday school, and the plans it is taught from.
//
// One record serves both, because they are one thing at two moments. A lesson
// plan is written once — what it is for, the passage, the memory verse, what
// happens in the room, what to bring and what the children take home. When it
// is put on a class's Sunday it gains a class, a date and its teachers, and
// that is all that changes. A plan with no date is in the library, waiting.
//
// Teaching a plan again copies it rather than moving it (`fromId` remembers
// where it came from), so the teacher who adapts last year's lesson for this
// year's class changes their copy, never the one the other class used.
//
// Teachers' names are stored beside their ids, the way a task stores its
// assignees: a lesson has to say who is teaching it the moment it arrives,
// before the roll has loaded.

const LESSONS_COLLECTION = 'lessons'

const asStrings = (value) => (Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : [])

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

const normalizeMemoryVerse = (verse) =>
  verse?.reference
    ? { reference: String(verse.reference), version: String(verse.version || ''), text: String(verse.text || '') }
    : null

const normalizeLesson = (snapshot) => {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    title: data.title || '',
    // The series it belongs to, so a quarter's lessons are found together.
    series: data.series || '',
    // Who it is written for, by the age bands the rest of the app plans
    // around (src/utils/ageBands.js), or '' for anyone.
    band: data.band || '',
    objective: data.objective || '',
    passages: Array.isArray(data.passages) ? data.passages.map(normalizePassage) : [],
    memoryVerse: normalizeMemoryVerse(data.memoryVerse),
    // What happens in the room, step by step, in Markdown.
    activities: data.activities || '',
    materials: asStrings(data.materials),
    takeHome: data.takeHome || '',
    // On a class's Sunday, or '' for a plan still in the library.
    classId: data.classId || '',
    date: data.date || '',
    teacherIds: asStrings(data.teacherIds),
    teacherNames: asStrings(data.teacherNames),
    // How it went, written after the class: what to change next time.
    review: data.review || '',
    fromId: data.fromId || '',
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || '',
    createdAt: data.createdAt?.toDate?.() || null,
    updatedAt: data.updatedAt?.toDate?.() || null,
  }
}

/** A blank lesson, for the editor. */
export const blankLesson = (fields = {}) => ({
  title: '',
  series: '',
  band: '',
  objective: '',
  passages: [],
  memoryVerse: null,
  activities: '',
  materials: [],
  takeHome: '',
  classId: '',
  date: '',
  teacherIds: [],
  teacherNames: [],
  review: '',
  fromId: '',
  ...fields,
})

/** What is written, cleaned the same way whether it is new or an edit. */
const forStorage = (lesson) => ({
  title: String(lesson.title || '').trim(),
  series: String(lesson.series || '').trim(),
  band: String(lesson.band || ''),
  objective: String(lesson.objective || '').trim(),
  passages: (lesson.passages || []).map(normalizePassage),
  memoryVerse: normalizeMemoryVerse(lesson.memoryVerse),
  activities: String(lesson.activities || '').trim(),
  materials: asStrings(lesson.materials),
  takeHome: String(lesson.takeHome || '').trim(),
  classId: String(lesson.classId || ''),
  date: String(lesson.date || ''),
  teacherIds: asStrings(lesson.teacherIds),
  teacherNames: asStrings(lesson.teacherNames),
  review: String(lesson.review || '').trim(),
  fromId: String(lesson.fromId || ''),
})

/** Every lesson the church has written. A few a week at most, so it stays small. */
export const subscribeToLessons = (callback) =>
  onSnapshot(
    collection(db, LESSONS_COLLECTION),
    (snapshot) => callback(snapshot.docs.map(normalizeLesson)),
    (error) => {
      console.error('Error subscribing to lessons:', error)
      callback([])
    }
  )

/** Adds a lesson and gives back its id, so the page can open it. */
export const addLesson = async (lesson, by = {}) => {
  const ref = await addDoc(collection(db, LESSONS_COLLECTION), {
    ...forStorage(lesson),
    createdBy: by.uid || '',
    createdByName: by.name || '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export const updateLesson = (id, lesson) =>
  updateDoc(doc(db, LESSONS_COLLECTION, id), { ...forStorage(lesson), updatedAt: Timestamp.now() })

/** Only how it went, after the class, without touching the plan itself. */
export const saveLessonReview = (id, review) =>
  updateDoc(doc(db, LESSONS_COLLECTION, id), { review: String(review || '').trim(), updatedAt: Timestamp.now() })

export const deleteLesson = (id) => deleteDoc(doc(db, LESSONS_COLLECTION, id))

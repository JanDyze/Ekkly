import { db } from './firebase'
import { addDoc, collection, doc, onSnapshot, Timestamp, updateDoc } from './firestore'

// Sunday school classes: who is taught together, and who usually teaches them.
//
// A class is named by the church ("Little Lambs", "Teens") and placed in one
// of the age bands the rest of the app plans around (src/utils/ageBands.js),
// with the ages it takes written as the church says them ("4 to 6"). Its
// regular teachers are who a new lesson is offered to first; who teaches on a
// given Sunday is the lesson's own, and the schedule's.
//
// A class that stops meeting is put away rather than deleted (`archived`), so
// the lessons it was taught keep saying which class they were for.

const CLASSES_COLLECTION = 'teachingClasses'

const asStrings = (value) => (Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : [])

const normalizeClass = (snapshot) => {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    name: data.name || '',
    band: data.band || '',
    ages: data.ages || '',
    room: data.room || '',
    teacherIds: asStrings(data.teacherIds),
    order: Number.isFinite(data.order) ? data.order : 0,
    archived: data.archived === true,
    createdAt: data.createdAt?.toDate?.() || null,
  }
}

const forStorage = (cls) => ({
  name: String(cls.name || '').trim(),
  band: String(cls.band || ''),
  ages: String(cls.ages || '').trim(),
  room: String(cls.room || '').trim(),
  teacherIds: asStrings(cls.teacherIds),
  order: Number.isFinite(cls.order) ? cls.order : 0,
  archived: cls.archived === true,
})

/** Every class, youngest band first, then in the church's own order. */
export const subscribeToTeachingClasses = (callback) =>
  onSnapshot(
    collection(db, CLASSES_COLLECTION),
    (snapshot) => callback(snapshot.docs.map(normalizeClass)),
    (error) => {
      console.error('Error subscribing to Sunday school classes:', error)
      callback([])
    }
  )

export const addTeachingClass = async (cls) => {
  const ref = await addDoc(collection(db, CLASSES_COLLECTION), { ...forStorage(cls), createdAt: Timestamp.now() })
  return ref.id
}

export const updateTeachingClass = (id, cls) => updateDoc(doc(db, CLASSES_COLLECTION, id), forStorage(cls))

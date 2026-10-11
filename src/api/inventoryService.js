import { db } from './firebase'
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
} from './firestore'
import { deleteImages, uploadImage } from './blobService'
import { CONDITIONS } from '../utils/inventoryUtils'
import { todayKey } from '../utils/taskUtils'

// The things the church owns — the sound desk, the folding chairs, the
// keyboard, the big rice pot — one document each in `inventory`.
//
// Photographs go to Blob (blobService) and the document keeps only their
// URLs: an item's picture is a phone photo, and a list of a hundred items each
// carrying its picture inside it would be a hundred documents near the 1 MiB
// a document holds, all downloaded to draw one list. Two files per item: the
// picture (PHOTO_DIM) and a small copy (THUMB_DIM) that lists and cards draw.
//
// Loans are an array on the item, written with arrayUnion and arrayRemove
// rather than a rewritten array: two people lending and returning on the same
// Sunday would otherwise each write back the copy they opened, and one of them
// would silently undo the other. For the same reason each loan is stored with
// every field present and nothing that changes after it is written, so the
// exact object read back can be removed again.

const COLLECTION = 'inventory'
const PHOTO_FOLDER = 'inventory'

const CONDITION_KEYS = CONDITIONS.map((c) => c.key)

const asLoan = (value) => ({
  id: String(value?.id || ''),
  to: String(value?.to || ''),
  memberId: String(value?.memberId || ''),
  quantity: Math.max(1, Math.trunc(Number(value?.quantity) || 1)),
  since: String(value?.since || ''),
  due: String(value?.due || ''),
  note: String(value?.note || ''),
  // What is stored, kept so returning it can remove that exact element.
  raw: value,
})

const normalizeItem = (snapshot) => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    firestoreId: snapshot.id,
    name: data.name || '',
    category: data.category || '',
    quantity: Math.max(1, Math.trunc(Number(data.quantity) || 1)),
    location: data.location || '',
    condition: CONDITION_KEYS.includes(data.condition) ? data.condition : 'good',
    repairNote: data.repairNote || '',
    conditionSince: data.conditionSince || '',
    photo: data.photo || '',
    thumb: data.thumb || data.photo || '',
    photoCut: Boolean(data.photoCut),
    loans: (Array.isArray(data.loans) ? data.loans : []).map(asLoan),
    history: (Array.isArray(data.history) ? data.history : [])
      .map((entry) => ({ ...asLoan(entry), returned: String(entry?.returned || '') }))
      .sort((a, b) => b.returned.localeCompare(a.returned)),
    // Centavos, like the ledger, so a value is never a float that drifts.
    value: Math.max(0, Math.trunc(Number(data.value) || 0)),
    acquired: data.acquired || '',
    notes: data.notes || '',
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || '',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  }
}

/** Live list of everything, alphabetical. Lists regroup it themselves. */
export const subscribeToInventory = (callback) =>
  onSnapshot(
    query(collection(db, COLLECTION), orderBy('name')),
    (snapshot) => callback(snapshot.docs.map(normalizeItem)),
    (error) => {
      console.error('Error subscribing to inventory:', error)
      callback([])
    }
  )

const refFor = (item) => doc(db, COLLECTION, item.firestoreId || item.id)

/** Only the fields the form edits, cleaned, so nothing stray lands on a record. */
const cleanFields = (fields) => {
  const out = {}
  if ('name' in fields) out.name = String(fields.name || '').trim()
  if ('category' in fields) out.category = String(fields.category || '').trim()
  if ('location' in fields) out.location = String(fields.location || '').trim()
  if ('quantity' in fields) out.quantity = Math.max(1, Math.trunc(Number(fields.quantity) || 1))
  if ('condition' in fields) out.condition = CONDITION_KEYS.includes(fields.condition) ? fields.condition : 'good'
  if ('repairNote' in fields) out.repairNote = String(fields.repairNote || '').trim()
  if ('conditionSince' in fields) out.conditionSince = String(fields.conditionSince || '')
  if ('value' in fields) out.value = Math.max(0, Math.trunc(Number(fields.value) || 0))
  if ('acquired' in fields) out.acquired = String(fields.acquired || '')
  if ('notes' in fields) out.notes = String(fields.notes || '').trim()
  return out
}

/**
 * Uploads a photo pair (encodePhoto's `{ photo, thumb }` data URLs) and
 * resolves their stored URLs. Both go up together, so an item never ends up
 * with a small copy of one picture and a large copy of another.
 */
export const uploadItemPhoto = async ({ photo, thumb }) => {
  const [photoUrl, thumbUrl] = await Promise.all([uploadImage(photo, PHOTO_FOLDER), uploadImage(thumb, PHOTO_FOLDER)])
  return { photo: photoUrl, thumb: thumbUrl }
}

/** Adds an item; `picture` is `{ photo, thumb, cut }` with stored URLs, or null. */
export const addItem = async (fields, picture, { uid = '', name = '' } = {}) => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...cleanFields({ condition: 'good', quantity: 1, ...fields }),
    photo: picture?.photo || '',
    thumb: picture?.thumb || '',
    photoCut: Boolean(picture?.cut),
    loans: [],
    history: [],
    createdBy: uid,
    createdByName: name,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

/**
 * Saves what the form changed. A new picture replaces the old one, and the
 * old files are deleted from the store once the record points at the new ones
 * — never before, so a failed save leaves the item with a picture.
 */
export const updateItem = async (item, fields, picture) => {
  const updates = { ...cleanFields(fields), updatedAt: Timestamp.now() }
  if (picture !== undefined) {
    updates.photo = picture?.photo || ''
    updates.thumb = picture?.thumb || ''
    updates.photoCut = Boolean(picture?.cut)
  }
  await updateDoc(refFor(item), updates)
  if (picture !== undefined) {
    const old = [item.photo, item.thumb].filter((url) => url && url !== updates.photo && url !== updates.thumb)
    deleteImages(old).catch((error) => console.error('Could not delete the old item photo:', error))
  }
}

/**
 * Marks an item fixed or broken. When it starts needing repair the day is
 * kept, so the home can say how long it has been waiting.
 */
export const setCondition = async (item, condition, repairNote = '') => {
  const changingToRepair = condition === 'repair' && item.condition !== 'repair'
  await updateDoc(refFor(item), {
    condition: CONDITION_KEYS.includes(condition) ? condition : 'good',
    repairNote: condition === 'repair' ? String(repairNote || item.repairNote || '').trim() : '',
    conditionSince: changingToRepair ? todayKey() : condition === 'repair' ? item.conditionSince || todayKey() : '',
    updatedAt: Timestamp.now(),
  })
}

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * Lends some or all of an item. `to` is the borrower's name as it should be
 * shown (a member's full name, or whoever it is — a sister church, a family
 * for a wake), `memberId` their record when they have one.
 */
export const lendItem = async (item, { to, memberId = '', quantity = 1, due = '', note = '' }) => {
  const loan = {
    id: newId(),
    to: String(to || '').trim(),
    memberId: String(memberId || ''),
    quantity: Math.max(1, Math.trunc(Number(quantity) || 1)),
    since: todayKey(),
    due: String(due || ''),
    note: String(note || '').trim(),
  }
  await updateDoc(refFor(item), { loans: arrayUnion(loan), updatedAt: Timestamp.now() })
  return loan
}

/** Takes a loan back, and keeps it in the item's history with the day it came back. */
export const returnLoan = async (item, loan) => {
  const stored = loan.raw || loan
  const { raw, ...plain } = loan
  await updateDoc(refFor(item), {
    loans: arrayRemove(stored),
    history: arrayUnion({ ...plain, returned: todayKey() }),
    updatedAt: Timestamp.now(),
  })
}

/**
 * Moves a loan's due date. The old loan comes out and the changed one goes in
 * within one batch, so nobody ever sees the item with the loan missing or
 * twice, and an extension cannot half happen.
 */
export const extendLoan = async (item, loan, due) => {
  const stored = loan.raw || loan
  const { raw, ...plain } = loan
  const batch = writeBatch(db)
  batch.update(refFor(item), { loans: arrayRemove(stored) })
  batch.update(refFor(item), { loans: arrayUnion({ ...plain, due: String(due || '') }), updatedAt: Timestamp.now() })
  await batch.commit()
}

/** Deletes an item and its pictures. */
export const deleteItem = async (item) => {
  await deleteDoc(refFor(item))
  deleteImages([item.photo, item.thumb].filter(Boolean)).catch((error) =>
    console.error('Could not delete the item photo:', error)
  )
}

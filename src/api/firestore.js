// Firestore, as the rest of the app is allowed to use it: identical to
// 'firebase/firestore' except that nothing can be written without saying who
// wrote it.
//
// Every write the app makes — adding a person, ticking a task, calling off a
// Sunday — goes through one of five functions: addDoc, setDoc, updateDoc,
// deleteDoc and writeBatch. Each is replaced here by a version that commits the
// change and an entry in `auditLog` in the same batch. A batch lands whole or
// not at all, so there is no change without its entry and no entry for a change
// that never happened; a log written after the fact, on a second round trip,
// is a log with holes wherever a phone lost signal between the two.
//
// "Strictly" is why this is a module rather than a habit. vite.config.js
// refuses to build if any file other than this one imports 'firebase/firestore'
// directly, so a new service cannot quietly write around the log.
//
// What an entry holds: who (uid, name, email as the account has them), when
// (the server's clock, not the phone's), what (collection, document, the
// fields written, and a short preview of each value), and from which page.
// Not the value before — that would cost a read on every write, and the
// quota is small enough that the public page has gone blank over it before.
//
// It is also where one church's records are kept apart from another's. Every
// church lives under churches/{churchId}/, and `collection(db, 'members')` and
// `doc(db, 'events', id)` are rewritten here to point inside the church this
// page is serving (src/api/church.js). The services go on naming collections
// the way they always have; none of them can reach another church by
// forgetting a prefix, because none of them writes the prefix. Firestore's
// rules check membership of that church on every read and write regardless.

import {
  addDoc as fsAddDoc,
  collection as fsCollection,
  deleteDoc as fsDeleteDoc,
  doc as fsDoc,
  serverTimestamp,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  writeBatch as fsWriteBatch,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import {
  AUDIT_COLLECTION,
  MAX_FIELDS,
  churchOfPath,
  describeData,
  labelOf,
  pathInChurch,
  topCollection,
} from '../../lib/auditEntry.js'
import { CHURCHES_COLLECTION, GLOBAL_COLLECTIONS } from '../../lib/churchId.js'
import { getChurchId } from './church'

export * from 'firebase/firestore'
export { AUDIT_COLLECTION }

/* ---------------------------------------------------------------- scoping */

const isFirestoreInstance = (value) => value?.type === 'firestore'

/**
 * The path segments, moved inside the current church unless the collection is
 * one of the few that sit beside the churches. Fails closed: a church
 * collection asked for on a page serving no church throws, rather than
 * quietly reading a top-level collection that should not exist.
 */
const scopedSegments = (segments) => {
  const head = String(segments[0] ?? '').split('/')[0]
  if (GLOBAL_COLLECTIONS.has(head)) return segments
  const churchId = getChurchId()
  if (!churchId) {
    throw new Error(`"${head}" belongs to a church, and this page is not serving one.`)
  }
  return [CHURCHES_COLLECTION, churchId, ...segments]
}

/** collection(db, 'members') -> churches/{id}/members. Anything else passes through. */
export function collection(parent, ...segments) {
  return isFirestoreInstance(parent)
    ? fsCollection(parent, ...scopedSegments(segments))
    : fsCollection(parent, ...segments)
}

/** doc(db, 'events', id) -> churches/{id}/events/{id}. doc(collectionRef) passes through. */
export function doc(parent, ...segments) {
  return isFirestoreInstance(parent) && segments.length
    ? fsDoc(parent, ...scopedSegments(segments))
    : fsDoc(parent, ...segments)
}

/**
 * Bookkeeping the app does on its own, many times an hour, that no person
 * decided: the heartbeat that says who is online, the "last seen" stamp, a
 * phone's push token, and the per-account preferences like a remembered tab.
 * Logging these would bury every real change under thousands of entries and
 * double the writes the quota is already tight on. The log itself is here so
 * it does not log its own entries.
 */
//
// joinRequests is here for a different reason: it is written by somebody who
// is not yet in the church, and an audit entry is something only a member may
// write. The approval that follows is logged, through the access record it
// creates.
const NOT_AUDITED = new Set([
  AUDIT_COLLECTION,
  'presence',
  'userAccounts',
  'fcmTokens',
  'userPrefs',
  'joinRequests',
])

// Writes outside any church — a request for a new church — have no church log
// to go in.
const isAudited = (ref) =>
  Boolean(churchOfPath(ref?.path)) && !NOT_AUDITED.has(topCollection(ref?.path))

/** updateDoc's other signature: (ref, 'field', value, 'field', value, …). */
const pairsToObject = (args) => {
  const out = {}
  for (let i = 0; i + 1 < args.length; i += 2) {
    const key = typeof args[i] === 'string' ? args[i] : String(args[i]?._internalPath || args[i])
    out[key] = args[i + 1]
  }
  return out
}

/* --------------------------------------------------------------- entries */

const actor = () => {
  const user = getAuth().currentUser
  return {
    actorUid: user?.uid || '',
    actorName: user?.displayName || '',
    actorEmail: user?.email || '',
  }
}

const page = () => (typeof window !== 'undefined' ? window.location.pathname : '')

const entryFor = (action, ref, data) => ({
  at: serverTimestamp(),
  ...actor(),
  action,
  collection: topCollection(ref.path),
  path: pathInChurch(ref.path),
  docId: ref.id,
  label: labelOf(data),
  ...describeData(data),
  page: page(),
  source: 'app',
})

// The entry goes in the log of the church the change was made in, read off the
// changed document's own path rather than off the page.
const auditRef = (ref) =>
  fsDoc(fsCollection(ref.firestore, CHURCHES_COLLECTION, churchOfPath(ref.path), AUDIT_COLLECTION))

/* ---------------------------------------------------------------- writes */

export const addDoc = async (collectionRef, data) => {
  if (!isAudited(collectionRef)) return fsAddDoc(collectionRef, data)
  const ref = doc(collectionRef)
  const batch = fsWriteBatch(collectionRef.firestore)
  batch.set(ref, data)
  batch.set(auditRef(ref), entryFor('create', ref, data))
  await batch.commit()
  return ref
}

export const setDoc = async (ref, data, options) => {
  if (!isAudited(ref)) return options ? fsSetDoc(ref, data, options) : fsSetDoc(ref, data)
  const batch = fsWriteBatch(ref.firestore)
  if (options) batch.set(ref, data, options)
  else batch.set(ref, data)
  batch.set(auditRef(ref), entryFor(options?.merge ? 'update' : 'set', ref, data))
  await batch.commit()
}

export const updateDoc = async (ref, ...args) => {
  if (!isAudited(ref)) return fsUpdateDoc(ref, ...args)
  const data = args.length === 1 ? args[0] : pairsToObject(args)
  const batch = fsWriteBatch(ref.firestore)
  batch.update(ref, ...args)
  batch.set(auditRef(ref), entryFor('update', ref, data))
  await batch.commit()
}

export const deleteDoc = async (ref) => {
  if (!isAudited(ref)) return fsDeleteDoc(ref)
  const batch = fsWriteBatch(ref.firestore)
  batch.delete(ref)
  batch.set(auditRef(ref), entryFor('delete', ref, null))
  await batch.commit()
}

/**
 * A batch that writes one entry for everything in it, at commit.
 *
 * One entry rather than one per operation: tagging a hundred people is one
 * thing somebody did, and Firestore's 500-write ceiling per batch leaves room
 * for exactly one more — which is why batchWrite.js chunks at 499.
 */
export const writeBatch = (db) => {
  const batch = fsWriteBatch(db)
  const ops = []

  const note = (action, ref, data) => {
    if (isAudited(ref)) ops.push({ action, ref, data })
  }

  return {
    set(ref, data, options) {
      note(options?.merge ? 'update' : 'set', ref, data)
      if (options) batch.set(ref, data, options)
      else batch.set(ref, data)
      return this
    },
    update(ref, ...args) {
      note('update', ref, args.length === 1 ? args[0] : pairsToObject(args))
      batch.update(ref, ...args)
      return this
    },
    delete(ref) {
      note('delete', ref, null)
      batch.delete(ref)
      return this
    },
    async commit() {
      if (ops.length === 1) {
        const [{ action, ref, data }] = ops
        batch.set(auditRef(ref), entryFor(action, ref, data))
      } else if (ops.length > 1) {
        const fields = [...new Set(ops.flatMap((op) => (op.data ? Object.keys(op.data) : [])))]
        const first = ops[0]
        batch.set(auditRef(first.ref), {
          ...entryFor(first.action, first.ref, first.data),
          action: [...new Set(ops.map((op) => op.action))].length === 1 ? first.action : 'batch',
          collection: [...new Set(ops.map((op) => topCollection(op.ref.path)))].join(', '),
          path: '',
          docId: '',
          label: `${ops.length} records`,
          docIds: ops.map((op) => op.ref.id).slice(0, 500),
          fields: fields.slice(0, MAX_FIELDS),
          changes: describeData(first.data).changes,
          count: ops.length,
        })
      }
      return batch.commit()
    },
  }
}

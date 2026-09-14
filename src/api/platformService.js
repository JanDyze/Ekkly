import { auth, db } from './firebase'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from './firestore'

// The platform's side of things: a congregation asking for a church of its own,
// and the people who run the platform saying yes.
//
// A request is written by whoever is asking and read back by them. Approving
// one is not done here — it creates a church, makes the requester its first
// administrator and authorises the church's address for Google sign-in, all of
// which needs the Admin SDK, so it goes through /api/platform.

const REQUESTS_COLLECTION = 'churchRequests'

export const isPlatformAdmin = async (uid) => {
  if (!uid) return false
  try {
    const snapshot = await getDoc(doc(db, 'platformAdmins', uid))
    return snapshot.exists()
  } catch {
    return false
  }
}

const normalizeRequest = (snapshot) => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    uid: data.uid || '',
    email: data.email || '',
    displayName: data.displayName || '',
    churchName: data.churchName || '',
    churchId: data.churchId || '',
    location: data.location || '',
    size: data.size || '',
    contactNumber: data.contactNumber || '',
    message: data.message || '',
    status: data.status || 'pending', // pending | approved | declined
    note: data.note || '',
    createdAt: data.createdAt?.toDate?.() || null,
    reviewedAt: data.reviewedAt?.toDate?.() || null,
  }
}

const clip = (value, max) => String(value || '').trim().slice(0, max)

export const submitChurchRequest = async (user, form) => {
  if (!user?.uid) throw new Error('Sign in first')
  const churchName = clip(form.churchName, 120)
  if (!churchName) throw new Error('Give the church a name')

  const ref = await addDoc(collection(db, REQUESTS_COLLECTION), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    churchName,
    churchId: clip(form.churchId, 40).toLowerCase(),
    location: clip(form.location, 160),
    size: clip(form.size, 40),
    contactNumber: clip(form.contactNumber, 40),
    message: clip(form.message, 1000),
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/** The signed-in account's own requests, newest first. */
export const subscribeToMyChurchRequests = (uid, callback) =>
  onSnapshot(
    query(collection(db, REQUESTS_COLLECTION), where('uid', '==', uid)),
    (snapshot) => {
      const requests = snapshot.docs.map(normalizeRequest)
      requests.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      callback(requests)
    },
    (error) => {
      console.error('Error loading your church requests:', error)
      callback([])
    }
  )

/** Every request, for platform administrators. */
export const subscribeToChurchRequests = (callback) =>
  onSnapshot(
    query(collection(db, REQUESTS_COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => callback(snapshot.docs.map(normalizeRequest)),
    (error) => {
      console.error('Error loading church requests:', error)
      callback([])
    }
  )

/**
 * approve: { requestId, churchId, churchName? } -> { churchId, address, authorizedDomain }
 * decline: { requestId, note? }
 */
export const reviewChurchRequest = async (action, body) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in required')

  const response = await fetch('/api/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (HTTP ${response.status})`)
  return payload
}

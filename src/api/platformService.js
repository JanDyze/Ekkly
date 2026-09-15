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
import { churchHeaders } from './church'

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
 * Anything the console does, and the few things a church's administrators ask
 * of the platform (their plan, their apps, a support request). The server
 * decides who may run which action; see api/platform.js. On a church's own
 * pages the church header rides along, so the server knows whose plan is meant.
 */
export const callPlatform = async (action, body = {}) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in required')

  const response = await fetch('/api/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...churchHeaders() },
    body: JSON.stringify({ action, ...body }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (HTTP ${response.status})`)
  return payload
}

/**
 * approve: { requestId, churchId, churchName? } -> { churchId, address, authorizedDomain }
 * decline: { requestId, note? }
 */
export const reviewChurchRequest = (action, body) => callPlatform(action, body)

/**
 * One signal from the front door: a visit, a church name someone tried, or a
 * call to action pressed. Sent only when the visitor has allowed it (see
 * useFrontDoorConsent), and never awaited by anything the page draws — if it
 * fails, the page carries on and nobody hears about it.
 */
export const sendFrontDoorSignal = (kind, fields = {}) =>
  fetch('/api/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'frontDoorSignal', kind, ...fields }),
    keepalive: true,
  }).catch(() => {})

/* ------------------------------------------------------ front door chat */

// The chat bubble's calls. None needs a sign-in: a visitor's
// conversation answers to the secret it was handed when it began, which the
// bubble keeps in the visitor's own browser (see useFrontDoorChat).
const callPublic = async (action, body = {}) => {
  const response = await fetch('/api/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (HTTP ${response.status})`)
  return payload
}

/** { threadId?, secret? } -> { enabled, online, messages?, seen?, name?, email?, ended? } */
export const pollFrontDoorChat = (thread) => callPublic('chatPoll', thread || {})

/** { threadId?, secret?, name?, email?, text, page?, website? } -> { threadId, secret?, messages } */
export const sendFrontDoorChat = (fields) => callPublic('chatSend', fields)

/** { threadId, secret, name?, email? } -> { name, email } */
export const identifyFrontDoorChat = (fields) => callPublic('chatIdentify', fields)

/**
 * The front door's welcome: a church's name, and how to reach whoever typed it.
 * { id, churchName, name?, contact?, page?, website? } -> { ok }
 * The same id again updates the same entry, so the name and the contact can
 * arrive one step apart.
 */
export const sendFrontDoorLead = (fields) => callPublic('frontDoorLead', fields)

/**
 * A beat from a signed-in tab, so the front door can say the host is online.
 * The server ignores anyone who is not the host. Never awaited by the page.
 */
export const sendPresenceBeat = () => callPlatform('presenceBeat').catch(() => {})

/* ------------------------------------------------- platform/public */

/**
 * The platform's name, colours and app prices — readable by anyone, and read
 * on every page, the front door and each church alike. Null until it exists.
 */
export const subscribeToPlatformPublic = (callback) =>
  onSnapshot(
    doc(db, 'platform', 'public'),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    (error) => {
      // Before the rules that open it are deployed, this is refused. The page
      // carries on with the built-in look rather than failing, but says why:
      // silently, a colour saved in the console just never shows up anywhere.
      if (error?.code === 'permission-denied') {
        console.warn('Platform settings were refused, so the built-in name and colours are showing. Deploy firestore.rules.')
      } else {
        console.error('Error loading platform settings:', error)
      }
      callback(null)
    }
  )

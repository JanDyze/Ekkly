import { db } from './firebase'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from './firestore'
import { isDevelopmentHost, readHost } from '../../lib/churchId.js'
import { getChurchId, setChurchId } from './church'

// Who belongs to a church, and how somebody comes to.
//
// Belonging is one document: churches/{churchId}/access/{uid}. Firestore's
// rules check for it on every read and write under the church, so this is the
// line between a congregation's records and everybody else with a Google
// account. Signing in no longer lets anyone in by itself.
//
// Somebody who is not in yet asks, with a document of their own at
// joinRequests/{uid}, and an administrator of that church says yes or no.
// Saying yes is what writes the access document.

const ACCESS_COLLECTION = 'access'
const JOIN_REQUESTS_COLLECTION = 'joinRequests'
const ADMINS_COLLECTION = 'appAdmins'

/* ------------------------------------------------------------ resolution */

const DEV_CHURCH_KEY = 'dev.church'

/**
 * Whether this address can switch churches with `?church=`: localhost, a LAN
 * IP, a *.vercel.app deployment, a tunnel. None of those can carry a church in
 * the address itself — Vercel will not hand out uec.<project>.vercel.app — so
 * without this a test deployment could only ever show one church.
 *
 * A real address never qualifies: uec.church.app and a church's own domain are
 * decided by the address before this is consulted, so on those `?church=` does
 * nothing. Nor does it open anything: which church a page shows is not who may
 * read it, and the rules still ask every account for its access to that church.
 */
export const canSwitchChurchHere = () =>
  typeof window !== 'undefined' && isDevelopmentHost(window.location.hostname)

/**
 * On a test address (above): `?church=<id>` opens that church, and `?church=`
 * with nothing after it opens the platform's front door. Remembered for the
 * tab, so a reload or a link inside the app stays where it was, and the front
 * door in one tab and a church in another do not trade places on refresh.
 *
 * Returns the id ('' for the front door), or undefined when nothing was chosen.
 */
const devChurchOverride = () => {
  if (!canSwitchChurchHere()) return undefined

  const params = new URLSearchParams(window.location.search)
  if (params.has('church')) {
    const chosen = (params.get('church') || '').trim().toLowerCase()
    try {
      sessionStorage.setItem(DEV_CHURCH_KEY, chosen)
    } catch {
      // Private window: it still applies to this load.
    }
    // Take it back out of the address so it is not carried into every link.
    params.delete('church')
    const query = params.toString()
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
    return chosen
  }

  try {
    const saved = sessionStorage.getItem(DEV_CHURCH_KEY)
    return saved === null ? undefined : saved
  } catch {
    return undefined
  }
}

/** Where to go to open a church, or the front door, from the page you are on. */
export const devChurchLink = (churchId = '') => `/?church=${encodeURIComponent(churchId)}`

/**
 * Settles which church this page is for, before the app mounts.
 *
 * The address decides: uec.church.app is uec. A church on its own domain is
 * looked up in `domains`. Anything still undecided — localhost, a Vercel
 * preview — uses `?church=` in development (above), then VITE_DEFAULT_CHURCH,
 * and with neither the page is the platform's front door rather than a church.
 */
export const resolveChurch = async () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const found = readHost(host, { rootDomain: import.meta.env.VITE_ROOT_DOMAIN })

  if (found.kind === 'church') return setChurchId(found.churchId)
  if (found.kind === 'platform') return setChurchId(null)

  if (!isDevelopmentHost(found.hostname)) {
    try {
      const snapshot = await getDoc(doc(db, 'domains', found.hostname))
      if (snapshot.exists()) return setChurchId(snapshot.data().churchId)
    } catch (error) {
      console.error('Error looking up this domain:', error)
    }
  }

  const override = devChurchOverride()
  if (override !== undefined) return setChurchId(override || null)

  return setChurchId(import.meta.env.VITE_DEFAULT_CHURCH || null)
}

/**
 * The little about a church that anyone may read: whether it exists, what it
 * is called, and whether it is open. Everything else needs access.
 */
export const getChurchProfile = async (churchId = getChurchId()) => {
  if (!churchId) return null
  try {
    const snapshot = await getDoc(doc(db, 'churches', churchId))
    if (!snapshot.exists()) return { id: churchId, exists: false }
    const data = snapshot.data()
    return {
      id: churchId,
      exists: true,
      name: data.name || '',
      status: data.status || 'active',
      primaryDomain: data.primaryDomain || '',
    }
  } catch (error) {
    // Offline on a cold start, most likely. Assume it exists and let the rules
    // decide, rather than telling a member their church has gone.
    console.error('Error loading the church profile:', error)
    return { id: churchId, exists: true, name: '', status: 'active', offline: true }
  }
}

/* ---------------------------------------------------------------- access */

/** Calls back with true or false as the signed-in account's access comes and goes. */
export const subscribeToMyAccess = (uid, callback) =>
  onSnapshot(
    doc(db, ACCESS_COLLECTION, uid),
    (snapshot) => callback(snapshot.exists()),
    (error) => {
      console.error('Error checking access:', error)
      callback(false)
    }
  )

const normalizeRequest = (snapshot) => {
  const data = snapshot.data()
  return {
    uid: snapshot.id,
    email: data.email || '',
    displayName: data.displayName || '',
    photoURL: data.photoURL || '',
    message: data.message || '',
    status: data.status || 'pending', // pending | approved | declined
    note: data.note || '',
    requestedAt: data.requestedAt?.toDate?.() || null,
    reviewedAt: data.reviewedAt?.toDate?.() || null,
    reviewedByEmail: data.reviewedByEmail || '',
  }
}

export const subscribeToMyJoinRequest = (uid, callback) =>
  onSnapshot(
    doc(db, JOIN_REQUESTS_COLLECTION, uid),
    (snapshot) => callback(snapshot.exists() ? normalizeRequest(snapshot) : null),
    (error) => {
      console.error('Error loading your join request:', error)
      callback(null)
    }
  )

/**
 * Asks to be let in. Keyed by uid, so asking twice is the same request, and a
 * declined request asked again goes back to pending.
 */
export const requestToJoin = async (user, message = '') => {
  if (!user?.uid) throw new Error('Sign in first')
  await setDoc(doc(db, JOIN_REQUESTS_COLLECTION, user.uid), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    message: String(message || '').trim().slice(0, 500),
    status: 'pending',
    requestedAt: serverTimestamp(),
  })
}

/** Pending requests, for the church's administrators. Oldest first: they have waited longest. */
export const subscribeToJoinRequests = (callback) =>
  onSnapshot(
    query(collection(db, JOIN_REQUESTS_COLLECTION), where('status', '==', 'pending')),
    (snapshot) => {
      const requests = snapshot.docs.map(normalizeRequest)
      requests.sort((a, b) => (a.requestedAt?.getTime() || 0) - (b.requestedAt?.getTime() || 0))
      callback(requests)
    },
    (error) => {
      // Non-administrators are refused by the rules, which is expected.
      if (error?.code !== 'permission-denied') console.error('Error loading join requests:', error)
      callback([])
    }
  )

/** Lets somebody in: the access document, and the request marked as answered. */
export const approveJoinRequest = async (request, reviewer) => {
  const batch = writeBatch(db)
  batch.set(doc(db, ACCESS_COLLECTION, request.uid), {
    uid: request.uid,
    name: request.displayName || request.email || '',
    email: request.email || '',
    grantedBy: reviewer?.uid || '',
    grantedByEmail: reviewer?.email || '',
    grantedAt: serverTimestamp(),
  })
  batch.update(doc(db, JOIN_REQUESTS_COLLECTION, request.uid), {
    status: 'approved',
    reviewedBy: reviewer?.uid || '',
    reviewedByEmail: reviewer?.email || '',
    reviewedAt: serverTimestamp(),
  })
  await batch.commit()
}

export const declineJoinRequest = async (request, reviewer, note = '') => {
  const batch = writeBatch(db)
  batch.update(doc(db, JOIN_REQUESTS_COLLECTION, request.uid), {
    status: 'declined',
    note: String(note || '').trim().slice(0, 500),
    reviewedBy: reviewer?.uid || '',
    reviewedByEmail: reviewer?.email || '',
    reviewedAt: serverTimestamp(),
  })
  await batch.commit()
}

/**
 * Takes somebody's access away, and their administrator role with it: a
 * role in a church you cannot open would only be a way back in.
 */
export const revokeAccess = async (uid) => {
  const batch = writeBatch(db)
  batch.delete(doc(db, ACCESS_COLLECTION, uid))
  const admin = await getDoc(doc(db, ADMINS_COLLECTION, uid)).catch(() => null)
  if (admin?.exists()) batch.delete(doc(db, ADMINS_COLLECTION, uid))
  await batch.commit()
}

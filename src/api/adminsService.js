import { db } from './firebase'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  Timestamp,
} from './firestore'

// One document per administrator, keyed by Firebase auth uid so membership is
// a direct document lookup rather than a query.
const ADMINS_COLLECTION = 'appAdmins'

const normalizeAdmin = (docSnap) => {
  const data = docSnap.data()
  return {
    uid: docSnap.id,
    email: data.email || '',
    displayName: data.displayName || '',
    addedBy: data.addedBy || '',
    addedByEmail: data.addedByEmail || '',
    addedAt: data.addedAt?.toDate?.() || new Date(),
  }
}

export const subscribeToAdmins = (callback) => {
  return onSnapshot(
    collection(db, ADMINS_COLLECTION),
    (snapshot) => {
      const admins = snapshot.docs.map(normalizeAdmin)
      admins.sort((a, b) => a.addedAt - b.addedAt)
      callback(admins)
    },
    (error) => {
      console.error('Error subscribing to admins:', error)
      callback([])
    }
  )
}

/**
 * Whether one account administers this church, as a single document read.
 *
 * subscribeToAdmins hands back the whole list, and usePermissions subscribes
 * to the roll beside it — the right shape for the app, and far more than the
 * public page should pay. That page asks only one question, of one account:
 * are you the administrator who still has to set this church up?
 */
export const isAdminUid = async (uid) => {
  if (!uid) return false
  try {
    const snapshot = await getDoc(doc(db, ADMINS_COLLECTION, uid))
    return snapshot.exists()
  } catch (error) {
    // Not in the church, most likely, and the rules said so. Not an
    // administrator is the right answer either way.
    console.error('Error checking administrator status:', error)
    return false
  }
}

export const addAdmin = async (user, addedBy) => {
  await setDoc(doc(db, ADMINS_COLLECTION, user.uid), {
    email: user.email || '',
    displayName: user.displayName || '',
    addedBy: addedBy?.uid || '',
    addedByEmail: addedBy?.email || '',
    addedAt: Timestamp.now(),
  })
}

export const removeAdmin = async (uid) => {
  await deleteDoc(doc(db, ADMINS_COLLECTION, uid))
}

/**
 * Bootstrap: claims the first admin slot, but only while there are none.
 * Re-reads the collection at call time so two people tapping the button at
 * once cannot both come through — the second sees an existing admin and is
 * turned away.
 */
export const claimFirstAdmin = async (user) => {
  const snapshot = await getDocs(collection(db, ADMINS_COLLECTION))
  if (!snapshot.empty) {
    throw new Error('An administrator already exists.')
  }
  await addAdmin(user, user)
}

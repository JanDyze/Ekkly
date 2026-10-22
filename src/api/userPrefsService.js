import { db } from './firebase'
import { deleteField, doc, onSnapshot, setDoc } from './firestore'

// One document per account for the choices that belong to a person rather than
// to the church: the order they dragged their apps into, and whatever else
// follows it.
//
// Separate from `userAccounts` on purpose, even though both are keyed by uid.
// The Accounts page streams every account document to any administrator
// looking at it; one person's arrangement of their home screen has no business
// travelling with that.
const PREFS_COLLECTION = 'userPrefs'

const prefsDoc = (uid) => doc(db, PREFS_COLLECTION, uid)

/**
 * Streams one account's preferences. Calls back with the document's fields, an
 * empty object when the account has never saved anything, or `null` when the
 * read failed — a caller that is deciding whether to migrate a local value up
 * has to be able to tell "nothing saved" from "could not look".
 */
export const subscribeToUserPrefs = (uid, callback) => {
  if (!uid) return () => {}
  return onSnapshot(
    prefsDoc(uid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : {}),
    (error) => {
      console.error('Error subscribing to user preferences:', error)
      callback(null)
    }
  )
}

/** Saves some preferences without touching the others. */
// Each preference given replaces what was stored for it, whole; the rest
// stay as they are. A plain merge went into a preference that is a set of
// choices and could never take one out: turning a panel back on left its
// old "off" stored under the new choices, and the next save of anything read
// it back and took the panel off the home again (useHomeLayout).
export const saveUserPrefs = (uid, partial) => {
  if (!uid) return Promise.resolve()
  return setDoc(prefsDoc(uid), partial, { mergeFields: Object.keys(partial) })
}

/**
 * Removes one preference rather than storing an empty value for it, so "back
 * to the default" and "deliberately set to nothing" stay different states.
 */
export const clearUserPref = (uid, key) => {
  if (!uid) return Promise.resolve()
  return setDoc(prefsDoc(uid), { [key]: deleteField() }, { merge: true })
}

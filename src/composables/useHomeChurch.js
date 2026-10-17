import { ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'

/**
 * Whether this person has the church on its hill on their home (the land of
 * HomeScene, under the apps on a phone and at the foot of a column on a
 * desktop). It is a picture and nothing more, so anyone who would rather
 * have the room can turn it off in Preferences ("Church picture").
 *
 * On unless turned off, and stored only when off, so a later change to the
 * home reaches everyone who never chose. Kept against the account like the
 * other choices about the home (useHomeCards, useHomeLayout), with the device
 * holding a head start so the church does not appear and then go.
 */
const PREF_KEY = 'homeChurch'
const cacheKey = (uid) => `ekkly:homeChurch:${uid}`

const readCache = (uid) => {
  try {
    return localStorage.getItem(cacheKey(uid)) !== 'off'
  } catch {
    return true
  }
}

const writeCache = (uid, on) => {
  try {
    if (on) localStorage.removeItem(cacheKey(uid))
    else localStorage.setItem(cacheKey(uid), 'off')
  } catch {
    // Firestore still has it; only the head start is lost.
  }
}

const on = ref(true)
const uid = ref(null)
let started = false
let unsubscribe = null

// Starts following the signed-in account's choice, once per session, the
// first time anything asks for it.
const start = () => {
  if (started) return
  started = true
  const { user } = useAuth()
  watch(
    () => user.value?.uid || null,
    (now) => {
      unsubscribe?.()
      unsubscribe = null
      uid.value = now
      if (!now) {
        on.value = true
        return
      }
      on.value = readCache(now)
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        // A failed read keeps what is on screen.
        if (!prefs) return
        on.value = prefs[PREF_KEY] !== false
        writeCache(now, on.value)
      })
    },
    { immediate: true }
  )
}

export function useHomeChurch() {
  start()

  /** Shows or hides the church for this person, everywhere they sign in. */
  const setHomeChurch = async (value) => {
    on.value = Boolean(value)
    if (!uid.value) return
    writeCache(uid.value, on.value)
    if (on.value) await clearUserPref(uid.value, PREF_KEY)
    else await saveUserPrefs(uid.value, { [PREF_KEY]: false })
  }

  return { homeChurch: on, setHomeChurch }
}

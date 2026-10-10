import { ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'

/**
 * Whether this person wants the bottom bar (components/BottomBar.vue): a row
 * of their first apps along the foot of every screen on a phone, for going
 * between apps without passing through the home.
 *
 * Off unless they turn it on in Preferences. The home of all apps is the way
 * between apps for everyone; the bar is for whoever moves between the same
 * few all day and would rather not go back to the home each time.
 *
 * Kept against the account, like the order of the apps it shows (useAppOrder)
 * and the style of the home's cards (useHomeCards), with the device holding a
 * head start so the bar does not appear a moment after everything else.
 */
const PREF_KEY = 'bottomBar'
const cacheKey = (uid) => `ekkly:bottomBar:${uid}`

const readCache = (uid) => {
  try {
    return localStorage.getItem(cacheKey(uid)) === '1'
  } catch {
    return false
  }
}

const writeCache = (uid, on) => {
  try {
    if (on) localStorage.setItem(cacheKey(uid), '1')
    else localStorage.removeItem(cacheKey(uid))
  } catch {
    // Firestore still has it; only the head start is lost.
  }
}

const on = ref(false)
const uid = ref(null)
let started = false
let unsubscribe = null

/** Starts following the signed-in account's choice, once per session. */
export const initBottomBar = () => {
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
        on.value = false
        return
      }
      on.value = readCache(now)
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        // A failed read keeps what is on screen.
        if (!prefs) return
        on.value = prefs[PREF_KEY] === true
        writeCache(now, on.value)
      })
    },
    { immediate: true }
  )
}

export function useBottomBar() {
  /** Turns the bar on or off for this person, everywhere they sign in. */
  const setBottomBar = async (value) => {
    on.value = Boolean(value)
    if (!uid.value) return
    writeCache(uid.value, on.value)
    if (on.value) await saveUserPrefs(uid.value, { [PREF_KEY]: true })
    else await clearUserPref(uid.value, PREF_KEY)
  }

  return { bottomBar: on, setBottomBar }
}

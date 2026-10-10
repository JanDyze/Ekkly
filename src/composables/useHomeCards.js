import { computed, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { DEFAULT_HOME_CARDS, homeCardStyle } from '../data/homeCards'
import { useAppSettings } from './useAppSettings'
import { useAuth } from './useAuth'

/**
 * How the home of all apps draws its apps (src/data/homeCards.js).
 *
 * Two layers. The church sets the style everyone sees, in Settings > Home.
 * Anyone can choose their own in Preferences, and theirs wins for them; going
 * back to "Church's choice" removes it, so they follow the church again if it
 * changes its mind later.
 *
 * The personal choice is kept against the account, like the order of the
 * apps (useAppOrder), so it follows the person to another device. The device
 * only remembers it as a head start, so the home does not redraw itself once
 * the first snapshot lands.
 */
const PREF_KEY = 'homeCards'
const cacheKey = (uid) => `ekkly:homeCards:${uid}`

const readCache = (uid) => {
  try {
    return localStorage.getItem(cacheKey(uid)) || null
  } catch {
    return null
  }
}

const writeCache = (uid, value) => {
  try {
    if (value) localStorage.setItem(cacheKey(uid), value)
    else localStorage.removeItem(cacheKey(uid))
  } catch {
    // Firestore still has it; only the head start is lost.
  }
}

const mine = ref(null)
const uid = ref(null)
let started = false
let unsubscribe = null

/** Starts following the signed-in account's choice, once per session. */
export const initHomeCards = () => {
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
        mine.value = null
        return
      }
      mine.value = readCache(now)
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        // A failed read keeps what is on screen.
        if (!prefs) return
        const saved = typeof prefs[PREF_KEY] === 'string' ? prefs[PREF_KEY] : null
        mine.value = saved
        writeCache(now, saved)
      })
    },
    { immediate: true }
  )
}

export function useHomeCards() {
  const { homeCards: churchChoice } = useAppSettings()

  /** The church's style, or the default when it has not chosen one. */
  const churchStyle = computed(() => homeCardStyle(churchChoice.value || DEFAULT_HOME_CARDS))

  /** This person's own choice, or null when they follow the church. */
  const myChoice = computed(() => (mine.value ? homeCardStyle(mine.value) : null))

  /** What the home draws for this person. */
  const style = computed(() => myChoice.value || churchStyle.value)

  /** Their own style, or null to follow the church's again. */
  const setMine = async (key) => {
    const value = key ? homeCardStyle(key) : null
    mine.value = value
    if (uid.value) writeCache(uid.value, value)
    if (!uid.value) return
    if (value) await saveUserPrefs(uid.value, { [PREF_KEY]: value })
    else await clearUserPref(uid.value, PREF_KEY)
  }

  return { style, churchStyle, myChoice, setMine }
}

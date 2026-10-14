import { computed, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { DEFAULT_QUICK_ACTIONS, MAX_QUICK_ACTIONS, QUICK_ACTIONS } from '../data/quickActions'
import { useAuth } from './useAuth'
import { usePermissions } from './usePermissions'

/**
 * The desktop home's quick actions (src/data/quickActions.js): everyone starts
 * with the same few, and anyone can choose their own from the menu itself.
 *
 * Kept against the account like the home's card style (useHomeCards), so the
 * choice follows the person to another device, with the device remembering it
 * only as a head start. Going back to the defaults removes the choice rather
 * than saving the default list, so a later change to the defaults reaches
 * them too.
 *
 * What shows is the choice, in the catalogue's order, less anything this
 * person may not do (or whose app the church has switched off), so a choice
 * made under one role never offers a dead button under another.
 */
const PREF_KEY = 'quickActions'
const cacheKey = (uid) => `ekkly:quickActions:${uid}`
const KNOWN = new Set(QUICK_ACTIONS.map((action) => action.key))

const clean = (value) => (Array.isArray(value) ? value.filter((key) => KNOWN.has(key)).slice(0, MAX_QUICK_ACTIONS) : null)

const readCache = (uid) => {
  try {
    return clean(JSON.parse(localStorage.getItem(cacheKey(uid)) || 'null'))
  } catch {
    return null
  }
}

const writeCache = (uid, value) => {
  try {
    if (value) localStorage.setItem(cacheKey(uid), JSON.stringify(value))
    else localStorage.removeItem(cacheKey(uid))
  } catch {
    // Firestore still has it; only the head start is lost.
  }
}

const mine = ref(null)
const uid = ref(null)
let started = false
let unsubscribe = null

// Starts following the signed-in account's choice, once per session, the
// first time the home asks for it.
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
        mine.value = null
        return
      }
      mine.value = readCache(now)
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        // A failed read keeps what is on screen.
        if (!prefs) return
        const saved = clean(prefs[PREF_KEY])
        mine.value = saved
        writeCache(now, saved)
      })
    },
    { immediate: true }
  )
}

export function useQuickActions() {
  start()
  const { canManage } = usePermissions()

  /** Every action this person may do, whether chosen or not. */
  const available = computed(() => QUICK_ACTIONS.filter((action) => canManage(action.area)))

  /** The keys chosen: their own, or the defaults. */
  const chosen = computed(() => mine.value || DEFAULT_QUICK_ACTIONS)

  /** Whether they are on the defaults rather than a choice of their own. */
  const isDefault = computed(() => !mine.value)

  /** What the menu shows. */
  const actions = computed(() => available.value.filter((action) => chosen.value.includes(action.key)))

  /** Their own list of keys, or null to go back to the defaults. */
  const setMine = async (keys) => {
    const value = keys ? clean(keys) : null
    mine.value = value
    if (!uid.value) return
    writeCache(uid.value, value)
    if (value) await saveUserPrefs(uid.value, { [PREF_KEY]: value })
    else await clearUserPref(uid.value, PREF_KEY)
  }

  /** Adds or takes away one, up to the most the menu holds. */
  const toggle = (key) => {
    const now = chosen.value
    if (now.includes(key)) return setMine(now.filter((k) => k !== key))
    if (now.length >= MAX_QUICK_ACTIONS) return Promise.resolve()
    return setMine([...now, key])
  }

  return { actions, available, chosen, isDefault, setMine, toggle, max: MAX_QUICK_ACTIONS }
}

import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'
import { motionLevel } from './useMotion'

/**
 * Simple view, for whoever finds Ekkly's screens busy: the same records with
 * the pictures, the character and the arranging taken away, larger and fewer
 * things on each screen. Turned on in Preferences ("Simple view").
 *
 * The home reads it first (HomeSimple). The apps follow, each reading this
 * same switch, so it is turned on once and means the same everywhere.
 *
 * Off unless turned on, and stored only when on, so a later change to the
 * full screens reaches everyone who never chose. Kept against the account
 * like the other choices about the home (useHomeChurch), with the device
 * holding a head start so the full home does not flash up first.
 */
const PREF_KEY = 'simpleView'
const cacheKey = (uid) => `ekkly:simpleView:${uid}`

const readCache = (uid) => {
  try {
    return localStorage.getItem(cacheKey(uid)) === 'on'
  } catch {
    return false
  }
}

const writeCache = (uid, on) => {
  try {
    if (on) localStorage.setItem(cacheKey(uid), 'on')
    else localStorage.removeItem(cacheKey(uid))
  } catch {
    // Firestore still has it; only the head start is lost.
  }
}

const on = ref(false)
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

/* ------------------------------------------------------------ the window */

// Switching on the home closes it like a church window and opens it onto the
// other (HomeModeShutter, drawn by Apps.vue): the panes shut, the home is
// changed behind them, and they open. The change is made while they are
// shut, so neither home is ever caught half laid out.
//
// Only while the home is on screen (Apps.vue says so through homeShowing);
// switched from anywhere else, it just changes. Not for anyone who has asked
// for less motion, in Preferences or on their device.
const shutter = ref(null)

// Simple view's sidebar on a phone, open or shut (SimpleSidebar), opened by
// the top bar's menu button.
export const simpleNavOpen = ref(false)
const homeShowing = ref(false)

const CLOSE_MS = 400
const HOLD_MS = 120
const OPEN_MS = 480

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const wantsMotion = () =>
  homeShowing.value &&
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  motionLevel() !== 'off'

/** Changes the home; false when a switch already moving left this one unmade. */
const show = async (value) => {
  if (on.value === value) return true
  if (!wantsMotion()) {
    on.value = value
    return true
  }
  // A second press while the window is already moving is let go.
  if (shutter.value) return false
  shutter.value = 'closing'
  try {
    await wait(CLOSE_MS)
    on.value = value
    await nextTick()
    await wait(HOLD_MS)
  } catch (error) {
    // Whatever went wrong changing the home, the window still opens: a
    // window left shut is a screen nobody can use.
    console.error('Error changing the home behind the window:', error)
  }
  shutter.value = 'opening'
  await wait(OPEN_MS)
  shutter.value = null
  return true
}

export function useSimpleView() {
  start()

  /**
   * Turns simple view on or off for this person, everywhere they sign in.
   * Saved as the value asked for, not read back from the setting, which a
   * reply from the account could have changed in between.
   */
  const setSimpleView = async (value) => {
    const next = Boolean(value)
    if (!(await show(next)) || !uid.value) return
    writeCache(uid.value, next)
    if (next) await saveUserPrefs(uid.value, { [PREF_KEY]: true })
    else await clearUserPref(uid.value, PREF_KEY)
  }

  return { simpleView: on, setSimpleView, shutter, homeShowing }
}

/**
 * Whether the screen on show is in simple view: the switch is on and this
 * screen's app has a simple layout (meta.simple on its routes). An app
 * without one keeps its full screens until it has, rather than having its
 * desktop tables squeezed into a phone's column.
 */
export function useSimpleHere() {
  const route = useRoute()
  const { simpleView } = useSimpleView()
  return computed(() => simpleView.value && route.matched.some((record) => record.meta?.simple))
}

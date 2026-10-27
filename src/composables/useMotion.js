import { computed, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'

/**
 * How much moves on screen, for this person:
 *
 *   full — the few motions that show where something went: People's faces
 *          finding their places when the roll is sorted again, and the
 *          home closing like a window as simple view is switched;
 *   off  — nothing moves.
 *
 * Pages never animate into each other; the last motion between them, a card
 * turning over into the page it opened, was taken out too. There is no
 * `simple` any more: whoever chose it asked for less motion, and now has none
 * (readLevel).
 *
 * Full unless they choose otherwise in Preferences; some people find motion
 * tiring, and it is theirs to turn down. A device asking for less motion gets
 * none whatever is chosen here.
 *
 * Kept against the account like their other preferences (userPrefs), with the
 * device holding a head start, and module-level so the router can read it
 * outside any component.
 */
export const MOTION_LEVELS = [
  { key: 'full', label: 'On' },
  { key: 'off', label: 'Off' },
]

const PREF_KEY = 'motion'
const cacheKey = (uid) => `ekkly:motion:${uid}`
const known = (value) => MOTION_LEVELS.some((level) => level.key === value)
// A stored level as it stands now: the old `simple` is `off`, and anything
// unknown is the default.
const readLevel = (value) => (value === 'simple' ? 'off' : known(value) ? value : 'full')

const level = ref('full')
const uid = ref(null)
let started = false
let unsubscribe = null

/** What the router asks before animating a change of page. */
export const motionLevel = () => level.value

/** Starts following the signed-in account's choice, once per session. */
export const initMotion = () => {
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
        level.value = 'full'
        return
      }
      try {
        const kept = localStorage.getItem(cacheKey(now))
        level.value = readLevel(kept)
      } catch {
        level.value = 'full'
      }
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        if (!prefs) return
        level.value = readLevel(prefs[PREF_KEY])
        try {
          localStorage.setItem(cacheKey(now), level.value)
        } catch {
          // Only the head start is lost.
        }
      })
    },
    { immediate: true }
  )
}

export function useMotion() {
  const label = computed(() => MOTION_LEVELS.find((l) => l.key === level.value)?.label || 'On')

  /** Sets it for this person, everywhere they sign in. Full is the default, so it is stored only when it is not. */
  const setMotion = async (value) => {
    level.value = known(value) ? value : 'full'
    if (!uid.value) return
    try {
      localStorage.setItem(cacheKey(uid.value), level.value)
    } catch {
      // Firestore still has it.
    }
    if (level.value === 'full') await clearUserPref(uid.value, PREF_KEY)
    else await saveUserPrefs(uid.value, { [PREF_KEY]: level.value })
  }

  /** The next level along, for a row that steps through them. */
  const nextMotion = () => {
    const at = MOTION_LEVELS.findIndex((l) => l.key === level.value)
    return setMotion(MOTION_LEVELS[(at + 1) % MOTION_LEVELS.length].key)
  }

  return { motion: level, motionLabel: label, setMotion, nextMotion }
}

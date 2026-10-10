import { computed, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'

/**
 * How much moves between pages, for this person (router/viewTransitions.js):
 *
 *   full   — the card turning over into the page it opens, the picture and
 *            the name flying into its header, its contents rising in;
 *   simple — pages slide in and settle, and nothing flies;
 *   off    — pages simply change.
 *
 * Full unless they choose otherwise in Preferences, because it is what makes
 * going between apps easy to follow; but some people find motion tiring, and
 * it is theirs to turn down. A device asking for less motion gets none
 * whatever is chosen here.
 *
 * Kept against the account like their other preferences (userPrefs), with the
 * device holding a head start, and module-level so the router can read it
 * outside any component.
 */
export const MOTION_LEVELS = [
  { key: 'full', label: 'Full' },
  { key: 'simple', label: 'Simple' },
  { key: 'off', label: 'Off' },
]

const PREF_KEY = 'motion'
const cacheKey = (uid) => `ekkly:motion:${uid}`
const known = (value) => MOTION_LEVELS.some((level) => level.key === value)

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
        level.value = known(kept) ? kept : 'full'
      } catch {
        level.value = 'full'
      }
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        if (!prefs) return
        level.value = known(prefs[PREF_KEY]) ? prefs[PREF_KEY] : 'full'
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
  const label = computed(() => MOTION_LEVELS.find((l) => l.key === level.value)?.label || 'Full')

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

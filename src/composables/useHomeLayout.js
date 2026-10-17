import { computed, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'

/**
 * Where the panels of the desktop home stand (HomeBoard): three columns, a
 * quarter, a half and a quarter wide, and which panels each holds, top to
 * bottom. Everyone starts with the same arrangement, and anyone can drag the
 * panels into their own, within a column or across to another.
 *
 * Kept against the account like the home's card style and quick actions
 * (useHomeCards, useQuickActions), so it follows the person to another
 * device, with the device remembering it only as a head start. Putting it
 * back removes the choice rather than saving the default, so a later change
 * to the default reaches them too.
 *
 * A saved arrangement is read forgivingly: a panel it does not know is
 * dropped, and a panel it is missing (one added since it was saved) goes
 * where the default has it, so every panel is always somewhere, once.
 *
 * YUNIT (`yunit`) has a place among the panels like any of them, anywhere
 * in any column, though he is carried there himself rather than dragged as
 * a panel is (HomeYunit). The church on its hill (`church`) is different: it
 * stands at the foot of a column, always, and is moved only from column to
 * column (`place`). It is kept as the column it is in, and an arrangement
 * that does not name one has it where the default puts it.
 */
export const HOME_PANELS = ['day', 'apps', 'attention', 'community', 'verse', 'week', 'yunit']

export const HOME_COLUMNS = [
  { id: 'left', weight: 1 },
  { id: 'middle', weight: 2 },
  { id: 'right', weight: 1 },
]

// What stands at the foot of a column rather than among its panels: the
// church, under the apps on the left to begin with.
export const HOME_FEET = ['church']

// YUNIT starts under the week, at the foot of the right-hand column, beside
// the people rail.
export const DEFAULT_HOME_LAYOUT = {
  left: ['day', 'apps'],
  middle: ['attention', 'community', 'verse'],
  right: ['week', 'yunit'],
  church: 'left',
}

const PREF_KEY = 'homeLayout'
const cacheKey = (uid) => `ekkly:homeLayout:${uid}`

const columnOf = (layout, key) => HOME_COLUMNS.find((column) => layout[column.id].includes(key))?.id

const clean = (value) => {
  if (!value || typeof value !== 'object') return null
  const seen = new Set()
  const layout = {}
  for (const { id } of HOME_COLUMNS) {
    layout[id] = (Array.isArray(value[id]) ? value[id] : []).filter((key) => HOME_PANELS.includes(key) && !seen.has(key) && seen.add(key))
  }
  for (const key of HOME_PANELS) {
    if (!seen.has(key)) layout[columnOf(DEFAULT_HOME_LAYOUT, key)].push(key)
  }
  for (const key of HOME_FEET) {
    layout[key] = HOME_COLUMNS.some((column) => column.id === value[key]) ? value[key] : DEFAULT_HOME_LAYOUT[key]
  }
  return layout
}

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

// Starts following the signed-in account's arrangement, once per session, the
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

const save = async (value) => {
  mine.value = value
  if (!uid.value) return
  writeCache(uid.value, value)
  if (value) await saveUserPrefs(uid.value, { [PREF_KEY]: value })
  else await clearUserPref(uid.value, PREF_KEY)
}

export function useHomeLayout() {
  start()

  /** Each column's panels, top to bottom. */
  const layout = computed(() => mine.value || clean(DEFAULT_HOME_LAYOUT))

  /** Whether this is still the arrangement everyone starts with. */
  const isDefault = computed(() => !mine.value)

  /** Puts `key` in `column` at `index` (counted before it is taken out). */
  const move = (key, column, index) => {
    const next = clean(layout.value)
    const from = columnOf(next, key)
    const at = next[from].indexOf(key)
    next[from].splice(at, 1)
    const to = from === column && index > at ? index - 1 : index
    next[column].splice(Math.max(0, Math.min(to, next[column].length)), 0, key)
    return save(next)
  }

  /** Stands `key` (the church) at the foot of `column`. */
  const place = (key, column) => {
    if (!HOME_FEET.includes(key) || !HOME_COLUMNS.some((each) => each.id === column)) return Promise.resolve()
    if (layout.value[key] === column) return Promise.resolve()
    return save({ ...clean(layout.value), [key]: column })
  }

  /** Back to the arrangement everyone starts with. */
  const reset = () => save(null)

  return { layout, isDefault, move, place, reset }
}

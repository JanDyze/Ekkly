import { computed, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'

/**
 * Where the panels of the desktop home stand (HomeBoard): three columns, a
 * quarter, a half and a quarter wide, and which panels each holds, top to
 * bottom. Everyone starts with the usual arrangement, made from the panels
 * their home shows (arrangeHome), and anyone can drag the
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
export const HOME_PANELS = [
  'day',
  'apps',
  'attention',
  'community',
  'verse',
  'week',
  'yunit',
  // Panels from the apps, off until someone turns them on (OPTIONAL_PANELS).
  'sunday',
  'prayer',
  'photos',
  'groups',
  'birthdays',
  'links',
]

export const HOME_COLUMNS = [
  { id: 'left', weight: 1 },
  { id: 'middle', weight: 2 },
  { id: 'right', weight: 1 },
]

// What stands at the foot of a column rather than among its panels: the
// church, under the apps on the left to begin with.
export const HOME_FEET = ['church']

// A column holds three at most (HomeBoard's CARDS), YUNIT among them: he
// stands in a column as a panel does and takes its room. The church is not
// one; it is the land at a column's foot.
const CARDS_A_COLUMN = 3

// Where each panel would rather stand, in the order the usual arrangement
// places them: what the home is for first (the day and the apps on the left,
// what needs attention across the middle, the week beside the people rail),
// then the quieter panels, then the ones from the apps someone has turned on.
// The left is the home's sidebar, the day and the apps over the church and
// nothing more; the middle, the widest, takes what reads better wide (the
// next Sunday's line-up, the photos).
const PLACES = [
  ['day', 'left'],
  ['apps', 'left'],
  ['attention', 'middle'],
  ['week', 'right'],
  ['community', 'middle'],
  ['verse', 'right'],
  ['sunday', 'middle'],
  ['prayer', 'right'],
  ['photos', 'middle'],
  ['birthdays', 'right'],
  ['groups', 'right'],
  ['links', 'right'],
]
// A panel whose column already has more than the other goes to the one with
// the fewest, the right on a tie. The left takes one only when both are full,
// which the switches under "Show on my home" keep from happening
// (HomePanelSwitches' BOARD).
const SPARE = ['right', 'middle']
const PINNED = ['day', 'apps']

/**
 * The usual arrangement, made from the panels `shown` on this person's home
 * rather than written out once: the day and the apps alone on the left, and
 * every other panel in its own column while that holds no more than the
 * other, else in the one with fewer, so none holds more than three and none
 * is crowded while the other stands half empty. For the home
 * everyone starts with: the day and the apps; what needs attention, the whole middle; the
 * week and YUNIT. A written-out arrangement put every panel from
 * the apps in the right-hand column, and the board then moved them one by
 * one, saving each move, so a home that had only turned a panel on stopped
 * being the usual one. YUNIT's place, last on the right beside the people
 * rail, is counted from the start; the panels not shown wait in the column
 * they would rather.
 */
export const arrangeHome = (shown) => {
  const layout = { left: [], middle: [], right: [] }
  const taken = (id) => layout[id].length + (id === 'right' && shown.includes('yunit') ? 1 : 0)
  for (const [key, prefer] of PLACES) {
    if (!shown.includes(key)) continue
    if (PINNED.includes(key)) {
      layout.left.push(key)
      continue
    }
    const fewest = [...SPARE].sort((a, b) => taken(a) - taken(b))[0]
    const roomy = taken(prefer) < CARDS_A_COLUMN && taken(prefer) <= taken(fewest)
    layout[roomy ? prefer : taken(fewest) < CARDS_A_COLUMN ? fewest : 'left'].push(key)
  }
  for (const [key, prefer] of PLACES) if (!shown.includes(key)) layout[prefer].push(key)
  layout.right.push('yunit')
  layout.church = 'left'
  return layout
}

// Every panel where it would rather stand, for placing one an older saved
// arrangement is missing (clean).
export const DEFAULT_HOME_LAYOUT = arrangeHome([])

// Rearranging the home: the board's panels can be dragged only while this is
// on (the home's Rearrange button, with Done beside it). Most people never
// move a panel, and a board that moved under every press was a way to break
// the home by accident.
export const homeArranging = ref(false)

const PREF_KEY = 'homeLayout'
const cacheKey = (uid) => `ekkly:homeLayout:${uid}`

/**
 * The panels someone may have on their home or not ("Show on my home", in
 * the account menu). Not the day or the apps, which the home is for, nor
 * what needs attention, which is the reason to open it.
 *
 * `on` is whether it shows for someone who never chose. Only what someone
 * would act on is on: the week (what is coming, to get ready for) and YUNIT
 * (who does the finding for them), beside the day, the apps and what needs
 * attention. The community and the verse are good to have but asked nothing
 * of anyone, and the panels from the apps are off too, so a church's home
 * does not arrive with every one of them at once — six more on the first
 * screen was the clutter that asking about panels began with. Each is offered
 * only to someone who may open what it shows (`capability`, or for YUNIT his
 * app).
 *
 * Kept apart from the arrangement, under a key of its own, so putting the
 * arrangement back does not change what is shown. Only the choices that
 * differ from `on` are stored, so a later change to a default reaches anyone
 * who never chose.
 */
export const OPTIONAL_PANELS = [
  { key: 'community', label: 'Community', on: false },
  { key: 'week', label: 'This week', on: true, capability: 'events.view' },
  { key: 'verse', label: 'Verse', on: false },
  { key: 'yunit', label: 'YUNIT', on: true, app: 'ai' },
  { key: 'sunday', label: 'Next Sunday', on: false, capability: 'lineups.view' },
  { key: 'prayer', label: 'Praying for', on: false, capability: 'prayer.view' },
  { key: 'photos', label: 'Latest photos', on: false, capability: 'gallery.view' },
  { key: 'groups', label: 'Small groups', on: false, capability: 'smallgroups.view' },
  { key: 'birthdays', label: 'Birthdays', on: false, capability: 'members.view' },
  { key: 'links', label: 'Quick links', on: false, capability: 'links.view' },
]
const CHOICES_KEY = 'homePanels'
const choicesCacheKey = (uid) => `ekkly:homePanels:${uid}`
const defaultOf = (key) => OPTIONAL_PANELS.find((panel) => panel.key === key)?.on ?? true
// { key: shown }, only where it differs from the default.
const cleanChoices = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([key, shown]) => OPTIONAL_PANELS.some((panel) => panel.key === key) && typeof shown === 'boolean' && shown !== defaultOf(key))
  )
}

const columnOf = (layout, key) => HOME_COLUMNS.find((column) => layout[column.id].includes(key))?.id

const clean = (value) => {
  if (!value || typeof value !== 'object') return null
  const seen = new Set()
  const layout = {}
  for (const { id } of HOME_COLUMNS) {
    layout[id] = (Array.isArray(value[id]) ? value[id] : []).filter((key) => HOME_PANELS.includes(key) && !seen.has(key) && seen.add(key))
  }
  // One missing from it goes to its column in the default, above YUNIT if
  // he stands last there, so a panel added since never lands under him.
  for (const key of HOME_PANELS) {
    if (seen.has(key)) continue
    const column = layout[columnOf(DEFAULT_HOME_LAYOUT, key)]
    column.splice(column.at(-1) === 'yunit' ? column.length - 1 : column.length, 0, key)
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
const choices = ref({})
// The panels the home's board shows (handed over by the home, which alone
// knows what this person may open), for the usual arrangement to be made from.
const onBoard = ref(null)
const uid = ref(null)

const readChoices = (uid) => {
  try {
    return cleanChoices(JSON.parse(localStorage.getItem(choicesCacheKey(uid)) || '{}'))
  } catch {
    return {}
  }
}

const writeChoices = (uid, value) => {
  try {
    if (Object.keys(value).length) localStorage.setItem(choicesCacheKey(uid), JSON.stringify(value))
    else localStorage.removeItem(choicesCacheKey(uid))
  } catch {
    // Firestore still has it; only the head start is lost.
  }
}
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
        choices.value = {}
        return
      }
      mine.value = readCache(now)
      choices.value = readChoices(now)
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        // A failed read keeps what is on screen.
        if (!prefs) return
        const saved = clean(prefs[PREF_KEY])
        mine.value = saved
        writeCache(now, saved)
        choices.value = cleanChoices(prefs[CHOICES_KEY])
        writeChoices(now, choices.value)
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

  /** Whether `key` shows on this person's home, by their choice or the default. */
  const isShown = (key) => choices.value[key] ?? defaultOf(key)

  /**
   * Each column's panels, top to bottom: this person's own, or the usual one
   * made from what their board shows (arrangeHome). Never saved until they
   * move something, so it follows whatever they turn on or off.
   */
  const layout = computed(() => mine.value || arrangeHome(onBoard.value || HOME_PANELS.filter(isShown)))

  /** Tells the usual arrangement which panels the board shows. */
  const showOnBoard = (keys) => {
    if (keys.join() !== onBoard.value?.join()) onBoard.value = keys
  }

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

  /**
   * Puts `key` in `column` just before `before`, or after everything in it
   * when `before` is null. For the board, which counts only the panels it
   * shows: the arrangement also keeps the ones switched off, in their
   * columns, so a place counted among the shown ones put a panel among the
   * hidden ones instead (YUNIT set down at the foot of a column landed above
   * the panel he was put under). Placed by the panel it goes before, it lands
   * where it was put, whatever is hidden around it.
   */
  const moveBefore = (key, column, before = null) => {
    const next = clean(layout.value)
    const from = columnOf(next, key)
    next[from].splice(next[from].indexOf(key), 1)
    const at = before ? next[column].indexOf(before) : -1
    next[column].splice(at < 0 ? next[column].length : at, 0, key)
    return save(next)
  }

  /** `a` and `b` change places, wherever each is: a full column's way in. */
  const swap = (a, b) => {
    const next = clean(layout.value)
    for (const { id } of HOME_COLUMNS) next[id] = next[id].map((key) => (key === a ? b : key === b ? a : key))
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

  /** The optional panels not on this person's home. */
  const hiddenPanels = computed(() => OPTIONAL_PANELS.filter((panel) => !isShown(panel.key)).map((panel) => panel.key))

  /** Puts `key` on the home, or takes it off. */
  const setShown = async (key, shown) => {
    const next = cleanChoices({ ...choices.value, [key]: shown })
    choices.value = next
    if (!uid.value) return
    writeChoices(uid.value, next)
    if (Object.keys(next).length) await saveUserPrefs(uid.value, { [CHOICES_KEY]: next })
    else await clearUserPref(uid.value, CHOICES_KEY)
  }

  return { layout, isDefault, move, moveBefore, swap, place, reset, hiddenPanels, isShown, setShown, showOnBoard }
}

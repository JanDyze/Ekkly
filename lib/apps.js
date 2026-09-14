// The apps a church can have, and what each one costs.
//
// A church pays for the apps it uses rather than for the whole of ekkly, so a
// congregation that only wants its roll and its calendar is not billed for a
// ledger it will never open. Turning an app off hides it everywhere — the
// sidebar, the bottom bar, the home page, the dashboard tiles, the connector —
// and keeps its records exactly where they are, so turning it back on loses
// nothing.
//
// Which apps exist is decided here, in code, because each one has to be tied to
// the pages and permissions it switches off. What each one costs, whether it is
// on sale and how it is described are the platform's to change, and live in
// platform/public (see mergeCatalog).
//
// The keys are the capability areas in lib/capabilities.js wherever there is
// one, so `can('finances.view')` finds its app without a second vocabulary.
// Shared by the browser and the server; nothing here may import Firebase.

export const APPS = [
  {
    key: 'members',
    name: 'People',
    group: 'People',
    // The roll is what every other app is about, so it cannot be turned off.
    // Its price, if any, is the church's base fee.
    core: true,
    description: 'Everyone the church knows, their details and the ministries they serve in.',
  },
  {
    key: 'smallgroups',
    name: 'Small Groups',
    group: 'People',
    description: 'The groups that meet through the week, who is in them and how each session went.',
  },
  {
    key: 'attendance',
    name: 'Attendance',
    group: 'People',
    description: 'Who came on a Sunday, and whether that is holding up over the weeks.',
  },
  {
    key: 'events',
    name: 'Events',
    group: 'Gatherings',
    description: 'The church calendar — services, meetings and everything else that is on.',
  },
  {
    key: 'songs',
    name: 'Song List',
    group: 'Gatherings',
    description: 'Every song the church sings, with its key, its words and who leads it.',
  },
  {
    key: 'lineups',
    name: 'Schedules & Presentation',
    group: 'Gatherings',
    description: 'Who is serving each Sunday, the songs, and putting them on the screen.',
  },
  {
    key: 'bible',
    name: 'Bible',
    group: 'Gatherings',
    description: 'Read the Bible in Tagalog, and find a verse by reference or by what it says.',
  },
  {
    key: 'minutes',
    name: 'Minutes',
    group: 'Gatherings',
    description: 'Notes typed during a meeting, written up into minutes the church can file.',
  },
  {
    key: 'prayer',
    name: 'Prayer Concerns',
    group: 'Gatherings',
    description: 'What the church is praying for, and who asked for it.',
  },
  {
    key: 'gallery',
    name: 'Gallery',
    group: 'Media',
    description: 'Photos from services and events.',
  },
  {
    key: 'links',
    name: 'Links',
    group: 'Media',
    description: 'The links the church hands out — forms, giving, and where to find it online.',
  },
  {
    key: 'finances',
    name: 'Finances',
    group: 'Administration',
    description: 'What comes in and goes out, and the statement for the month.',
  },
  {
    key: 'tasks',
    name: 'Tasks',
    group: 'Administration',
    description: 'Jobs the church has to get done, and who agreed to do them.',
  },
  {
    key: 'ai',
    name: 'AI assist',
    group: 'Extras',
    // Not a page: the buttons that write up minutes, look up a song and lay out
    // lyrics. It costs the platform per use, which is why it is sold on its own.
    description: 'Writes up minutes from notes, looks up songs and lays out lyrics.',
  },
]

export const APP_KEYS = APPS.map((app) => app.key)
export const CORE_APP_KEYS = APPS.filter((app) => app.core).map((app) => app.key)

const BY_KEY = new Map(APPS.map((app) => [app.key, app]))

export const isAppKey = (key) => BY_KEY.has(key)
export const appByKey = (key) => BY_KEY.get(key) || null

/**
 * The app a capability belongs to, or null for one no app switches off
 * (the dashboard). `finances.manage` -> 'finances'.
 */
export const appOfCapability = (capability) => {
  const area = String(capability || '').split('.')[0]
  return BY_KEY.has(area) ? area : null
}

/** Only real keys, each once, with the core apps always included. */
export const normalizeAppList = (list) => {
  const keys = new Set(CORE_APP_KEYS)
  ;(Array.isArray(list) ? list : []).forEach((key) => {
    if (BY_KEY.has(key)) keys.add(key)
  })
  return APP_KEYS.filter((key) => keys.has(key))
}

/**
 * What a church has switched on, from its subscription/apps document.
 * `null` means every app: a church from before apps were sold — UEC, moved
 * across with everything it already used — has no document, and must not wake
 * up to find half its app gone.
 */
export const enabledAppsFrom = (data) =>
  data && Array.isArray(data.apps) ? new Set(normalizeAppList(data.apps)) : null

/** One catalogue entry as the platform stores it, cleaned. Price is centavos. */
const cleanEntry = (entry) => ({
  price: Math.max(0, Math.trunc(Number(entry?.price) || 0)),
  available: entry?.available !== false,
  description: typeof entry?.description === 'string' ? entry.description.trim().slice(0, 300) : '',
})

/**
 * Every app with what the platform says about it merged over the defaults:
 * `{ key, name, group, core, description, price, available }`.
 * A core app is always available, whatever is stored.
 */
export const mergeCatalog = (stored) => {
  const byKey = new Map(
    (Array.isArray(stored) ? stored : []).filter((e) => BY_KEY.has(e?.key)).map((e) => [e.key, e])
  )
  return APPS.map((app) => {
    const entry = byKey.has(app.key) ? cleanEntry(byKey.get(app.key)) : cleanEntry({})
    return {
      ...app,
      description: entry.description || app.description,
      price: entry.price,
      available: app.core ? true : entry.available,
    }
  })
}

/** What the platform stores for the catalogue: key, price, availability, wording. */
export const catalogForStorage = (entries) =>
  (Array.isArray(entries) ? entries : [])
    .filter((entry) => BY_KEY.has(entry?.key))
    .map((entry) => ({ key: entry.key, ...cleanEntry(entry) }))

/**
 * The monthly price of a set of apps, in centavos. `enabled` null means every
 * app. A church's billing can carry a custom amount instead — see billing.
 */
export const monthlyTotal = (catalog, enabled) =>
  catalog
    .filter((app) => (enabled ? enabled.has(app.key) : true))
    .reduce((total, app) => total + (app.price || 0), 0)

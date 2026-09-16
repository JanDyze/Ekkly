// The apps a church can have, and what each one costs.
//
// A church pays for the apps it uses rather than for the whole of Ekkly, so a
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

// `price` is the starting price, in centavos a month, for a platform that has
// not set its own in the console yet. Once the console saves prices, its
// figures win, a deliberate zero included.
//
// For now every app is ₱1, while payments are being tried out. The prices meant
// for launch, pitched at what a Philippine congregation can carry (People is
// the base fee; storage and AI cost more; the Bible costs nothing to serve):
//   People 299 · Small Groups 149 · Attendance 99 · Events 99 · Song List 99
//   Schedules & Presentation 199 · Bible 0 · Minutes 149 · Prayer Concerns 49
//   Gallery 199 · Links 49 · Finances 249 · Tasks 49 · EKRIS 399
export const APPS = [
  {
    key: 'members',
    name: 'People',
    group: 'People',
    price: 100,
    // The roll is what every other app is about, so it cannot be turned off.
    // Its price, if any, is the church's base fee.
    core: true,
    description: 'Everyone in the church, and where they serve.',
  },
  {
    key: 'smallgroups',
    name: 'Small Groups',
    group: 'People',
    price: 100,
    description: 'Midweek groups and how each session went.',
  },
  {
    key: 'attendance',
    name: 'Attendance',
    group: 'People',
    price: 100,
    description: 'Head counts for every gathering.',
  },
  {
    key: 'events',
    name: 'Events',
    group: 'Gatherings',
    price: 100,
    description: 'Services, meetings and everything on.',
  },
  {
    key: 'songs',
    name: 'Song List',
    group: 'Gatherings',
    price: 100,
    description: 'Every song, with its key and words.',
  },
  {
    key: 'lineups',
    name: 'Schedules & Presentation',
    group: 'Gatherings',
    price: 100,
    description: 'Who serves on Sunday, and the screen.',
  },
  {
    key: 'bible',
    name: 'Bible',
    group: 'Gatherings',
    price: 100,
    description: 'The Bible in Tagalog and English, to read and search.',
  },
  {
    key: 'minutes',
    name: 'Minutes',
    group: 'Gatherings',
    price: 100,
    description: 'Meeting notes, written up for filing.',
  },
  {
    key: 'prayer',
    name: 'Prayer Concerns',
    group: 'Gatherings',
    price: 100,
    description: 'What the church is praying for.',
  },
  {
    key: 'gallery',
    name: 'Gallery',
    group: 'Media',
    price: 100,
    description: 'Photos from services and events.',
  },
  {
    key: 'links',
    name: 'Links',
    group: 'Media',
    price: 100,
    description: 'Forms, giving and the church online.',
  },
  {
    key: 'finances',
    name: 'Finances',
    group: 'Administration',
    price: 100,
    description: 'Money in and out, and the statement.',
  },
  {
    key: 'tasks',
    name: 'Tasks',
    group: 'Administration',
    price: 100,
    description: 'Jobs to do, and who is doing them.',
  },
  {
    key: 'ai',
    // EKRIS: Ekklesia Knowledge Retrieval & Intelligence System, the assistant.
    name: 'EKRIS',
    group: 'Extras',
    price: 100,
    // Not a page: the buttons that write up minutes, look up a song and lay out
    // lyrics. It costs the platform per use, which is why it is sold on its own.
    description: 'Writes minutes, finds songs, lays out lyrics.',
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
    const saved = byKey.has(app.key)
    const entry = saved ? cleanEntry(byKey.get(app.key)) : cleanEntry({})
    return {
      ...app,
      description: entry.description || app.description,
      price: saved ? entry.price : app.price || 0,
      available: app.core ? true : entry.available,
    }
  })
}

/** What the platform stores for the catalogue: key, price, availability, wording. */
export const catalogForStorage = (entries) =>
  (Array.isArray(entries) ? entries : [])
    .filter((entry) => BY_KEY.has(entry?.key))
    .map((entry) => ({ key: entry.key, ...cleanEntry(entry) }))

// Paying for a year up front costs ten months: two months free, which is the
// usual reward for committing and easy to say in one breath.
export const MONTHS_PER_YEAR_PAID = 10

/** A monthly price, in centavos, as the price of a year paid up front. */
export const yearlyPrice = (monthly) => (monthly || 0) * MONTHS_PER_YEAR_PAID

/**
 * The monthly price of a set of apps, in centavos. `enabled` null means every
 * app. A church's billing can carry a custom amount instead — see billing.
 */
export const monthlyTotal = (catalog, enabled) =>
  catalog
    .filter((app) => (enabled ? enabled.has(app.key) : true))
    .reduce((total, app) => total + (app.price || 0), 0)

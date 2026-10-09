// The Philippines' places, for picking an address a step at a time: province,
// then city or municipality, then barangay.
//
// From the PSGC API (psgc.gitlab.io/api) — the Philippine Standard
// Geographic Code, the government's own list of every barangay, published as
// static JSON with no key and open to any page. It is not church data and is
// the same for everyone, so like the Bible text it is fetched rather than
// stored, and kept once fetched: in memory for the page, and in localStorage
// so the province list and the places a church keeps picking from are there
// the next time without asking again, and with no signal.
//
// Metro Manila is a region with no province, so the list of provinces would
// leave out everyone who lives there. It is put at the top of that list as if
// it were one, and its cities are asked of the region instead.

const BASE = 'https://psgc.gitlab.io/api'
const STORE = 'ekkly:psgc:'
const NCR = '130000000'

const memory = new Map()

const byName = (a, b) => a.name.localeCompare(b.name)
const slim = (rows) => rows.map((row) => ({ code: row.code, name: row.name })).sort(byName)

const cached = (path) => {
  if (memory.has(path)) return memory.get(path)

  let stored = null
  try {
    stored = JSON.parse(localStorage.getItem(STORE + path) || 'null')
  } catch {
    // Nothing kept, or storage blocked: fetch it.
  }

  const pending = stored
    ? Promise.resolve(stored)
    : fetch(`${BASE}${path}`)
        .then((response) => {
          if (!response.ok) throw new Error('Could not load the list of places')
          return response.json()
        })
        .then((rows) => {
          const list = slim(rows)
          try {
            localStorage.setItem(STORE + path, JSON.stringify(list))
          } catch {
            // Full or blocked; it is still kept for this page.
          }
          return list
        })
        .catch((error) => {
          // A failed fetch must not stay cached: the signal may be back next time.
          memory.delete(path)
          throw error
        })

  memory.set(path, pending)
  return pending
}

/** Every province, Metro Manila first: `[{ code, name }]`. */
export const listProvinces = async () => [{ code: NCR, name: 'Metro Manila' }, ...(await cached('/provinces/'))]

/** The cities and municipalities of a province (or of Metro Manila). */
export const listCities = (provinceCode) =>
  cached(provinceCode === NCR ? `/regions/${NCR}/cities-municipalities/` : `/provinces/${provinceCode}/cities-municipalities/`)

/** The barangays of a city or municipality. */
export const listBarangays = (cityCode) => cached(`/cities-municipalities/${cityCode}/barangays/`)

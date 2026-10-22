import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMembers } from './useMembers'
import { useEvents } from './useEvents'
import { useTasks } from './useTasks'
import { useMinutes } from './useMinutes'
import { useSmallGroups } from './useSmallGroups'
import { usePermissions } from './usePermissions'
import { useAuth } from './useAuth'
import { subscribeToSongs } from '../api/songsService'
import { NAV_ITEMS, navItemAllowed } from '../data/navigation'
import { getFullName } from '../utils/memberUtils'
import { snippetAt } from '../utils/search'

/**
 * One search for everything in the church's app, by what is meant rather than
 * by the exact words (components/search/SearchSheet.vue).
 *
 * Every record the person may see becomes a short text — a person's name,
 * nickname and ministries; an event's title, place and description; a song's
 * title and its first lines — and each text becomes a vector of its meaning on
 * the device itself (search/embedWorker.js). A search is then the records whose
 * meaning is nearest the question's, so "worship songs about grace" finds
 * Amazing Grace without the word "worship" being in it.
 *
 * Meaning alone is poor at names — "Ana" means nothing in particular — so the
 * words count too: a record whose name starts with what was typed comes first,
 * whatever the vectors say. Until the model is on the device (it downloads
 * once, about 23 MB, and only after the person says yes) the words are all
 * there is, and the search still works.
 *
 * Nothing about a person's contact details or address is put in a text, and
 * prayer concerns are left out altogether: they are pastoral records, not
 * something to turn up in a search.
 */

/* ------------------------------------------------------------ the model */

const CONSENT_KEY = 'ekkly:search-model'
const status = ref('off') // off | loading | ready | error
const progress = ref(0)

let worker = null
let nextId = 0
const waiting = new Map()

const startWorker = () => {
  if (worker) return
  status.value = 'loading'
  worker = new Worker(new URL('../search/embedWorker.js', import.meta.url), { type: 'module' })
  const files = new Map()
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') {
      files.set(data.file, data)
      const all = [...files.values()]
      const total = all.reduce((sum, f) => sum + f.total, 0)
      progress.value = total ? all.reduce((sum, f) => sum + f.loaded, 0) / total : 0
    } else if (data.type === 'ready') {
      status.value = 'ready'
      progress.value = 1
    } else if (data.type === 'result' || data.type === 'error') {
      const job = waiting.get(data.id)
      waiting.delete(data.id)
      if (data.type === 'error') {
        status.value = 'error'
        job?.reject(new Error(data.message))
      } else job?.resolve(data.vectors)
    }
  }
}

const embed = (texts) =>
  new Promise((resolve, reject) => {
    startWorker()
    const id = ++nextId
    waiting.set(id, { resolve, reject })
    worker.postMessage({ id, texts })
  })

const consented = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes'
  } catch {
    return false
  }
}

/** The person said yes to the download: start it, and remember the answer. */
const allowModel = () => {
  try {
    localStorage.setItem(CONSENT_KEY, 'yes')
  } catch {
    // Asked again next time; the model is cached by the browser either way.
  }
  embed([]).catch(() => {})
}

/* ------------------------------------------------------- the vectors kept */

// A text's vector, by the text itself, so a record re-embeds only when what
// it says has changed. Kept in IndexedDB on the device between visits.
const vectors = new Map()
const DB_NAME = 'ekkly-search'
const STORE = 'vectors'

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

let loadedFromDisk = null
const loadVectors = () => {
  if (!loadedFromDisk) {
    loadedFromDisk = openDb()
      .then(
        (db) =>
          new Promise((resolve) => {
            const req = db.transaction(STORE).objectStore(STORE).openCursor()
            req.onsuccess = () => {
              const cursor = req.result
              if (!cursor) return resolve()
              vectors.set(cursor.key, cursor.value)
              cursor.continue()
            }
            req.onerror = () => resolve()
          })
      )
      .catch(() => {})
  }
  return loadedFromDisk
}

const saveVectors = (entries) =>
  openDb()
    .then((db) => {
      const tx = db.transaction(STORE, 'readwrite')
      entries.forEach(([text, vector]) => tx.objectStore(STORE).put(vector, text))
    })
    .catch(() => {})

/* --------------------------------------------------------- the words */

const fold = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Where a word of the query begins a word of the text (both folded), or -1.
// Only at the start of a word: "art" finding "start" is noise, not an answer.
const findWord = (folded, word) => {
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}`, 'u').exec(folded)
  return match ? match.index + match[1].length : -1
}

/**
 * How well the words of a query match a record, 0 to 1, and — when they were
 * found in its text rather than its title — where, to show.
 */
const wordScore = (query, doc) => {
  const q = fold(query).trim()
  if (!q) return { score: 0 }
  const title = fold(doc.title)
  if (title.startsWith(q)) return { score: 1 }
  if (title.split(/\s+/).some((w) => w.startsWith(q))) return { score: 0.92 }
  if (title.includes(q)) return { score: 0.85 }
  const words = q.split(/\s+/).filter(Boolean)
  const body = fold(doc.text)
  const found = words.filter((w) => findWord(title, w) >= 0 || findWord(body, w) >= 0)
  if (!found.length) return { score: 0 }
  let score = found.length === words.length ? 0.6 : 0.3 * (found.length / words.length)
  // An app found only by its description comes after the records that hold
  // the word: someone searching "love" wants the songs, then the app whose
  // blurb happens to say it.
  if (doc.kind === 'app') score *= 0.9
  // The first place in the text a found word starts, if it is in the text.
  const hits = found.map((w) => [findWord(body, w), w.length]).filter(([at]) => at >= 0)
  if (!hits.length) return { score }
  const [at, length] = hits.reduce((a, b) => (b[0] < a[0] ? b : a))
  // The row says where, since its title and subtitle do not.
  return { score, match: snippetAt(String(doc.text), at, length) }
}

const dot = (a, b) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

/* ---------------------------------------------------- what was searched */

// The last few searches, and the last few things opened from one, so whoever
// looks up the same song every Sunday does not type it every Sunday.
//
// Kept on this device and against the account: a shared office tablet should
// not hand one person's searches to the next. What was opened is kept as ids,
// not copies, and shown from the live records — so a renamed song shows its
// new name, and one deleted, or one this person may no longer open, drops out.
const HISTORY_SIZE = 6
const historyKey = (uid) => `ekkly:search-history.${uid}`

const readHistory = (uid) => {
  if (!uid) return { queries: [], opened: [] }
  try {
    const raw = JSON.parse(localStorage.getItem(historyKey(uid)) || '{}')
    const strings = (list) => (Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [])
    return { queries: strings(raw.queries), opened: strings(raw.opened) }
  } catch {
    return { queries: [], opened: [] }
  }
}

const writeHistory = (uid, value) => {
  if (!uid) return
  try {
    if (value.queries.length || value.opened.length) localStorage.setItem(historyKey(uid), JSON.stringify(value))
    else localStorage.removeItem(historyKey(uid))
  } catch {
    // Remembered for this visit only.
  }
}

// Newest first, without the same thing twice.
const pushRecent = (list, item, same = (a, b) => a === b) =>
  [item, ...list.filter((x) => !same(x, item))].slice(0, HISTORY_SIZE)

/* ------------------------------------------------------- the composable */

export function useGlobalSearch() {
  const { can, isAdmin } = usePermissions()
  const { members } = useMembers()
  const { events } = useEvents()
  const { tasks } = useTasks()
  const { minutes } = useMinutes()
  const { groups } = useSmallGroups()

  const songs = ref([])
  let stopSongs = null
  onMounted(() => {
    stopSongs = subscribeToSongs((list) => {
      songs.value = list
    })
  })
  onBeforeUnmount(() => stopSongs?.())

  // Whether this person may open the app a kind of record belongs to.
  const allowed = (path) => {
    const item = NAV_ITEMS.find((i) => i.path === path)
    return Boolean(item && navItemAllowed(item, can, isAdmin.value))
  }

  const docs = computed(() => {
    const list = []

    // The apps themselves, so "where do I record attendance" lands somewhere.
    NAV_ITEMS.filter((item) => navItemAllowed(item, can, isAdmin.value)).forEach((item) =>
      list.push({
        id: `app:${item.path}`,
        kind: 'app',
        title: item.name,
        subtitle: item.tagline || '',
        art: item.art,
        to: item.path,
        text: [item.tagline, item.description].filter(Boolean).join('. '),
      })
    )

    if (allowed('/people')) {
      members.value.forEach((m) => {
        const ministries = Array.isArray(m.ministries) ? m.ministries.join(', ') : ''
        list.push({
          id: `person:${m.firestoreId || m.id}`,
          kind: 'person',
          title: getFullName(m),
          subtitle: [m.nickname && `“${m.nickname}”`, ministries].filter(Boolean).join(' · '),
          member: m,
          to: { name: 'MemberDetails', params: { id: m.id || m.firestoreId } },
          text: [m.nickname, ministries && `Serves in ${ministries}`, m.occupation].filter(Boolean).join('. '),
        })
      })
    }

    if (allowed('/events')) {
      events.value.forEach((e) =>
        list.push({
          id: `event:${e.firestoreId || e.id}`,
          kind: 'event',
          title: e.title || 'Event',
          subtitle: [e.date, e.location].filter(Boolean).join(' · '),
          to: { name: 'Events', query: e.date ? { date: e.date } : {} },
          text: [e.location, stripHtml(e.description).slice(0, 300)].filter(Boolean).join('. '),
        })
      )
    }

    if (allowed('/songs')) {
      songs.value.forEach((s) =>
        list.push({
          id: `song:${s.id}`,
          kind: 'song',
          title: s.title || 'Song',
          subtitle: s.category || '',
          to: { name: 'SongDetails', params: { id: s.id } },
          text: [s.category, stripHtml(s.lyrics).slice(0, 360), s.notes].filter(Boolean).join('. '),
        })
      )
    }

    if (allowed('/tasks')) {
      tasks.value.forEach((t) =>
        list.push({
          id: `task:${t.id}`,
          kind: 'task',
          title: t.title || 'Task',
          subtitle: [t.done ? 'Done' : 'Open', t.ministry, t.assigneeNames?.join(', ')].filter(Boolean).join(' · '),
          to: { name: 'Tasks' },
          text: [stripHtml(t.details).slice(0, 300), t.ministry].filter(Boolean).join('. '),
        })
      )
    }

    if (allowed('/minutes')) {
      minutes.value.forEach((m) =>
        list.push({
          id: `minute:${m.firestoreId || m.id}`,
          kind: 'minute',
          title: m.title || 'Minutes',
          subtitle: m.date || '',
          to: { name: 'MinuteDetails', params: { id: m.firestoreId || m.id } },
          text: stripHtml(m.content).slice(0, 400),
        })
      )
    }

    if (allowed('/small-groups')) {
      groups.value.forEach((g) =>
        list.push({
          id: `group:${g.firestoreId || g.id}`,
          kind: 'group',
          title: g.name || 'Small group',
          subtitle: g.location || '',
          to: { name: 'SmallGroupDetails', params: { id: g.firestoreId || g.id } },
          text: [stripHtml(g.description).slice(0, 300), g.location].filter(Boolean).join('. '),
        })
      )
    }

    return list
  })

  // What each record's meaning is read from: its title and its text.
  const meaningOf = (doc) => `${doc.title}. ${doc.text}`.slice(0, 500)

  /* --- keeping the vectors in step with the records --- */
  const indexed = ref(0)
  let indexing = false
  const index = async () => {
    if (indexing || status.value !== 'ready') return
    indexing = true
    try {
      await loadVectors()
      const missing = [...new Set(docs.value.map(meaningOf))].filter((t) => !vectors.has(t))
      for (let i = 0; i < missing.length; i += 24) {
        const batch = missing.slice(i, i + 24)
        const out = await embed(batch)
        const entries = batch.map((text, j) => [text, Float32Array.from(out[j])])
        entries.forEach(([text, v]) => vectors.set(text, v))
        saveVectors(entries)
        indexed.value += batch.length
      }
    } catch {
      // A failed batch leaves word search as it is; the next change tries again.
    } finally {
      indexing = false
    }
  }

  watch([docs, status], index)
  onMounted(() => {
    loadVectors()
    if (consented()) embed([]).catch(() => {})
  })

  /* --- the search itself --- */
  const query = ref('')
  const queryVector = ref(null)
  let asked = 0

  watch(query, async (q) => {
    const mine = ++asked
    queryVector.value = null
    if (status.value !== 'ready' || q.trim().length < 3) return
    // A beat after the last keystroke, so a word half typed is not searched.
    await new Promise((r) => setTimeout(r, 180))
    if (mine !== asked) return
    try {
      const [v] = await embed([q.trim()])
      if (mine === asked) queryVector.value = v
    } catch {
      // Words only, this time.
    }
  })

  const results = computed(() => {
    const q = query.value.trim()
    if (!q) return []
    const qv = queryVector.value
    return docs.value
      .map((doc) => {
        const { score: words, match } = wordScore(q, doc)
        const v = qv && vectors.get(meaningOf(doc))
        const meaning = v ? dot(qv, v) : 0
        // Words lead where they match; meaning carries what words miss.
        const score = Math.max(words, meaning * 0.95) + (words > 0 && meaning > 0.3 ? 0.08 : 0)
        return { doc, score, words, meaning, match }
      })
      .filter((r) => r.words > 0 || r.meaning > 0.32)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((r) => ({ ...r.doc, match: r.match, byMeaning: r.words === 0 }))
  })

  /* --- what was searched before --- */
  const { user } = useAuth()
  const uid = computed(() => user.value?.uid || null)
  const history = ref(readHistory(uid.value))
  watch(uid, (now) => {
    history.value = readHistory(now)
  })

  const recentQueries = computed(() => history.value.queries)
  const recentOpened = computed(() => {
    const byId = new Map(docs.value.map((doc) => [doc.id, doc]))
    return history.value.opened.map((id) => byId.get(id)).filter(Boolean)
  })

  // Called when a result is opened: that is when a search found something,
  // rather than every half-typed word along the way.
  const remember = (result) => {
    const q = query.value.trim()
    const next = {
      queries: q ? pushRecent(history.value.queries, q, (a, b) => fold(a) === fold(b)) : history.value.queries,
      opened: pushRecent(history.value.opened, result.id),
    }
    history.value = next
    writeHistory(uid.value, next)
  }

  const forgetQuery = (q) => {
    const next = { ...history.value, queries: history.value.queries.filter((x) => x !== q) }
    history.value = next
    writeHistory(uid.value, next)
  }

  const clearHistory = () => {
    history.value = { queries: [], opened: [] }
    writeHistory(uid.value, history.value)
  }

  return {
    query,
    results,
    recentQueries,
    recentOpened,
    remember,
    forgetQuery,
    clearHistory,
    status,
    progress,
    consented,
    allowModel,
    indexed,
    total: computed(() => docs.value.length),
  }
}

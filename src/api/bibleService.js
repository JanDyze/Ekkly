import { DEFAULT_BIBLE_VERSION } from '../data/bibleBooks'
import { parseReference, formatReference } from '../utils/bibleRef'
import { auth } from './firebase'
import { churchHeaders } from './church'

/**
 * Reading verses out of the translations shipped in public/bible/.
 *
 * Static JSON rather than Firestore, one file per book per translation, fetched
 * the first time something asks for it and then kept. Gzipped that is 2 KB for
 * Judas, 35 KB for Juan and 89 KB for Mga Awit at the worst — so the second
 * reading from Juan on a Sunday costs nothing, and a service whose passages
 * have all been looked up once will run with the network down. That last part
 * is the point: a projector must not stop because the church wifi did.
 *
 * Which translation is a decision every call carries, defaulting to the one a
 * church gets before anybody chooses. Nothing here reads the preference itself
 * — that is useBibleVersion's job — because the presentation page and the
 * reader can legitimately be looking at different translations at once.
 *
 * Nothing here writes. A verse is not church data; it is the same for everyone
 * and never edited, which is why it sits in the bundle's neighbourhood instead
 * of in the database.
 */

/** "<version>:<slug>" -> Promise<book>. The promise is cached, not the result,
 *  so two lookups racing for the same book share one request. Keyed by
 *  translation as well, so switching to the King James and back does not throw
 *  away the Tagalog Juan somebody is about to read from again. */
const books = new Map()

const loadBook = (slug, version = DEFAULT_BIBLE_VERSION) => {
  const key = `${version}:${slug}`
  if (books.has(key)) return books.get(key)

  const pending = fetch(`/bible/${version}/${slug}.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`${slug} is not in this translation`)
      return response.json()
    })
    .catch((error) => {
      // A failed fetch must not poison the cache: the operator will try again,
      // and next time the wifi may be back.
      books.delete(key)
      throw error
    })

  books.set(key, pending)
  return pending
}

/**
 * The verses a parsed reference points at.
 *
 * Ranges are clamped rather than refused at the top end — "Juan 3:16-99" means
 * "to the end of the chapter" to everyone who types it, and refusing it five
 * minutes before a service helps nobody. A start that is off the end is a
 * different matter and comes back as an error, because it means the reference
 * itself is wrong.
 *
 * @param {object} ref      from parseReference, which records the translation
 *                          it named the book in
 * @param {string} version  overrides that, for a caller reading elsewhere
 * @returns {Promise<{reference: string, version: string, verses: Array}>}
 */
export const lookupPassage = async (ref, version) => {
  if (!ref?.slug) throw new Error('No reference to look up')
  const from = version || ref.version || DEFAULT_BIBLE_VERSION
  const book = await loadBook(ref.slug, from)

  const byNumber = new Map(book.chapters.map((chapter) => [chapter.chapter, chapter]))
  const first = byNumber.get(ref.startChapter)
  if (!first) throw new Error(`${ref.book} has no chapter ${ref.startChapter}`)

  if (ref.startVerse != null && !first.verses.some((v) => v.verse === ref.startVerse)) {
    const last = first.verses[first.verses.length - 1]?.verse ?? 0
    throw new Error(`${ref.book} ${ref.startChapter} has ${last} verses`)
  }

  const verses = []
  for (let number = ref.startChapter; number <= ref.endChapter; number += 1) {
    const chapter = byNumber.get(number)
    if (!chapter) continue

    // Only the ends of the range are bounded; a chapter in the middle of a
    // multi-chapter reading is included whole.
    const from = number === ref.startChapter && ref.startVerse != null ? ref.startVerse : 1
    const to = number === ref.endChapter && ref.endVerse != null ? ref.endVerse : Infinity

    chapter.verses.forEach((verse) => {
      if (verse.verse >= from && verse.verse <= to) {
        verses.push({ chapter: number, verse: verse.verse, text: verse.text })
      }
    })
  }

  if (!verses.length) throw new Error('That reference has no verses in it')

  return { reference: formatReference(ref), version: book.version || from, verses }
}

/**
 * Reference in, verses out — what the run-sheet editor calls.
 *
 * Parse errors and lookup errors are the same thing to the operator, who typed
 * one field and wants to know whether it worked, so both arrive as `error`
 * rather than one being thrown and the other returned.
 */
export const lookupReference = async (input, version = DEFAULT_BIBLE_VERSION) => {
  const parsed = parseReference(input, version)
  if (parsed.error) return { error: parsed.error }

  try {
    const passage = isRemoteVersion(version)
      ? await lookupRemotePassage(parsed.ref, version)
      : await lookupPassage(parsed.ref, version)
    return { ...passage, ref: parsed.ref }
  } catch (error) {
    return { error: error.message || 'Could not load that passage' }
  }
}

/**
 * The same passage out of a licensed translation, a chapter per request.
 *
 * The span is capped because each chapter is a call against a quota the whole
 * deployment shares, and because a reading nobody will finish is not worth
 * spending it on. A run sheet wanting more than this can hold two items.
 */
const REMOTE_CHAPTER_SPAN = 4

const lookupRemotePassage = async (ref, version) => {
  const span = ref.endChapter - ref.startChapter + 1
  if (span > REMOTE_CHAPTER_SPAN) {
    throw new Error(`That is ${span} chapters. Ask for ${REMOTE_CHAPTER_SPAN} or fewer here.`)
  }

  const verses = []
  let notice = null

  for (let number = ref.startChapter; number <= ref.endChapter; number += 1) {
    const page = await loadRemoteChapter(ref.slug, number, version)
    notice = notice || { copyright: page.copyright, link: page.link }

    // Only the ends of the range are bounded, the same as a translation on
    // disk; a chapter in the middle of a reading comes whole.
    const from = number === ref.startChapter && ref.startVerse != null ? ref.startVerse : 1
    const to = number === ref.endChapter && ref.endVerse != null ? ref.endVerse : Infinity

    page.verses.forEach((verse) => {
      if (verse.verse >= from && verse.verse <= to) {
        verses.push({ chapter: number, verse: verse.verse, text: verse.text })
      }
    })
  }

  if (!verses.length) throw new Error('That reference has no verses in it')

  return { reference: formatReference(ref), version, verses, ...notice }
}

/** Drops every cached book, in every translation. Nothing needs this in normal
 *  use — switching translation keeps its cache — but a stale build served a
 *  revised file has nowhere else to be corrected from. */
export const clearBibleCache = () => {
  books.clear()
  chapters.clear()
}

/* ---------- translations that are not in the app ---------- */

/**
 * The ESV and the NIV cannot ship inside the app: both are licensed per use and
 * neither may be stored. They are fetched a chapter at a time through
 * /api/song-lookup, which holds the publisher's key server-side.
 *
 * Everything about them is worse than a translation on disk — no offline, no
 * whole-Bible search, a quota shared by every church on the deployment — so
 * they are offered only where a key has actually been set, and the reader says
 * plainly which kind it is showing.
 */
const remoteIndex = { pending: null, list: [] }

/**
 * The route is church-scoped and refuses a caller who is not signed in to one,
 * so both the account's token and the church go with every request — the same
 * pair songLookupService sends to the same route.
 */
const authHeaders = async () => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in required')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...churchHeaders(),
  }
}

/**
 * Which licensed translations this deployment can serve, asked once.
 *
 * An empty list is the normal answer and the quiet one: with no key set the
 * picker shows the three translations that ship in the app and nothing here is
 * ever reached again.
 */
export const listRemoteBibles = async () => {
  if (remoteIndex.pending) return remoteIndex.pending

  remoteIndex.pending = authHeaders()
    .then((headers) =>
      fetch('/api/song-lookup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'scripture', op: 'available' }),
      })
    )
    .then((response) => (response.ok ? response.json() : { bibles: [] }))
    .then((data) => {
      remoteIndex.list = Array.isArray(data.bibles) ? data.bibles : []
      return remoteIndex.list
    })
    .catch(() => {
      // Not being able to ask is the same as there being none: the app still
      // has three Bibles and no reason to say anything about it.
      remoteIndex.pending = null
      return []
    })

  return remoteIndex.pending
}

/** Whether an id names a licensed translation rather than one on disk. */
export const isRemoteVersion = (version) => remoteIndex.list.some((b) => b.id === version)

/** The licensed translation's row, for its name and its copyright notice. */
export const remoteBible = (version) => remoteIndex.list.find((b) => b.id === version) || null

/** "<version>:<slug>:<chapter>" -> Promise<{verses, copyright}>, for this tab
 *  and this sitting only. Held in memory so that paging back to the chapter you
 *  just read does not spend another request against the quota — never written
 *  to storage or to the service worker's cache, which both licences forbid. */
const chapters = new Map()

export const loadRemoteChapter = (slug, chapter, version) => {
  const key = `${version}:${slug}:${chapter}`
  if (chapters.has(key)) return chapters.get(key)

  const pending = authHeaders()
    .then((headers) =>
      fetch('/api/song-lookup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'scripture', version, slug, chapter }),
      })
    )
    .then(async (response) => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load that chapter.')
      return data
    })
    .catch((error) => {
      chapters.delete(key)
      throw error
    })

  chapters.set(key, pending)
  return pending
}

/**
 * One book, whole, off the same cache the reference lookup fills.
 *
 * The reader pages through chapters, so handing it the book rather than a
 * chapter means the first chapter costs a fetch and the other forty-nine cost
 * nothing — and a passage already looked up on the Presentation page is
 * already here, and the other way round, as long as both are reading the same
 * translation.
 */
export const getBook = (slug, version = DEFAULT_BIBLE_VERSION) => loadBook(slug, version)

/**
 * Folds away everything that stops a typed word matching a printed one: case,
 * the accents this translation sets on a handful of words, and the curly
 * quotes it uses throughout — somebody searching for "kaya't" types a straight
 * apostrophe, and the text has ’.
 *
 * Every substitution here replaces one character with one character, so an
 * index into the folded string is an index into the original. That is what
 * lets the reader highlight the matched span inside a verse it is showing
 * unfolded: fold, find, then slice the *original* at what was found.
 *
 * Exported for that, rather than copied there, so the rule that finds a match
 * and the rule that marks it cannot drift apart.
 */
export const foldText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, '-')

/**
 * The same fold with the run of the typed phrase tidied up — collapsing the
 * double space somebody leaves between two words, and the one they leave on
 * the end.
 *
 * For the needle only. Doing it to the haystack too would change its length
 * and so break the index foldText exists to keep honest.
 */
export const fold = (value) => foldText(value).replace(/\s+/g, ' ').trim()

/**
 * Verses containing a phrase.
 *
 * `slugs` is the search's whole cost: one book is instant and offline, because
 * the reader has already loaded it, while all sixty-six is five megabytes the
 * person has to ask for. So the caller decides the scope and this reports
 * progress rather than guessing at either.
 *
 * Books are fetched one at a time on purpose: sixty-six parallel requests on
 * church wifi is how you turn a search into a stall. The walk is in canonical
 * order, so `onProgress` can honestly say how far through the Bible it is.
 *
 * @param query      what was typed
 * @param slugs      which books to look in, in the order to look
 * @param options    version: which translation to read. A phrase is searched in
 *                   the translation on screen and no other — "lumakad" finds
 *                   nothing in the King James, and saying so is the honest
 *                   answer rather than quietly searching somewhere else.
 *                   limit: stop after this many hits.
 *                   onProgress({done, total, hits}): after each book.
 *                   isCancelled(): checked between books, to abandon the walk.
 * @returns {Promise<{hits: Array, truncated: boolean, cancelled: boolean, searched: number}>}
 */
export const searchBooks = async (query, slugs, options = {}) => {
  const { version = DEFAULT_BIBLE_VERSION, limit = 200, onProgress, isCancelled } = options
  const needle = fold(query)
  const hits = []
  let truncated = false
  let searched = 0

  if (needle.length < 2) return { hits, truncated, cancelled: false, searched }

  for (const slug of slugs) {
    if (isCancelled?.()) return { hits, truncated, cancelled: true, searched }

    let book
    try {
      book = await loadBook(slug, version)
    } catch {
      // One missing book must not end the search — the other sixty-five are
      // still worth reading.
      searched += 1
      onProgress?.({ done: searched, total: slugs.length, hits: hits.length })
      continue
    }

    book.chapters.forEach((chapter) => {
      chapter.verses.forEach((verse) => {
        if (hits.length >= limit) {
          truncated = true
          return
        }
        if (foldText(verse.text).includes(needle)) {
          hits.push({
            slug,
            book: book.book_localized || book.book || slug,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
          })
        }
      })
    })

    searched += 1
    onProgress?.({ done: searched, total: slugs.length, hits: hits.length })
    if (truncated) break
  }

  return { hits, truncated, cancelled: false, searched }
}

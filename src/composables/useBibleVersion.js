import { computed, ref, watch } from 'vue'
import { saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAuth } from './useAuth'
import { BIBLE_VERSIONS, DEFAULT_BIBLE_VERSION } from '../data/bibleBooks'

/**
 * Which translation this account reads.
 *
 * Against the account rather than the church, because a congregation is not of
 * one mind about this: the pastor reads the Tagalog, the youth worker reads the
 * King James, and the same office tablet serves both. It travels with the
 * account for the same reason the reading place does — a phone and a laptop
 * should agree — and it is remembered rather than asked for, because nobody
 * wants to pick a Bible twice.
 *
 * Deliberately separate from [[useBiblePlace]] even though both live in the
 * same preferences document: a place is a book and a chapter, which mean the
 * same thing in every translation, so switching translation keeps your place.
 */
const PREF_KEY = 'bibleVersion'

// A paint cache, so a cold start opens in the right translation instead of
// showing a chapter of Tagalog to somebody who reads English.
const cacheKey = (uid) => `uec.bibleVersion.${uid}`

const ids = new Set(BIBLE_VERSIONS.map((v) => v.id))

/** Rejects anything that is not a translation this build actually ships. */
const clean = (value) => (typeof value === 'string' && ids.has(value) ? value : null)

const readCache = (uid) => {
  try {
    return clean(localStorage.getItem(cacheKey(uid)))
  } catch {
    return null
  }
}

const writeCache = (uid, id) => {
  try {
    localStorage.setItem(cacheKey(uid), id)
  } catch {
    // The choice still goes to Firestore; only the head start is lost.
  }
}

const chosen = ref(null)
const uid = ref(null)

let started = false
let unsubscribe = null

/**
 * Starts following the signed-in account's translation. Self-starting on first
 * use rather than from main.js: only the Bible and the Presentation pages ask,
 * and a church that opens neither should not pay for the subscription.
 */
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
        chosen.value = null
        return
      }

      chosen.value = readCache(now)

      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        // A failed read leaves whatever is on screen alone rather than
        // switching the reader's Bible out from under them.
        if (!prefs) return
        const saved = clean(prefs[PREF_KEY])
        if (saved) {
          chosen.value = saved
          writeCache(now, saved)
        }
      })
    },
    { immediate: true }
  )
}

export function useBibleVersion() {
  start()

  /** The id to read from: the account's choice, or the church's default. */
  const version = computed(() => chosen.value || DEFAULT_BIBLE_VERSION)

  /** Its row in the table, for a name to show and a short code for the chip. */
  const versionMeta = computed(
    () => BIBLE_VERSIONS.find((v) => v.id === version.value) || BIBLE_VERSIONS[0]
  )

  const setVersion = (id) => {
    const next = clean(id)
    if (!next || next === chosen.value) return

    chosen.value = next
    if (!uid.value) return // Nobody to save it against; it lasts the session.
    writeCache(uid.value, next)
    saveUserPrefs(uid.value, { [PREF_KEY]: next }).catch((error) =>
      console.error('Error saving Bible translation:', error)
    )
  }

  return { version, versionMeta, versions: BIBLE_VERSIONS, setVersion }
}

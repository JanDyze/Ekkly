import { computed, ref, watch } from 'vue'
import { saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { listRemoteBibles } from '../api/bibleService'
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

/**
 * The licensed translations this deployment can reach, once the server has
 * said. Empty until it answers, and empty for good on a deployment with no
 * publisher key set — which is the ordinary case and the silent one.
 */
const remote = ref([])

/** Every translation on offer: the ones in the app, then any licensed ones. */
const all = computed(() => [...BIBLE_VERSIONS, ...remote.value])

/**
 * A saved preference is kept as it was written and checked only when it is
 * read, not when it arrives.
 *
 * The licensed translations are announced by the server a moment after the
 * saved choice comes back from Firestore, so validating on arrival would throw
 * away an "ESV" that is about to become valid — and the reader would be handed
 * the Tagalog with no sign anything had been ignored. Held raw, the choice
 * simply starts working the moment the list lands.
 */
const clean = (value) => (typeof value === 'string' && value ? value : null)

/** Whether a translation is one this deployment can actually serve now. */
const known = (id) => all.value.some((v) => v.id === id)

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

      // Asked once per session, and only once somebody is signed in: the route
      // is church-scoped and there is no token to reach it with before that.
      // A deployment with no publisher key answers with an empty list and this
      // never matters again.
      listRemoteBibles()
        .then((bibles) => {
          remote.value = bibles
        })
        .catch(() => {
          // Three translations and no explanation is the right failure here.
        })

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

  /**
   * The id to read from: the account's choice if this deployment can serve it,
   * otherwise the default. A church that had the ESV and then let the licence
   * lapse falls back to a Bible that still opens rather than to an error.
   */
  const version = computed(() =>
    chosen.value && known(chosen.value) ? chosen.value : DEFAULT_BIBLE_VERSION
  )

  /** Its row, for a name to show and a short code for the chip. */
  const versionMeta = computed(
    () => all.value.find((v) => v.id === version.value) || BIBLE_VERSIONS[0]
  )

  /** True while the Bible on screen is fetched rather than held in the app. */
  const isRemote = computed(() => versionMeta.value?.remote === true)

  const setVersion = (id) => {
    const next = clean(id)
    if (!next || !known(next) || next === chosen.value) return

    chosen.value = next
    if (!uid.value) return // Nobody to save it against; it lasts the session.
    writeCache(uid.value, next)
    saveUserPrefs(uid.value, { [PREF_KEY]: next }).catch((error) =>
      console.error('Error saving Bible translation:', error)
    )
  }

  return { version, versionMeta, isRemote, versions: all, setVersion }
}

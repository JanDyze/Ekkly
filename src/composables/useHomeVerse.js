import { ref, watch } from 'vue'
import { HOME_VERSES } from '../data/homeVerses'
import { DEFAULT_BIBLE_VERSION } from '../data/bibleBooks'
import { lookupReference } from '../api/bibleService'
import { useBibleVersion } from './useBibleVersion'

// A verse for the home of all apps' main card, picked at random from
// HOME_VERSES and read in the translation this person reads in.
//
// One per opening of the app rather than per visit to the home: going into an
// app and back out should find the same verse, the way the deck keeps its
// dismissed cards until the app is opened again. sessionStorage is that span;
// where it is blocked, a new verse each time the home is shown is no harm.
//
// The licensed translations (the ESV, the NIV) are fetched against a quota the
// whole deployment shares and must carry their notice under the text, which a
// card has no room for, so a reader of one of those sees the church's default
// here instead. The translations on disk also work with no connection.

const STORE = 'ekkly:home-verse'

const pick = () => {
  try {
    const kept = sessionStorage.getItem(STORE)
    if (kept && HOME_VERSES.includes(kept)) return kept
  } catch {
    // Nothing kept; pick afresh.
  }
  const chosen = HOME_VERSES[Math.floor(Math.random() * HOME_VERSES.length)]
  try {
    sessionStorage.setItem(STORE, chosen)
  } catch {
    // Not kept past this page; it is still today's verse here.
  }
  return chosen
}

export function useHomeVerse() {
  const { version, isRemote } = useBibleVersion()
  const reference = pick()

  /** `{ text, reference, version, slug, chapter }` once read; null until then, or if it cannot be. */
  const verse = ref(null)

  watch(
    () => (isRemote.value ? DEFAULT_BIBLE_VERSION : version.value),
    async (reading) => {
      const passage = await lookupReference(reference, reading)
      // A translation switched while this was loading has its own lookup coming.
      if (passage.error || reading !== (isRemote.value ? DEFAULT_BIBLE_VERSION : version.value)) return
      verse.value = {
        // Jesus's words open a quotation that closes verses later, so a verse
        // lifted out of them carries half a pair of speech marks. On a card
        // the verse is the quotation, so they go.
        text: passage.verses.map((v) => v.text).join(' ').replace(/[“”]/g, '').trim(),
        reference: passage.reference,
        version: passage.version,
        // Where it is in the reader, for the card to open.
        slug: passage.ref.slug,
        chapter: passage.ref.startChapter,
      }
    },
    { immediate: true }
  )

  return { verse }
}

// The translations that cannot be shipped in the app, and how to fetch one.
//
// Everything under public/bible/ is out of copyright, which is what lets it sit
// in the bundle's neighbourhood, read with the wifi off and cost the church
// nothing. The ESV and the NIV are neither of those things: both are licensed
// per use, both forbid storing the text, and both need a key that must never
// reach a browser. So they are fetched a chapter at a time, through here.
//
// What that costs, and why the reader has to behave differently for them:
//
//   - No offline. A passage arrives over the network or not at all, which is
//     exactly the failure the static translations exist to avoid. A church
//     projecting from one of these is a church whose reading stops when the
//     hall wifi does.
//   - No whole-Bible search. Searching a phrase means reading all 66 books,
//     and neither licence permits holding them.
//   - Quotas are per deployment, not per church. Crossway allows 5,000 queries
//     a day across this whole key, shared by every church on it.
//
// LICENSING, which no amount of code settles:
//
//   - ESV: the free key is NON-COMMERCIAL ONLY. Ekkly is sold to churches, so
//     using it here needs a commercial licence from Crossway
//     (https://www.crossway.org/permissions/). Crossway's terms also forbid
//     storing more than 500 verses or half a book, which the run sheet's
//     habit of saving a reading's words runs into.
//   - NIV: commercial use is NOT available through API.Bible's express
//     licensing at all. A commercial NIV needs a negotiated agreement with
//     Biblica (everywhere outside North America and Europe, the Philippines
//     included), HarperCollins Christian Publishing (US/Canada) or Hodder &
//     Stoughton (UK/EU).
//
// Neither translation appears in the app until its key is set, so an unlicensed
// deployment shows exactly what it did before.

/**
 * The licensed translations this knows how to fetch.
 *
 * `env` is what has to be set for one to appear at all. `copyright` is not
 * decoration — both publishers require the notice to be shown wherever their
 * text is, and the reader prints it under the chapter.
 */
export const REMOTE_BIBLES = {
  ESV: {
    id: 'ESV',
    name: 'English Standard Version',
    short: 'ESV',
    note: 'Read over the network, not stored',
    language: 'English',
    languageCode: 'en',
    provider: 'crossway',
    env: 'ESV_API_KEY',
    copyright:
      'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
    link: 'https://www.esv.org',
  },
  NIV: {
    id: 'NIV',
    name: 'New International Version',
    short: 'NIV',
    note: 'Read over the network, not stored',
    language: 'English',
    languageCode: 'en',
    provider: 'apibible',
    env: 'API_BIBLE_KEY',
    // API.Bible addresses each translation by an id belonging to the account
    // that licensed it, so it cannot be hard-coded here.
    idEnv: 'API_BIBLE_NIV_ID',
    copyright:
      'THE HOLY BIBLE, NEW INTERNATIONAL VERSION®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.',
    link: 'https://www.biblica.com',
  },
}

/**
 * API.Bible addresses books by their OSIS code rather than by name. Keyed by
 * the slug the rest of the app uses, so the two never have to be matched up by
 * spelling — "Song-of-Solomon" and "Song of Songs" are the same book and only
 * this table has to know it.
 */
const OSIS = {
  Genesis: 'GEN',
  Exodus: 'EXO',
  Leviticus: 'LEV',
  Numbers: 'NUM',
  Deuteronomy: 'DEU',
  Joshua: 'JOS',
  Judges: 'JDG',
  Ruth: 'RUT',
  '1-Samuel': '1SA',
  '2-Samuel': '2SA',
  '1-Kings': '1KI',
  '2-Kings': '2KI',
  '1-Chronicles': '1CH',
  '2-Chronicles': '2CH',
  Ezra: 'EZR',
  Nehemiah: 'NEH',
  Esther: 'EST',
  Job: 'JOB',
  Psalms: 'PSA',
  Proverbs: 'PRO',
  Ecclesiastes: 'ECC',
  'Song-of-Solomon': 'SNG',
  Isaiah: 'ISA',
  Jeremiah: 'JER',
  Lamentations: 'LAM',
  Ezekiel: 'EZK',
  Daniel: 'DAN',
  Hosea: 'HOS',
  Joel: 'JOL',
  Amos: 'AMO',
  Obadiah: 'OBA',
  Jonah: 'JON',
  Micah: 'MIC',
  Nahum: 'NAM',
  Habakkuk: 'HAB',
  Zephaniah: 'ZEP',
  Haggai: 'HAG',
  Zechariah: 'ZEC',
  Malachi: 'MAL',
  Matthew: 'MAT',
  Mark: 'MRK',
  Luke: 'LUK',
  John: 'JHN',
  Acts: 'ACT',
  Romans: 'ROM',
  '1-Corinthians': '1CO',
  '2-Corinthians': '2CO',
  Galatians: 'GAL',
  Ephesians: 'EPH',
  Philippians: 'PHP',
  Colossians: 'COL',
  '1-Thessalonians': '1TH',
  '2-Thessalonians': '2TH',
  '1-Timothy': '1TI',
  '2-Timothy': '2TI',
  Titus: 'TIT',
  Philemon: 'PHM',
  Hebrews: 'HEB',
  James: 'JAS',
  '1-Peter': '1PE',
  '2-Peter': '2PE',
  '1-John': '1JN',
  '2-John': '2JN',
  '3-John': '3JN',
  Jude: 'JUD',
  Revelation: 'REV',
}

/** Crossway wants a name it can parse; the slug's hyphens are not that. */
const plainName = (slug) => String(slug || '').replace(/-/g, ' ')

/** Which licensed translations this deployment is actually able to serve. */
export const configuredRemotes = () =>
  Object.values(REMOTE_BIBLES)
    .filter((bible) => {
      if (!process.env[bible.env]) return false
      // API.Bible needs the translation's own id as well as the account key;
      // without it the key alone can serve nothing.
      if (bible.idEnv && !process.env[bible.idEnv]) return false
      return true
    })
    .map(({ id, name, short, note, language, languageCode, copyright, link }) => ({
      id,
      name,
      short,
      note,
      language,
      languageCode,
      copyright,
      link,
      // The reader keys everything else off this: no offline, no whole-Bible
      // search, and a copyright line under the chapter.
      remote: true,
    }))

/**
 * Turns the ESV text endpoint's output into verses.
 *
 * It answers with one run of prose per passage, verse numbers inline in square
 * brackets — "[1] In the beginning... [2] The earth was...". Splitting on the
 * brackets is the whole job; the chapter is known because only one is ever
 * asked for at a time.
 */
const versesFromEsvText = (text, chapter) => {
  const verses = []
  const pattern = /\[(\d+)\]\s*/g
  let match = pattern.exec(text)

  while (match) {
    const number = Number(match[1])
    const from = match.index + match[0].length
    const next = pattern.exec(text)
    const body = text.slice(from, next ? next.index : text.length)
    const cleaned = body.replace(/\s+/g, ' ').trim()
    if (cleaned) verses.push({ chapter, verse: number, text: cleaned })
    match = next
  }

  return verses
}

/** One chapter of the ESV, from Crossway. */
const fetchCrossway = async (bible, { slug, chapter }) => {
  const query = `${plainName(slug)} ${chapter}`
  const url =
    'https://api.esv.org/v3/passage/text/?' +
    new URLSearchParams({
      q: query,
      'include-passage-references': 'false',
      'include-verse-numbers': 'true',
      'include-first-verse-numbers': 'true',
      'include-footnotes': 'false',
      'include-footnote-body': 'false',
      'include-headings': 'false',
      'include-short-copyright': 'false',
      'indent-paragraphs': '0',
      'indent-poetry': 'false',
    })

  const response = await fetch(url, {
    headers: { Authorization: `Token ${process.env[bible.env]}` },
  })

  if (response.status === 401 || response.status === 403) {
    throw Object.assign(new Error('The ESV key was rejected.'), { status: 502 })
  }
  if (response.status === 429) {
    throw Object.assign(new Error('The ESV daily limit has been reached.'), { status: 429 })
  }
  if (!response.ok) {
    throw Object.assign(new Error('The ESV service did not answer.'), { status: 502 })
  }

  const data = await response.json()
  const passage = (data.passages || []).join('\n')
  return versesFromEsvText(passage, chapter)
}

/** One chapter from API.Bible, which is how the NIV is reached. */
const fetchApiBible = async (bible, { slug, chapter }) => {
  const book = OSIS[slug]
  if (!book) throw Object.assign(new Error('That book is not available.'), { status: 404 })

  const bibleId = process.env[bible.idEnv]
  const url =
    `https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(bibleId)}` +
    `/chapters/${encodeURIComponent(`${book}.${chapter}`)}?` +
    new URLSearchParams({
      'content-type': 'text',
      'include-notes': 'false',
      'include-titles': 'false',
      'include-chapter-numbers': 'false',
      'include-verse-numbers': 'true',
      'include-verse-spans': 'false',
    })

  const response = await fetch(url, { headers: { 'api-key': process.env[bible.env] } })

  if (response.status === 401 || response.status === 403) {
    throw Object.assign(new Error('The API.Bible key was rejected, or this translation is not licensed to it.'), {
      status: 502,
    })
  }
  if (response.status === 429) {
    throw Object.assign(new Error('The API.Bible limit has been reached.'), { status: 429 })
  }
  if (!response.ok) {
    throw Object.assign(new Error('The Bible service did not answer.'), { status: 502 })
  }

  const data = await response.json()
  // Its text form marks verses the same way the ESV does, so the same reading
  // works — the difference between the two providers is the request, not the
  // shape of what comes back.
  return versesFromEsvText(String(data?.data?.content || ''), chapter)
}

const PROVIDERS = { crossway: fetchCrossway, apibible: fetchApiBible }

/**
 * One chapter of a licensed translation.
 *
 * A chapter rather than a book, and a book never: the longest chapter is well
 * inside what either licence permits per request, and a whole book is not.
 *
 * @param id       a key of REMOTE_BIBLES
 * @param slug     the book, as the app spells it
 * @param chapter  which chapter
 * @returns {Promise<{version, chapter, verses, copyright, link}>}
 */
export const fetchRemoteChapter = async (id, { slug, chapter }) => {
  const bible = REMOTE_BIBLES[id]
  if (!bible) throw Object.assign(new Error('No such translation.'), { status: 404 })
  if (!process.env[bible.env] || (bible.idEnv && !process.env[bible.idEnv])) {
    throw Object.assign(new Error(`${bible.name} is not set up on this server.`), { status: 503 })
  }

  const number = Number(chapter)
  if (!Number.isInteger(number) || number < 1 || number > 150) {
    throw Object.assign(new Error('That is not a chapter.'), { status: 400 })
  }
  if (!OSIS[slug]) throw Object.assign(new Error('No such book.'), { status: 404 })

  const verses = await PROVIDERS[bible.provider](bible, { slug, chapter: number })
  if (!verses.length) {
    throw Object.assign(new Error('That chapter came back empty.'), { status: 502 })
  }

  return {
    version: bible.id,
    chapter: number,
    verses,
    copyright: bible.copyright,
    link: bible.link,
  }
}

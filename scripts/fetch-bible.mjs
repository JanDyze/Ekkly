/**
 * Installs a public-domain English translation from api.getbible.net.
 *
 *   node scripts/fetch-bible.mjs WEB
 *   node scripts/fetch-bible.mjs KJV
 *   node scripts/fetch-bible.mjs          # every translation in the catalogue
 *
 * The Tagalog text has to be scraped, one request per chapter, and is
 * copyrighted — hence scripts/scrape_bible.py, the 190 MB working directory
 * and the gitignore rule. English is nothing like that hard: these
 * translations are out of copyright, and get.bible serves each one whole in a
 * single 9 MB request. So there is no scrape to keep, and the output is
 * committed like any other asset.
 *
 * What comes out is exactly what sync-bible.mjs produces for the Tagalog:
 * public/bible/<ID>/<Book>.json, one file per book, minified and fetched on
 * demand, plus an index.json describing the translation. The reader cannot
 * tell which script put a translation there, and that is the point.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeBibleTable } from './bible-table.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The English translations worth offering, and what get.bible calls each.
 *
 * All four are public domain, which is the whole reason they can be shipped
 * inside the app rather than called out to at runtime: no licence to buy per
 * church, no key to rotate, no rate limit to fall foul of five minutes before
 * a service. The modern-copyright translations — NIV, ESV, NLT — are none of
 * those things, and would have to be fetched live from a licensed API.
 *
 * `short` is what fits in the chip in the corner of the reader.
 */
const CATALOGUE = {
  WEB: {
    source: 'web',
    name: 'World English Bible',
    short: 'WEB',
    note: 'Modern English, public domain',
  },
  KJV: {
    source: 'kjv',
    name: 'King James Version',
    short: 'KJV',
    note: 'The 1611 translation',
  },
  ASV: {
    source: 'asv',
    name: 'American Standard Version',
    short: 'ASV',
    note: 'A literal 1901 revision',
  },
  BBE: {
    source: 'basicenglish',
    name: 'Bible in Basic English',
    short: 'BBE',
    note: 'A 1,000-word vocabulary',
  },
}

/** Which of them ship by default. The other two are a one-line command away. */
const SHIPPED = ['WEB', 'KJV']

/**
 * Where get.bible's name for a book is not simply the canonical slug with its
 * spaces hyphenated. Only one is, but the reader addresses books by filename,
 * so a translation that wrote Song-of-Songs.json would be a book the picker
 * could not open.
 */
const SLUGS = { 'Song of Songs': 'Song-of-Solomon' }

const slugOf = (name) => SLUGS[name] || name.replace(/ /g, '-')

/** The Hebrew scriptures are the first 39 of the 66; the rest is the New. */
const testamentOf = (nr) => (nr <= 39 ? 'OT' : 'NT')

const install = async (id) => {
  const entry = CATALOGUE[id]
  if (!entry) {
    console.error(`No translation called ${id}. Try one of: ${Object.keys(CATALOGUE).join(', ')}`)
    process.exitCode = 1
    return
  }

  const url = `https://api.getbible.net/v2/${entry.source}.json`
  process.stdout.write(`${id}: fetching ${url} … `)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  const data = await response.json()
  console.log(`${data.books.length} books`)

  const out = join(root, 'public', 'bible', id)
  if (existsSync(out)) rmSync(out, { recursive: true })
  mkdirSync(out, { recursive: true })

  let bytes = 0
  let verseCount = 0

  const books = data.books.map((book) => {
    const slug = slugOf(book.name)

    // Only the verses travel. get.bible repeats the reference on every single
    // verse — "John 3:16" as a string, next to the chapter number that is
    // already the key above it — and dropping that is most of the saving.
    const payload = JSON.stringify({
      version: id,
      book: book.name,
      book_localized: book.name,
      chapters: book.chapters.map((chapter) => ({
        chapter: chapter.chapter,
        verses: chapter.verses.map((verse) => ({
          verse: verse.verse,
          // The source leaves a trailing space on most verses, from the markup
          // it was converted out of. Harmless in a paragraph, but it shows up
          // as a gap before the punctuation on a projected slide.
          text: String(verse.text).replace(/\s+/g, ' ').trim(),
        })),
      })),
    })

    writeFileSync(join(out, `${slug}.json`), payload)
    bytes += payload.length

    const verses = book.chapters.reduce((total, c) => total + c.verses.length, 0)
    verseCount += verses

    return {
      slug,
      en: book.name,
      name: book.name,
      testament: testamentOf(book.nr),
      chapters: book.chapters.length,
      verses,
    }
  })

  writeFileSync(
    join(out, 'index.json'),
    JSON.stringify({
      version: id,
      name: entry.name,
      short: entry.short,
      note: entry.note,
      language: 'English',
      languageCode: 'en',
      book_count: books.length,
      verse_count: verseCount,
      books,
    })
  )

  console.log(
    `${id}: ${books.length} books, ${verseCount} verses -> public/bible/${id}/ ` +
      `(${(bytes / 1024 / 1024).toFixed(1)} MB minified)`
  )
}

const wanted = process.argv.slice(2).map((arg) => arg.toUpperCase())
for (const id of wanted.length ? wanted : SHIPPED) await install(id)

writeBibleTable()

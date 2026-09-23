<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SearchX,
  X,
} from '../icons'
import { BIBLE_BOOKS } from '../data/bibleBooks'
import { fold, foldText, getBook, searchBooks } from '../api/bibleService'
import { parseReference, formatReference, bookName } from '../utils/bibleRef'
import { useBiblePlace } from '../composables/useBiblePlace'
import { useBibleVersion } from '../composables/useBibleVersion'
import SearchBar from '../components/common/SearchBar.vue'
import { useScrollLock } from '../composables/useScrollLock'

/**
 * Reading the Bible, as opposed to looking a verse up to put on a wall.
 *
 * The Presentation page already had the translation and the reference parser;
 * what it did not have was anywhere to simply read. Both go through the same
 * cached books, so a passage found here is already loaded there on Sunday, and
 * the other way round.
 *
 * The page is a reader first: a chapter of text, and a way to the next one.
 * Everything else — the picker, the translation, the search — stays folded
 * away until it is asked for, because the common case is opening the app to
 * carry on.
 */
const route = useRoute()
const router = useRouter()
const { place, remember } = useBiblePlace()
const { version, versionMeta, versions, setVersion } = useBibleVersion()

const bookBySlug = new Map(BIBLE_BOOKS.map((b) => [b.slug, b]))

/** A book's name in the translation being read: "Mga Awit", or "Psalms". */
const nameOf = (slug) => bookName(bookBySlug.get(slug), version.value)

/* ---------- where we are ---------- */

/**
 * The route is the truth, but it is allowed to say nothing: /bible means
 * "carry on from last time", and only when there is nothing to carry on from
 * does it mean Genesis 1.
 *
 * Which is why the address is left as /bible rather than rewritten to the
 * chapter it resolved to. The remembered place arrives from Firestore a moment
 * after the first paint, and a URL rewritten before it lands would pin the
 * reader to Genesis and then ignore the answer when it came.
 */
const current = computed(() => {
  const slug = bookBySlug.has(route.params.slug) ? route.params.slug : null
  if (!slug) return place.value || { slug: 'Genesis', chapter: 1 }

  const max = bookBySlug.get(slug).chapters
  const asked = Number(route.params.chapter)
  const chapter = Number.isInteger(asked) && asked >= 1 && asked <= max ? asked : 1
  return { slug, chapter }
})

/** The open book, carrying the name the translation being read gives it. */
const meta = computed(() => {
  const book = bookBySlug.get(current.value.slug)
  return { ...book, name: bookName(book, version.value) }
})

/** Every chapter there is, in order, so turning a page can cross a book. */
const spine = BIBLE_BOOKS.flatMap((b) =>
  Array.from({ length: b.chapters }, (_, i) => ({ slug: b.slug, chapter: i + 1 }))
)
const spineIndex = new Map(spine.map((spot, i) => [spot.slug + ':' + spot.chapter, i]))

const at = computed(() => spineIndex.get(current.value.slug + ':' + current.value.chapter) ?? 0)
const previous = computed(() => spine[at.value - 1] || null)
const next = computed(() => spine[at.value + 1] || null)

const labelOf = (spot) => (spot ? nameOf(spot.slug) + ' ' + spot.chapter : '')

/**
 * `replace` for turning a page, `push` for a jump.
 *
 * Reading ten chapters should not leave ten entries for the back button to
 * walk out of one at a time. Landing somewhere from a search result is the
 * opposite: that is a place you can arrive at by mistake, and backing out of
 * it should return you to what you were reading.
 */
const goTo = (slug, chapter, { jump = false } = {}) => {
  const to = { name: 'Bible', params: { slug, chapter: String(chapter) } }
  if (jump) router.push(to)
  else router.replace(to)
}

/* ---------- the text ---------- */

const chapters = ref([])
const loading = ref(true)
const error = ref('')

// Which verse to light up on arrival, when we got here from a reference or a
// result rather than by turning a page.
const highlighted = ref(null)
const readerRef = ref(null)

let loadToken = 0

const loadCurrentBook = async () => {
  const slug = current.value.slug
  const token = ++loadToken
  loading.value = true
  error.value = ''

  try {
    const book = await getBook(slug, version.value)
    if (token !== loadToken) return // A faster tap overtook this one.
    chapters.value = book.chapters
  } catch {
    if (token !== loadToken) return
    chapters.value = []
    error.value = 'Could not load ' + (nameOf(slug) || slug) + '. Check your connection.'
  } finally {
    if (token === loadToken) loading.value = false
  }
}

const verses = computed(
  () => chapters.value.find((c) => c.chapter === current.value.chapter)?.verses || []
)

let fadeTimer = null

/** Puts the reader at the top of the chapter, or on the verse that was named. */
const settle = async () => {
  await nextTick()
  const verse = highlighted.value
  const target = verse ? readerRef.value?.querySelector('[data-verse="' + verse + '"]') : null

  if (!target) {
    // Either nothing was named, or the book is still being fetched and its
    // verses have yet to arrive. In the second case this runs again when they
    // do — so the mark has to survive until then, which is why the fade below
    // is started only once there is something to fade.
    readerRef.value?.scrollTo({ top: 0 })
    return
  }

  target.scrollIntoView({ block: 'center' })

  // The mark is for finding your line on arrival, not for keeping. Left up, it
  // reads as something the verse itself carries.
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => (highlighted.value = null), 2600)
}

// The chapter is fetched again when the translation changes: same place,
// different words. Keeping the place translation-independent is what lets
// somebody compare a verse by switching and switching back.
watch([() => current.value.slug, version], loadCurrentBook, { immediate: true })

watch(
  () => [current.value.slug, current.value.chapter].join(':'),
  () => {
    // Only an explicit navigation is worth saving. At bare /bible the chapter
    // on screen may still be the Genesis 1 stand-in shown while the remembered
    // place is in flight, and saving that would overwrite the very thing being
    // waited for.
    if (route.params.slug) remember(current.value.slug, current.value.chapter)
    settle()
  },
  { immediate: true }
)

// A freshly fetched book has no verses to scroll to until they arrive, so
// arrival is settled again once they do.
watch(verses, settle)

onBeforeUnmount(() => clearTimeout(fadeTimer))

const turn = (spot) => {
  if (!spot) return
  highlighted.value = null
  goTo(spot.slug, spot.chapter)
}

/* ---------- the picker ---------- */

const pickerOpen = ref(false)
// The reader behind holds still while the picker is up.
useScrollLock(pickerOpen)
// null while books are being shown, a slug once one is chosen and its chapters
// have taken their place.
const picking = ref(null)

const openPicker = () => {
  picking.value = current.value.slug
  pickerOpen.value = true
}

/* ---------- the translation ---------- */

const versionOpen = ref(false)
useScrollLock(versionOpen)

const chooseVersion = (id) => {
  versionOpen.value = false
  setVersion(id)
}

/**
 * The translations grouped under their language, in the order the table lists
 * them — which puts the default first, so a church that has never touched this
 * sees its own Bible at the top.
 */
const languages = computed(() => {
  const groups = new Map()
  versions.forEach((entry) => {
    if (!groups.has(entry.language)) groups.set(entry.language, [])
    groups.get(entry.language).push(entry)
  })
  return [...groups].map(([language, entries]) => ({ language, entries }))
})

const testaments = [
  { key: 'OT', label: 'Old Testament' },
  { key: 'NT', label: 'New Testament' },
]
const booksIn = (key) => BIBLE_BOOKS.filter((b) => b.testament === key)

const chooseBook = (book) => {
  // A one-chapter book has nothing to choose, so the second step is skipped
  // rather than shown with a single button sitting in it.
  if (book.chapters === 1) {
    pickerOpen.value = false
    highlighted.value = null
    goTo(book.slug, 1, { jump: true })
    return
  }
  picking.value = book.slug
}

const chooseChapter = (chapter) => {
  pickerOpen.value = false
  highlighted.value = null
  goTo(picking.value, chapter, { jump: true })
}

/* ---------- search ---------- */

const query = ref('')
const searchOpen = ref(false)
const searching = ref(false)
const results = ref([])
const truncated = ref(false)
// null unless a whole-Bible search is running, {done, total} while one is.
const progress = ref(null)
const scope = ref('book')

const typed = computed(() => query.value.trim())
const searchable = computed(() => typed.value.length >= 2)

/** The reference the box holds, if it holds one. Never touches the network. */
const jumpTo = computed(() => {
  if (!typed.value) return null
  const parsed = parseReference(typed.value, version.value)
  return parsed.error ? null : parsed.ref
})

let searchToken = 0
let debounce = null

const runSearch = async (slugs, nextScope) => {
  const token = ++searchToken
  scope.value = nextScope
  searching.value = true
  results.value = []
  truncated.value = false
  progress.value = nextScope === 'all' ? { done: 0, total: slugs.length } : null

  const outcome = await searchBooks(typed.value, slugs, {
    version: version.value,
    isCancelled: () => token !== searchToken,
    onProgress: ({ done, total }) => {
      if (token === searchToken && nextScope === 'all') progress.value = { done, total }
    },
  })

  if (token !== searchToken) return
  results.value = outcome.hits
  truncated.value = outcome.truncated
  searching.value = false
  progress.value = null
}

const searchWholeBible = () =>
  runSearch(
    BIBLE_BOOKS.map((b) => b.slug),
    'all'
  )

// Searching the open book costs nothing — it is already in memory — so it runs
// as you type, and works with the network down. The other sixty-five are five
// megabytes, and are only fetched when somebody asks for them by name.
//
// A change of translation re-runs it rather than clearing it: the words are
// different, so the hits are different, and leaving the old ones up would
// attribute Tagalog verses to the King James.
watch([typed, () => current.value.slug, version], () => {
  clearTimeout(debounce)
  searchToken += 1
  searching.value = false
  progress.value = null

  if (!searchable.value) {
    results.value = []
    truncated.value = false
    return
  }

  debounce = setTimeout(() => runSearch([current.value.slug], 'book'), 250)
})

onBeforeUnmount(() => clearTimeout(debounce))

const clearSearch = () => {
  query.value = ''
  searchToken += 1
  clearTimeout(debounce)
  results.value = []
  truncated.value = false
  searching.value = false
  progress.value = null
  searchOpen.value = false
}

/** Following a reference or a result empties the box, so reading resumes. */
const leaveFor = (slug, chapter, verse) => {
  clearSearch()
  highlighted.value = verse ?? null
  goTo(slug, chapter, { jump: true })
}

const followReference = () => {
  const target = jumpTo.value
  if (target) leaveFor(target.slug, target.startChapter, target.startVerse)
}

const openResult = (hit) => leaveFor(hit.slug, hit.chapter, hit.verse)

/**
 * A hit shown with its match marked, so a page of results can be skimmed
 * instead of read. Found in the folded text but sliced out of the original, so
 * what appears keeps its accents and its punctuation — which only works
 * because foldText replaces characters one for one. `fold` would collapse the
 * verse's whitespace and slide every index after it along.
 */
const marked = (text) => {
  const needle = fold(typed.value)
  const found = foldText(text).indexOf(needle)
  if (!needle || found < 0) return [{ text, hit: false }]
  return [
    { text: text.slice(0, found), hit: false },
    { text: text.slice(found, found + needle.length), hit: true },
    { text: text.slice(found + needle.length), hit: false },
  ].filter((part) => part.text)
}

/** Results stand in for the reader; you are looking at one or the other. */
const showingResults = computed(() => searchable.value)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Where you are, and the one box that takes you anywhere else. This is
         the page's only header — the app bar is hidden here — so on a phone,
         where the layout gives no padding of its own, it sets its own top
         margin rather than sitting against the edge of the screen. -->
    <div
      class="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 pb-2 pt-3 dark:border-gray-700 sm:px-0 sm:pt-0"
    >
      <button
        v-if="!searchOpen"
        @click="openPicker"
        class="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
        title="Choose a book and chapter"
      >
        <BookOpen class="h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
        <span class="truncate text-base font-bold text-gray-900 dark:text-white">
          {{ meta.name }} {{ current.chapter }}
        </span>
        <ChevronDown class="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      <div class="flex flex-1 items-center justify-end gap-2">
        <!-- The translation, as the short code a reader recognises. It sits
             beside the search rather than inside the picker because switching
             is something you do while reading a verse, not while going to find
             one — and it hides with the book name when the search takes the
             row over on a phone. -->
        <button
          v-if="!searchOpen"
          @click="versionOpen = true"
          class="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-bold tracking-wide text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          :title="versionMeta.name"
        >
          {{ versionMeta.short }}
        </button>

        <SearchBar
          v-model="query"
          v-model:open="searchOpen"
          placeholder="Juan 3:16, or a phrase to find"
        />
      </div>
    </div>

    <!-- Results, in the reader's place rather than floating over it. -->
    <div v-if="showingResults" class="min-h-0 flex-1 overflow-y-auto pb-bar! px-3 py-3 sm:px-0">
      <!-- A typed reference is the fastest thing the box can hold, so it sits
           above whatever the same words happen to match. -->
      <button
        v-if="jumpTo"
        @click="followReference"
        class="mb-3 flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10 dark:border-primary-light/30 dark:bg-primary-light/10 dark:hover:bg-primary-light/20"
      >
        <BookOpen class="h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
          Go to {{ formatReference(jumpTo) }}
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="min-w-0 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
          <template v-if="searching && progress">
            Reading {{ progress.done }} of {{ progress.total }} books…
          </template>
          <template v-else-if="searching">Searching {{ meta.name }}…</template>
          <template v-else>
            {{ results.length }}{{ truncated ? '+' : '' }}
            {{ results.length === 1 ? 'verse' : 'verses' }}
            in {{ scope === 'all' ? 'the whole Bible' : meta.name }}
          </template>
        </p>
        <button
          v-if="scope === 'book' && !searching"
          @click="searchWholeBible"
          class="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/10"
        >
          Search all 66 books
        </button>
      </div>

      <div v-if="searching && !results.length" class="flex items-center justify-center py-10">
        <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
      </div>

      <div
        v-else-if="!results.length"
        class="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-600"
      >
        <SearchX class="mx-auto h-5 w-5 text-gray-400" />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Nothing in {{ scope === 'all' ? 'the Bible' : meta.name }} matches “{{ typed }}”.
        </p>
        <button
          v-if="scope === 'book'"
          @click="searchWholeBible"
          class="mt-2 text-xs font-semibold text-primary hover:underline dark:text-primary-light"
        >
          Try the whole Bible
        </button>
      </div>

      <ul v-else class="space-y-1">
        <li v-for="hit in results" :key="hit.slug + hit.chapter + '-' + hit.verse">
          <button
            @click="openResult(hit)"
            class="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
          >
            <span class="block text-[11px] font-semibold text-primary dark:text-primary-light">
              {{ hit.book }} {{ hit.chapter }}:{{ hit.verse }}
            </span>
            <span class="mt-0.5 block text-sm leading-relaxed text-gray-700 dark:text-gray-300"
              ><span
                v-for="(part, i) in marked(hit.text)"
                :key="i"
                :class="part.hit ? 'rounded bg-yellow-200 font-semibold dark:bg-yellow-500/30' : ''"
                >{{ part.text }}</span
              ></span
            >
          </button>
        </li>
      </ul>
    </div>

    <!-- The reader -->
    <div v-else ref="readerRef" class="min-h-0 flex-1 overflow-y-auto pb-bar! px-3 py-4 sm:px-0">
      <div v-if="loading" class="mx-auto max-w-prose space-y-3">
        <div
          v-for="n in 8"
          :key="n"
          class="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          :style="{ width: 70 + ((n * 7) % 30) + '%' }"
        />
      </div>

      <div
        v-else-if="error"
        class="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-600"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ error }}</p>
        <button
          @click="loadCurrentBook"
          class="mt-2 text-xs font-semibold text-primary hover:underline dark:text-primary-light"
        >
          Try again
        </button>
      </div>

      <!-- One column, held to a readable measure. A Bible set across a 1400px
           laptop is a Bible nobody finishes a chapter of. -->
      <article v-else class="mx-auto max-w-prose">
        <h1 class="mb-3 text-lg font-bold text-gray-900 dark:text-white">
          {{ meta.name }} {{ current.chapter }}
          <span class="ml-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            {{ versionMeta.short }}
          </span>
        </h1>

        <p
          v-for="verse in verses"
          :key="verse.verse"
          :data-verse="verse.verse"
          :class="[
            '-mx-1 rounded px-1 py-0.5 text-[15px] leading-[1.75] text-gray-800 transition-colors duration-1000 dark:text-gray-200',
            highlighted === verse.verse ? 'bg-yellow-100 dark:bg-yellow-500/20' : '',
          ]"
        >
          <span class="mr-1 align-super text-[10px] font-bold text-gray-400 dark:text-gray-500">
            {{ verse.verse }}
          </span>
          {{ verse.text }}
        </p>
      </article>
    </div>

    <!-- Turning the page. It crosses a book boundary on purpose: reading
         straight through is what this is for, and stopping dead at the end of
         Juan to go and find Gawa in a picker is not reading. -->
    <div
      v-if="!showingResults"
      class="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 dark:border-gray-700 sm:px-0 sm:pb-0"
    >
      <button
        v-if="previous"
        @click="turn(previous)"
        class="flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
      >
        <ChevronLeft class="h-4 w-4 shrink-0" />
        <span class="truncate">{{ labelOf(previous) }}</span>
      </button>
      <span v-else />

      <button
        v-if="next"
        @click="turn(next)"
        class="flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
      >
        <span class="truncate">{{ labelOf(next) }}</span>
        <ChevronRight class="h-4 w-4 shrink-0" />
      </button>
      <span v-else />
    </div>

    <!-- Book, then chapter.
         z-80 is the house level for a sheet a page puts up, and it has to be
         above z-50: that is the bottom bar, which is a sibling of this whole
         view and therefore paints over anything that merely ties with it. -->
    <Transition name="sheet">
      <div
        v-if="pickerOpen"
        class="fixed inset-0 z-80 flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a book and chapter"
      >
        <div class="absolute inset-0 bg-black/40" @click="pickerOpen = false" />
        <div
          class="sheet-panel relative z-10 flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:max-w-lg sm:rounded-2xl sm:border"
        >
          <div
            class="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700"
          >
            <button
              v-if="picking"
              @click="picking = null"
              class="-ml-1 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Back to the books"
            >
              <ChevronLeft class="h-5 w-5" />
            </button>
            <h2 class="flex-1 truncate text-sm font-bold text-gray-900 dark:text-white">
              {{ picking ? nameOf(picking) : 'Choose a book' }}
            </h2>
            <button
              @click="pickerOpen = false"
              class="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- The sheet now covers the bottom bar, so its own last row is what
               sits over the phone's home indicator and has to clear it. -->
          <div
            v-if="picking"
            class="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4"
          >
            <div class="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              <button
                v-for="n in bookBySlug.get(picking).chapters"
                :key="n"
                @click="chooseChapter(n)"
                :class="[
                  'grid h-9 place-items-center rounded-lg text-sm font-medium tabular-nums transition-colors',
                  picking === current.slug && n === current.chapter
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
                ]"
              >
                {{ n }}
              </button>
            </div>
          </div>

          <div
            v-else
            class="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4"
          >
            <div v-for="t in testaments" :key="t.key" class="mb-4 last:mb-0">
              <p
                class="mb-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500"
              >
                {{ t.label }}
              </p>
              <div class="grid grid-cols-2 gap-1 sm:grid-cols-3">
                <button
                  v-for="book in booksIn(t.key)"
                  :key="book.slug"
                  @click="chooseBook(book)"
                  :class="[
                    'truncate rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors',
                    book.slug === current.slug
                      ? 'bg-primary/10 text-primary dark:bg-primary-light/10 dark:text-primary-light'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                  ]"
                >
                  {{ bookName(book, version) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Which translation to read. Grouped by language, because that is the
         choice somebody is actually making — the difference between the King
         James and the World English is a matter of taste, but the difference
         between English and Tagalog is the difference between a Bible you can
         read and one you cannot. -->
    <Transition name="sheet">
      <div
        v-if="versionOpen"
        class="fixed inset-0 z-80 flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a translation"
      >
        <div class="absolute inset-0 bg-black/40" @click="versionOpen = false" />
        <div
          class="sheet-panel relative z-10 flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:max-w-sm sm:rounded-2xl sm:border"
        >
          <div
            class="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700"
          >
            <h2 class="flex-1 truncate text-sm font-bold text-gray-900 dark:text-white">
              Choose a translation
            </h2>
            <button
              @click="versionOpen = false"
              class="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div
            class="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3"
          >
            <div v-for="group in languages" :key="group.language" class="mb-3 last:mb-0">
              <p
                class="mb-1.5 px-1 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500"
              >
                {{ group.language }}
              </p>
              <button
                v-for="entry in group.entries"
                :key="entry.id"
                @click="chooseVersion(entry.id)"
                :class="[
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                  entry.id === version
                    ? 'bg-primary/10 dark:bg-primary-light/10'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                ]"
              >
                <span class="min-w-0 flex-1">
                  <span
                    :class="[
                      'block truncate text-sm font-semibold',
                      entry.id === version
                        ? 'text-primary dark:text-primary-light'
                        : 'text-gray-900 dark:text-white',
                    ]"
                  >
                    {{ entry.name }}
                  </span>
                  <span class="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {{ entry.note }}
                  </span>
                </span>
                <Check
                  v-if="entry.id === version"
                  class="h-4 w-4 shrink-0 text-primary dark:text-primary-light"
                />
              </button>
            </div>

            <!-- Said once, quietly, where somebody choosing a Bible can see it:
                 every translation here is free to reproduce, which is why they
                 can be read with the wifi off and at no cost to the church. -->
            <p class="px-3 pt-1 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
              Each one is stored in the app, so it reads with no connection.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: scale(0.96);
  }
}
</style>

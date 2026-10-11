<script setup>
import { computed, ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import BibleBar from './BibleBar.vue'
import BibleReader from './BibleReader.vue'
import BibleSheet from './BibleSheet.vue'
import { PSALM_23, ROMANS_8 } from './verses'

// Scene: any chapter in two taps. The book's name at the top is tapped, the
// books come up, Romans is chosen, its chapters take their place, and 8 opens
// it: the same two steps as the page's own picker.

const BOOKS = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
]
// Romans has sixteen chapters.
const CHAPTERS = Array.from({ length: 16 }, (_, i) => i + 1)

const tapBook = ref(false)
const open = ref(false)
const book = ref(null)
const chapter = ref(null)
const opened = ref(false)
const { at } = useSceneTimeline()

at(900, () => (tapBook.value = true))
at(1150, () => (open.value = true))
at(2050, () => (book.value = 'Romans'))
at(2350, () => (open.value = 'chapters'))
at(3100, () => (chapter.value = 8))
at(3450, () => {
  open.value = false
  tapBook.value = false
  opened.value = true
})

const reading = computed(() =>
  opened.value
    ? { book: 'Romans', chapter: 8, verses: ROMANS_8, previous: 'Romans 7', next: 'Romans 9' }
    : { book: 'Psalms', chapter: 23, verses: PSALM_23.KJV, previous: 'Psalms 22', next: 'Psalms 24' }
)
</script>

<template>
  <div class="relative flex h-full flex-col">
    <BibleBar class="st-rise" :book="reading.book" :chapter="reading.chapter" :tap-book="tapBook" />

    <BibleReader
      :key="reading.book"
      :book="reading.book"
      :chapter="reading.chapter"
      :verses="reading.verses"
      :previous="reading.previous"
      :next="reading.next"
    />

    <BibleSheet :open="!!open" :title="open === 'chapters' ? 'Romans' : 'Choose a book'" :back="open === 'chapters'">
      <div v-if="open === 'chapters'" class="grid grid-cols-6 gap-1.5 p-4">
        <span
          v-for="n in CHAPTERS"
          :key="n"
          :style="{ '--d': `${n * 18}ms` }"
          :class="[
            'st-pop relative grid h-9 place-items-center rounded-lg text-sm font-medium tabular-nums',
            chapter === n ? 'st-tap st-filled bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
          ]"
        >
          {{ n }}
        </span>
      </div>

      <div v-else class="p-4">
        <p class="mb-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">New Testament</p>
        <div class="grid grid-cols-2 gap-1">
          <span
            v-for="name in BOOKS"
            :key="name"
            :class="[
              'relative truncate rounded-lg px-2 py-1.5 text-xs font-medium',
              book === name ? 'st-tap bg-primary/10 text-primary dark:bg-primary-light/10 dark:text-primary-light' : 'text-gray-700 dark:text-gray-300',
            ]"
          >
            {{ name }}
          </span>
        </div>
      </div>
    </BibleSheet>
  </div>
</template>

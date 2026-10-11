<script setup>
import { onUnmounted, ref } from 'vue'
import { Loader2, SearchX } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import BibleBar from './BibleBar.vue'
import { DAILY_BREAD } from './verses'

// Scene: a verse found by what it says. "daily bread" is typed while John is
// open, and John has nothing; the whole Bible is asked for, the books are
// read one after another as the count shows, and the two verses come back
// with the words marked. Searching the open book first and the rest only on
// request is how the page itself does it.

const PHRASE = 'daily bread'
const BOOKS = 66

const query = ref('')
// 'typing', then 'none' in John, then 'reading' every book, then 'found'.
const stage = ref('typing')
const tapped = ref(false)
const read = ref(0)
const { at, type, still } = useSceneTimeline()

let frame = 0
const readAll = (duration) => {
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration)
    read.value = Math.round(BOOKS * p)
    if (p < 1) frame = requestAnimationFrame(tick)
    else stage.value = 'found'
  }
  frame = requestAnimationFrame(tick)
}

const typed = type(query, PHRASE, 500, 90)
at(typed + 300, () => (stage.value = 'none'))
at(typed + 1100, () => (tapped.value = true))
at(typed + 1350, () => {
  if (still) {
    stage.value = 'found'
    return
  }
  stage.value = 'reading'
  readAll(1100)
})

onUnmounted(() => cancelAnimationFrame(frame))

// The verse with the words it matched marked, as the page marks a hit.
const parts = (text) => {
  const found = text.toLowerCase().indexOf(PHRASE)
  return [
    { text: text.slice(0, found), hit: false },
    { text: text.slice(found, found + PHRASE.length), hit: true },
    { text: text.slice(found + PHRASE.length), hit: false },
  ].filter((part) => part.text)
}
</script>

<template>
  <div class="relative flex h-full flex-col">
    <BibleBar class="st-rise" book="John" :chapter="3" :query="query" :caret="!still && stage === 'typing'" />

    <div v-if="stage !== 'typing'" class="px-3 py-3">
      <div class="mb-2 flex h-6 items-center justify-between gap-2">
        <p class="min-w-0 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
          <template v-if="stage === 'reading'">Reading <span class="tabular-nums">{{ read }}</span> of {{ BOOKS }} books…</template>
          <template v-else-if="stage === 'found'">{{ DAILY_BREAD.length }} verses in the whole Bible</template>
          <template v-else>0 verses in John</template>
        </p>
        <span
          v-if="stage === 'none'"
          :class="[
            'relative shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-primary dark:text-primary-light',
            tapped ? 'st-tap bg-primary/10 dark:bg-primary-light/10' : '',
          ]"
        >
          Search all 66 books
        </span>
      </div>

      <div v-if="stage === 'none'" class="st-rise rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center dark:border-gray-600">
        <SearchX class="mx-auto size-5 text-gray-400" />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Nothing in John matches “{{ PHRASE }}”.</p>
        <p class="mt-2 text-xs font-semibold text-primary dark:text-primary-light">Try the whole Bible</p>
      </div>

      <div v-else-if="stage === 'reading'" class="flex flex-col gap-3 pt-2">
        <div class="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${(read / BOOKS) * 100}%` }" />
        </div>
        <Loader2 class="mx-auto mt-4 size-5 animate-spin text-gray-400" />
      </div>

      <ul v-else class="flex flex-col gap-1">
        <li
          v-for="(hit, i) in DAILY_BREAD"
          :key="hit.ref"
          class="st-rise rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
          :style="{ '--d': `${i * 140}ms` }"
        >
          <span class="block text-[11px] font-semibold text-primary dark:text-primary-light">{{ hit.ref }}</span>
          <span class="mt-0.5 block text-sm leading-relaxed text-gray-700 dark:text-gray-300"
            ><span
              v-for="(part, j) in parts(hit.text)"
              :key="j"
              :class="part.hit ? 'rounded bg-yellow-200 font-semibold dark:bg-yellow-500/30' : ''"
              >{{ part.text }}</span
            ></span
          >
        </li>
      </ul>
    </div>
  </div>
</template>

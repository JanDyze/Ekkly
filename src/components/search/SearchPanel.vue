<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ClockCounterClockwise, MagnifyingGlass, X } from '../../icons'
import SearchResult from './SearchResult.vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useGlobalSearch } from '../../composables/useGlobalSearch'

// The search itself (useGlobalSearch): one box, and one list, best first, each
// result saying what it is — so a person and a song that both answer the
// question sit side by side rather than in separate boxes the eye has to
// compare.
//
// Search by meaning needs a small model on the device. It is offered, never
// fetched unasked: on a phone's data plan 23 MB is something to say yes to.
// Until then, and for anyone who says no, the words still find things.

const emit = defineEmits(['close'])

const router = useRouter()
const {
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
  total,
} = useGlobalSearch()

const panel = ref(null)
const input = ref(null)
// Holds focus inside, holds the page still underneath, and Escape closes.
useFocusTrap(panel, ref(true), () => emit('close'))
onMounted(() => input.value?.focus())

const hasHistory = computed(() => recentQueries.value.length > 0 || recentOpened.value.length > 0)

// A search from before goes back in the box, and the focus with it, so it
// can be run again as it was or changed a word.
const searchAgain = (q) => {
  query.value = q
  input.value?.focus()
}

// Whether to offer the model: not yet agreed to, and not already on its way.
const offer = ref(!consented())
const turnOn = () => {
  allowModel()
  offer.value = false
}

const percent = computed(() => Math.round(progress.value * 100))
const stillIndexing = computed(() => status.value === 'ready' && indexed.value > 0 && indexed.value < total.value)

const open = (result) => {
  remember(result)
  emit('close')
  router.push(result.to)
}
// The result Enter opens: the best one to begin with, shown as already chosen
// so the commonest search is type, Enter. The arrows move it, and it goes back
// to the top whenever the results change under it.
const active = ref(0)
watch(results, () => {
  active.value = 0
})
const list = ref(null)
const move = (step) => {
  const count = results.value.length
  if (!count) return
  active.value = (active.value + step + count) % count
  nextTick(() => list.value?.children[active.value]?.scrollIntoView({ block: 'nearest' }))
}
const openActive = () => {
  const result = results.value[active.value]
  if (result) open(result)
}
</script>

<template>
  <div
    ref="panel"
    role="dialog"
    aria-modal="true"
    aria-label="Search"
    tabindex="-1"
    class="relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[75dvh] sm:max-w-xl sm:rounded-3xl dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700"
  >
    <!-- The box. -->
    <div class="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-gray-800">
      <MagnifyingGlass class="size-5 shrink-0 text-gray-400" />
      <input
        id="global-search"
        ref="input"
        v-model="query"
        type="search"
        data-global-search
        enterkeyhint="go"
        autocomplete="off"
        placeholder="Search people, songs, events…"
        aria-label="Search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="global-search-results"
        :aria-expanded="results.length > 0"
        :aria-activedescendant="results.length ? `global-search-result-${active}` : undefined"
        class="search-input min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        @keydown.enter.prevent="openActive"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
      />
      <button
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
        aria-label="Close search"
        @click="emit('close')"
      >
        <X class="size-5" />
      </button>
    </div>

    <!-- Search by meaning: offered, downloading, or quietly on. -->
    <div v-if="offer && status === 'off'" class="shrink-0 border-b border-gray-100 bg-primary/5 px-4 py-3 dark:border-gray-800 dark:bg-primary-light/10">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">Search by meaning</p>
      <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
        Finds what you mean, not only the words you type. Downloads 23 MB once, then works offline. Nothing you search leaves your phone.
      </p>
      <div class="mt-2 flex gap-2">
        <button type="button" class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white" @click="turnOn">Turn on</button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5" @click="offer = false">Not now</button>
      </div>
    </div>
    <div v-else-if="status === 'loading'" class="shrink-0 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
      <p class="text-xs text-gray-500 dark:text-gray-400">Getting search by meaning ready · {{ percent }}%</p>
      <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden="true">
        <div class="h-full rounded-full bg-primary transition-[width] duration-300 dark:bg-primary-light" :style="{ width: `${percent}%` }" />
      </div>
    </div>
    <p v-else-if="stillIndexing" class="shrink-0 border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
      Reading your church's records · {{ indexed }} of {{ total }}
    </p>
    <p v-else-if="status === 'error'" class="shrink-0 border-b border-gray-100 px-4 py-2 text-xs text-amber-700 dark:border-gray-800 dark:text-amber-400">
      Search by meaning could not start, so this is searching by words. It will try again next time.
    </p>

    <!-- The results. -->
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <!-- Nothing typed yet: what was searched and opened before, if anything. -->
      <template v-if="!query.trim()">
        <template v-if="hasHistory">
          <div class="flex items-center justify-between px-3 pb-1 pt-1">
            <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400">Recent</h2>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              @click="clearHistory"
            >
              Clear
            </button>
          </div>
          <ul v-if="recentQueries.length" class="flex flex-col">
            <li v-for="q in recentQueries" :key="q" class="flex items-center">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                @click="searchAgain(q)"
              >
                <ClockCounterClockwise class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
                <span class="truncate text-[15px] text-gray-700 dark:text-gray-200">{{ q }}</span>
              </button>
              <button
                type="button"
                class="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                :aria-label="`Remove “${q}” from recent searches`"
                @click="forgetQuery(q)"
              >
                <X class="size-4" />
              </button>
            </li>
          </ul>
          <ul v-if="recentOpened.length" class="flex flex-col" :class="{ 'mt-1 border-t border-gray-100 pt-1 dark:border-gray-800': recentQueries.length }">
            <li v-for="result in recentOpened" :key="result.id">
              <SearchResult :result="result" @open="open" />
            </li>
          </ul>
        </template>
        <p v-else class="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Try a name, a song, or what you are looking for — “youth outreach”, “songs about grace”.
        </p>
      </template>
      <p v-else-if="!results.length" class="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Nothing matches “{{ query.trim() }}”.
      </p>
      <ul v-else id="global-search-results" ref="list" role="listbox" aria-label="Results" class="flex flex-col">
        <li
          v-for="(result, i) in results"
          :id="`global-search-result-${i}`"
          :key="result.id"
          role="option"
          :aria-selected="i === active"
          @mousemove="active = i"
        >
          <SearchResult :result="result" :active="i === active" @open="open" />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* The box is the whole panel's reason for being and always has the focus, so
   the app's keyboard-focus outline (style.css, which a text field always meets
   when focused) only drew a hard rectangle inside it. The caret says enough. */
.search-input:focus-visible {
  outline: none;
}
</style>

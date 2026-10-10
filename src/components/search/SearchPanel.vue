<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarBlank,
  CheckSquare,
  MagnifyingGlass,
  MusicNotes,
  Notebook,
  UsersThree,
  X,
} from '../../icons'
import AppArt from '../common/AppArt.vue'
import MemberAvatar from '../members/MemberAvatar.vue'
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
const { query, results, status, progress, consented, allowModel, indexed, total } = useGlobalSearch()

const panel = ref(null)
const input = ref(null)
// Holds focus inside, holds the page still underneath, and Escape closes.
useFocusTrap(panel, ref(true), () => emit('close'))
onMounted(() => input.value?.focus())

const KINDS = {
  app: { label: 'App' },
  person: { label: 'Person' },
  event: { label: 'Event', icon: CalendarBlank },
  song: { label: 'Song', icon: MusicNotes },
  task: { label: 'Task', icon: CheckSquare },
  minute: { label: 'Minutes', icon: Notebook },
  group: { label: 'Small group', icon: UsersThree },
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
  emit('close')
  router.push(result.to)
}
const openFirst = () => {
  if (results.value[0]) open(results.value[0])
}
</script>

<template>
  <div
    ref="panel"
    role="dialog"
    aria-modal="true"
    aria-label="Search"
    tabindex="-1"
    class="relative flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[75dvh] sm:max-w-xl sm:rounded-3xl dark:bg-gray-900"
  >
    <!-- The box. -->
    <div class="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-gray-800">
      <MagnifyingGlass class="size-5 shrink-0 text-gray-400" />
      <input
        id="global-search"
        ref="input"
        v-model="query"
        type="search"
        enterkeyhint="go"
        autocomplete="off"
        placeholder="Search people, songs, events…"
        aria-label="Search"
        class="min-w-0 flex-1 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        @keydown.enter.prevent="openFirst"
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
      <p v-if="!query.trim()" class="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Try a name, a song, or what you are looking for — “youth outreach”, “songs about grace”.
      </p>
      <p v-else-if="!results.length" class="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Nothing matches “{{ query.trim() }}”.
      </p>
      <ul v-else class="flex flex-col">
        <li v-for="result in results" :key="result.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
            @click="open(result)"
          >
            <MemberAvatar v-if="result.kind === 'person'" :member="result.member" alt="" size="h-10 w-10" class="shrink-0" />
            <span v-else class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
              <AppArt v-if="result.kind === 'app'" :app-key="result.art" class="size-7" />
              <component :is="KINDS[result.kind].icon" v-else class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ result.title }}</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                {{ KINDS[result.kind].label }}<template v-if="result.subtitle"> · {{ result.subtitle }}</template>
              </span>
            </span>
            <span
              v-if="result.byMeaning"
              class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
            >
              By meaning
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

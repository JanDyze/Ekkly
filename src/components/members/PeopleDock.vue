<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowUpDown, List, MagnifyingGlass, SquaresFour, Tag, X } from '../../icons'

// The foot of the roll: search under the thumb, and how the roll is laid out
// beside it.
//
// It replaced a round plus button whose menu held seven things, Search among
// them, so the thing people do most on a roll took two taps and a guess. Here
// search is a labelled bar, one tap from typing, with the sort and the list or
// grid beside it. Which sort is on is said under the screen's title.
//
// Reading a long roll it gets out of the way by itself: while the list
// scrolls down it is only a round search button in the corner, and the whole
// bar comes back the moment the list scrolls up, the same moment the screen's
// header does (AppScreen's `hidden`). Nothing to drag, nothing at the screen's
// edges, where a phone's back swipe lives.
//
// Searching, the bar is the search box itself, where the thumb already is. It
// rides above the keyboard: a phone's keyboard covers the page rather than
// shortening it, so the bar is lifted by however much of the window the
// keyboard is hiding.

const props = defineProps({
  query: { type: String, default: '' },
  open: { type: Boolean, default: false },
  // The list is scrolling down: show only the round button.
  tucked: { type: Boolean, default: false },
  sortLabel: { type: String, default: '' },
  // 'list' or 'grid'.
  view: { type: String, default: 'list' },
  resultCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  canTag: { type: Boolean, default: false },
})

const emit = defineEmits(['update:query', 'update:open', 'sort', 'toggle-view', 'tag-results'])

// Details live in the search now, so the placeholder has to teach that:
// people only try a tag or a job if something tells them they can.
const placeholder = 'Name, tag or job'

const input = ref(null)

const openSearch = async () => {
  emit('update:open', true)
  await nextTick()
  input.value?.focus()
}

// Closing clears it: a search you cannot see must not still be filtering.
const closeSearch = () => {
  emit('update:query', '')
  emit('update:open', false)
}

/* ------------------------------------------------------ above the keyboard */

const lift = ref(0)

const measure = () => {
  const vv = window.visualViewport
  if (!vv) return
  lift.value = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

const follow = (on) => {
  const vv = window.visualViewport
  if (!vv) return
  if (on) {
    measure()
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
  } else {
    vv.removeEventListener('resize', measure)
    vv.removeEventListener('scroll', measure)
    lift.value = 0
  }
}

watch(() => props.open, follow)
onBeforeUnmount(() => follow(false))
</script>

<template>
  <!-- Above the bottom bar when someone has it on, rather than under it. -->
  <div
    class="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+0.75rem))] z-40 px-4"
    :style="lift ? { transform: `translateY(-${lift}px)` } : null"
  >
    <div class="mx-auto max-w-xl">
      <!-- Searching: the same capsule, now the box itself, with what it found
           above it in the same colours. The icon keeps its place from the
           capsule at rest, so opening it changes only what is beside it. -->
      <div v-if="open" class="pointer-events-auto">
        <div
          v-if="query"
          class="mb-2 flex items-center gap-2 rounded-full bg-gray-900 py-1.5 pl-4 pr-1.5 text-white dark:bg-gray-100 dark:text-gray-900"
        >
          <span class="text-xs font-semibold tabular-nums opacity-70">
            {{ resultCount }} of {{ totalCount }}
          </span>
          <!-- The search is already the filter, so it is also the quickest
               way to tag a group: narrow to them, then tag the lot. -->
          <button
            v-if="resultCount && canTag"
            type="button"
            class="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
            @click="emit('tag-results')"
          >
            <Tag class="size-3.5" />
            Tag these {{ resultCount }}
          </button>
        </div>
        <div class="relative">
          <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-white dark:text-gray-900" />
          <input
            ref="input"
            :value="query"
            type="text"
            inputmode="search"
            enterkeyhint="search"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="Search people"
            :placeholder="`${placeholder} — comma for several`"
            class="h-12 w-full rounded-full border-0 bg-gray-900 pl-12 pr-12 text-[15px] text-white caret-white placeholder:text-white/50 focus:outline-none dark:bg-gray-100 dark:text-gray-900 dark:caret-gray-900 dark:placeholder:text-gray-900/50"
            @input="emit('update:query', $event.target.value)"
            @keyup.escape="closeSearch"
          />
          <button
            type="button"
            class="dock-button absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/70 hover:text-white dark:text-gray-900/70 dark:hover:text-gray-900"
            :aria-label="query ? 'Clear search' : 'Close search'"
            @click="query ? emit('update:query', '') : closeSearch()"
          >
            <X class="size-4.5" />
          </button>
        </div>
      </div>

      <!-- At rest, one capsule: search, then how the roll is laid out.
           Scrolling down it narrows from the left until only the search
           icon is left, a round button in the corner, and widens again on
           the way up: one thing changing size, not one swapped for another.
           The icon sits in a slot exactly as wide as the capsule's height,
           so at its narrowest the capsule is a circle with the icon in its
           middle. -->
      <div
        v-else
        :class="[
          'dock pointer-events-auto ml-auto flex h-12 items-center overflow-hidden rounded-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
          tucked ? 'w-12' : 'w-full',
        ]"
      >
        <button type="button" class="dock-button flex h-full flex-[1_0_3rem] items-center overflow-hidden text-left" aria-label="Search people" @click="openSearch">
          <span class="flex w-12 shrink-0 justify-center">
            <MagnifyingGlass class="size-5" />
          </span>
          <span :class="['dock-fade truncate pr-3 text-[15px]', tucked ? 'opacity-0' : 'opacity-80']">Search people</span>
        </button>
        <!-- Out of reach of a tab or a screen reader while tucked away. -->
        <div :class="['dock-fade flex min-w-0 shrink items-center overflow-hidden pr-1', tucked ? 'opacity-0' : '']" :inert="tucked">
          <span class="mx-1 h-6 w-px bg-current opacity-20" aria-hidden="true" />
          <button
            type="button"
            class="dock-button flex size-10 shrink-0 items-center justify-center rounded-full"
            :aria-label="`Sort: ${sortLabel}`"
            :title="`Sort: ${sortLabel}`"
            @click="emit('sort')"
          >
            <ArrowUpDown class="size-5" />
          </button>
          <!-- Named for where it takes you, with that view's icon. -->
          <button
            type="button"
            class="dock-button flex size-10 shrink-0 items-center justify-center rounded-full"
            :aria-label="view === 'list' ? 'Show as grid' : 'Show as list'"
            :title="view === 'list' ? 'Show as grid' : 'Show as list'"
            @click="emit('toggle-view')"
          >
            <SquaresFour v-if="view === 'list'" class="size-5" />
            <List v-else class="size-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Narrowing to the round button and widening back: the capsule's width, on
   the same curve the screen's header hides on, while what it is leaving out
   fades a little quicker so nothing is seen squeezed. */
.dock {
  transition: width 0.34s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dock-fade {
  transition: opacity 0.18s ease;
}

.dock-button {
  transition: background-color 0.15s ease;
}

.dock-button:hover {
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .dock,
  .dock-fade {
    transition: none;
  }
}
</style>

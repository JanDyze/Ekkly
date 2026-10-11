<script setup>
import { ref } from 'vue'
import { ListFilter, Loader2, MagnifyingGlass, Plus, SearchX, X, Youtube } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import SongThumb from './SongThumb.vue'
import outreach from '../../../../assets/mock-photos/outreach.svg'
import christmas from '../../../../assets/mock-photos/christmas.svg'
import kidsChurch from '../../../../assets/mock-photos/kids-church.svg'

// Scene: a song not on the list yet. The search finds nothing in the
// songbook, so Search YouTube is pressed from the same box; the videos come
// back, the first is added, and the Add song sheet opens with its title and
// link already in — the category is the one thing only the worship team
// knows, so that is tapped, and it is added.

const RESULTS = [
  { id: 'live', title: 'Build My Life (Live)', channel: 'Kanlungan Worship', thumb: outreach },
  { id: 'lyric', title: 'Build My Life · Lyric Video', channel: 'Himig ng Papuri', thumb: christmas },
  { id: 'acoustic', title: 'Build My Life (Acoustic)', channel: 'Bukang Liwayway Music', thumb: kidsChurch },
]

const query = ref('')
const searching = ref(false)
const found = ref(false)
const picked = ref(false)
const category = ref('Praise')
const added = ref(false)
const { at, type, still } = useSceneTimeline()

const typed = type(query, 'build my life', 400, 70)
at(typed + 450, () => (searching.value = true))
at(typed + 1000, () => {
  searching.value = false
  found.value = true
})
at(typed + 1900, () => (picked.value = true))
at(typed + 2500, () => (category.value = 'Worship'))
at(typed + 2950, () => (added.value = true))
</script>

<template>
  <div class="relative h-full">
    <div class="px-3 pt-5">
      <div class="st-rise flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900">
        <div class="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-gray-100 px-3 dark:bg-gray-800">
          <MagnifyingGlass class="size-4 shrink-0 text-gray-400" />
          <span :class="['truncate text-sm', query ? '' : 'text-gray-400', still || found ? '' : 'st-caret']">{{ query || 'Search songs...' }}</span>
        </div>
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          <ListFilter class="size-5" />
        </span>
      </div>

      <!-- Nothing in the songbook: the way out is YouTube. -->
      <div v-if="!found" class="flex flex-col items-center px-4 pt-10 text-center">
        <SearchX class="size-10 text-gray-300 dark:text-gray-600" />
        <p class="mt-3 text-sm font-semibold">No songs match</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Nothing here for <span class="font-medium">“{{ query || '…' }}”</span>.
        </p>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span
            :class="[
              'st-filled relative inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white',
              searching ? 'st-tap bg-primary-hover' : 'bg-primary',
            ]"
          >
            <Loader2 v-if="searching" class="size-4 animate-spin" />
            <Youtube v-else class="size-4" />
            {{ searching ? 'Searching YouTube…' : 'Search YouTube' }}
          </span>
          <span class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">Clear filters</span>
        </div>
      </div>

      <section v-else class="mt-1">
        <div class="st-rise flex items-center gap-2 py-2" style="--d: 0ms">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <Youtube class="size-3" /> From YouTube
          </span>
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ RESULTS.length }}</span>
        </div>
        <div
          v-for="(r, i) in RESULTS"
          :key="r.id"
          class="st-rise flex items-center gap-3 rounded-xl px-2 py-2.5"
          :style="{ '--d': `${100 + i * 110}ms` }"
        >
          <SongThumb :src="r.thumb" :play="false" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ r.title }}</span>
            <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ r.channel }}</span>
          </span>
          <span
            :class="[
              'relative flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400',
              picked && i === 0 ? 'st-tap text-primary dark:text-primary-light' : '',
            ]"
          >
            <Plus class="size-4" />
          </span>
        </div>
      </section>
    </div>

    <!-- The Add song sheet, over the list, with what YouTube could tell. -->
    <template v-if="picked">
      <div class="sheet-dim absolute inset-0 rounded-[28px] bg-black/50" />
      <div class="sheet-up absolute inset-x-0 bottom-0 flex flex-col rounded-[28px] border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between gap-3 rounded-t-[28px] border-b border-primary/20 bg-linear-to-r from-primary/10 to-transparent px-4 py-3 dark:border-primary-light/20 dark:from-primary-light/10">
          <span class="min-w-0">
            <span class="block text-base font-semibold">Add song</span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">Everyone signed in can see it</span>
          </span>
          <X class="size-5 shrink-0 text-gray-400" />
        </div>
        <div class="flex flex-col gap-3 p-4">
          <div>
            <p class="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Title</p>
            <p class="truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900">Build My Life (Live)</p>
          </div>
          <div>
            <p class="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Category</p>
            <div class="grid grid-cols-3 gap-2">
              <span
                v-for="c in ['Praise', 'Worship', 'Hymnal']"
                :key="c"
                :class="[
                  'relative rounded-lg border px-2 py-2 text-center text-sm font-semibold transition-colors',
                  category === c ? 'st-filled border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-300',
                  category === c && c === 'Worship' ? 'st-tap' : '',
                ]"
              >
                {{ c }}
              </span>
            </div>
          </div>
        </div>
        <div class="px-4 pb-4">
          <span
            :class="[
              'st-filled relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white',
              added ? 'st-tap bg-primary-hover' : 'bg-primary',
            ]"
          >
            Add song
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The sheet comes up from the screen's foot, never from below it: it starts
   where it ends and only fades and settles, so it never crosses the edge. */
.sheet-up {
  transform-origin: bottom;
  animation: sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.sheet-dim {
  animation: sheet-dim 0.3s ease-out both;
}
@keyframes sheet-up {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
}
@keyframes sheet-dim {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sheet-up,
  .sheet-dim {
    animation: none;
  }
}
</style>

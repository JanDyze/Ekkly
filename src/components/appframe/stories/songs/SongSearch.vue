<script setup>
import { computed, ref } from 'vue'
import { FileText, ListFilter, MagnifyingGlass, Plus } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import SongThumb from './SongThumb.vue'
import { CATEGORY, SONGS } from './cast'

// Scene: a song found by a line of it. The list arrives grouped by category,
// someone types the line going round in their head, and the list narrows to
// the hymn it comes from — the song list searches the lyrics as well as the
// titles — and a thumb opens it.

// The words each song is searched by, beyond its title. Only the hymns'
// words are quoted, and they are long out of copyright.
const WORDS = {
  itiswell: 'When peace like a river attendeth my way',
  grace: 'Amazing grace, how sweet the sound',
}

const query = ref('')
const tapped = ref(false)
const { at, type, still } = useSceneTimeline()
const done = type(query, 'peace like a river', 1200, 75)
at(done + 450, () => (tapped.value = true))

// As many rows as the screen holds, never more: the list is longer than one
// screen, as a real songbook is, and the rest would spill under its foot.
const FITS = 4

/** The headings and the songs under them, as one list so it can narrow smoothly. */
const rows = computed(() => {
  const q = query.value.toLowerCase()
  const found = SONGS.filter((s) => !q || `${s.title} ${WORDS[s.id] || ''}`.toLowerCase().includes(q)).slice(0, FITS)
  const list = []
  for (const s of found) {
    if (!list.some((row) => row.key === `h-${s.category}`)) {
      list.push({ key: `h-${s.category}`, heading: s.category, count: found.filter((f) => f.category === s.category).length })
    }
    list.push({ key: s.id, song: s })
  }
  return list
})
</script>

<template>
  <div class="px-3 pt-5">
    <div class="st-rise flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900">
      <div class="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-gray-100 px-3 dark:bg-gray-800">
        <MagnifyingGlass class="size-4 shrink-0 text-gray-400" />
        <span :class="['truncate text-sm', query ? '' : 'text-gray-400', still ? '' : 'st-caret']">{{ query || 'Search songs...' }}</span>
      </div>
      <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        <ListFilter class="size-5" />
      </span>
      <span class="st-filled flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
        <Plus class="size-5" />
      </span>
    </div>

    <TransitionGroup tag="div" name="found" class="relative mt-1">
      <div
        v-for="(row, i) in rows"
        :key="row.key"
        class="st-rise"
        :style="{ '--d': `${150 + i * 70}ms` }"
      >
        <div v-if="row.heading" class="flex items-center gap-2 py-2">
          <span :class="['rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider', CATEGORY[row.heading]]">{{ row.heading }}</span>
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ row.count }}</span>
        </div>
        <div
          v-else
          :class="[
            'relative flex items-center gap-3 rounded-xl px-2 py-2.5',
            tapped && row.song.id === 'itiswell' ? 'st-tap bg-gray-50 text-primary dark:bg-white/5 dark:text-primary-light' : '',
          ]"
        >
          <SongThumb :src="row.song.thumb" />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5">
              <span class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.song.title }}</span>
              <FileText v-if="row.song.lyrics" class="size-3.5 shrink-0 text-emerald-500" />
            </span>
            <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.song.keys }}</span>
          </span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.found-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.25s ease;
}
.found-leave-to {
  opacity: 0;
}
.found-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

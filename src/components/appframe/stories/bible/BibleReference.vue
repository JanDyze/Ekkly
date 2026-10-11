<script setup>
import { ref } from 'vue'
import { BookOpen, ChevronRight } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import BibleBar from './BibleBar.vue'
import BibleReader from './BibleReader.vue'
import { JOHN_3 } from './verses'

// Scene: straight to a verse. "Juan 3:16" is typed, the Tagalog name the way
// most people remember it, while the King James is open; the box offers to go
// to John 3:16, and the chapter opens with that verse lit.

const query = ref('')
const offer = ref(false)
const tapped = ref(false)
const arrived = ref(false)
const { at, type, still } = useSceneTimeline()

const typed = type(query, 'Juan 3:16', 700, 120)
at(typed + 200, () => (offer.value = true))
at(typed + 1000, () => (tapped.value = true))
at(typed + 1350, () => (arrived.value = true))
</script>

<template>
  <div class="relative flex h-full flex-col">
    <template v-if="!arrived">
      <BibleBar class="st-rise" book="Psalms" :chapter="23" :query="query" :caret="!still" />
      <div class="px-3 py-3">
        <span
          v-if="offer"
          :class="[
            'st-pop relative flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 dark:border-primary-light/30 dark:bg-primary-light/10',
            tapped ? 'st-tap text-primary dark:text-primary-light' : '',
          ]"
        >
          <BookOpen class="size-4 shrink-0 text-primary dark:text-primary-light" />
          <span class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">Go to John 3:16</span>
          <ChevronRight class="size-4 shrink-0 text-gray-400" />
        </span>
      </div>
    </template>

    <template v-else>
      <BibleBar book="John" :chapter="3" />
      <BibleReader book="John" :chapter="3" :verses="JOHN_3" :mark="16" previous="John 2" next="John 4" />
    </template>
  </div>
</template>

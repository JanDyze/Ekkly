<script setup>
import { computed, ref } from 'vue'
import { BookOpen, Cards, Menu, Music2 } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PresentBar from './PresentBar.vue'

// Scene: Sunday's run sheet, already filled in. Nobody types it: the worship
// team's songs arrive from the schedule in the order they planned, then the
// preacher's readings and outline after them, where the message falls. The
// slide count climbs as each arrives, and Present is pressed: the projector
// window opens, with nothing on it until the first slide is shown.

const ITEMS = [
  { title: 'Amazing Grace', type: 'song', slides: 8 },
  { title: 'Blessed Assurance', type: 'song', slides: 6 },
  { title: 'How Great Thou Art', type: 'song', slides: 8 },
  { title: 'John 3:16-17', type: 'scripture', slides: 2 },
  { title: 'Ephesians 2:8-9', type: 'scripture', slides: 2 },
  { title: 'Grace that saves', type: 'text', slides: 4 },
]
const ICONS = { song: Music2, scripture: BookOpen, text: Cards }

const shown = ref(0)
const live = ref(false)
const tapping = ref(false)
const { at } = useSceneTimeline()
ITEMS.forEach((_, i) => at(400 + i * 330 + (i >= 3 ? 250 : 0), () => (shown.value = i + 1)))
at(3100, () => (tapping.value = true))
at(3350, () => (live.value = true))

const slides = computed(() => ITEMS.slice(0, shown.value).reduce((n, item) => n + item.slides, 0))
</script>

<template>
  <div>
    <PresentBar :slides="slides" :live="live" :tap-present="tapping && !live" />

    <div class="px-3.5 pt-3">
      <div class="st-rise flex items-center justify-between px-1" style="--d: 100ms">
        <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Run sheet</p>
        <span class="text-[11px] font-medium text-gray-400">From schedule</span>
      </div>

      <div class="mt-2 flex flex-col gap-1">
        <template v-for="(item, i) in ITEMS" :key="item.title">
          <!-- Where one team's part ends and the other's begins. -->
          <p v-if="i === 0 && shown > 0" class="st-rise px-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">From the worship team</p>
          <p v-if="i === 3 && shown > 3" class="st-rise px-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">From the preacher</p>
          <div
            v-if="i < shown"
            class="st-rise flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-bold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
          >
            <Menu class="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
            <component :is="ICONS[item.type]" class="size-3.5 shrink-0" />
            <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

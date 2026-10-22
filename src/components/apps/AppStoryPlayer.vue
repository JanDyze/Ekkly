<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CaretLeft, CaretRight } from '../../icons'
import StoryScreen from '../appframe/stories/StoryScreen.vue'
import { storyOf } from '../appframe/stories'

// An app's story playing in place, as an app store plays an app's preview on
// its page: the scenes one after another (stories/<app>/index.js), each with
// its caption over the app's screen doing it, round and round, with a bar for
// each scene to say where it is. The same scenes holding an app's tile plays
// full screen (AppPeek), here as part of the All apps page's panel
// (AppDetailsPanel), so what an app does is seen before it is opened.
//
// It takes the room it is given: the screen is drawn at a phone's size and
// scaled to fit (StoryScreen), so a short panel shows a smaller screen, never
// a cut one. The arrows step through it; a mouse resting on it holds the
// scene where it is, so it can be read.

const props = defineProps({
  // The app's artwork key, which is what a story is found by.
  art: { type: String, required: true },
})

const scenes = computed(() => storyOf(props.art) || [])
const index = ref(0)
const elapsed = ref(0)
const paused = ref(false)
const current = computed(() => scenes.value[index.value] || null)

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let frame = 0
let last = 0
const run = (now) => {
  const scene = current.value
  if (scene && !paused.value) {
    elapsed.value += now - last
    if (elapsed.value >= scene.duration) go(index.value + 1)
  }
  last = now
  frame = requestAnimationFrame(run)
}
const go = (to) => {
  const n = scenes.value.length
  if (!n) return
  index.value = ((to % n) + n) % n
  elapsed.value = 0
}
const start = () => {
  cancelAnimationFrame(frame)
  index.value = 0
  elapsed.value = 0
  last = performance.now()
  // Asking for less motion, it waits on the first scene for the arrows.
  if (scenes.value.length && !reduced) frame = requestAnimationFrame(run)
}
watch(() => props.art, start, { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(frame))

const fill = (i) => {
  if (i < index.value) return 1
  if (i > index.value || !current.value) return 0
  return Math.max(0, Math.min(1, elapsed.value / current.value.duration))
}
</script>

<template>
  <div
    v-if="current"
    class="group/story relative flex min-h-0 flex-1 flex-col"
    @pointerenter="paused = true"
    @pointerleave="paused = false"
  >
    <!-- A bar for each scene, the one playing filling as it goes. -->
    <div class="flex shrink-0 gap-1" aria-hidden="true">
      <span v-for="(_, i) in scenes" :key="i" class="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <span class="block h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${fill(i) * 100}%` }" />
      </span>
    </div>

    <div :key="`words-${index}`" class="mt-3 shrink-0">
      <p class="story-in text-base font-bold leading-tight text-gray-900 dark:text-white">{{ current.caption }}</p>
      <p class="story-in mt-0.5 text-sm leading-snug text-gray-500 dark:text-gray-400" style="--d: 60ms">{{ current.line }}</p>
    </div>

    <StoryScreen class="mt-3">
      <component :is="current.scene" :key="`${art}-${index}`" />
    </StoryScreen>

    <button
      type="button"
      class="absolute left-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-600 opacity-0 ring-1 ring-gray-200 transition-opacity group-hover/story:opacity-100 focus-visible:opacity-100 dark:bg-gray-800/90 dark:text-gray-300 dark:ring-gray-600"
      aria-label="Previous scene"
      @click="go(index - 1)"
    >
      <CaretLeft class="size-4.5" />
    </button>
    <button
      type="button"
      class="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-600 opacity-0 ring-1 ring-gray-200 transition-opacity group-hover/story:opacity-100 focus-visible:opacity-100 dark:bg-gray-800/90 dark:text-gray-300 dark:ring-gray-600"
      aria-label="Next scene"
      @click="go(index + 1)"
    >
      <CaretRight class="size-4.5" />
    </button>
  </div>
</template>

<style scoped>
/* Each scene's words come in as it starts, once. */
.story-in {
  animation: story-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms) both;
}
@keyframes story-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .story-in {
    animation: none;
  }
}
</style>

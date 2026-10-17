<script setup>
import { PaperPlaneRight } from '../../../../icons'
import YunitMascot from '../../../yunit/YunitMascot.vue'
import { prefersStill } from '../../../frontdoor/useSceneTimeline'
import YunitName from '../../../yunit/YunitWordmark.vue'

// YUNIT's page mid-conversation, drawn once for every scene that talks to
// him: him small in the header with what he is doing under his name, the
// conversation in the middle (the slot), and the box at the foot with
// whatever is being typed into it.
//
// The conversation gets what the header and the box leave, about 300px, and
// each scene plans its turns to fit in that: the page scrolls a long answer,
// a story's screen cannot.

defineProps({
  mood: { type: String, default: 'idle' },
  status: { type: String, default: 'Your church’s assistant' },
  // What is in the box.
  draft: { type: String, default: '' },
  // A thumb on Send.
  sending: { type: Boolean, default: false },
})

const still = prefersStill()
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="st-rise flex items-center gap-2.5 border-b border-gray-200 px-4 pb-2.5 pt-4 dark:border-gray-800">
      <!-- Small, so without the burst beside him, and only a picture here. -->
      <YunitMascot :mood="mood" :interactive="false" :follow="false" :sparks="false" :fidget="false" class="size-10 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="text-base font-black leading-tight tracking-tight"><YunitName /></p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ status }}</p>
      </div>
    </div>

    <div class="min-h-0 flex-1 px-4 pt-4">
      <slot />
    </div>

    <div class="px-3 pb-4 pt-2">
      <div class="flex items-center gap-2 rounded-3xl bg-white p-1.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <span :class="['min-w-0 flex-1 truncate px-2.5 text-sm', draft ? '' : 'text-gray-400', draft && !still ? 'st-caret' : '']">{{ draft || 'Ask or tell YUNIT…' }}</span>
        <span
          :class="[
            'relative flex size-9 shrink-0 items-center justify-center rounded-2xl',
            draft || sending ? 'st-filled bg-primary text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
            sending ? 'st-tap' : '',
          ]"
        >
          <PaperPlaneRight class="size-4.5" />
        </span>
      </div>
    </div>
  </div>
</template>

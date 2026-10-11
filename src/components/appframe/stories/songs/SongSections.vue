<script setup>
import { ref } from 'vue'
import { ArrowLeft, Check, Loader2, Sparkles } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: the words ready for the slides. A hymn's lyrics are on its page as
// they were pasted; Identify sections is pressed, the verse and the chorus
// are named where they start, and the running order fills in — one chorus in
// the words, sung as often as the order says. The tech team copies the
// result straight into the slides, a section at a time.

// Public domain (Horatio Spafford, 1873).
const VERSE = [
  'When peace like a river attendeth my way,',
  'When sorrows like sea billows roll;',
  'Whatever my lot, Thou hast taught me to say,',
  'It is well, it is well with my soul.',
]
const CHORUS = ['It is well with my soul,', 'It is well, it is well with my soul.']
const ORDER = ['Verse 1', 'Chorus', 'Verse 1', 'Chorus']

const reading = ref(false)
const named = ref(false)
const { at } = useSceneTimeline()
at(1300, () => (reading.value = true))
at(2300, () => {
  reading.value = false
  named.value = true
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="st-rise flex shrink-0 items-center gap-3 rounded-t-[28px] border-b border-gray-200 bg-white px-4 pb-3 pt-5 dark:border-gray-700 dark:bg-gray-800">
      <ArrowLeft class="size-5 shrink-0 text-gray-400" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-bold">It Is Well With My Soul</span>
        <span class="block text-xs font-medium text-gray-400">
          {{ named ? '2 sections · 4 slides' : '1 section · 3 slides' }}
          <span v-if="named" class="text-amber-600 dark:text-amber-400">· unsaved</span>
        </span>
      </span>
      <span class="st-filled flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white">
        <Check class="size-3.5" />
        Save
      </span>
    </div>

    <div class="p-4">
      <div class="st-rise mb-2 flex items-center justify-between gap-2" style="--d: 100ms">
        <p class="text-xs font-bold text-gray-400">Lyrics</p>
        <span
          :class="[
            'relative flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary-light/15 dark:text-primary-light',
            reading ? 'st-tap' : '',
          ]"
        >
          <Loader2 v-if="reading" class="size-3 animate-spin" />
          <Sparkles v-else class="size-3" />
          {{ reading ? 'Reading…' : 'Identify sections' }}
        </span>
      </div>

      <div class="st-rise rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[11px] leading-4 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" style="--d: 180ms">
        <p v-if="named" class="st-pop font-bold text-primary dark:text-primary-light" style="--d: 0ms">Verse 1</p>
        <p v-for="line in VERSE" :key="line" class="truncate">{{ line }}</p>
        <p>&nbsp;</p>
        <p v-if="named" class="st-pop font-bold text-primary dark:text-primary-light" style="--d: 120ms">Chorus</p>
        <p v-for="line in CHORUS" :key="line" class="truncate">{{ line }}</p>
      </div>

      <template v-if="named">
        <p class="st-rise mb-1.5 mt-3 text-xs font-bold text-gray-500 dark:text-gray-400" style="--d: 250ms">Arrangement</p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(label, i) in ORDER"
            :key="i"
            class="st-pop rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary dark:bg-primary-light/15 dark:text-primary-light"
            :style="{ '--d': `${350 + i * 120}ms` }"
          >
            {{ label }}
          </span>
        </div>

        <p class="st-rise mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30" style="--d: 900ms">
          Identified 2 sections · sung 4 times. Check it, then Save.
        </p>
      </template>
    </div>
  </div>
</template>

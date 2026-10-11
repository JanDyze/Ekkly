<script setup>
import { ref } from 'vue'
import { Check } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import BibleBar from './BibleBar.vue'
import BibleReader from './BibleReader.vue'
import BibleSheet from './BibleSheet.vue'
import { PSALM_23 } from './verses'

// Scene: the Bible in the words you read it in. Psalm 23 is open in the King
// James; the translation's code is tapped, the list comes up grouped by
// language, the World English is chosen, and the same four verses come back
// in its words: same place, different translation, which is how a verse gets
// compared.

const TRANSLATIONS = [
  { language: 'Tagalog', entries: [{ id: 'MBBTAG', name: 'Magandang Balita Biblia', note: 'Tagalog, 2005 edition' }] },
  {
    language: 'English',
    entries: [
      { id: 'KJV', name: 'King James Version', note: 'The 1611 translation' },
      { id: 'WEB', name: 'World English Bible', note: 'Modern English, public domain' },
    ],
  },
]

const version = ref('KJV')
const tapChip = ref(false)
const open = ref(false)
const picked = ref(null)
const { at } = useSceneTimeline()

at(1500, () => (tapChip.value = true))
at(1750, () => (open.value = true))
at(2900, () => (picked.value = 'WEB'))
at(3350, () => {
  open.value = false
  tapChip.value = false
  version.value = 'WEB'
})
</script>

<template>
  <div class="relative flex h-full flex-col">
    <BibleBar class="st-rise" book="Psalms" :chapter="23" :version="version" :tap-version="tapChip" />

    <BibleReader
      :key="version"
      book="Psalms"
      :chapter="23"
      :version="version"
      :verses="PSALM_23[version]"
      previous="Psalms 22"
      next="Psalms 24"
    />

    <BibleSheet :open="open" title="Choose a translation">
      <div class="px-3 pt-3">
        <div v-for="group in TRANSLATIONS" :key="group.language" class="mb-2.5">
          <p class="mb-1 px-1 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{{ group.language }}</p>
          <span
            v-for="entry in group.entries"
            :key="entry.id"
            :class="[
              'relative flex items-center gap-2 rounded-lg px-3 py-2',
              (picked || version) === entry.id ? 'bg-primary/10 dark:bg-primary-light/10' : '',
              picked === entry.id ? 'st-tap text-primary dark:text-primary-light' : '',
            ]"
          >
            <span class="min-w-0 flex-1">
              <span
                :class="[
                  'block truncate text-sm font-semibold',
                  (picked || version) === entry.id ? 'text-primary dark:text-primary-light' : 'text-gray-900 dark:text-white',
                ]"
              >
                {{ entry.name }}
              </span>
              <span class="block truncate text-[11px] text-gray-500 dark:text-gray-400">{{ entry.note }}</span>
            </span>
            <Check v-if="(picked || version) === entry.id" class="size-4 shrink-0 text-primary dark:text-primary-light" />
          </span>
        </div>
        <p class="px-3 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
          A translation stored in the app reads with no connection.
        </p>
      </div>
    </BibleSheet>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Check } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import RecorderHead from './RecorderHead.vue'
import { person, nameOf } from './cast'

// Scene: the room counted as it fills. Sunday's roll is open under its age
// bands; names are ticked as people come in, each band's tally keeps up, and
// the header's ring and wash fill with the room. Nobody is ever marked
// absent: a register records who came.

// Most of the room is already in; these are the last few through the door.
const BEFORE = 31
const EXPECTED = 48
const BANDS = [
  { key: 'adults', label: 'Adults', of: 32, before: 21, people: ['andres', 'rosario', 'danilo'].map(person) },
  { key: 'youth', label: 'Youth', of: 16, before: 10, people: ['kristine', 'miguel'].map(person) },
]
const ARRIVALS = ['rosario', 'kristine', 'andres', 'miguel', 'danilo']

const present = ref([])
const last = ref('')
const { at } = useSceneTimeline()
ARRIVALS.forEach((id, i) =>
  at(1000 + i * 520, () => {
    present.value = [...present.value, id]
    last.value = id
  })
)

const isPresent = (p) => present.value.includes(p.id)
const tallyOf = (band) => band.before + band.people.filter(isPresent).length
const count = computed(() => BEFORE + present.value.length)
</script>

<template>
  <div class="flex h-full flex-col">
    <RecorderHead class="st-rise" title="Sunday Service" date="Sun, Oct 11" :present="count" :expected="EXPECTED" />

    <div class="px-2 pt-2">
      <section v-for="(band, b) in BANDS" :key="band.key" class="st-rise mb-3" :style="{ '--d': `${150 + b * 200}ms` }">
        <div class="-mx-2 mb-1 flex items-center gap-2 border-y border-gray-200 bg-gray-100 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900">
          <span class="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">{{ band.label }}</span>
          <span class="ml-auto text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ tallyOf(band) }} of {{ band.of }}</span>
        </div>
        <ul class="flex flex-col gap-1">
          <li
            v-for="p in band.people"
            :key="p.id"
            :class="[
              'relative flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-300',
              isPresent(p) ? 'bg-emerald-50 dark:bg-emerald-500/10' : '',
              last === p.id ? 'st-tap text-emerald-600 dark:text-emerald-400' : '',
            ]"
          >
            <StoryFace :person="p" />
            <span class="min-w-0 flex-1 text-sm">
              <span :class="['block truncate', isPresent(p) ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300']">
                {{ nameOf(p) }}
              </span>
              <span v-if="p.nickname" class="block truncate text-[11px] text-gray-500 dark:text-gray-400">“{{ p.nickname }}”</span>
            </span>
            <span
              :class="[
                'flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                isPresent(p) ? 'bg-emerald-500' : 'border-2 border-gray-200 dark:border-gray-600',
              ]"
            >
              <Check v-if="isPresent(p)" class="st-pop size-3.5 text-white" style="--d: 0ms" />
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

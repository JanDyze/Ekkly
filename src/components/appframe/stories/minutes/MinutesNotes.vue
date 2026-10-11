<script setup>
import { computed, ref } from 'vue'
import { MoreVertical, Sparkles, UserRound } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import MinutesHeader from './MinutesHeader.vue'
import { nameOf, person } from './cast'

// Scene: notes typed while the meeting runs. Under the agenda item being
// discussed, the secretary types what was agreed, then "@Be": the roster
// offers Ben, he is chosen, and his name sits in the note marked, the way the
// page marks a person it recognises, before the sentence carries on.

const FIRST = 'Gift packs for 120 kids, ₱18,000 from the outreach fund.'
const REST = ' to canvass prices by Friday.'
const ben = person('ben')
const MATCHES = [ben, person('bea')]

const first = ref('')
const asking = ref('')
const chosen = ref(false)
const rest = ref('')
const { at, type, still } = useSceneTimeline()

const typedFirst = type(first, FIRST, 600, 26)
const typedAsk = type(asking, '@Be', typedFirst + 300, 140)
at(typedAsk + 650, () => (chosen.value = true))
type(rest, REST, typedAsk + 900, 34)

// Which part of the note the caret is on: the one being typed now.
const typing = computed(() => {
  if (still) return ''
  if (chosen.value) return 'rest'
  return asking.value ? 'ask' : 'first'
})
</script>

<template>
  <div class="h-full rounded-[28px] bg-white dark:bg-gray-800">
    <MinutesHeader class="st-rise">
      <h2 class="min-w-0 flex-1 truncate text-sm font-bold">
        <span class="text-gray-400 dark:text-gray-500">II.</span>
        Christmas outreach
      </h2>
      <span class="st-filled flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white">
        <Sparkles class="size-4" />
        Write up
      </span>
      <MoreVertical class="size-4.5 shrink-0 text-gray-400" />
    </MinutesHeader>

    <div class="px-3 py-3">
      <div class="st-rise relative min-h-50 rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed ring-2 ring-primary dark:border-gray-600 dark:bg-gray-800 dark:ring-primary-light" style="--d: 120ms">
        <p :class="typing === 'first' ? 'st-caret' : ''">{{ first }}</p>
        <p v-if="asking" class="mt-2">
          <template v-if="chosen">
            <span class="rounded bg-primary/10 px-1 font-medium text-primary dark:bg-primary-light/15 dark:text-primary-light">{{ nameOf(ben) }}</span><span :class="typing === 'rest' ? 'st-caret' : ''">{{ rest }}</span>
          </template>
          <span v-else :class="typing === 'ask' ? 'st-caret' : ''">{{ asking }}</span>
        </p>

        <!-- The roster, offered under the name being typed. -->
        <div
          v-if="asking.length > 1 && !chosen"
          class="st-pop absolute left-3 top-[94px] w-52 rounded-xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
        >
          <span
            v-for="(p, i) in MATCHES"
            :key="p.id"
            :class="[
              'flex items-center gap-2 px-3 py-2 text-sm',
              i === 0 ? 'st-filled rounded-t-xl bg-primary text-white' : 'rounded-b-xl text-gray-700 dark:text-gray-200',
            ]"
          >
            <UserRound :class="['size-4 shrink-0', i === 0 ? 'text-white/80' : 'text-gray-400']" />
            {{ nameOf(p) }}
          </span>
        </div>
      </div>
      <p class="st-rise mt-2 text-xs text-gray-400 dark:text-gray-500" style="--d: 200ms">
        Type <span class="font-semibold">@</span> to pull a name off the roster.
      </p>
    </div>
  </div>
</template>

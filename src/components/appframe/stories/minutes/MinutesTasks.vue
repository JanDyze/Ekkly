<script setup>
import { ref } from 'vue'
import { CalendarDays, Check, ListChecks, Loader2, Plus, Sparkles, UserRound } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import MinutesHeader from './MinutesHeader.vue'
import { nameOf, person } from './cast'

// Scene: every promise lands on a list. Under the written-up minutes, the
// commitments the meeting made are read out of its "Who does what" table,
// each with who said yes and when by; Add all is pressed, and one after
// another they go onto the To-do list, so nobody has to remember them from
// the meeting.

const ITEMS = [
  { title: 'Canvass gift prices', who: person('ben'), due: 'Fri, Oct 9' },
  { title: 'Book the court', who: person('carla'), due: 'Fri, Oct 16' },
  { title: 'Wrap the gifts', who: person('mark'), due: 'Sat, Dec 5' },
]

const pressed = ref(false)
const busy = ref(false)
const added = ref(0)
const { at } = useSceneTimeline()

at(1700, () => (pressed.value = true))
at(1950, () => (busy.value = true))
ITEMS.forEach((_, i) => at(2350 + i * 320, () => (added.value = i + 1)))
</script>

<template>
  <div class="h-full rounded-[28px] bg-white dark:bg-gray-800">
    <MinutesHeader class="st-rise">
      <h2 class="min-w-0 flex-1 truncate text-sm font-bold">Summary</h2>
      <span class="st-filled flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white">
        <Sparkles class="size-4" />
        Write again
      </span>
    </MinutesHeader>

    <div class="px-3 py-3">
      <div class="st-rise rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/40" style="--d: 100ms">
        <div class="mb-2 flex h-8 items-center justify-between gap-2">
          <h3 class="flex items-center gap-1.5 text-[13px] font-semibold">
            <ListChecks class="size-4 text-primary dark:text-primary-light" />
            {{ ITEMS.length }} action items
          </h3>
          <span v-if="added === ITEMS.length" class="st-pop text-xs font-medium text-primary underline dark:text-primary-light">All on the To-do list</span>
          <span
            v-else
            :class="[
              'st-filled relative rounded-lg px-3 py-1.5 text-xs font-medium text-white',
              pressed ? 'st-tap bg-primary-hover' : 'bg-primary',
            ]"
          >
            Add all {{ ITEMS.length }} to To-do
          </span>
        </div>

        <ul class="flex flex-col gap-2">
          <li
            v-for="(item, i) in ITEMS"
            :key="item.title"
            class="st-rise flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800"
            :style="{ '--d': `${300 + i * 140}ms` }"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium">{{ item.title }}</span>
              <span class="mt-1 flex flex-col gap-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                <span class="flex items-center gap-1"><UserRound class="size-3.5" />{{ nameOf(item.who) }}</span>
                <span class="flex items-center gap-1"><CalendarDays class="size-3.5" />{{ item.due }}</span>
              </span>
            </span>
            <span
              v-if="added > i"
              class="st-pop flex shrink-0 items-center gap-1 rounded-lg bg-green-100 px-2 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <Check class="size-3.5" />
              On the list
            </span>
            <span v-else class="st-filled flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white">
              <Loader2 v-if="busy" class="size-3.5 animate-spin" />
              <Plus v-else class="size-3.5" />
              Add
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

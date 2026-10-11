<script setup>
import { ref } from 'vue'
import { CalendarDays, UsersRound } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'
import smallGroupPhoto from '../../../../assets/mock-photos/small-group.svg'
import bibleStudyPhoto from '../../../../assets/mock-photos/bible-study.svg'

// Scene: every group at a glance. The groups' cover cards arrive the way the
// Groups section draws them, each with its leader, its size and when it meets,
// and a thumb goes to the one meeting tonight.

const tapped = ref(false)
const { at } = useSceneTimeline()
at(2700, () => (tapped.value = true))

// Two cards, never more: a cover card is most of a phone's width tall, and a
// third would run off the foot of the screen. The rest are in the count.
const GROUPS = [
  { id: 'kabataan', name: 'Kabataan Cell', leader: person('ramon'), size: 9, when: 'Thu • 7:00 PM', cover: smallGroupPhoto },
  { id: 'nanay', name: 'Mga Nanay ng Bayan', leader: person('tess'), size: 12, when: 'Sat • 3:00 PM', cover: bibleStudyPhoto },
]
</script>

<template>
  <div class="px-4 pt-6">
    <div class="st-rise flex items-baseline justify-between">
      <p class="text-xl font-bold">Groups</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">8 groups</p>
    </div>

    <div class="mt-3 flex flex-col gap-3">
      <div
        v-for="(g, i) in GROUPS"
        :key="g.id"
        :class="[
          'st-rise relative rounded-2xl border bg-white dark:bg-gray-800',
          tapped && i === 0 ? 'st-tap border-primary text-primary dark:border-primary-light dark:text-primary-light' : 'border-gray-200 dark:border-gray-700',
        ]"
        :style="{ '--d': `${150 + i * 220}ms` }"
      >
        <!-- The cover: the group's photo, as the card shows it, darkened at
             the foot so its name reads on any picture. A made-up photo, like
             the rest of the story. -->
        <div class="relative h-[72px] rounded-t-2xl bg-linear-to-br from-primary/25 via-primary/10 to-primary/5 dark:from-primary/30 dark:via-primary/15 dark:to-gray-800">
          <img :src="g.cover" alt="" class="absolute inset-0 h-full w-full rounded-t-2xl object-cover" />
          <div class="absolute inset-0 rounded-t-2xl bg-linear-to-t from-black/60 via-black/15 to-transparent" />
          <p class="absolute inset-x-0 bottom-0 truncate px-3 pb-2 text-base font-bold text-white">{{ g.name }}</p>
        </div>

        <div class="flex flex-col gap-2 p-3">
          <div class="flex items-center gap-2">
            <StoryFace :person="g.leader" size="size-8 text-[11px]" />
            <span class="min-w-0">
              <span class="block text-[10px] uppercase leading-tight tracking-wide text-gray-400 dark:text-gray-500">Leader</span>
              <span class="block truncate text-sm font-medium leading-tight text-gray-900 dark:text-white">{{ nameOf(g.leader) }}</span>
            </span>
          </div>
          <div class="flex gap-1.5">
            <span
              class="st-pop inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
              :style="{ '--d': `${700 + i * 220}ms` }"
            >
              <UsersRound class="size-3.5" />
              {{ g.size }} Members
            </span>
            <span
              class="st-pop inline-flex min-w-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
              :style="{ '--d': `${820 + i * 220}ms` }"
            >
              <CalendarDays class="size-3.5 shrink-0" />
              <span class="truncate">{{ g.when }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

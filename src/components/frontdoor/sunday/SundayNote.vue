<script setup>
import { computed } from 'vue'
import { CheckCircle2, Clock } from '../../../icons'
import { formatMoney } from '../../../utils/moneyUtils'

// What the app shows at each beat of the front door's Sunday, as a small card
// under the bulletin's words: the count going up as the ushers click, the
// song the band is on, the offering being entered. Sample people and sample
// numbers only, moving with `u`, how far through its beat the reader is.

const props = defineProps({
  beat: { type: String, required: true },
  u: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
})

const SONGS = [
  { name: 'Amazing Grace', key: 'G' },
  { name: 'Be Thou My Vision', key: 'D' },
  { name: 'Holy, Holy, Holy', key: 'E♭' },
]
const song = computed(() => Math.min(SONGS.length - 1, Math.floor(props.u * 1.6)))

const offering = computed(() => Math.round(Math.min(1, props.u * 1.3) * 18450) * 100)

const PRAYER = [
  { says: 'Lola Ising’s surgery on Tuesday', status: 'Praying' },
  { says: 'The Reyes family’s move', status: 'Praying' },
  { says: 'A job for Miguel', status: 'Answered', at: 0.55 },
]

const TASKS = [
  { says: 'Return the projector to the hall', who: 'Jun', at: 0.15 },
  { says: 'Call this week’s first-timers', who: 'Lyn', at: 0.4 },
  { says: 'Book the bus for youth camp', who: 'Ana', at: 0.65 },
]

// Sunday school's class, counted in at the door.
const CLASS_SIZE = 14
const kidsIn = computed(() => Math.min(12, Math.round(Math.min(1, props.u * 1.4) * 12)))

const GROUPS = [
  { name: 'Grace group', when: 'Wed 7 PM', coming: 8 },
  { name: 'Young couples', when: 'Thu 7 PM', coming: 6 },
  { name: 'Men’s Bible study', when: 'Sat 7 AM', coming: 5 },
]

const row = 'flex items-center justify-between gap-3 py-2 text-sm'
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/60">
    <template v-if="beat === 'doors'">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">This Sunday · who is on</p>
      <ul class="mt-1 divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="(duty, i) in [['Doors and chairs', 'Ben and Ruth'], ['Ushers', 'Carlo and Lyn'], ['Sound', 'Jun']]" :key="duty[0]" :class="row">
          <span class="min-w-0 truncate"><span class="font-semibold">{{ duty[0] }}</span> · {{ duty[1] }}</span>
          <span :class="['inline-flex shrink-0 items-center gap-1 text-xs font-semibold', u > i * 0.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400']">
            <CheckCircle2 class="h-3.5 w-3.5" /> Seen
          </span>
        </li>
      </ul>
    </template>

    <template v-else-if="beat === 'welcome'">
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Sunday service</p>
          <p class="text-3xl font-black tabular-nums">{{ count }}</p>
        </div>
        <p class="pb-1 text-xs text-gray-500 dark:text-gray-400">here so far</p>
      </div>
      <div :class="['mt-2 flex items-center gap-3 border-t border-gray-200 pt-2 text-sm dark:border-gray-800', u < 0.55 && 'invisible']">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary-light/15 dark:text-primary-light">MD</span>
        <span class="min-w-0">
          <span class="block truncate font-semibold">Mika Dela Cruz</span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">First visit · added to People</span>
        </span>
      </div>
    </template>

    <template v-else-if="beat === 'worship'">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Mara leads · Jun keys · Paolo drums · Ben guitar</p>
      <ol class="mt-1">
        <li v-for="(item, i) in SONGS" :key="item.name" :class="[row, i === song ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400']">
          <span class="flex items-center gap-2">
            <span :class="['h-1.5 w-1.5 rounded-full', i === song ? 'bg-primary dark:bg-primary-light' : 'bg-gray-300 dark:bg-gray-700']"></span>
            {{ item.name }}
          </span>
          <span class="text-xs tabular-nums">Key of {{ item.key }}</span>
        </li>
      </ol>
    </template>

    <template v-else-if="beat === 'kids'">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Little Lambs · ages 4 to 6</p>
      <div class="mt-1 flex items-end justify-between gap-3">
        <p class="text-3xl font-black tabular-nums">{{ kidsIn }}<span class="text-base font-semibold text-gray-400"> of {{ CLASS_SIZE }}</span></p>
        <p class="pb-1 text-xs text-gray-500 dark:text-gray-400">here today</p>
      </div>
      <p :class="[row, 'border-t border-gray-200 dark:border-gray-800']">
        <span class="min-w-0 truncate"><span class="font-semibold">Lesson</span> · Noah builds the ark</span>
        <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">Used before</span>
      </p>
    </template>

    <template v-else-if="beat === 'word'">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">The good news · part 1</p>
      <p class="mt-1 font-semibold">God is holy, and God is love</p>
      <ul class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        <li :class="row"><span>Reading · Romans 5:8</span><span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">On the screen</span></li>
        <li :class="[row, 'border-t border-gray-200 dark:border-gray-800']"><span>Notes · three points</span><span class="text-xs text-gray-500 dark:text-gray-400">Planned Thursday</span></li>
      </ul>
    </template>

    <template v-else-if="beat === 'prayer'">
      <ul class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="item in PRAYER" :key="item.says" :class="row">
          <span class="min-w-0 truncate">{{ item.says }}</span>
          <span
            v-if="item.at && u >= item.at"
            class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 class="h-3.5 w-3.5" /> Answered
          </span>
          <span v-else class="shrink-0 text-xs font-semibold text-primary dark:text-primary-light">Praying</span>
        </li>
      </ul>
    </template>

    <template v-else-if="beat === 'offering'">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Sunday offering · counted by Ruth and Ben</p>
      <p class="mt-1 text-3xl font-black tabular-nums">{{ formatMoney(offering) }}</p>
      <p :class="['mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400', u < 0.8 && 'invisible']">
        <CheckCircle2 class="h-3.5 w-3.5" /> In this month’s book
      </p>
    </template>

    <template v-else-if="beat === 'notices'">
      <ul class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="item in [['Wed', '7:00 PM', 'Small groups'], ['Fri', '6:00 PM', 'Youth night'], ['Sat', '7:00 AM', 'Men’s breakfast']]" :key="item[2]" :class="row">
          <span class="flex min-w-0 items-center gap-3">
            <span class="w-8 shrink-0 text-xs font-bold uppercase text-primary dark:text-primary-light">{{ item[0] }}</span>
            <span class="truncate font-semibold">{{ item[2] }}</span>
          </span>
          <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ item[1] }}</span>
        </li>
      </ul>
    </template>

    <template v-else-if="beat === 'after'">
      <ul class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="group in GROUPS" :key="group.name" :class="row">
          <span class="min-w-0">
            <span class="block truncate font-semibold">{{ group.name }}</span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">{{ group.when }}</span>
          </span>
          <span class="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ group.coming }} coming</span>
        </li>
      </ul>
    </template>

    <template v-else-if="beat === 'meeting'">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Leaders’ meeting · action items</p>
      <ul class="mt-1">
        <li v-for="item in TASKS" :key="item.says" :class="[row, u < item.at && 'invisible']">
          <span class="flex min-w-0 items-center gap-2">
            <Clock class="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span class="truncate">{{ item.says }}</span>
          </span>
          <span class="shrink-0 text-xs font-semibold">{{ item.who }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>

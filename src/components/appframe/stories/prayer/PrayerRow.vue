<script setup>
import { computed } from 'vue'
import { CheckCircle, Heart } from '../../../../icons'
import StoryFace from '../StoryFace.vue'
import { lineOf, person } from './cast'

// One concern as PrayerConcernListItem draws it: the face of the person it is
// for (a heart when it is for a family or a place), what to pray for, and one
// quiet line of who and when. High and urgent are said in amber on the right,
// and in a list that mixes them an answered one carries a tick.

const props = defineProps({
  concern: { type: Object, required: true },
  showStatus: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  tapped: { type: Boolean, default: false },
})

const who = computed(() => (props.concern.who ? person(props.concern.who) : null))
const answered = computed(() => props.concern.status === 'answered')
const flag = computed(() =>
  !answered.value && ['urgent', 'high'].includes(props.concern.priority) ? (props.concern.priority === 'urgent' ? 'Urgent' : 'High') : ''
)
</script>

<template>
  <div
    :class="[
      'relative flex min-h-14 items-center gap-3 px-3 py-2.5',
      props.selected ? 'bg-primary/10 dark:bg-primary/20' : '',
      props.tapped ? 'st-tap text-primary dark:text-primary-light' : '',
    ]"
  >
    <StoryFace v-if="who" :person="who" size="size-10 text-xs" />
    <span v-else class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
      <Heart class="size-5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ props.concern.title }}</span>
      <span class="mt-0.5 block truncate text-[13px] text-gray-500 dark:text-gray-400">{{ lineOf(props.concern, { showStatus: props.showStatus }) }}</span>
    </span>
    <span v-if="flag" class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      {{ flag }}
    </span>
    <CheckCircle v-else-if="props.showStatus && answered" class="st-pop size-5 shrink-0 text-primary dark:text-primary-light" />
  </div>
</template>

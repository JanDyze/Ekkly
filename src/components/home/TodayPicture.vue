<script setup>
import { computed } from 'vue'
import AppArt from '../common/AppArt.vue'
import MemberAvatar from '../members/MemberAvatar.vue'

// A Today card's picture on the desktop home (HomeAttention, HomeCommunity):
// what it is about wherever there is one, rather than a plain icon — its
// photo (an event's, a Sunday's), else the people it is about (the accounts
// waiting, whose birthday, who is new, who you serve with), else the day it is
// on, else its own drawing (brand/ekkly/sections/today.mjs). Only a card with
// none of those keeps its icon.

const props = defineProps({
  card: { type: Object, required: true },
  // 'md' (44px) in the attention list, 'sm' (36px) in the community grid.
  size: { type: String, default: 'md' },
})

const people = computed(() => (props.card.members || props.card.faces?.members || []).filter(Boolean))
const box = computed(() => (props.size === 'sm' ? 'size-9' : 'size-11'))
const face = computed(() => (props.size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'))
const pair = computed(() => (props.size === 'sm' ? 'h-6.5 w-6.5' : 'h-8 w-8'))
</script>

<template>
  <img v-if="card.photo" :src="card.photo" alt="" :class="[box, 'shrink-0 rounded-xl object-cover']" />
  <span v-else-if="people.length === 1" class="shrink-0">
    <MemberAvatar :member="people[0]" alt="" :size="face" />
  </span>
  <!-- Two or more: the first two, one over the other's shoulder. -->
  <span v-else-if="people.length" :class="[box, 'relative shrink-0']" aria-hidden="true">
    <span class="absolute left-0 top-0"><MemberAvatar :member="people[0]" alt="" :size="pair" /></span>
    <span class="absolute bottom-0 right-0">
      <MemberAvatar :member="people[1]" alt="" :size="pair" plain-class="ring-2 ring-white dark:ring-gray-900" />
    </span>
  </span>
  <span
    v-else-if="card.date"
    :class="[box, 'flex shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 leading-none text-primary dark:bg-primary-light/15 dark:text-primary-light']"
  >
    <span class="text-[9px] font-bold uppercase">{{ card.date.month }}</span>
    <span class="mt-px text-sm font-bold tabular-nums">{{ card.date.day }}</span>
  </span>
  <AppArt v-else-if="card.art" :app-key="card.art" :class="[box, 'shrink-0']" />
  <span v-else :class="[box, 'flex shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300']">
    <component :is="card.icon" v-if="card.icon" class="size-5" />
  </span>
</template>

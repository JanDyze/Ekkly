<script setup>
import { computed } from 'vue'
import MemberAvatar from '../members/MemberAvatar.vue'

// The foot of a deck card about people (DeckCard): their faces, overlapping,
// with a dashed seat for each place nobody is in yet, and one short line
// under them. A card that is about who should look like who — the faces say
// more than a count, and the seats show at a glance what is still open.
//
// Every card in a deck is as tall as the tallest, so a card with only words
// would end in an empty band; this is what most of them fill it with.

const props = defineProps({
  members: { type: Array, default: () => [] },
  // Places nobody is in yet, drawn after the faces.
  empty: { type: Number, default: 0 },
  max: { type: Number, default: 6 },
  caption: { type: String, default: '' },
  // The card's tone, so the rings and seats are cut from its own background.
  tone: { type: String, default: 'plain' },
})

const shown = computed(() => props.members.slice(0, props.max))
const seats = computed(() => Math.max(0, Math.min(props.empty, props.max - shown.value.length)))
const more = computed(() => props.members.length + props.empty - shown.value.length - seats.value)

const RINGS = {
  accent: 'ring-2 ring-white/70',
  warn: 'ring-2 ring-amber-50 dark:ring-gray-800',
  plain: 'ring-2 ring-white dark:ring-gray-800',
}

const SEATS = {
  accent: 'border-white/60 bg-white/10',
  warn: 'border-amber-300 bg-amber-50 dark:border-gray-600 dark:bg-gray-800',
  plain: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800',
}

const MUTED = {
  accent: 'text-white/80',
  warn: 'text-amber-800 dark:text-gray-400',
  plain: 'text-gray-500 dark:text-gray-400',
}
</script>

<template>
  <div>
    <div class="flex items-center">
      <div class="flex -space-x-2.5">
        <MemberAvatar
          v-for="member in shown"
          :key="member.firestoreId || member.id"
          :member="member"
          alt=""
          size="h-9 w-9"
          :plain-class="RINGS[tone] || RINGS.plain"
        />
        <span
          v-for="n in seats"
          :key="`seat-${n}`"
          :class="['size-9 rounded-full border-2 border-dashed', SEATS[tone] || SEATS.plain]"
          aria-hidden="true"
        />
      </div>
      <span v-if="more > 0" :class="['ml-2 text-sm font-semibold tabular-nums', MUTED[tone] || MUTED.plain]">+{{ more }}</span>
    </div>
    <p v-if="caption" :class="['mt-1.5 truncate text-xs', MUTED[tone] || MUTED.plain]">{{ caption }}</p>
  </div>
</template>

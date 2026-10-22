<script setup>
import { computed } from 'vue'
import { kindOf, kindTile } from '../../../../utils/ticketUtils'

// One ticket drawn the way the list draws it (components/tickets/TicketRow):
// its kind as a small tile, the title, and one quiet line. Kept to one line
// each, truncated rather than wrapped, so a scene's list can be planned to
// fit the screen.

const props = defineProps({
  ticket: { type: Object, required: true },
  // The line under the title; who sent it and when, unless told otherwise.
  line: { type: String, default: '' },
  pill: { type: String, default: '' },
})

const kind = computed(() => kindOf(props.ticket.kind))
const subtitle = computed(() => props.line || `${props.ticket.who} · ${props.ticket.when}`)
</script>

<template>
  <div class="flex items-center gap-2.5 px-3 py-2">
    <span :class="['flex size-8 shrink-0 items-center justify-center rounded-lg', kindTile(ticket.kind)]">
      <component :is="kind.icon" class="size-4" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[13px] font-medium">{{ ticket.title }}</span>
      <span class="block truncate text-[11px] text-gray-500 dark:text-gray-400">{{ subtitle }}</span>
    </span>
    <span
      v-if="pill"
      class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
    >
      {{ pill }}
    </span>
  </div>
</template>

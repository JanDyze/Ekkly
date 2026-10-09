<script setup>
import { eventStatusSummary } from '../../../lib/eventStatus'
import EventListItem from './EventListItem.vue'
import EventBandHeader from './EventBandHeader.vue'

// The month as a list of days: a sticky heading for each day that has
// something on, and plain rows beneath it. The agenda view is this on its own;
// on a phone the grid has it underneath, in the room square cells leave.
//
// `entries` come resolved from CalendarView —
// `{ dateString, day, label, ariaLabel, holiday, events, isToday, isSelected }`
// — so the heading, the highlight and the labels read the way the grid's do.

defineProps({
  entries: { type: Array, required: true },
  currentMonth: { type: String, required: true },
  empty: { type: String, default: '' },
})

const emit = defineEmits(['dayClick', 'eventClick'])
</script>

<template>
  <!-- Laid out the way the People list is. It was a bordered card per day
       holding filled chips, which made a busy month a wall of colour. The
       heading still opens the day. -->
  <div role="list" :aria-label="`${currentMonth} agenda`">
    <section v-for="entry in entries" :key="entry.dateString" role="listitem">
      <EventBandHeader
        clickable
        :label="entry.label"
        :count="entry.events.length || null"
        :note="entry.holiday?.name || ''"
        :highlight="entry.isToday || entry.isSelected"
        :aria-label="entry.ariaLabel"
        :aria-current="entry.isToday ? 'date' : undefined"
        @click="emit('dayClick', entry.day)"
      >
        <span v-if="entry.isToday" class="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
          Today
        </span>
      </EventBandHeader>
      <div v-if="entry.events.length" class="space-y-1 p-2">
        <EventListItem
          v-for="event in entry.events"
          :key="event.id"
          :event="event"
          :title="eventStatusSummary(event) || event.title"
          @click="emit('eventClick', event)"
        />
      </div>
    </section>

    <div v-if="!entries.length" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      {{ empty || `No events scheduled for ${currentMonth}` }}
    </div>
  </div>
</template>

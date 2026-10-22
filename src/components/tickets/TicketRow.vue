<script setup>
import { computed } from 'vue'
import { ChatCircleText } from '../../icons'
import ListRow from '../appframe/ListRow.vue'
import { ago, kindOf, kindTile, standing, ticketQueryContext } from '../../utils/ticketUtils'

// One ticket in a list of them (TicketsBoard): its kind as a small tile, what
// it says, and one quiet line. Read by two people, who want different lines.
//
// Whoever sent it wants to know where it stands — sent to Ekkly, waiting for
// an answer, answered — and whether there is something new to read: a tag
// says so when the last word on it is someone else's. An administrator going
// down the list wants who sent it, when, and where in the app; where it
// stands is the group it is under.
//
// It used to carry a drag grip and four transport buttons on every line. A
// row is something to read now, and the ticket opens on a tap.

const props = defineProps({
  ticket: { type: Object, required: true },
  // Read as whoever sent it, rather than as an administrator.
  asReporter: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  // What the list is being searched for, if anything.
  query: { type: String, default: '' },
})

// Found by a word the row does not show (in its details or a message): the
// words around it, in place of the quiet line, so the row says why it is here.
const found = computed(() => ticketQueryContext(props.ticket, props.query))

const emit = defineEmits(['open'])

const kind = computed(() => kindOf(props.ticket.kind))

const subtitle = computed(() => {
  const t = props.ticket
  const who = props.asReporter ? standing(t) : t.reporterName || (t.reporterUid ? 'Someone' : 'Backlog')
  return [who, ago(t.createdAt), t.where].filter(Boolean).join(' · ')
})

// The last word on it is someone else's: an answer to read.
const answered = computed(() => {
  const last = props.ticket.messages?.[props.ticket.messages.length - 1]
  return Boolean(last && last.from !== 'reporter')
})
</script>

<template>
  <ListRow
    :title="ticket.title || 'Ticket'"
    :subtitle="subtitle"
    :class="selected ? 'bg-primary/10 dark:bg-primary/20' : ''"
    @click="emit('open', ticket)"
  >
    <template #leading>
      <span :class="['flex size-10 shrink-0 items-center justify-center rounded-xl', kindTile(ticket.kind)]">
        <component :is="kind.icon" class="size-5" />
        <span class="sr-only">{{ kind.label }}</span>
      </span>
    </template>
    <template v-if="found" #subtitle>
      <template v-if="found.who">{{ found.who }}: </template>{{ found.before
      }}<strong class="font-semibold text-gray-900 dark:text-white">{{ found.hit }}</strong>{{ found.after }}
    </template>
    <template #trailing>
      <span
        v-if="asReporter && answered"
        class="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
      >
        <ChatCircleText class="size-3.5" />
        Replied
      </span>
      <ChatCircleText
        v-else-if="!asReporter && ticket.messages?.length"
        class="size-4.5 shrink-0 text-gray-300 dark:text-gray-600"
        :aria-label="`${ticket.messages.length} ${ticket.messages.length === 1 ? 'message' : 'messages'}`"
      />
    </template>
  </ListRow>
</template>

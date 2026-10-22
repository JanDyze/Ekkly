<script setup>
import { computed } from 'vue'
import { ago } from '../../utils/ticketUtils'

// The conversation on a ticket: what was sent, then everything said on it
// since, each a bubble. Whoever is reading sees their own side on the right
// in the church's colour and everyone else's on the left, as any messaging
// app does — so the church's app (TicketDrawer) and the platform's console
// (TicketsAdmin) draw the same thread from their own side.
//
// Three voices can be in it: whoever sent it, their church's administrators,
// and Ekkly. Each says who it is over its bubble, Ekkly's marked as Ekkly's,
// because to someone who sent a bug "Jan" means nothing unless it says where
// Jan is from.

const props = defineProps({
  ticket: { type: Object, required: true },
  // Which voices are the reader's own, drawn on the right: ['reporter'] for
  // whoever sent it, ['church'] for its administrators, ['ekkly'] for the
  // platform.
  ours: { type: Array, default: () => [] },
  // The reader's own uid, so their name reads "You".
  myUid: { type: String, default: '' },
})

const nameOf = (from, uid, name) => {
  if (uid && uid === props.myUid) return 'You'
  if (from === 'ekkly') return name ? `${name} · Ekkly` : 'Ekkly'
  if (from === 'church') return name || 'Your church'
  return name || 'Someone'
}

const bubbles = computed(() => {
  const t = props.ticket
  return [
    {
      id: 'sent',
      from: 'reporter',
      who: t.reporterUid ? nameOf('reporter', t.reporterUid, t.reporterName) : 'The backlog',
      text: t.details || t.title,
      at: t.createdAt,
    },
    ...(t.messages || []).map((m) => ({ id: m.id, from: m.from, who: nameOf(m.from, m.uid, m.name), text: m.text, at: m.at })),
  ].map((b) => ({ ...b, ours: props.ours.includes(b.from) }))
})

const initial = (who) => (who === 'You' ? 'Y' : who.charAt(0).toUpperCase() || '?')
</script>

<template>
  <ol class="flex flex-col gap-4" aria-label="Conversation">
    <li v-for="b in bubbles" :key="b.id" :class="['flex max-w-[92%] items-end gap-2', b.ours ? 'ml-auto flex-row-reverse' : '']">
      <span
        :class="[
          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          b.from === 'ekkly'
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        ]"
        aria-hidden="true"
      >
        {{ initial(b.who) }}
      </span>
      <div class="min-w-0">
        <p :class="['mb-1 px-1 text-xs text-gray-500 dark:text-gray-400', b.ours ? 'text-right' : '']">
          {{ b.who }}<template v-if="b.at"> · {{ ago(b.at) }}</template>
        </p>
        <p
          :class="[
            'whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
            b.ours
              ? 'rounded-br-md bg-primary text-white'
              : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-700/70 dark:text-white',
          ]"
        >{{ b.text }}</p>
      </div>
    </li>
  </ol>
</template>

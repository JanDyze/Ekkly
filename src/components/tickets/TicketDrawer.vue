<script setup>
import { computed, ref, watch } from 'vue'
import { Check, PaperPlaneRight, PencilSimple, Trash2, X } from '../../icons'
import TicketThread from './TicketThread.vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { closedWord, handledBy, isClosed, kindOf, kindTile, lastAnswer, standing } from '../../utils/ticketUtils'

// One ticket, read as the conversation it is (TicketThread). Beside the list
// on a desktop, as mail reads (TicketsBoard), and a sheet from the foot on a
// phone.
//
// Whoever sent it sees where it has got to as three steps, the conversation,
// and a box to add to it — which opens it again if it had been closed, since
// there is evidently more to say. Until anyone else has written on it they may
// still change it or take it back.
//
// A church's administrator answers the church's own (a question, a
// complaint, praise) in the box at the foot, and answering closes it; a word
// of thanks can be marked read without one. A bug or an idea is Ekkly's: the
// administrator reads where it stands and what Ekkly said, with nothing to
// do, and it says so rather than leaving them to wonder.

const isMobile = useMediaQuery('(max-width: 1023px)')

const props = defineProps({
  show: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  // Read as whoever sent it, rather than as an administrator.
  mine: { type: Boolean, default: false },
  myUid: { type: String, default: '' },
  // What this person may do with it (useTickets).
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  canWrite: { type: Boolean, default: false },
  canMarkDone: { type: Boolean, default: false },
  posting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'edit', 'delete', 'post', 'done'])

const close = () => emit('update:show', false)

const kind = computed(() => (props.ticket ? kindOf(props.ticket.kind) : null))
const closed = computed(() => isClosed(props.ticket))
const ekklys = computed(() => (props.ticket ? handledBy(props.ticket.kind) === 'ekkly' : false))

const meta = computed(() => {
  const t = props.ticket
  if (!t) return ''
  return [props.mine ? '' : t.reporterName ? `From ${t.reporterName}` : '', standing(t), t.where].filter(Boolean).join(' · ')
})

/* --------------------------------------------------------------- progress */

// Sent, picked up, closed: what someone who sent a ticket wants to know, in
// the order it happens. On hold is the second step, said so.
const steps = computed(() => {
  const t = props.ticket
  if (!t) return []
  const reached = closed.value ? 3 : t.status === 'doing' || t.status === 'paused' || lastAnswer(t) ? 2 : 1
  return [
    { key: 'sent', label: 'Sent', done: reached >= 1 },
    { key: 'seen', label: t.status === 'paused' ? 'On hold' : 'Picked up', done: reached >= 2 },
    { key: 'closed', label: closed.value ? closedWord(t) : 'Done', done: reached >= 3 },
  ]
})

/* ---------------------------------------------------------------- writing */

const draft = ref('')
watch(
  () => [props.show, props.ticket?.id],
  () => {
    draft.value = ''
  },
  { immediate: true }
)
// Cleared once what was sent has landed on the ticket.
watch(
  () => props.ticket?.messages?.length,
  (now, before) => {
    if (now > before) draft.value = ''
  }
)

const firstName = computed(() => (props.ticket?.reporterName || '').split(' ')[0] || 'them')

const placeholder = computed(() => {
  if (!props.mine) return `Answer ${firstName.value}…`
  return closed.value ? 'Write again, and it opens again…' : 'Add to this…'
})

const hint = computed(() => {
  if (props.mine) return ''
  return props.ticket?.kind === 'praise' ? 'A word back closes it as read.' : 'Answering marks it answered.'
})

const sendMessage = () => {
  const words = draft.value.trim()
  if (!words || props.posting) return
  emit('post', words)
}
const onKey = (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    sendMessage()
  }
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show && isMobile.value, close)

const ICON_BUTTON =
  'flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200'
</script>

<template>
  <Teleport to="body" :disabled="!isMobile">
    <Transition :name="isMobile ? 'modal-sheet' : 'pane'">
      <div
        v-if="show && ticket"
        :class="
          isMobile
            ? 'fixed inset-0 z-80 flex flex-col justify-end'
            : 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/5 dark:bg-gray-800/70 dark:ring-white/10'
        "
      >
        <div v-if="isMobile" class="absolute inset-0 bg-black/50" @click="close" />
        <div
          ref="dialogRef"
          role="dialog"
          :aria-modal="isMobile ? 'true' : undefined"
          aria-labelledby="ticket-drawer-title"
          tabindex="-1"
          :class="[
            'flex min-h-0 flex-col',
            isMobile ? 'relative z-10 max-h-[92dvh] w-full rounded-t-2xl bg-white dark:bg-gray-800' : 'h-full w-full',
          ]"
        >
          <!-- The kind, and what can be done to it, small, by the close. -->
          <div class="flex shrink-0 items-center gap-1 border-b border-gray-100 px-3 py-2.5 dark:border-white/10 sm:px-4">
            <p class="flex min-w-0 flex-1 items-center gap-2">
              <span :class="['flex size-8 shrink-0 items-center justify-center rounded-lg', kindTile(ticket.kind)]">
                <component :is="kind.icon" class="size-4.5" />
              </span>
              <span class="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">{{ kind.label }}</span>
            </p>
            <button
              v-if="canMarkDone"
              type="button"
              :class="ICON_BUTTON"
              :aria-label="ticket.kind === 'praise' ? 'Mark as read' : 'Mark as answered'"
              :title="ticket.kind === 'praise' ? 'Mark as read' : 'Mark as answered'"
              @click="emit('done')"
            >
              <Check class="size-4.5" />
            </button>
            <button v-if="canEdit" type="button" :class="ICON_BUTTON" aria-label="Edit ticket" title="Edit" @click="emit('edit')">
              <PencilSimple class="size-4.5" />
            </button>
            <button
              v-if="canDelete"
              type="button"
              :class="[ICON_BUTTON, 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400']"
              :aria-label="mine ? 'Take back ticket' : 'Delete ticket'"
              :title="mine ? 'Take back' : 'Delete'"
              @click="emit('delete')"
            >
              <Trash2 class="size-4.5" />
            </button>
            <button type="button" :class="ICON_BUTTON" aria-label="Close" @click="close">
              <X class="size-5" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <h3 id="ticket-drawer-title" class="text-xl font-semibold leading-snug text-gray-900 dark:text-white">
              {{ ticket.title || 'Ticket' }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ meta }}</p>

            <!-- Where it has got to, for whoever sent it. -->
            <ol v-if="mine" class="mt-5 flex items-start" aria-label="Progress">
              <li v-for="(step, i) in steps" :key="step.key" class="relative flex flex-1 flex-col items-center text-center">
                <span
                  v-if="i > 0"
                  :class="[
                    'absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2',
                    step.done ? 'bg-primary dark:bg-primary-light' : 'bg-gray-200 dark:bg-gray-700',
                  ]"
                />
                <span
                  :class="[
                    'relative flex size-6 items-center justify-center rounded-full',
                    step.done
                      ? 'bg-primary text-white dark:bg-primary-light dark:text-gray-900'
                      : 'bg-white ring-2 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
                  ]"
                >
                  <Check v-if="step.done" class="size-3.5" />
                </span>
                <span
                  :class="['mt-1.5 text-xs', step.done ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500']"
                >
                  {{ step.label }}
                </span>
              </li>
            </ol>

            <!-- Ekkly's, for an administrator: nothing to do, and said so. -->
            <p
              v-else-if="ekklys"
              class="mt-4 rounded-xl bg-gray-100 px-3.5 py-2.5 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300"
            >
              {{ kind.label }}s go to the Ekkly team, who answer here. Nothing for you to do.
            </p>

            <div class="mt-6">
              <TicketThread :ticket="ticket" :ours="mine ? ['reporter'] : ['church']" :my-uid="myUid" />
              <p v-if="!lastAnswer(ticket) && !closed" class="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
                {{ ekklys ? 'No answer from Ekkly yet.' : 'No answer yet.' }}
              </p>
            </div>
          </div>

          <!-- Writing on it, at the foot as a chat's box is. -->
          <form
            v-if="canWrite"
            class="shrink-0 border-t border-gray-100 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10 sm:px-4 lg:pb-3"
            @submit.prevent="sendMessage"
          >
            <div class="flex items-end gap-2">
              <label for="ticket-message" class="sr-only">{{ placeholder }}</label>
              <textarea
                id="ticket-message"
                v-model="draft"
                rows="1"
                :placeholder="placeholder"
                class="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[15px] text-gray-900 field-sizing-content placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                @keydown="onKey"
              />
              <button
                type="submit"
                :disabled="!draft.trim() || posting"
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
                :aria-label="posting ? 'Sending' : 'Send'"
              >
                <PaperPlaneRight class="size-5" />
              </button>
            </div>
            <p v-if="hint" class="mt-1.5 px-1 text-xs text-gray-400 dark:text-gray-500">{{ hint }}</p>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pane-enter-active {
  transition: opacity 0.2s ease;
}

.pane-enter-from {
  opacity: 0;
}

.modal-sheet-enter-active,
.modal-sheet-leave-active {
  transition: opacity 0.25s ease;
}

.modal-sheet-enter-active > div:last-child,
.modal-sheet-leave-active > div:last-child {
  transition: transform 0.25s ease;
}

.modal-sheet-enter-from,
.modal-sheet-leave-to {
  opacity: 0;
}

.modal-sheet-enter-from > div:last-child,
.modal-sheet-leave-to > div:last-child {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .pane-enter-active,
  .modal-sheet-enter-active,
  .modal-sheet-leave-active,
  .modal-sheet-enter-active > div:last-child,
  .modal-sheet-leave-active > div:last-child {
    transition: none;
  }
}
</style>

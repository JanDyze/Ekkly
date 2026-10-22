<script setup>
import { computed, onActivated, ref, watch } from 'vue'
import { Kanban, Loader2, MagnifyingGlass, PaperPlaneRight, Trash2, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import TicketThread from '../tickets/TicketThread.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'
import { useFocusTrap } from '../../composables/useFocusTrap'
import {
  TICKET_STATUSES,
  ago,
  closedWord,
  handledBy,
  kindOf,
  kindTile,
  matchesTicketQuery,
} from '../../utils/ticketUtils'

// Every church's tickets, as a board: the console's side of the Tickets app
// (lib/platform/tickets.js). Bugs and ideas are Ekkly's to answer, and this is
// where they are worked: a column for each place a ticket can be — new, in
// progress, on hold, done — each card a ticket, with the church it came from.
// A card is dragged to another column to move it on, and up or down its own
// to say what comes first. A phone, which cannot drag, moves it from the
// ticket itself.
//
// Opening a card shows its whole conversation (TicketThread, Ekkly's side on
// the right) with a box to answer in, which whoever sent it reads in their
// church's app, and what it was sent from.
//
// Questions, complaints and praise are each church's to answer, so the board
// leaves them out unless asked for (Everything): there to read, not to work.

const toast = useToast()
const tickets = ref([])
const loading = ref(true)

// The server sends times as ISO strings; the shared helpers read Dates.
const toDate = (value) => (value ? new Date(value) : null)
const fromServer = (t) => ({
  ...t,
  createdAt: toDate(t.createdAt) || new Date(0),
  updatedAt: toDate(t.updatedAt),
  doneAt: toDate(t.doneAt),
  messages: (t.messages || []).map((m) => ({ ...m, at: toDate(m.at) })),
})

const load = async () => {
  try {
    tickets.value = (await callPlatform('tickets')).map(fromServer)
  } catch (error) {
    console.error('Error loading tickets:', error)
    toast.error(error.message || 'Could not load the tickets.')
  } finally {
    loading.value = false
  }
}
onActivated(load)

const keyOf = (t) => `${t.churchId}/${t.id}`

/* --------------------------------------------------------------- filters */

const scope = ref('ekkly')
const churchFilter = ref('')
const searchQuery = ref('')

const churches = computed(() => {
  const seen = new Map()
  tickets.value.forEach((t) => seen.set(t.churchId, t.churchName))
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
})

const shown = computed(() =>
  tickets.value.filter(
    (t) =>
      (scope.value === 'all' || handledBy(t.kind) === 'ekkly') &&
      (!churchFilter.value || t.churchId === churchFilter.value) &&
      matchesTicketQuery(t, searchQuery.value)
  )
)

/* ----------------------------------------------------------------- board */

// Where a ticket sits in its column: the order given it, or for one never
// placed, where it would have landed when it was sent (newest highest, as
// ticketsService writes a new one), so every card has a number to sort by and
// a dropped card always has room between its neighbours.
const rankOf = (t) => (typeof t.order === 'number' ? t.order : -t.createdAt.getTime())
const byRank = (a, b) => rankOf(a) - rankOf(b)

// The closed pile is history: the latest few, the rest on asking.
const DONE_SHOWN = 12
const showAllDone = ref(false)

const COLUMNS = [
  { key: 'open', label: 'New' },
  { key: 'doing', label: 'In progress' },
  { key: 'paused', label: 'On hold' },
  { key: 'done', label: 'Done' },
]

const columns = computed(() =>
  COLUMNS.map((col) => {
    if (col.key === 'done') {
      const all = shown.value
        .filter((t) => t.status === 'done' || t.status === 'declined')
        .sort((a, b) => (b.doneAt?.getTime() || 0) - (a.doneAt?.getTime() || 0))
      const cards = showAllDone.value || searchQuery.value.trim() ? all : all.slice(0, DONE_SHOWN)
      return { ...col, cards, total: all.length, more: all.length - cards.length }
    }
    const cards = shown.value.filter((t) => t.status === col.key).sort(byRank)
    return { ...col, cards, total: cards.length, more: 0 }
  })
)

/** The last word on it is from whoever sent it, or nobody has answered. */
const waiting = (t) => {
  const last = t.messages[t.messages.length - 1]
  return !last || last.from !== 'ekkly'
}

/* ------------------------------------------------------------- changing */

const replaceLocal = (updated) => {
  tickets.value = tickets.value.map((t) => (keyOf(t) === keyOf(updated) ? updated : t))
}

// Shown at once and sent after, so a card lands where it was dropped rather
// than jumping back while the server answers; put back if it refuses.
const change = async (ticket, fields, { quiet = false } = {}) => {
  const before = ticket
  replaceLocal({ ...ticket, ...fields })
  try {
    const updated = await callPlatform('updateTicket', { churchId: ticket.churchId, id: ticket.id, ...fields })
    replaceLocal(fromServer(updated))
    if (!quiet && fields.status) toast.success(`Moved to ${TICKET_STATUSES.find((s) => s.key === fields.status)?.label}`)
  } catch (error) {
    replaceLocal(before)
    console.error('Error updating ticket:', error)
    toast.error(error.message || 'Could not update that ticket. Please try again.')
  }
}

/* ---------------------------------------------------------------- drag */

// The browser's own drag and drop: the console is worked from a computer.
const dragging = ref(null)
const dropAt = ref(null)

const onDragStart = (event, ticket) => {
  dragging.value = ticket
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', keyOf(ticket))
}

const onDragEnd = () => {
  dragging.value = null
  dropAt.value = null
}

// Where in a column the pointer is: before the first card (other than the
// one being carried) whose middle is below it, by that card's key, or at the
// end (null).
const beforeAt = (event) => {
  const carried = keyOf(dragging.value)
  const cards = [...event.currentTarget.querySelectorAll('[data-card]')].filter((el) => el.dataset.key !== carried)
  const hit = cards.find((el) => {
    const box = el.getBoundingClientRect()
    return event.clientY < box.top + box.height / 2
  })
  return hit ? hit.dataset.key : null
}

const onDragOver = (event, column) => {
  if (!dragging.value) return
  event.preventDefault()
  dropAt.value = { column: column.key, before: column.key === 'done' ? null : beforeAt(event) }
}

const onDrop = (event, column) => {
  event.preventDefault()
  const ticket = dragging.value
  const at = dropAt.value
  onDragEnd()
  if (!ticket || !at) return

  if (column.key === 'done') {
    if (ticket.status !== 'done' && ticket.status !== 'declined') change(ticket, { status: 'done' })
    return
  }

  // Its new place: halfway between the cards either side of where it fell.
  const others = column.cards.filter((t) => keyOf(t) !== keyOf(ticket))
  const found = at.before ? others.findIndex((t) => keyOf(t) === at.before) : -1
  const index = found < 0 ? others.length : found
  const above = others[index - 1]
  const below = others[index]
  const order = above && below ? (rankOf(above) + rankOf(below)) / 2 : below ? rankOf(below) - 1000 : above ? rankOf(above) + 1000 : 0

  const fields = { order }
  if (ticket.status !== column.key) fields.status = column.key
  if (!fields.status && rankOf(ticket) === order) return
  change(ticket, fields, { quiet: !fields.status })
}

/* ---------------------------------------------------------- one ticket */

const openKey = ref(null)
const opened = computed(() => tickets.value.find((t) => keyOf(t) === openKey.value) || null)
const openTicket = (ticket) => {
  openKey.value = keyOf(ticket)
}
const close = () => {
  openKey.value = null
}

const draft = ref('')
watch(openKey, () => {
  draft.value = ''
})

const posting = ref(false)
const sendAnswer = async () => {
  const text = draft.value.trim()
  if (!opened.value || !text || posting.value) return
  posting.value = true
  try {
    const updated = await callPlatform('updateTicket', { churchId: opened.value.churchId, id: opened.value.id, message: text })
    replaceLocal(fromServer(updated))
    draft.value = ''
  } catch (error) {
    console.error('Error answering ticket:', error)
    toast.error(error.message || 'Could not send that. Please try again.')
  } finally {
    posting.value = false
  }
}
const onKey = (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    sendAnswer()
  }
}

const pendingDelete = ref(null)
const confirmDelete = async () => {
  const ticket = pendingDelete.value
  pendingDelete.value = null
  if (!ticket) return
  try {
    await callPlatform('deleteTicket', { churchId: ticket.churchId, id: ticket.id })
    tickets.value = tickets.value.filter((t) => keyOf(t) !== keyOf(ticket))
    if (openKey.value === keyOf(ticket)) close()
    toast.success('Ticket deleted')
  } catch (error) {
    console.error('Error deleting ticket:', error)
    toast.error(error.message || 'Could not delete that ticket. Please try again.')
  }
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => Boolean(opened.value), close)
</script>

<template>
  <SectionCard :icon="Kanban" title="Tickets" subtitle="Bugs and ideas from every church, worked from new to done">
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3 dark:border-gray-700">
      <div class="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900" role="radiogroup" aria-label="Which tickets">
        <button
          v-for="option in [{ key: 'ekkly', label: 'Bugs & ideas' }, { key: 'all', label: 'Everything' }]"
          :key="option.key"
          type="button"
          role="radio"
          :aria-checked="scope === option.key"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            scope === option.key ? 'bg-white text-gray-900 ring-1 ring-black/5 dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
          ]"
          @click="scope = option.key"
        >
          {{ option.label }}
        </button>
      </div>
      <select
        v-if="churches.length > 1"
        v-model="churchFilter"
        aria-label="Church"
        class="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option value="">Every church</option>
        <option v-for="church in churches" :key="church.id" :value="church.id">{{ church.name }}</option>
      </select>
      <label class="relative ml-auto min-w-48 flex-1 sm:max-w-64">
        <MagnifyingGlass class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search tickets"
          aria-label="Search tickets"
          class="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </label>
    </div>

    <div v-if="loading" class="grid grid-cols-4 gap-3 p-3">
      <div v-for="i in 4" :key="i" class="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700"></div>
    </div>

    <!-- The board: four columns side by side, scrolled sideways on a phone. -->
    <div v-else class="flex snap-x gap-3 overflow-x-auto p-3 [scrollbar-width:thin]">
      <section
        v-for="column in columns"
        :key="column.key"
        :aria-label="column.label"
        :class="[
          'flex w-[80vw] max-w-72 shrink-0 snap-start flex-col rounded-xl bg-gray-50 p-2 transition-colors sm:w-auto sm:max-w-none sm:flex-1 sm:shrink dark:bg-gray-900/50',
          dragging && dropAt?.column === column.key ? 'ring-2 ring-primary/40' : '',
        ]"
        @dragover="onDragOver($event, column)"
        @drop="onDrop($event, column)"
      >
        <h3 class="flex items-center gap-2 px-1.5 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ column.label }}
          <span class="font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ column.total }}</span>
        </h3>

        <ol class="flex min-h-24 flex-col gap-2">
          <li v-for="ticket in column.cards" :key="keyOf(ticket)" data-card :data-key="keyOf(ticket)">
            <!-- Where the dragged card would land. -->
            <div
              v-if="dragging && dropAt?.column === column.key && dropAt.before === keyOf(ticket) && column.key !== 'done'"
              class="mb-2 h-1 rounded-full bg-primary"
            />
            <button
              type="button"
              draggable="true"
              :class="[
                'w-full rounded-lg bg-white p-2.5 text-left ring-1 ring-gray-200 transition-colors hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-gray-600',
                openKey === keyOf(ticket) ? 'ring-2 ring-primary dark:ring-primary-light' : '',
                dragging && keyOf(dragging) === keyOf(ticket) ? 'opacity-40' : '',
              ]"
              @click="openTicket(ticket)"
              @dragstart="onDragStart($event, ticket)"
              @dragend="onDragEnd"
            >
              <span class="flex items-start gap-2">
                <span :class="['mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md', kindTile(ticket.kind)]">
                  <component :is="kindOf(ticket.kind).icon" class="size-3.5" />
                </span>
                <span class="line-clamp-3 min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900 dark:text-white">{{ ticket.title || 'Ticket' }}</span>
              </span>
              <span class="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <span class="truncate">{{ ticket.churchName }}</span>
                <span aria-hidden="true">·</span>
                <span class="shrink-0">{{ ago(ticket.createdAt) }}</span>
                <span
                  v-if="column.key === 'done' && ticket.status === 'declined'"
                  class="ml-auto shrink-0 rounded-full bg-gray-100 px-1.5 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {{ closedWord(ticket) }}
                </span>
                <span
                  v-else-if="column.key !== 'done' && waiting(ticket)"
                  class="ml-auto size-2 shrink-0 rounded-full bg-primary dark:bg-primary-light"
                  title="Waiting on Ekkly"
                  aria-label="Waiting on Ekkly"
                />
              </span>
            </button>
          </li>
          <li
            v-if="dragging && dropAt?.column === column.key && dropAt.before === null && column.key !== 'done'"
            class="h-1 rounded-full bg-primary"
          />
          <li v-if="!column.cards.length && !dragging" class="px-1.5 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Nothing here
          </li>
        </ol>

        <button
          v-if="column.more"
          type="button"
          class="mt-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-white dark:text-primary-light dark:hover:bg-gray-800"
          @click="showAllDone = true"
        >
          Show {{ column.more }} more
        </button>
      </section>
    </div>

    <!-- One ticket: its whole conversation, and the answer to it. -->
    <Teleport to="body">
      <div v-if="opened" class="fixed inset-0 z-80 flex items-end justify-center sm:items-stretch sm:justify-end">
        <div class="absolute inset-0 bg-black/40" @click="close"></div>
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="platform-ticket-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white sm:m-3 sm:max-h-none sm:max-w-lg sm:rounded-2xl dark:bg-gray-800"
        >
          <div class="flex shrink-0 items-center gap-1 border-b border-gray-100 px-3 py-2.5 dark:border-white/10 sm:px-4">
            <p class="flex min-w-0 flex-1 items-center gap-2">
              <span :class="['flex size-8 shrink-0 items-center justify-center rounded-lg', kindTile(opened.kind)]">
                <component :is="kindOf(opened.kind).icon" class="size-4.5" />
              </span>
              <span class="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
                {{ kindOf(opened.kind).label }} · {{ opened.churchName }}
              </span>
            </p>
            <button
              type="button"
              class="flex size-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              aria-label="Delete ticket"
              title="Delete"
              @click="pendingDelete = opened"
            >
              <Trash2 class="size-4.5" />
            </button>
            <button
              type="button"
              class="flex size-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Close"
              @click="close"
            >
              <X class="size-5" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <h3 id="platform-ticket-title" class="text-xl font-semibold leading-snug text-gray-900 dark:text-white">
              {{ opened.title || 'Ticket' }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ [opened.reporterName ? `From ${opened.reporterName}` : 'From the backlog', ago(opened.createdAt), opened.where].filter(Boolean).join(' · ') }}
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <select
                :value="opened.status"
                aria-label="Status"
                class="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-medium text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                @change="change(opened, { status: $event.target.value })"
              >
                <option v-for="status in TICKET_STATUSES" :key="status.key" :value="status.key">{{ status.label }}</option>
              </select>
              <span v-if="opened.assigneeName && (opened.status === 'doing' || opened.status === 'paused')" class="text-sm text-gray-500 dark:text-gray-400">
                {{ opened.assigneeName }} has this one
              </span>
            </div>
            <p v-if="handledBy(opened.kind) === 'church'" class="mt-3 rounded-xl bg-gray-100 px-3.5 py-2.5 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
              This is {{ opened.churchName }}’s to answer. You can read it, and write if it needs Ekkly.
            </p>

            <div class="mt-6">
              <TicketThread :ticket="opened" :ours="['ekkly']" />
            </div>

            <p v-if="opened.page" class="mt-6 break-all text-xs text-gray-400 dark:text-gray-500">
              Sent from the page {{ opened.page }}
            </p>
            <p v-if="opened.device || opened.version" :class="['text-xs text-gray-400 dark:text-gray-500', opened.page ? 'mt-1' : 'mt-6']">
              Sent from {{ [opened.device, opened.version ? `Ekkly ${opened.version}` : ''].filter(Boolean).join(' · ') }}
            </p>
          </div>

          <form
            v-if="opened.reporterUid"
            class="flex shrink-0 items-end gap-2 border-t border-gray-100 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10 sm:px-4 sm:pb-3"
            @submit.prevent="sendAnswer"
          >
            <label for="platform-ticket-answer" class="sr-only">Answer</label>
            <textarea
              id="platform-ticket-answer"
              v-model="draft"
              rows="1"
              :placeholder="`Answer ${(opened.reporterName || 'them').split(' ')[0]} as Ekkly…`"
              class="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[15px] text-gray-900 field-sizing-content placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              @keydown="onKey"
            />
            <button
              type="submit"
              :disabled="!draft.trim() || posting"
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
              :aria-label="posting ? 'Sending' : 'Send answer'"
            >
              <Loader2 v-if="posting" class="size-5 animate-spin" />
              <PaperPlaneRight v-else class="size-5" />
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <ConfirmationModal
      :show="Boolean(pendingDelete)"
      title="Delete ticket"
      :message="`Delete “${pendingDelete?.title || 'this ticket'}” from ${pendingDelete?.churchName || 'its church'}? This cannot be undone.`"
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="(open) => { if (!open) pendingDelete = null }"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </SectionCard>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChatCircleText, MagnifyingGlass } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import AppArt from '../../components/common/AppArt.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import TicketRow from '../../components/tickets/TicketRow.vue'
import TicketDrawer from '../../components/tickets/TicketDrawer.vue'
import TicketComposer from '../../components/tickets/TicketComposer.vue'
import { useTickets } from '../../composables/useTickets'
import { useToast } from '../../composables/useToast'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { SENDABLE_KINDS, isClosed, kindTile, matchesTicketQuery } from '../../utils/ticketUtils'

// The Tickets app: one screen, an inbox rather than a launcher (routes.js says
// why). Two people use it, and each gets only what they came for.
//
// Everyone gets a line saying what this is, and the kinds as a row of buttons,
// each opening the form already set to it — so a bug is two taps from the
// screen opening.
//
// Someone who sent tickets sees them under it, each with where it stands and
// a tag when there is an answer to read.
//
// A church's administrator sees the church's tickets in four groups, by what
// they ask of them (useTickets): the questions and complaints that need an
// answer, the kind words to read, the bugs and ideas sent to Ekkly (to see,
// not to do), and what has been answered. It used to be a developer's
// backlog — statuses, ownership, an order to drag, chores — which was Ekkly's
// work handed to someone who cannot fix the app. That is the platform's
// console now (TicketsAdmin).
//
// On a desktop the list is on the left and the ticket opened from it reads on
// the right, as mail does, with a quiet panel there until one is picked.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const wide = useMediaQuery('(min-width: 1024px)')
const {
  tickets,
  loading,
  canManage,
  myUid,
  isMine,
  needsAnswer,
  kindWords,
  withEkkly,
  closedTickets,
  mine,
  send,
  updateTicket,
  post,
  markDone,
  removeTicket,
  canEdit,
  canDelete,
  canWrite,
  canMarkDone,
} = useTickets()

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/* ------------------------------------------------------------- the top */

const heading = computed(() => {
  if (!canManage.value || loading.value) return 'Tell us what you think'
  const n = needsAnswer.value.length
  return n ? `${plural(n, 'ticket needs', 'tickets need')} an answer` : 'Nothing needs an answer'
})

const subline = computed(() =>
  canManage.value
    ? 'Questions, complaints and praise are yours to answer. Bugs and ideas go to the Ekkly team.'
    : 'Bugs and ideas go to the Ekkly team. Questions, complaints and praise go to your church’s administrators.'
)

/* ---------------------------------------------------------------- search */

// Only once there is enough to need it: a few tickets are read, not searched.
const searchQuery = ref(String(route.query.q || ''))
const searchable = computed(() => canManage.value && tickets.value.length > 8)
const matches = (t) => matchesTicketQuery(t, searchQuery.value)

/* ---------------------------------------------------------------- groups */

// Closed ones are history: the latest few, and the rest on asking.
const CLOSED_SHOWN = 8
const showAllClosed = ref(false)

const groups = computed(() => {
  const filter = (list) => list.filter(matches)
  if (!canManage.value) {
    const list = filter(mine.value)
    return [
      { key: 'open', label: 'Your tickets', tickets: list.filter((t) => !isClosed(t)) },
      { key: 'closed', label: 'Closed', tickets: list.filter(isClosed) },
    ].filter((g) => g.tickets.length)
  }
  const closed = filter(closedTickets.value)
  const searching = Boolean(searchQuery.value.trim())
  return [
    { key: 'answer', label: 'Needs an answer', tickets: filter(needsAnswer.value) },
    { key: 'praise', label: 'Kind words', tickets: filter(kindWords.value) },
    {
      key: 'ekkly',
      label: 'Sent to Ekkly',
      note: 'Ekkly answers these. You see what they say.',
      tickets: filter(withEkkly.value),
    },
    {
      key: 'closed',
      label: 'Answered and closed',
      tickets: searching || showAllClosed.value ? closed : closed.slice(0, CLOSED_SHOWN),
      more: searching || showAllClosed.value ? 0 : Math.max(0, closed.length - CLOSED_SHOWN),
    },
  ].filter((g) => g.tickets.length)
})

const emptyLine = computed(() => {
  if (searchQuery.value.trim()) {
    return { title: `Nothing matches “${searchQuery.value.trim()}”`, detail: 'Try a word from the ticket, a name, or “unanswered”.' }
  }
  return canManage.value
    ? { title: 'No tickets yet', detail: 'What people in the church send shows here.' }
    : { title: 'Nothing sent yet', detail: 'Pick what you would like to tell us above.' }
})

/* ------------------------------------------------------------- one ticket */

const openId = ref(null)
const opened = computed(() => tickets.value.find((t) => (t.firestoreId || t.id) === openId.value) || null)

const openTicket = (ticket) => {
  openId.value = ticket.firestoreId || ticket.id
}
const closeTicket = () => {
  openId.value = null
}

// A link to one ticket (a notification) opens it. The query is dropped once
// it has, so closing it does not open it again.
watch(
  [() => route.query.open, tickets],
  ([id]) => {
    if (!id) return
    const ticket = tickets.value.find((t) => String(t.firestoreId || t.id) === String(id))
    if (!ticket) return
    openTicket(ticket)
    const { open: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

// Say which layer refused, rather than a generic "could not save" that sends
// you looking in the wrong place.
const failed = (error, message) => {
  console.error(error)
  toast.error(
    error?.code === 'permission-denied'
      ? 'You do not have permission to change tickets in this church.'
      : `${message} Please try again.`
  )
}

const posting = ref(false)
const postMessage = async (text) => {
  if (!opened.value || posting.value) return
  posting.value = true
  try {
    await post(opened.value, text)
  } catch (error) {
    failed(error, 'Could not send that.')
  } finally {
    posting.value = false
  }
}

const closeAsDone = async () => {
  if (!opened.value) return
  const praise = opened.value.kind === 'praise'
  try {
    await markDone(opened.value)
    toast.success(praise ? 'Marked as read' : 'Marked as answered')
  } catch (error) {
    failed(error, 'Could not close that ticket.')
  }
}

/* ------------------------------------------------------------- the form */

const showComposer = ref(false)
const editing = ref(null)
const startKind = ref('')
const saving = ref(false)
const sent = ref(false)

const newTicket = (kind = '') => {
  editing.value = null
  startKind.value = typeof kind === 'string' ? kind : ''
  sent.value = false
  showComposer.value = true
}

const editTicket = () => {
  editing.value = opened.value
  sent.value = false
  showComposer.value = true
}

// ?add=1 opens the form, ?add=<kind> already set to that kind. The query is
// dropped once it has, so closing the form does not open it again.
watch(
  () => route.query.add,
  (add) => {
    if (!add) return
    newTicket(SENDABLE_KINDS.some((k) => k.key === add) ? String(add) : '')
    const { add: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

const saveTicket = async (fields) => {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value) {
      await updateTicket(editing.value, fields)
      showComposer.value = false
      toast.success('Ticket saved')
    } else {
      await send(fields)
      // The form thanks them itself, and stays until they close it.
      sent.value = true
    }
  } catch (error) {
    // The form stays open and keeps what was typed, so a failed save is not
    // also a lost one.
    failed(error, editing.value ? 'Could not save that ticket.' : 'Could not send that ticket.')
  } finally {
    saving.value = false
  }
}

/* -------------------------------------------------------------- deleting */

const pendingDelete = ref(null)
const takingBack = computed(() => Boolean(pendingDelete.value && isMine(pendingDelete.value)))

const confirmDelete = async () => {
  const ticket = pendingDelete.value
  const back = takingBack.value
  pendingDelete.value = null
  if (!ticket) return
  try {
    await removeTicket(ticket)
    if (openId.value === (ticket.firestoreId || ticket.id)) closeTicket()
    toast.success(back ? 'Ticket taken back' : 'Ticket deleted')
  } catch (error) {
    failed(error, 'Could not delete that ticket.')
  }
}

</script>

<template>
  <AppScreen fill board plain>
    <div class="flex min-h-0 flex-1 gap-5">
      <!-- The list, with what this is above it: the whole screen on a phone,
           a column on a desktop. -->
      <div class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-6 lg:w-104 lg:flex-none xl:w-120">
        <section class="pb-6 pt-1">
          <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{ heading }}</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ subline }}</p>
          <div class="mt-5 grid grid-cols-5 gap-1">
            <button
              v-for="kind in SENDABLE_KINDS"
              :key="kind.key"
              type="button"
              class="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-0.5 py-2 transition-colors hover:bg-white dark:hover:bg-gray-800"
              :aria-label="`Send a ${kind.label.toLowerCase()}: ${kind.hint}`"
              @click="newTicket(kind.key)"
            >
              <span :class="['flex size-12 items-center justify-center rounded-2xl', kindTile(kind.key)]">
                <component :is="kind.icon" class="size-6" />
              </span>
              <span class="w-full truncate text-center text-xs font-medium text-gray-700 dark:text-gray-300">{{ kind.label }}</span>
            </button>
          </div>
        </section>

        <label v-if="searchable" class="relative mb-5 block">
          <MagnifyingGlass class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            enterkeyhint="search"
            placeholder="Search — a word, a name, “unanswered”"
            aria-label="Search tickets"
            class="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>

        <div v-if="loading" class="flex flex-col gap-2">
          <div v-for="n in 4" :key="n" class="flex items-center gap-3 rounded-2xl bg-white p-3 dark:bg-gray-800">
            <div class="size-10 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-600" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
              <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            </div>
          </div>
        </div>

        <div v-else-if="!groups.length" class="flex flex-col items-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
          <ChatCircleText class="mb-3 size-10 text-gray-300 dark:text-gray-600" />
          <p class="mb-1 text-lg">{{ emptyLine.title }}</p>
          <p class="text-sm">{{ emptyLine.detail }}</p>
        </div>

        <div v-else class="flex flex-col gap-5">
          <ListGroup v-for="group in groups" :key="group.key" :title="group.label" :count="group.tickets.length + (group.more || 0)" :note="group.note || ''">
            <TicketRow
              v-for="ticket in group.tickets"
              :key="ticket.firestoreId || ticket.id"
              :ticket="ticket"
              :as-reporter="!canManage"
              :selected="openId === (ticket.firestoreId || ticket.id)"
              :query="searchQuery"
              @open="openTicket"
            />
            <button
              v-if="group.more"
              type="button"
              class="w-full px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-gray-50 dark:text-primary-light dark:hover:bg-gray-700/40"
              @click="showAllClosed = true"
            >
              Show {{ group.more }} more
            </button>
          </ListGroup>
        </div>
      </div>

      <!-- The ticket, beside the list on a desktop and a sheet on a phone. -->
      <TicketDrawer
        :show="Boolean(opened)"
        :ticket="opened"
        :mine="opened ? isMine(opened) : false"
        :my-uid="myUid"
        :can-edit="opened ? canEdit(opened) : false"
        :can-delete="opened ? canDelete(opened) : false"
        :can-write="opened ? canWrite(opened) : false"
        :can-mark-done="opened ? canMarkDone(opened) : false"
        :posting="posting"
        @update:show="(open) => { if (!open) closeTicket() }"
        @post="postMessage"
        @done="closeAsDone"
        @edit="editTicket"
        @delete="pendingDelete = opened"
      />

      <!-- Nothing open yet on a desktop: the reading side waits, quietly. -->
      <div
        v-if="wide && !opened"
        class="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl bg-white px-8 text-center ring-1 ring-black/5 dark:bg-gray-800/70 dark:ring-white/10"
      >
        <AppArt app-key="tickets" :play="1" class="size-16" />
        <p class="mt-4 text-base font-semibold text-gray-900 dark:text-white">
          {{ groups.length ? 'Pick a ticket to read it' : 'Nothing to read here yet' }}
        </p>
        <p class="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
          {{ canManage ? 'The whole conversation opens here, with a box to answer.' : 'What you sent opens here, with every answer to it.' }}
        </p>
      </div>
    </div>

    <TicketComposer
      v-model:show="showComposer"
      :ticket="editing"
      :start-kind="startKind"
      :saving="saving"
      :sent="sent"
      @save="saveTicket"
      @again="newTicket()"
    />

    <ConfirmationModal
      :show="Boolean(pendingDelete)"
      :title="takingBack ? 'Take back ticket' : 'Delete ticket'"
      :message="`${takingBack ? 'Take back' : 'Delete'} “${pendingDelete?.title || 'this ticket'}”? This cannot be undone.`"
      :confirm-text="takingBack ? 'Take back' : 'Delete'"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="(open) => { if (!open) pendingDelete = null }"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </AppScreen>
</template>

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  subscribeToTickets,
  addTicket,
  updateTicket,
  postTicketMessage,
  markTicketDone,
  deleteTicket,
} from '../api/ticketsService'
import { useAuth } from './useAuth'
import { usePermissions } from './usePermissions'
import { getDisplayName } from '../utils/memberUtils'
import { compareClosed, compareNewest, handledBy, isClosed } from '../utils/ticketUtils'
import { MOCK_TICKETS_ON, makeMockTickets } from '../data/mockTickets' // MOCK

// One listener shared across callers, the same arrangement as useTasks.
const tickets = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

// MOCK: the made-up tickets (src/data/mockTickets.js), made once whoever is
// signed in is known, and changed on this device only.
const mocks = ref(null) // MOCK

/**
 * The Tickets app's data, and its one summary of it, so the board's groups
 * and counts cannot disagree (CLAUDE.md, "Adding an app").
 *
 * Two people use it. Anyone sends tickets and reads back their own, with the
 * conversation on each. A church's administrators (`canManage`) also read its
 * tickets and answer the ones that are the church's — questions, complaints,
 * praise (lib/tickets.js, handledBy). Bugs and ideas are Ekkly's, answered
 * from the platform's console; the church sees where they stand and what
 * Ekkly said, and nothing to do. Nobody else's tickets are shown to someone
 * who is not an administrator, though the rules would allow it: a complaint
 * is sent to the people who can act on it, not posted to the church.
 *
 * Chores are the platform's own notes, and are left out of the church's app
 * altogether.
 */
export function useTickets() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToTickets((data) => {
      tickets.value = data
      loading.value = false
    })
  })

  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0 && unsubscribe) {
      unsubscribe()
      unsubscribe = null
      subscribers = 0
    }
  })

  const { user, displayName } = useAuth()
  const { isAdmin, myMember } = usePermissions()
  const canManage = computed(() => Boolean(isAdmin.value))
  const myUid = computed(() => user.value?.uid || '')
  const myName = computed(() => getDisplayName(myMember.value) || displayName.value || '')
  const me = computed(() => ({ uid: myUid.value, name: myName.value }))

  const isMine = (ticket) => Boolean(myUid.value) && ticket.reporterUid === myUid.value

  // MOCK: start of the made-up tickets.
  watch(
    myUid,
    (uid) => {
      if (MOCK_TICKETS_ON && uid && !mocks.value) mocks.value = makeMockTickets(me.value)
    },
    { immediate: true }
  )
  const patchMock = (ticket, patch) => {
    mocks.value = mocks.value.map((t) => (t.id === ticket.id ? { ...t, ...patch, updatedAt: new Date() } : t))
  }
  // MOCK: end.

  // Every ticket the church's app shows: the church's (and the made-up ones
  // while they are on), but not the platform's chores.
  const all = computed(() => [...tickets.value, ...(mocks.value || [])].filter((t) => t.kind !== 'chore')) // MOCK: was tickets.value

  const newestFirst = (list) => [...list].sort(compareNewest)
  const churchs = (t) => handledBy(t.kind) === 'church'

  /* ---------------------------------------------- for its administrators */

  /** A question or a complaint nobody has answered: theirs to do. */
  const needsAnswer = computed(() => newestFirst(all.value.filter((t) => churchs(t) && !isClosed(t) && t.kind !== 'praise')))

  /** Praise not yet read. Nothing to do but read it, so never counted as work. */
  const kindWords = computed(() => newestFirst(all.value.filter((t) => t.kind === 'praise' && !isClosed(t))))

  /** Bugs and ideas still open at Ekkly: to see, not to do. */
  const withEkkly = computed(() => newestFirst(all.value.filter((t) => !churchs(t) && !isClosed(t))))

  /** Everything closed, the most recently first. */
  const closedTickets = computed(() => all.value.filter(isClosed).sort(compareClosed))

  /* -------------------------------------------------------------- yours */

  const mine = computed(() => newestFirst(all.value.filter(isMine)))

  /* ---------------------------------------------------------- the moves */

  // A made-up ticket is changed here, the way the service would change a
  // real one, and never written (the `if (ticket.mock)` lines are MOCK).
  const send = (ticket) => addTicket(ticket, me.value)

  const edit = async (ticket, fields) => {
    if (ticket.mock) return patchMock(ticket, fields)
    return updateTicket(ticket, fields)
  }

  /**
   * Write on a ticket: as whoever sent it, or as its church when an
   * administrator answers one of the church's own.
   */
  const post = async (ticket, text) => {
    const from = isMine(ticket) ? 'reporter' : 'church'
    if (ticket.mock) {
      const message = { id: String(Date.now()), from, uid: myUid.value, name: myName.value, text, at: new Date() }
      const closes = from === 'church' && churchs(ticket)
      const reopens = from === 'reporter' && isClosed(ticket)
      return patchMock(ticket, {
        messages: [...ticket.messages, message],
        ...(closes ? { status: 'done', doneAt: new Date() } : {}),
        ...(reopens ? { status: 'open', doneAt: null } : {}),
      })
    }
    return postTicketMessage(ticket, { from, uid: myUid.value, name: myName.value, text })
  }

  const markDone = async (ticket) => {
    if (ticket.mock) return patchMock(ticket, { status: 'done', doneAt: new Date() })
    return markTicketDone(ticket)
  }

  const remove = async (ticket) => {
    if (ticket.mock) {
      mocks.value = mocks.value.filter((t) => t.id !== ticket.id)
      return
    }
    return deleteTicket(ticket)
  }

  /* --------------------------------------------------------- who may what */

  /**
   * Whoever sent it may change it until anyone else has said something on
   * it; after that the words being answered should not change under the
   * answer.
   */
  const canEdit = (ticket) => isMine(ticket) && !ticket.messages.some((m) => m.from !== 'reporter')

  /** Whoever sent it may take it back then too; an administrator, any time. */
  const canDelete = (ticket) => canManage.value || canEdit(ticket)

  /**
   * Who may write on it: whoever sent it, and the church's administrators on
   * the church's own. Ekkly answers bugs and ideas, so the church does not
   * write on those for them.
   */
  const canWrite = (ticket) => isMine(ticket) || (canManage.value && churchs(ticket))

  /** An administrator closing one of the church's own without a word. */
  const canMarkDone = (ticket) => canManage.value && churchs(ticket) && !isClosed(ticket)

  return {
    tickets: all,
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
    updateTicket: edit,
    post,
    markDone,
    removeTicket: remove,
    canEdit,
    canDelete,
    canWrite,
    canMarkDone,
  }
}

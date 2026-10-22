import { db } from './firebase'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  arrayUnion,
  Timestamp,
} from './firestore'
import { notify } from './notifyService'
import { describeDevice, handledBy, isTicketStatus, kindLabel, normalizeKind } from '../utils/ticketUtils'
import { TICKET_SCOPE, messageId, messagesOf } from '../../lib/tickets.js'

// These ride in the `tasks` collection rather than one of their own, marked by
// `scope`, because that is where the backlog they grew out of was kept and
// moving them would strand every ticket already filed. The church's task list
// (tasksService) and the connector both leave these rows out, filtered on the
// same marker. The platform reads every church's from the server
// (lib/platform/tickets.js), where its console answers the bugs and ideas.
//
// Anyone in the church may read them — every collection under a church is
// open to everyone in it (firestore.rules) — so the app shows someone only
// what they sent, and the whole list only to administrators. Nothing a ticket
// says is meant to be secret, and the form says who reads it.
const TICKETS_COLLECTION = 'tasks'

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

const toDate = (value) => value?.toDate?.() || null

const normalizeTicket = (snapshot) => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    firestoreId: snapshot.id,
    title: data.title || '',
    details: data.details || '',
    kind: normalizeKind(data.kind),
    // Where in the app it is about, by the app's name, when they said.
    where: data.where || '',
    // The page it was sent from, address and all, when it came from the
    // quick-ticket shortcut (useQuickTicket) rather than the Tickets app.
    page: data.page || '',
    order: typeof data.order === 'number' ? data.order : null,
    // Who sent it. A ticket from the backlog before anyone else could file
    // one has nobody here, and was an administrator's own note.
    reporterUid: data.reporterUid || '',
    reporterName: data.reporterName || '',
    device: data.device || '',
    version: data.version || '',
    assigneeUid: data.assigneeUid || '',
    assigneeName: data.assigneeName || '',
    // The conversation on it, oldest first (lib/tickets.js).
    messages: messagesOf(data, toDate),
    // `done` is what the first version of this wrote; anything stored then
    // still reads correctly without a migration.
    status: isTicketStatus(data.status) ? data.status : data.done ? 'done' : 'open',
    doneAt: toDate(data.doneAt),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }
}

/** Live list, newest written first. The app sorts and groups it. */
export const subscribeToTickets = (callback) => {
  const q = query(collection(db, TICKETS_COLLECTION), orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) =>
      callback(snapshot.docs.filter((d) => d.data().scope === TICKET_SCOPE).map(normalizeTicket)),
    (error) => {
      console.error('Error subscribing to tickets:', error)
      callback([])
    }
  )
}

/**
 * Send one. The device and the app's version are read here rather than asked
 * for: whoever reports a bug rarely knows either, and both are often the
 * whole answer.
 */
export const addTicket = async ({ title, details = '', kind = 'suggestion', where = '', page = '' }, reporter = {}) => {
  try {
    const docRef = await addDoc(collection(db, TICKETS_COLLECTION), {
      title,
      details,
      kind: normalizeKind(kind),
      where,
      page,
      // Negative and falling, so the newest lands at the top of an ascending
      // sort without having to read the list first.
      order: -Date.now(),
      reporterUid: reporter.uid || '',
      reporterName: reporter.name || '',
      device: describeDevice(),
      version: APP_VERSION,
      assigneeUid: '',
      assigneeName: '',
      messages: [],
      scope: TICKET_SCOPE,
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    // The church's administrators hear about what is theirs to answer. A bug
    // or an idea is Ekkly's, which reads them in its console, so ringing every
    // administrator's phone for one would only be asking them to do nothing.
    if (handledBy(kind) === 'church') {
      notify('ticket.new', {
        title: `${kindLabel(kind)}: ${title}`,
        body: reporter.name ? `From ${reporter.name}` : '',
      })
    }

    return docRef.id
  } catch (error) {
    console.error('Error adding ticket:', error)
    throw error
  }
}

const refFor = (ticket) => doc(db, TICKETS_COLLECTION, ticket.firestoreId || ticket.id)

/** The words of one: its title, details, kind and where. */
export const updateTicket = async (ticket, { title, details, kind, where }) => {
  try {
    await updateDoc(refFor(ticket), {
      title,
      details,
      kind: normalizeKind(kind),
      where: where || '',
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating ticket:', error)
    throw error
  }
}

/**
 * Add to the conversation, and move the ticket on as that implies:
 *
 *   - its church answering one of its own closes it (`done`): answered;
 *   - whoever sent it writing again opens it, if it had closed: it is not
 *     answered after all, or there is more to say.
 *
 * `from` is 'reporter' or 'church'; Ekkly's messages are written by the
 * platform, from the server.
 */
export const postTicketMessage = async (ticket, { from, uid = '', name = '', text }) => {
  const updates = {
    messages: arrayUnion({ id: messageId(), from, uid, name, text, at: Timestamp.now() }),
    updatedAt: Timestamp.now(),
  }
  if (from === 'church' && handledBy(ticket.kind) === 'church') {
    updates.status = 'done'
    updates.doneAt = Timestamp.now()
  }
  if (from === 'reporter' && (ticket.status === 'done' || ticket.status === 'declined')) {
    updates.status = 'open'
    updates.doneAt = null
  }
  try {
    await updateDoc(refFor(ticket), updates)
  } catch (error) {
    console.error('Error adding to ticket:', error)
    throw error
  }
}

/** Closed without a word: praise read, or a question already answered aloud. */
export const markTicketDone = async (ticket) => {
  try {
    await updateDoc(refFor(ticket), { status: 'done', doneAt: Timestamp.now(), updatedAt: Timestamp.now() })
  } catch (error) {
    console.error('Error closing ticket:', error)
    throw error
  }
}

export const deleteTicket = async (ticket) => {
  try {
    await deleteDoc(refFor(ticket))
  } catch (error) {
    console.error('Error deleting ticket:', error)
    throw error
  }
}

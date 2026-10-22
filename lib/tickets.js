// What a ticket is, shared by the church's app (src/utils/ticketUtils.js) and
// the platform's console (lib/platform/tickets.js). Dependency-free, like
// lib/notifications.js, because both halves import it.
//
// A ticket is somebody in a church telling someone something: a bug, an idea,
// a question, a complaint, a word of thanks. Who it is for depends on what it
// is. A bug or a suggestion is about Ekkly, which the church cannot fix, so it
// goes to the people who run Ekkly (the platform's console); a question, a
// complaint or praise is the church's to answer (its administrators, in the
// Tickets app). A chore is the platform's own note, filed by nobody.

// Every ticket rides in its church's `tasks` collection, marked by `scope`
// (src/api/ticketsService.js says why).
export const TICKET_SCOPE = 'dev'

export const TICKET_KIND_KEYS = ['bug', 'suggestion', 'praise', 'complaint', 'question', 'chore']

// `feature` is what the backlog called a suggestion before anyone else could
// file one. A ticket stored then still reads correctly without a migration.
const KIND_ALIASES = { feature: 'suggestion' }

export const normalizeKind = (kind) => {
  const key = KIND_ALIASES[kind] || kind
  return TICKET_KIND_KEYS.includes(key) ? key : 'suggestion'
}

const EKKLY_KINDS = ['bug', 'suggestion', 'chore']

/** 'ekkly' for what the platform answers, 'church' for what the church does. */
export const handledBy = (kind) => (EKKLY_KINDS.includes(normalizeKind(kind)) ? 'ekkly' : 'church')

/**
 * Where a ticket stands. The platform works an Ekkly ticket through all of
 * them; a church's ticket is only ever open (waiting for an answer) or done
 * (answered, or read).
 */
export const TICKET_STATUS_KEYS = ['open', 'doing', 'paused', 'done', 'declined']

export const isClosedStatus = (status) => status === 'done' || status === 'declined'

/** Who wrote a message: whoever sent the ticket, their church, or Ekkly. */
export const MESSAGE_FROM = ['reporter', 'church', 'ekkly']

/**
 * The conversation on a ticket, oldest first, each { id, from, uid, name,
 * text, at }. A ticket from before there were conversations kept one answer
 * in `reply`, which its church's administrators wrote; it reads as the first
 * message. `toDate` turns a stored time into a Date on whichever side is
 * reading (a client Timestamp and an Admin one differ).
 */
export const messagesOf = (data, toDate) => {
  const list = Array.isArray(data.messages)
    ? data.messages
        .filter((m) => m && m.text)
        .map((m, i) => ({
          id: m.id || `m${i}`,
          from: MESSAGE_FROM.includes(m.from) ? m.from : 'church',
          uid: m.uid || '',
          name: m.name || '',
          text: String(m.text),
          at: toDate(m.at),
        }))
    : []
  if (!list.length && data.reply) {
    list.push({ id: 'legacy', from: 'church', uid: '', name: data.replyByName || '', text: String(data.reply), at: toDate(data.repliedAt) })
  }
  return list.sort((a, b) => (a.at?.getTime?.() || 0) - (b.at?.getTime?.() || 0))
}

/** A short random id for a message, so a list can key it. */
export const messageId = () => Math.random().toString(36).slice(2, 10)

import { Bug, Lightbulb, ThumbsDown, ThumbsUp, Question, Wrench } from '../icons'
import { handledBy, isClosedStatus, normalizeKind } from '../../lib/tickets.js'
import { snippetAt } from './search'

export { handledBy, normalizeKind }

// Tickets: what the people using Ekkly tell the people running it — a bug,
// an idea, something they love or something that frustrates them. Not the
// church's task list, which is `taskUtils` and is about jobs for people.
//
// It began as a backlog the administrators kept for themselves (bug, feature,
// chore). Anyone can send one now, so the kinds are named for what someone
// wants to say rather than for the commit that will answer it.

/**
 * What a ticket can be, in the order the form offers them. `hint` is the
 * line under the name on the form, `prompt` and `example` what its boxes ask.
 *
 * Chore is the administrators' own: work nobody reported (a tidy-up, an
 * upgrade). It is kept off the form for everyone else, who has no chores to
 * file, and it is what a ticket from the old backlog with no reporter reads
 * as when it was one.
 *
 * Colours are a small dot or tile beside the words, never the whole row
 * (DESIGN.md, "One accent colour"). Red stays with bugs, which are something
 * broken; amber for a complaint, which is something needing attention.
 */
export const TICKET_KINDS = [
  {
    key: 'bug',
    label: 'Bug',
    hint: 'Something is broken',
    icon: Bug,
    prompt: 'What went wrong?',
    example: 'The lineup lost the band when I saved',
    more: 'What you were doing, what you expected, and what happened instead.',
  },
  {
    key: 'suggestion',
    label: 'Suggestion',
    hint: 'An idea to make it better',
    icon: Lightbulb,
    prompt: 'What is your idea?',
    example: 'Let us print the Sunday lineup',
    more: 'What it would help you do, and how you do it today.',
  },
  {
    key: 'praise',
    label: 'Praise',
    hint: 'Something you love',
    icon: ThumbsUp,
    prompt: 'What do you love?',
    example: 'Recording attendance takes a minute now',
    more: 'What it has made easier for you or your ministry.',
  },
  {
    key: 'complaint',
    label: 'Complaint',
    hint: 'Something frustrates you',
    icon: ThumbsDown,
    prompt: 'What frustrates you?',
    example: 'Finding a song takes too many taps',
    more: 'Where it happens, and what would make it better.',
  },
  {
    key: 'question',
    label: 'Question',
    hint: 'Not sure how something works',
    icon: Question,
    prompt: 'What would you like to know?',
    example: 'How do I add someone to a ministry?',
    more: 'Where you looked, so the answer can say where to go.',
  },
  {
    key: 'chore',
    label: 'Chore',
    hint: 'Work nobody reported',
    icon: Wrench,
    prompt: 'What needs doing?',
    example: 'Tidy up the old event types',
    more: 'Anything worth remembering when you come back to it.',
    adminOnly: true,
  },
]

export const kindOf = (key) => TICKET_KINDS.find((k) => k.key === normalizeKind(key))

export const kindLabel = (key) => kindOf(key).label

/** The kinds anyone in a church may file: everything but Chore, the platform's own. */
export const SENDABLE_KINDS = TICKET_KINDS.filter((k) => !k.adminOnly)

/** The kind's tile on a row and on the form: a pale ground, the ink on it. */
export const kindTile = (key) =>
  ({
    bug: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    suggestion: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    praise: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    complaint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    question: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
    chore: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
  })[normalizeKind(key)]

/** A selected kind's ring on the form, in the same hue as its tile. */
export const kindRing = (key) =>
  ({
    bug: 'ring-red-500 dark:ring-red-400',
    suggestion: 'ring-blue-500 dark:ring-blue-400',
    praise: 'ring-green-500 dark:ring-green-400',
    complaint: 'ring-amber-500 dark:ring-amber-400',
    question: 'ring-violet-500 dark:ring-violet-400',
    chore: 'ring-gray-400 dark:ring-gray-500',
  })[normalizeKind(key)]

/* --------------------------------------------------------------- status */

/**
 * Where a ticket is, as the platform works it. `open` is new: sent, and
 * nobody has picked it up. Starting one takes it; pausing keeps it yours
 * while you are elsewhere. Done and Won't do both close it, and are different
 * answers: a suggestion that will not be built deserves to be told so.
 *
 * A church's own tickets (handledBy 'church') only ever go from open to done.
 */
export const TICKET_STATUSES = [
  { key: 'open', label: 'New' },
  { key: 'doing', label: 'In progress' },
  { key: 'paused', label: 'On hold' },
  { key: 'done', label: 'Done' },
  { key: 'declined', label: 'Won’t do' },
]

export const isTicketStatus = (status) => TICKET_STATUSES.some((s) => s.key === status)

export const statusLabel = (status) => TICKET_STATUSES.find((s) => s.key === status)?.label || 'New'

export const isClosed = (ticket) => isClosedStatus(ticket?.status)

/**
 * Praise and a fixed bug both close a ticket, but they say it differently:
 * Done on a word of thanks reads oddly, so it was read.
 */
export const closedWord = (ticket) => {
  if (ticket.status === 'declined') return 'Won’t do'
  if (ticket.kind === 'praise') return 'Read'
  if (handledBy(ticket.kind) === 'church') return 'Answered'
  return ticket.kind === 'bug' ? 'Fixed' : 'Done'
}

/**
 * Where it stands, in the words the church reads — whoever sent it and its
 * administrators alike. A bug or an idea is with Ekkly, and says how far it
 * has got there; anything else is waiting for the church, or answered.
 */
export const standing = (ticket) => {
  if (isClosed(ticket)) return closedWord(ticket)
  if (handledBy(ticket.kind) === 'church') return ticket.kind === 'praise' ? 'Not read yet' : 'Waiting for an answer'
  if (ticket.status === 'doing') return 'Ekkly is working on it'
  if (ticket.status === 'paused') return 'On hold at Ekkly'
  return 'Sent to Ekkly'
}

/** The last thing said on it, other than by whoever sent it. */
export const lastAnswer = (ticket) => [...(ticket.messages || [])].reverse().find((m) => m.from !== 'reporter') || null

/* ----------------------------------------------------------------- time */

const DAY = 86400000

/** "Just now", "3 hours ago", "Yesterday", "4 days ago", then the date. */
export const ago = (date, now = new Date()) => {
  if (!date) return ''
  const ms = now - date
  if (ms < 60000) return 'Just now'
  if (ms < 3600000) {
    const m = Math.floor(ms / 60000)
    return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`
  }
  if (ms < DAY && now.getDate() === date.getDate()) {
    const h = Math.floor(ms / 3600000)
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  }
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY)
  if (days <= 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** "October 2026", for grouping closed tickets by the month they closed. */
export const monthLabel = (date) =>
  date ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Earlier'

/* --------------------------------------------------------------- device */

/**
 * A few words on what a ticket was sent from — "iPhone · Safari · installed"
 * — so a bug that only happens on one kind of phone can be told apart from
 * one that happens everywhere, without asking whoever sent it to find out.
 * Read once, as it is sent; nothing that identifies the device is kept.
 */
export const describeDevice = () => {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent || ''
  const platform = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Macintosh/.test(ua)
            ? 'Mac'
            : /CrOS/.test(ua)
              ? 'Chromebook'
              : /Linux/.test(ua)
                ? 'Linux'
                : ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Firefox|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari/.test(ua)
            ? 'Safari'
            : ''
  const installed =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone)
  const width = typeof window !== 'undefined' ? `${window.innerWidth}px wide` : ''
  return [platform, browser, installed ? 'installed' : '', width].filter(Boolean).join(' · ')
}

/* --------------------------------------------------------------- search */

/**
 * The kind pills narrow by kind; this narrows by everything else. Who sent
 * it, who has it and where it stands are all in the haystack, so "paused",
 * "unassigned", "replied" or a person's name can simply be typed rather than
 * each needing a control of its own.
 */
const haystack = (ticket) =>
  [
    ticket.title,
    ticket.details,
    ticket.where,
    ticket.kind,
    kindLabel(ticket.kind),
    ticket.reporterName,
    ticket.assigneeName,
    ticket.assigneeUid ? 'taken assigned' : 'unassigned free',
    ticket.status,
    statusLabel(ticket.status),
    ...(ticket.messages || []).map((m) => m.text),
    lastAnswer(ticket) ? 'replied answered' : 'unanswered',
    standing(ticket),
    handledBy(ticket.kind) === 'ekkly' ? 'ekkly' : 'church',
    isClosed(ticket) ? 'closed fixed complete' : '',
    ticket.status === 'doing' ? 'started wip' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

/** Every word has to land somewhere, so "bug lineup" narrows twice. */
export const matchesTicketQuery = (ticket, query) => {
  const terms = String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return true
  const text = haystack(ticket)
  return terms.every((term) => text.includes(term))
}

/**
 * Where a search found a ticket, when its row would not show it: a word from
 * its details or from someone's message, with the words around it and who
 * wrote them. Without it, "love" turns up a ticket titled "Attendance
 * counter" and nothing on the row says why. Null when the title or the row's
 * own line already shows the word, or when it matched something the list
 * already says (a status, "unanswered").
 */
export const ticketQueryContext = (ticket, query) => {
  const terms = String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return null
  const shown = [ticket.title, ticket.reporterName, ticket.where].filter(Boolean).join(' ').toLowerCase()
  const hidden = terms.filter((term) => !shown.includes(term))
  if (!hidden.length) return null
  const places = [
    { who: ticket.reporterName || '', text: String(ticket.details || '') },
    ...(ticket.messages || []).map((m) => ({ who: m.name || '', text: String(m.text || '') })),
  ]
  for (const term of hidden) {
    for (const place of places) {
      const at = place.text.toLowerCase().indexOf(term)
      if (at >= 0) return { who: place.who, ...snippetAt(place.text, at, term.length) }
    }
  }
  return null
}

/* -------------------------------------------------------------- ordering */

/**
 * The order the administrators put them in, smallest first.
 *
 * There is no urgent/high/normal. A three-word scale makes you file a ticket
 * under a word and then argue with yourself about which word; "Move to the
 * top" says the same thing without the vocabulary, and says it precisely.
 *
 * A ticket with no order yet sinks to the bottom and falls back to newest
 * first, which is where an unplaced thing belongs.
 */
export const orderOf = (ticket) =>
  typeof ticket?.order === 'number' ? ticket.order : Number.MAX_SAFE_INTEGER

export const compareTickets = (a, b) =>
  orderOf(a) - orderOf(b) || (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0)

/** Most recently closed first — the only order a closed pile is read in. */
export const compareClosed = (a, b) => (b.doneAt?.getTime?.() || 0) - (a.doneAt?.getTime?.() || 0)

/** Newest sent first, for someone reading back what they sent. */
export const compareNewest = (a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0)

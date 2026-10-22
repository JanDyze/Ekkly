#!/usr/bin/env node
/**
 * Every church's tickets from the command line, for Claude Code to read and
 * sort before fixing what they say. The quick ticket (Alt+T on any page,
 * useQuickTicket) is how they are written while going through the app; this
 * is how they are picked up. Uses FIREBASE_SERVICE_ACCOUNT from .env.
 *
 *   node scripts/tickets.mjs                    open bugs and ideas (Ekkly's)
 *   node scripts/tickets.mjs --all              every ticket, closed ones too
 *   node scripts/tickets.mjs --json             the same, as JSON
 *   node scripts/tickets.mjs show <id>
 *   node scripts/tickets.mjs set <id> kind=bug where=People status=doing
 *   node scripts/tickets.mjs answer <id> "Fixed in 0.36.0."
 *
 * `set` changes title, details, kind, where, page and status. `answer` adds a
 * message from Ekkly that whoever sent it reads on the ticket. An id may be
 * shortened to its first few characters. Every change is written to the
 * platform's log, as the console's are.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The lib modules read their settings from process.env, as they do on
// Vercel, so .env goes there before any of them is loaded.
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue
  const i = line.indexOf('=')
  if (i > 0 && !(line.slice(0, i).trim() in process.env)) process.env[line.slice(0, i).trim()] = line.slice(i + 1)
}

const { FieldValue } = await import('firebase-admin/firestore')
const { db } = await import('../lib/firebaseAdmin.js')
const { churchRef } = await import('../lib/tenant.js')
const { listTickets, updateTicket } = await import('../lib/platform/tickets.js')
const { logEntry, logRef } = await import('../lib/platform/common.js')
const { TICKET_KIND_KEYS, TICKET_STATUS_KEYS, handledBy, isClosedStatus, normalizeKind } = await import('../lib/tickets.js')

// Who the platform's log says made the change.
const CLAUDE = { uid: 'claude-code', email: '', displayName: 'Claude' }

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const [command = 'list', id, ...rest] = args.filter((a) => !a.startsWith('--'))

const find = async (wanted) => {
  if (!wanted) throw new Error('Which ticket? Give its id.')
  const matches = (await listTickets()).filter((t) => t.id.startsWith(wanted))
  if (!matches.length) throw new Error(`No ticket starts with ${wanted}.`)
  if (matches.length > 1) throw new Error(`${wanted} could be ${matches.map((t) => t.id).join(', ')}.`)
  return matches[0]
}

const print = (t) => {
  console.log(`${t.id}  [${t.kind} · ${t.status}]  ${t.title}`)
  const where = [t.churchId, t.where, t.page].filter(Boolean).join(' · ')
  if (where) console.log(`  at: ${where}`)
  console.log(`  from: ${t.reporterName || 'nobody'} · ${t.createdAt?.slice(0, 16).replace('T', ' ')}${t.version ? ` · v${t.version}` : ''}`)
  if (t.details) console.log(t.details.replace(/^/gm, '  | '))
  for (const m of t.messages) console.log(`  > ${m.name || m.from} (${m.from}): ${m.text}`)
  console.log()
}

const list = async () => {
  let tickets = await listTickets()
  if (!flags.has('--all')) tickets = tickets.filter((t) => handledBy(t.kind) === 'ekkly' && !isClosedStatus(t.status))
  // Oldest first, so they read in the order they were noted down.
  tickets.reverse()
  if (flags.has('--json')) return console.log(JSON.stringify(tickets, null, 2))
  if (!tickets.length) return console.log('No tickets.')
  tickets.forEach(print)
  console.log(`${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`)
}

const set = async () => {
  const ticket = await find(id)
  const updates = { updatedAt: FieldValue.serverTimestamp() }
  for (const pair of rest) {
    const i = pair.indexOf('=')
    const key = pair.slice(0, i)
    const value = pair.slice(i + 1)
    if (i < 1) throw new Error(`Write changes as key=value, not ${pair}.`)
    if (key === 'kind') {
      if (!TICKET_KIND_KEYS.includes(value)) throw new Error(`kind is one of ${TICKET_KIND_KEYS.join(', ')}.`)
      updates.kind = normalizeKind(value)
    } else if (key === 'status') {
      if (!TICKET_STATUS_KEYS.includes(value)) throw new Error(`status is one of ${TICKET_STATUS_KEYS.join(', ')}.`)
      updates.status = value
      updates.doneAt = isClosedStatus(value) ? FieldValue.serverTimestamp() : null
    } else if (['title', 'details', 'where', 'page'].includes(key)) {
      updates[key] = value
    } else {
      throw new Error(`Cannot set ${key}. Set title, details, kind, where, page or status.`)
    }
  }
  if (Object.keys(updates).length < 2) throw new Error('Nothing to change.')

  const ref = churchRef(ticket.churchId).collection('tasks').doc(ticket.id)
  const batch = db().batch()
  batch.update(ref, updates)
  batch.set(
    logRef(),
    logEntry(CLAUDE, 'ticket.update', {
      churchId: ticket.churchId,
      target: ticket.id,
      label: `${ticket.title}: ${rest.map((p) => p.split('=')[0]).join(', ')}`,
    })
  )
  await batch.commit()
  print(await find(ticket.id))
}

const answer = async () => {
  const ticket = await find(id)
  const text = rest.join(' ').trim()
  if (!text) throw new Error('What should the answer say?')
  print(await updateTicket(CLAUDE, { churchId: ticket.churchId, id: ticket.id, message: text }))
}

const commands = { list, show: async () => print(await find(id)), set, answer }

try {
  if (!commands[command]) throw new Error(`Unknown command ${command}. Use list, show, set or answer.`)
  await commands[command]()
  process.exit(0)
} catch (error) {
  console.error(error.message || error)
  process.exit(1)
}

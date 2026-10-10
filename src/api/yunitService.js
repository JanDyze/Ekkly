/**
 * Talks to YUNIT through the `chat` mode of /api/enhance (lib/yunit.js).
 *
 * A question streams newline-delimited JSON back: `phase` events while he
 * thinks and looks things up, then `done` with his answer — a short message,
 * cards, changes for the person to confirm, and suggestions. A confirmed
 * change goes back on the same route as an `action` and is run there as the
 * person, after the server checks again that they may make it.
 */
import { auth } from './firebase'
import { churchHeaders } from './church'

const post = async (body) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in to talk to YUNIT.')
  const response = await fetch('/api/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...churchHeaders() },
    body: JSON.stringify({ mode: 'chat', ...body }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'YUNIT could not answer just now. Try again.')
  }
  return response
}

const parseLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

/**
 * @param {Array<{role: 'user'|'assistant', text: string}>} messages  the conversation so far
 * @param {(event: {type: string, phase?: string, label?: string}) => void} [onEvent]
 * @returns {Promise<{mood: string, message: string, cards: object[], actions: object[], suggestions: string[]}>}
 */
export async function askYunit(messages, onEvent) {
  const response = await post({ messages })

  let answer = null
  const consume = (line) => {
    const event = parseLine(line)
    if (!event) return
    if (event.type === 'error') throw new Error(event.error || 'YUNIT could not answer just now. Try again.')
    if (event.type === 'done') answer = event
    else onEvent?.(event)
  }

  // A body with no reader (an old browser, a proxy that buffered) still
  // parses: the lines are all there, they just arrive at once.
  if (!response.body?.getReader) {
    String(await response.text()).split('\n').forEach(consume)
  } else {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // A chunk can end mid-line, so only whole lines are read.
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      lines.forEach(consume)
    }
    buffer += decoder.decode()
    if (buffer.trim()) consume(buffer)
  }

  if (!answer || (!answer.message && !answer.cards?.length && !answer.actions?.length)) {
    throw new Error('YUNIT had nothing to say. Try again.')
  }
  return {
    mood: answer.mood || 'plain',
    message: answer.message || '',
    cards: answer.cards || [],
    actions: answer.actions || [],
    suggestions: answer.suggestions || [],
  }
}

/** Runs one change the person confirmed on a card. Resolves to what the tool reported. */
export async function confirmAction({ tool, args }) {
  const response = await post({ action: { tool, args } })
  const payload = await response.json()
  return payload.result
}

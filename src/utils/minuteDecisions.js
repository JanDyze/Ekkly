/**
 * What a meeting decided, read back out of its write-up.
 *
 * The write-ups are Markdown in a shape YUNIT is asked for (api/enhance.js),
 * and that shape marks every decision: the whole meeting's write-up ends each
 * agenda item with a "**Decided:**" line under the item's own "###" heading,
 * and one item written up on its own lists them under "## What we decided".
 * Both are read here, the way minuteActionItems.js reads the "Who does what"
 * table, so a decision is found wherever the church wrote it.
 *
 * "**Still deciding:**" is left out on purpose: a question still open is not
 * a decision, and the Decisions list is where someone looks to see what was
 * settled.
 */

const HEADING = /^(#{1,4})\s+(.*)$/
const DECIDED_HEADING = /^(?:[ivx]+\.?\s*)?(?:what we decided|decisions?(?: made)?)\b/i
const DECIDED_LINE = /^(?:[*\-+]\s+)?\*\*decided:?\*\*:?\s*(.+)$/i
const BULLET = /^(?:[*\-+]|\d+[.)])\s+(.*)$/
const NOTHING = /^nothing was decided/i

const plain = (text) =>
  String(text || '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Every decision in one piece of Markdown, in the order written, each with the
 * agenda item it was made under when the write-up says.
 *
 * @param {string} markdown
 * @param {string} [topic]  the agenda item, when the Markdown is one item's own
 * @returns {{ text: string, topic: string }[]}
 */
export function extractDecisions(markdown, topic = '') {
  const lines = String(markdown || '').split(/\r?\n/)
  const found = []
  let item = topic
  // The rank of a "What we decided" heading while inside it, otherwise 0.
  let inDecided = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const heading = line.match(HEADING)
    if (heading) {
      const level = heading[1].length
      const title = plain(heading[2])
      if (inDecided && level <= inDecided) inDecided = 0
      if (DECIDED_HEADING.test(title)) inDecided = level
      // An agenda item's own heading in the whole meeting's write-up.
      else if (level >= 3) item = title
      continue
    }

    const decided = line.match(DECIDED_LINE)
    if (decided) {
      const text = plain(decided[1])
      if (text && !NOTHING.test(text)) found.push({ text, topic: item })
      continue
    }

    if (inDecided) {
      const bullet = line.match(BULLET)
      const text = plain(bullet ? bullet[1] : '')
      if (text && !NOTHING.test(text)) found.push({ text, topic: item })
    }
  }

  return found
}

/**
 * Every decision one minute records: from the whole meeting's write-up when
 * there is one, otherwise from whatever each agenda item has.
 */
export function minuteDecisions(minute) {
  const structure = minute?.structure || {}
  if (String(structure.overallSummary || '').trim()) return extractDecisions(structure.overallSummary)
  const agenda = structure.agenda || []
  return agenda.flatMap((entry, index) =>
    extractDecisions(structure.discussions?.[index] || '', typeof entry === 'string' ? entry : entry?.title || '')
  )
}

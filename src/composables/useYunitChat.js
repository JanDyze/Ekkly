import { computed, nextTick, ref, watch } from 'vue'
import { askYunit, confirmAction } from '../api/yunitService'
import { feel } from '../utils/yunitFeedback'

// A conversation with YUNIT, and what his face should be doing because of it.
//
// He is not driven by buttons: he moves according to what is happening. Typing
// to him, he listens; while he works it out and looks through the records, he
// thinks; as his answer comes up, he talks; then he wears the face the answer
// asked for (happy, puzzled, sorry) for a few seconds and settles. A change
// confirmed on one of his cards gets a celebration when it is done. Left alone
// long enough, he falls asleep, and wakes with a start when someone comes
// back.
//
// An answer is a short message, cards for the records it is about, changes
// waiting to be confirmed, and suggestions of what to say next. A change
// carries its own state — waiting, running, done, cancelled or failed — and
// that state is told back to him with the rest of the conversation, so he
// knows what was actually done.
//
// The conversation lives here, at module level, so it is still there when
// someone opens another app and comes back. It is not saved: closing Ekkly
// starts a fresh one.

const messages = ref([])
const draft = ref('')
const sending = ref(false)
const focused = ref(false)

// 'thinking' and 'talking' while an answer is on its way; a reaction for a few
// seconds after; 'sleeping' after a long quiet.
const phase = ref('idle')
// What he is looking through right now, for the line under his name.
const doing = ref('')
// A gesture for the page to play on him, as { name, n } so the same one can
// be asked for twice running.
const cue = ref(null)
let cues = 0
const gesture = (name) => (cue.value = { name, n: ++cues })

const REACTIONS = {
  happy: { mood: 'happy', for: 3000 },
  celebrate: { mood: 'happy', for: 3500, gesture: 'celebrate' },
  confused: { mood: 'confused', for: 4500 },
  sorry: { mood: 'sad', for: 4000 },
  plain: { mood: 'idle', for: 0, gesture: 'nod' },
}

let settleTimer = null
let sleepTimer = null
// Ten minutes of quiet before he dozes: until then he plays (HomeYunit). It
// was five, and with his play every half a minute or so he seemed never to
// settle: a quiet home should be quiet for a while before he nods off.
const SLEEP_AFTER = 600000

const busy = () => phase.value === 'thinking' || phase.value === 'talking'
const settleIn = (ms) => {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => {
    if (!busy()) phase.value = 'idle'
  }, ms)
}

// Any sign of someone there pushes sleep back, and wakes him if he dozed.
const stir = () => {
  clearTimeout(sleepTimer)
  if (phase.value === 'sleeping') phase.value = 'idle'
  sleepTimer = setTimeout(() => {
    if (phase.value === 'idle' && !sending.value) {
      phase.value = 'sleeping'
      feel('doze')
    }
  }, SLEEP_AFTER)
}

const mood = computed(() => {
  if (phase.value !== 'idle') return phase.value
  // Typing to him: he leans in to listen.
  if (focused.value && draft.value.trim()) return 'listening'
  return 'idle'
})

const react = (name) => {
  const reaction = REACTIONS[name] || REACTIONS.plain
  phase.value = reaction.mood
  // Not a sound for every line he finishes saying: that was too much.
  if (reaction.mood === 'confused') feel('puzzled')
  if (reaction.gesture) gesture(reaction.gesture)
  settleIn(reaction.for)
}

// How a past answer is told back to him: his words, what the cards showed,
// and what became of each change he proposed.
const STATES = {
  waiting: 'not confirmed yet',
  running: 'being carried out',
  done: 'confirmed and done',
  cancelled: 'cancelled by the person',
  failed: 'tried, and it failed',
}
const asText = (message) => {
  if (message.role === 'user') return message.text
  const parts = [message.text]
  if (message.cards?.length) parts.push(`(Cards shown: ${message.cards.map((card) => card.title).join('; ')})`)
  message.actions?.forEach((action) => parts.push(`(Change: ${action.summary} — ${STATES[action.state] || action.state}${action.note ? `: ${action.note}` : ''})`))
  return parts.filter(Boolean).join('\n')
}

// His message comes up a few words at a time, which is when he talks.
const reveal = (at, text) =>
  new Promise((resolve) => {
    const words = text.split(/(\s+)/)
    const step = Math.max(18, Math.min(45, 1600 / Math.max(1, words.length)))
    let shown = 0
    const tick = () => {
      shown += 2
      messages.value[at].text = words.slice(0, shown).join('')
      if (shown < words.length) setTimeout(tick, step)
      else resolve()
    }
    tick()
  })

const ask = async (text) => {
  const question = String(text ?? draft.value).trim()
  if (!question || sending.value) return
  stir()
  if (text === undefined) draft.value = ''
  messages.value = [...messages.value, { role: 'user', text: question }]
  messages.value = [...messages.value, { role: 'assistant', text: '', pending: true, cards: [], actions: [], suggestions: [] }]
  // Changed through the list rather than by holding the object: what the list
  // hands back is Vue's reactive copy, and only changes to that are seen.
  const at = messages.value.length - 1
  sending.value = true
  phase.value = 'thinking'
  doing.value = ''
  gesture('nod')
  feel('send')

  const history = messages.value
    .slice(0, -1)
    .filter((message) => !message.error)
    .map((message) => ({ role: message.role, text: asText(message) }))

  try {
    const answer = await askYunit(history, (event) => {
      if (event.type === 'phase') doing.value = event.phase === 'looking' ? event.label || '' : ''
    })
    doing.value = ''
    phase.value = 'talking'
    feel('reply')
    Object.assign(messages.value[at], { pending: false })
    await reveal(at, answer.message)
    Object.assign(messages.value[at], {
      cards: answer.cards,
      actions: answer.actions.map((action) => ({ ...action, state: 'waiting', note: '' })),
      suggestions: answer.suggestions,
    })
    react(answer.mood)
  } catch (error) {
    doing.value = ''
    Object.assign(messages.value[at], { text: error.message || 'YUNIT could not answer just now. Try again.', pending: false, error: true })
    feel('sorry')
    phase.value = 'sad'
    settleIn(4000)
  } finally {
    sending.value = false
    stir()
  }
}

// A change on one of his cards, confirmed. He thinks while it runs, and
// celebrates when it is done.
const confirm = async (messageIndex, actionIndex) => {
  const action = messages.value[messageIndex]?.actions?.[actionIndex]
  if (!action || action.state !== 'waiting') return
  stir()
  action.state = 'running'
  phase.value = 'thinking'
  try {
    const result = await confirmAction(action)
    action.state = 'done'
    action.note = result?.title || ''
    feel('done')
    phase.value = 'idle'
    react(action.destructive ? 'happy' : 'celebrate')
  } catch (error) {
    action.state = 'failed'
    action.note = error.message || 'It could not be done.'
    feel('sorry')
    phase.value = 'idle'
    react('sorry')
  }
}

const cancel = (messageIndex, actionIndex) => {
  const action = messages.value[messageIndex]?.actions?.[actionIndex]
  if (!action || action.state !== 'waiting') return
  stir()
  action.state = 'cancelled'
  feel('cancel')
  gesture('shake')
}

// Starting over, with a wave to say so.
const clear = () => {
  if (sending.value) return
  messages.value = []
  phase.value = 'idle'
  feel('clear')
  gesture('wave')
  stir()
}

// A line of his own rather than an answer (his hello on the home): he talks
// for as long as it takes to come up, then is pleased to see whoever it was
// for, and settles. A question asked meanwhile takes over, as it should.
let speakTimer = null
const speak = (ms) => {
  if (sending.value) return
  stir()
  clearTimeout(speakTimer)
  clearTimeout(settleTimer)
  phase.value = 'talking'
  speakTimer = setTimeout(() => {
    if (phase.value === 'talking' && !sending.value) react('happy')
  }, ms)
}

export function useYunitChat() {
  return { messages, draft, sending, focused, mood, doing, cue, send: () => ask(), ask, confirm, cancel, clear, stir, gesture, speak }
}

/**
 * Keeps the newest answer in view while it arrives, in whatever scrolls the
 * conversation (`scroller`, a ref to it), unless the person has scrolled up
 * to read something earlier.
 */
export function useFollowReplies(scroller) {
  const nearBottom = () => {
    const el = scroller.value
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160
  }
  watch(
    () => JSON.stringify(messages.value.map((m) => [m.text.length, m.cards?.length, m.actions?.map((a) => a.state)])),
    async () => {
      const follow = nearBottom()
      await nextTick()
      if (follow && scroller.value) scroller.value.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
    }
  )
}

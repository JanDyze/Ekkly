import { computed, onUnmounted, ref, watch } from 'vue'
import { identifyFrontDoorChat, pollFrontDoorChat, sendFrontDoorChat } from '../api/platformService'

// A visitor's conversation with whoever runs Ekkly, for the front door's chat
// bubble.
//
// The server keeps the messages; this keeps the key to them. A conversation
// answers only to the secret handed back when it began, stored in the
// visitor's own browser with the name they gave, so coming back tomorrow
// carries on the same conversation. Private windows throw on localStorage, and
// there the conversation simply lasts as long as the page.
//
// The bubble asks the server about once a minute whether the host is online,
// and every few seconds while it is open, so a reply shows up as it is sent.
// Nothing is asked while the tab is hidden.

const STORE_KEY = 'ekkly.frontDoor.chat'
const OPEN_POLL_MS = 4000
// Faster once there is a conversation, so a reply can be previewed by the
// bubble while it is closed without anyone waiting a minute for it.
const CLOSED_POLL_MS = 60 * 1000
const CLOSED_THREAD_POLL_MS = 15 * 1000

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || {}
  } catch {
    return {}
  }
}

const save = (value) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(value))
  } catch {
    // Remembered for this page only.
  }
}

export function useFrontDoorChat() {
  const stored = ref(load())
  const enabled = ref(false)
  const online = ref(false)
  const messages = ref([])
  const seen = ref(false)
  const open = ref(false)
  const sending = ref(false)
  // The newest reply that arrived while the bubble was closed, to show beside
  // it until they open it or wave it away.
  const preview = ref(null)

  const hasThread = computed(() => Boolean(stored.value.threadId && stored.value.secret))
  const thread = () => (hasThread.value ? { threadId: stored.value.threadId, secret: stored.value.secret } : {})

  const remember = (patch) => {
    stored.value = { ...stored.value, ...patch }
    save(stored.value)
  }

  // Replies from the host the visitor has not had the bubble open to see.
  const unread = computed(() => {
    const readAt = stored.value.readAt || ''
    return messages.value.filter((m) => m.from === 'host' && (m.at || '') > readAt).length
  })

  const markRead = () => {
    const last = messages.value.at(-1)?.at
    if (last && last !== stored.value.readAt) remember({ readAt: last })
    preview.value = null
  }

  /* ------------------------------------------------------------ polling */

  let timer = 0
  let stopped = false
  let polledOnce = false

  const poll = async () => {
    try {
      const result = await pollFrontDoorChat(thread())
      enabled.value = result.enabled !== false
      online.value = Boolean(result.online)
      if (result.ended) {
        remember({ threadId: '', secret: '', readAt: '' })
        messages.value = []
      } else if (result.messages) {
        const before = messages.value.filter((m) => m.from === 'host').length
        messages.value = result.messages
        seen.value = Boolean(result.seen)
        // Where to reply is the server's to know, e.g. from another device.
        if (result.email && result.email !== stored.value.email) remember({ email: result.email, name: result.name })
        const hostMessages = result.messages.filter((m) => m.from === 'host')
        if (polledOnce && !open.value && hostMessages.length > before) preview.value = hostMessages.at(-1)
      }
      polledOnce = true
      if (open.value) markRead()
    } catch (error) {
      // The bubble keeps what it last knew; the next poll tries again.
      console.error('Error checking the chat:', error)
    }
  }

  const schedule = () => {
    clearTimeout(timer)
    if (stopped) return
    const wait = open.value ? OPEN_POLL_MS : hasThread.value ? CLOSED_THREAD_POLL_MS : CLOSED_POLL_MS
    timer = setTimeout(async () => {
      if (document.visibilityState === 'visible') await poll()
      schedule()
    }, wait)
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') poll().then(schedule)
  }

  poll().then(schedule)
  document.addEventListener('visibilitychange', onVisibility)

  onUnmounted(() => {
    stopped = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  // Opening asks at once and then quickly; closing slows back down.
  watch(open, (isOpen) => {
    if (isOpen) {
      markRead()
      poll().then(schedule)
    } else {
      schedule()
    }
  })

  /* ------------------------------------------------------------ sending */

  /**
   * Sends one message. `website` is the hidden field only a bot fills in.
   * Shown straight away, marked as sending, and replaced by the server's copy
   * when it lands.
   */
  const send = async ({ text, name, email, website }) => {
    const body = String(text || '').trim()
    if (!body || sending.value) return
    sending.value = true
    const pending = { from: 'visitor', text: body, at: new Date().toISOString(), pending: true }
    messages.value = [...messages.value, pending]
    try {
      const result = await sendFrontDoorChat({
        ...thread(),
        name: name || stored.value.name,
        email: email ?? stored.value.email,
        text: body,
        page: window.location.href,
        website,
      })
      if (result.secret) remember({ threadId: result.threadId, secret: result.secret, name: name || '', email: email || '' })
      messages.value = result.messages
      seen.value = false
      markRead()
    } catch (error) {
      messages.value = messages.value.filter((m) => m !== pending)
      throw error
    } finally {
      sending.value = false
    }
  }

  /** Who they are and where to reply, told after the conversation began. */
  const identify = async ({ name, email }) => {
    if (!hasThread.value) return
    const result = await identifyFrontDoorChat({ ...thread(), name, email })
    remember({ name: result.name, email: result.email, identified: true })
  }

  /** "Not now" on the reply card: asked once per conversation. */
  const skipIdentify = () => remember({ identified: true })

  return {
    enabled,
    online,
    messages,
    seen,
    open,
    sending,
    unread,
    preview,
    hasThread,
    visitorName: computed(() => stored.value.name || ''),
    visitorEmail: computed(() => stored.value.email || ''),
    identified: computed(() => Boolean(stored.value.identified || stored.value.email)),
    send,
    identify,
    skipIdentify,
    dismissPreview: () => (preview.value = null),
  }
}

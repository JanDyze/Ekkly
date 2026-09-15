<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ArrowUp, ChatCircleDots, Check, EnvelopeSimple, MessengerLogo, Phone, X } from '../../icons'
import { useAuth } from '../../composables/useAuth'
import { useFrontDoorChat } from '../../composables/useFrontDoorChat'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useScrollLock } from '../../composables/useScrollLock'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import mark from '../../assets/ekkly-mark.svg'

// The chat bubble in the front door's corner: whether the person who runs
// Ekkly is around, and the quickest way to ask them something.
//
// Built for someone who has a question but not yet the words for it. Opening
// shows a few questions churches actually ask, one tap each, beside the other
// ways to reach a person (a call, an email, Messenger). Nobody is asked for a
// name before they have said anything; once they have, a small card asks where
// to reply if they leave. A reply that arrives while the bubble is closed is
// previewed beside it.
//
// It grows out of the bubble when opened, the way What's inside grows out of
// an app, and nothing about it moves while it sits there.

const { branding } = usePlatformConfig()
const { isAuthenticated, displayName, email: signedInEmail } = useAuth()
const chat = useFrontDoorChat()
const { enabled, online, messages, seen, open, sending, unread, preview, identified } = chat

const settings = computed(() => branding.value.chat)
const host = computed(() => settings.value.hostName || 'The developer')
const emailAddress = computed(() => branding.value.contactEmail || settings.value.hostEmail)

const contacts = computed(() =>
  [
    settings.value.phone && { key: 'call', label: 'Call', icon: Phone, href: `tel:${settings.value.phone.replace(/[^\d+]/g, '')}` },
    emailAddress.value && { key: 'email', label: 'Email', icon: EnvelopeSimple, href: `mailto:${emailAddress.value}` },
    settings.value.messenger && { key: 'messenger', label: 'Messenger', icon: MessengerLogo, href: settings.value.messenger, external: true },
  ].filter(Boolean)
)

// What churches ask first. One tap sends it.
const STARTERS = ['How much would my church pay?', 'Can we try it for free?', 'Is our church’s data private?', 'Can someone show us around?']

/* ------------------------------------------------------------ messages */

const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')

// Consecutive messages from one side read as one turn: one avatar, one time.
const turns = computed(() =>
  messages.value.reduce((list, message) => {
    const last = list.at(-1)
    if (last && last.from === message.from) last.items.push(message)
    else list.push({ from: message.from, items: [message] })
    return list
  }, [])
)

const lastFromVisitor = computed(() => messages.value.at(-1)?.from === 'visitor')

// After their first message, unless Google already told us who they are.
const askWhereToReply = computed(() => !isAuthenticated.value && !identified.value && messages.value.some((m) => m.from === 'visitor' && !m.pending))

/* -------------------------------------------------------------- sending */

const text = ref('')
const website = ref('')
const error = ref('')
const scroller = ref(null)
const textarea = ref(null)

// To the newest message. Before there are any, the greeting stays at the top.
const toBottom = async () => {
  await nextTick()
  if (!scroller.value) return
  scroller.value.scrollTop = messages.value.length ? scroller.value.scrollHeight : 0
}
watch(() => messages.value.length, toBottom)
watch(askWhereToReply, toBottom)

// Opening shows the conversation and nothing more. The message box is not
// focused: on a phone that throws the keyboard up over what they came to read.
watch(open, (isOpen) => {
  if (isOpen) toBottom()
})

// The box grows with what is typed, up to about five lines.
const grow = () => {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

const submit = async (value = text.value) => {
  const body = value.trim()
  if (!body) return
  error.value = ''
  // A suggested question is sent as it is; what was typed is cleared, and put
  // back if it does not go.
  const fromBox = value === text.value
  if (fromBox) {
    text.value = ''
    nextTick(grow)
  }
  try {
    await chat.send({
      text: body,
      name: isAuthenticated.value ? displayName.value : '',
      email: isAuthenticated.value ? signedInEmail.value : undefined,
      website: website.value,
    })
  } catch (e) {
    if (fromBox) text.value = body
    error.value = e.message || 'Could not send that message. Please try again.'
  }
}

// On a computer Enter sends and Shift+Enter is a new line. On a phone Enter is
// a new line, as on every phone keyboard, and the button sends.
const coarse = useMediaQuery('(pointer: coarse)')
const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !coarse.value) {
    event.preventDefault()
    submit()
  }
}

/* ------------------------------------------------------- where to reply */

const reply = ref({ name: '', email: '' })
const savingReply = ref(false)
const replyError = ref('')

const saveReply = async () => {
  replyError.value = ''
  if (!reply.value.email.trim()) {
    replyError.value = 'Add an email so we can reply.'
    return
  }
  savingReply.value = true
  try {
    await chat.identify({ name: reply.value.name.trim(), email: reply.value.email.trim() })
  } catch (e) {
    replyError.value = e.message || 'Could not save that. Please try again.'
  } finally {
    savingReply.value = false
  }
}

/* ---------------------------------------------------------------- open */

const openChat = () => {
  open.value = true
}
const close = () => (open.value = false)

/* ------------------------------------------------------ phone keyboard */

// On a phone the conversation takes the whole screen, sized to what the
// keyboard leaves showing. Phones do not shrink the page for the keyboard —
// a panel pinned to the bottom sits behind it, and dvh does not change — but
// the visual viewport does, so the panel follows it: its height, and its top,
// since iOS also scrolls the page when an input near the bottom is focused.
const isPhone = useMediaQuery('(max-width: 639px)')
const viewport = ref({ height: 0, top: 0, keyboard: false })

const measure = () => {
  const vv = window.visualViewport
  const height = vv ? vv.height : window.innerHeight
  viewport.value = {
    height,
    top: vv ? vv.offsetTop : 0,
    // Anything much shorter than the window is the keyboard.
    keyboard: window.innerHeight - height > 120,
  }
  toBottom()
}

// The page underneath holds still while the conversation covers it, or a
// phone scrolls it about as the keyboard comes and goes. Through the shared
// lock, so a dialog that opens over it does not hand the page back early.
useScrollLock(() => open.value && isPhone.value)

const followKeyboard = (on) => {
  const vv = window.visualViewport
  if (on) {
    measure()
    vv?.addEventListener('resize', measure)
    vv?.addEventListener('scroll', measure)
  } else {
    vv?.removeEventListener('resize', measure)
    vv?.removeEventListener('scroll', measure)
  }
}

watch([open, isPhone], ([isOpen, phone]) => followKeyboard(Boolean(isOpen && phone)))
onUnmounted(() => followKeyboard(false))

const phoneStyle = computed(() =>
  isPhone.value && viewport.value.height
    ? { height: `${viewport.value.height}px`, transform: `translateY(${viewport.value.top}px)` }
    : {}
)

// 16px text on a phone: anything smaller and iOS zooms the page in on focus.
const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
</script>

<template>
  <div v-if="enabled" class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6" @keydown.esc="close">
    <!-- The open conversation. On a phone it fills the screen above the keyboard. -->
    <Transition name="grow">
      <section
        v-if="open"
        role="dialog"
        aria-label="Chat with us"
        :style="phoneStyle"
        class="panel fixed inset-x-0 top-0 flex h-dvh flex-col overflow-hidden bg-white sm:absolute sm:inset-x-auto sm:top-auto sm:bottom-18 sm:right-0 sm:h-[min(38rem,calc(100dvh-11rem))] sm:w-92 sm:transform-none sm:rounded-2xl sm:shadow-2xl sm:shadow-gray-900/20 sm:ring-1 sm:ring-gray-900/5 dark:bg-gray-900 dark:sm:shadow-black/50 dark:sm:ring-white/10"
      >
        <!-- Who they are talking to, and the other ways to reach them. -->
        <header class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3 dark:border-gray-800">
          <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <img :src="mark" alt="" class="h-6 w-6" />
            <span :class="['absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-gray-900', online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600']"></span>
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ host }}</p>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              <span v-if="online" class="font-medium text-emerald-600 dark:text-emerald-400">Online now</span>
              <template v-else>Away · replies by email</template>
            </p>
          </div>
          <a
            v-for="contact in messages.length ? contacts : []"
            :key="contact.key"
            :href="contact.href"
            :target="contact.external ? '_blank' : undefined"
            :rel="contact.external ? 'noopener' : undefined"
            :aria-label="contact.label"
            :title="contact.label"
            class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <component :is="contact.icon" class="h-5 w-5" />
          </a>
          <button type="button" aria-label="Close chat" class="-mr-1 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white" @click="close">
            <X class="h-5 w-5" />
          </button>
        </header>

        <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <!-- Before anything is said: a greeting, a few questions, other ways. -->
          <template v-if="!messages.length">
            <p class="text-xl font-black tracking-tight text-gray-900 dark:text-white">Hi there</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ online ? 'Ask anything about Ekkly. I’m here now.' : 'Ask anything about Ekkly. I’ll reply by email.' }}
            </p>

            <ul class="mt-5 space-y-2">
              <li v-for="starter in STARTERS" :key="starter">
                <button
                  type="button"
                  :disabled="sending"
                  class="group flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:border-primary-light/40 dark:hover:bg-primary-light/10"
                  @click="submit(starter)"
                >
                  {{ starter }}
                  <ArrowUp class="h-4 w-4 shrink-0 rotate-45 text-gray-400 transition-colors group-hover:text-primary dark:group-hover:text-primary-light" />
                </button>
              </li>
            </ul>

            <template v-if="contacts.length">
              <p class="mt-5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Or reach us directly</p>
              <div :class="['mt-2 grid gap-2', contacts.length === 3 ? 'grid-cols-3' : contacts.length === 2 ? 'grid-cols-2' : 'grid-cols-1']">
                <a
                  v-for="contact in contacts"
                  :key="contact.key"
                  :href="contact.href"
                  :target="contact.external ? '_blank' : undefined"
                  :rel="contact.external ? 'noopener' : undefined"
                  class="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <component :is="contact.icon" class="h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
                  {{ contact.label }}
                </a>
              </div>
            </template>
          </template>

          <!-- The conversation. -->
          <div v-else class="space-y-4">
            <div v-for="(turn, t) in turns" :key="t" :class="['flex items-end gap-2', turn.from === 'visitor' ? 'justify-end' : '']">
              <span v-if="turn.from === 'host'" class="mb-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                <img :src="mark" alt="" class="h-4 w-4" />
              </span>
              <div :class="['flex min-w-0 max-w-[80%] flex-col gap-1', turn.from === 'visitor' ? 'items-end' : 'items-start']">
                <p
                  v-for="(message, m) in turn.items"
                  :key="`${message.at}-${m}`"
                  :class="[turn.from === 'host' ? 'bubble-host' : 'bubble-visitor', { 'opacity-60': message.pending }]"
                >
                  {{ message.text }}
                </p>
                <p class="px-1 text-[0.6875rem] text-gray-400 dark:text-gray-500">
                  <template v-if="turn.items.at(-1).pending">Sending…</template>
                  <template v-else>
                    {{ time(turn.items.at(-1).at) }}
                    <template v-if="turn.from === 'visitor' && t === turns.length - 1 && seen">
                      · <Check class="inline h-3 w-3 align-[-2px]" /> Seen
                    </template>
                  </template>
                </p>
              </div>
            </div>

            <!-- Away, and they have said where to reply. -->
            <p v-if="!online && lastFromVisitor && identified" class="text-center text-xs text-gray-400 dark:text-gray-500">
              Away right now. You’ll get a reply by email.
            </p>

            <!-- Where to reply, asked once, after they have said something. -->
            <form v-if="askWhereToReply" class="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-700 dark:bg-gray-800/60" @submit.prevent="saveReply">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Where can we reply if you leave?</p>
              <div class="mt-2.5 space-y-2">
                <input v-model="reply.name" type="text" maxlength="60" autocomplete="name" placeholder="Your name" aria-label="Your name" :class="field" />
                <input v-model="reply.email" type="email" maxlength="120" autocomplete="email" placeholder="you@church.org" aria-label="Your email" :class="field" />
              </div>
              <p v-if="replyError" role="alert" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ replyError }}</p>
              <div class="mt-3 flex items-center justify-end gap-2">
                <button type="button" class="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" @click="chat.skipIdentify">Not now</button>
                <button type="submit" :disabled="savingReply" class="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">Save</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Only a bot fills this in. -->
        <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="absolute -left-[9999px] h-px w-px opacity-0" />

        <form
          :class="['shrink-0 px-3 pt-2 sm:pb-3', viewport.keyboard ? 'pb-2' : 'pb-[max(0.75rem,env(safe-area-inset-bottom))]']"
          @submit.prevent="submit()"
        >
          <p v-if="error" role="alert" class="mb-2 px-1 text-xs text-red-600 dark:text-red-400">{{ error }}</p>
          <div class="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary dark:border-gray-700 dark:bg-gray-800">
            <textarea
              ref="textarea"
              v-model="text"
              rows="1"
              maxlength="1000"
              placeholder="Write a message"
              aria-label="Message"
              class="max-h-32 min-h-9 flex-1 resize-none border-0 bg-transparent py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 sm:text-sm dark:text-white"
              @input="grow"
              @keydown="onKeydown"
            ></textarea>
            <button
              type="submit"
              :disabled="sending || !text.trim()"
              aria-label="Send"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
            >
              <ArrowUp class="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      </section>
    </Transition>

    <!-- A reply that came while the bubble was closed. -->
    <Transition name="fade">
      <div
        v-if="preview && !open"
        class="relative w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-3 pr-9 shadow-xl shadow-gray-900/15 ring-1 ring-gray-900/5 dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/10"
      >
        <button type="button" class="flex w-full items-start gap-2.5 text-left" @click="openChat">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <img :src="mark" alt="" class="h-5 w-5" />
          </span>
          <span class="min-w-0">
            <span class="block text-xs font-semibold text-gray-900 dark:text-white">{{ host }}</span>
            <span class="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{{ preview.text }}</span>
          </span>
        </button>
        <button type="button" aria-label="Dismiss" class="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" @click="chat.dismissPreview">
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <!-- The bubble. A phone gets the round face; a wider screen says who is there. -->
    <button
      type="button"
      :aria-expanded="open"
      :aria-label="online ? `${host} is online. Open chat` : 'Open chat'"
      :class="[
        'relative flex h-14 items-center gap-3 rounded-full bg-white p-2 shadow-xl shadow-gray-900/15 ring-1 ring-gray-900/5 transition-shadow hover:shadow-2xl sm:pr-5 dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/10',
        { 'max-sm:hidden': open },
      ]"
      @click="open ? close() : openChat()"
    >
      <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <X v-if="open" class="h-5 w-5" />
        <ChatCircleDots v-else class="h-5 w-5" />
        <span :class="['absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-gray-900', online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600']"></span>
      </span>
      <span class="hidden min-w-0 text-left sm:block">
        <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ online ? `${host} is online` : 'Questions?' }}</span>
        <span class="block text-xs text-gray-500 dark:text-gray-400">{{ online ? 'Talk to us now' : 'Leave a message' }}</span>
      </span>
      <span
        v-if="unread && !open"
        class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold tabular-nums text-white ring-2 ring-white dark:ring-gray-900"
      >
        {{ unread }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.bubble-host,
.bubble-visitor {
  width: fit-content;
  max-width: 100%;
  padding: 0.5rem 0.8rem;
  font-size: 0.875rem;
  line-height: 1.35rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
  transition: opacity 0.2s ease;
}

.bubble-host {
  border-radius: 1.1rem 1.1rem 1.1rem 0.35rem;
  background: var(--color-gray-100);
  color: var(--color-gray-900);
}

.dark .bubble-host {
  background: var(--color-gray-800);
  color: var(--color-gray-100);
}

.bubble-visitor {
  border-radius: 1.1rem 1.1rem 0.35rem 1.1rem;
  background: var(--color-primary);
  color: white;
}

/* A dark page's accent is its light shade, too pale under white text. */
.dark .bubble-visitor {
  background: color-mix(in oklab, var(--color-primary) 45%, var(--color-gray-900));
}

/* The conversation grows out of the bubble in the corner, and shrinks back
   into it. */
.grow-enter-active {
  transition:
    clip-path 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}

.grow-leave-active {
  transition:
    clip-path 0.25s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.25s ease;
}

.panel {
  clip-path: inset(0 round 1rem);
}

.grow-enter-from,
.grow-leave-to {
  clip-path: inset(calc(100% - 3.5rem) 0 0 calc(100% - 3.5rem) round 1.75rem);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* On a phone the panel is the whole screen, with no corner to grow from. */
@media (max-width: 639px) {
  .panel {
    clip-path: none;
  }

  .grow-enter-from,
  .grow-leave-to {
    clip-path: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grow-enter-active,
  .grow-leave-active {
    transition: opacity 0.15s ease;
  }
}
</style>

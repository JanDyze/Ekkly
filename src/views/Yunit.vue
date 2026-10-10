<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowCounterClockwise,
  CalendarBlank,
  Check,
  CheckSquare,
  Church,
  ClipboardText,
  FileText,
  HandsPraying,
  Info,
  MusicNotes,
  PaperPlaneRight,
  PencilSimple,
  Plus,
  Trash,
  User,
  UsersThree,
  Wallet,
  X,
} from '../icons'
import YunitMascot from '../components/yunit/YunitMascot.vue'
import { useYunitChat } from '../composables/useYunitChat'
import { markdownToHtml } from '../utils/markdownUtils'

// YUNIT's page: a conversation with him, and him reacting to it.
//
// There are no buttons to make him move. He moves because of what is
// happening — listening while you type, thinking while he looks through the
// records, talking as his answer comes up, then pleased, puzzled or sorry as
// it calls for (useYunitChat decides which).
//
// His answers are short on purpose: a sentence or two, then cards. A card is
// a record to open, or a change to confirm — nothing he proposes happens
// until someone presses Confirm on it (lib/yunit.js). The page is given room
// to breathe: one roomy column, space between turns, and him standing large
// until the conversation starts, then stepping up into a slim header.

const { messages, draft, sending, focused, mood, doing, cue, send, ask, confirm, cancel, clear, stir } = useYunitChat()

const mascot = ref(null)
const scroller = ref(null)
const input = ref(null)
const chatting = computed(() => messages.value.length > 0)

// Ways to start, for someone who does not know what to ask. Each is a real
// question he can answer from the records.
const STARTERS = [
  { icon: CalendarBlank, text: 'What’s on this Sunday?' },
  { icon: User, text: 'Who has a birthday this week?' },
  { icon: CheckSquare, text: 'What tasks are overdue?' },
  { icon: ClipboardText, text: 'How was attendance last month?' },
]

const CARD_ICONS = {
  person: User,
  event: CalendarBlank,
  task: CheckSquare,
  song: MusicNotes,
  prayer: HandsPraying,
  group: UsersThree,
  money: Wallet,
  minute: FileText,
  attendance: ClipboardText,
  church: Church,
  info: Info,
}

// What kind of change a card is, from its tool's name.
const actionIcon = (action) => (action.destructive ? Trash : /^(update|record)_/.test(action.tool) ? PencilSimple : Plus)

const status = computed(() => {
  if (doing.value) return `Looking at ${doing.value.toLowerCase()}…`
  if (sending.value) return mood.value === 'talking' ? 'Answering…' : 'Thinking…'
  return 'Your church’s assistant'
})

// Gestures the conversation asks for (a nod on sending, a celebration).
watch(cue, (next) => next && mascot.value?.play(next.name))

// The newest answer stays in view while it arrives, unless the person has
// scrolled up to read something earlier.
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

// The box grows with what is typed, up to a few lines, then scrolls.
const fit = () => {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}
watch(draft, () => nextTick(fit))

// Enter sends; Shift+Enter is a new line, as in any chat.
const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

const html = (text) => markdownToHtml(text)

// Only the last answer's suggestions are offered: earlier ones have been
// overtaken by the conversation.
const lastAnswer = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i -= 1) if (messages.value[i].role === 'assistant') return i
  return -1
})

onMounted(() => {
  stir()
  // A wave once he has arrived (his arrival takes a little over a second).
  setTimeout(() => mascot.value?.play(chatting.value ? 'nod' : 'wave'), 1300)
})
</script>

<template>
  <div class="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
    <!-- In conversation: him small, his name, and what he is doing. -->
    <header v-if="chatting" class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-2.5 sm:px-6 dark:border-gray-800">
      <YunitMascot ref="mascot" :mood="mood" :sparks="mood !== 'idle'" class="size-14 shrink-0" />
      <div class="min-w-0 flex-1">
        <h1 class="text-lg font-black tracking-tight text-gray-900 dark:text-white" aria-label="YUNIT">YUN<span class="yunit-i" aria-hidden="true">ı</span>T</h1>
        <p class="truncate text-sm text-gray-500 dark:text-gray-400" aria-live="polite">{{ status }}</p>
      </div>
      <button
        type="button"
        class="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
        :disabled="sending"
        @click="clear"
      >
        <ArrowCounterClockwise class="size-4" />
        New chat
      </button>
    </header>

    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <!-- Before anything is said: him, large, and ways to start. -->
      <section v-if="!chatting" class="flex min-h-full flex-col items-center justify-center px-5 py-8 text-center sm:px-6">
        <YunitMascot ref="mascot" :mood="mood" class="size-[min(24dvh,14rem)]" />
        <h1 class="mt-4 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl dark:text-white" aria-label="YUNIT">
          YUN<span class="yunit-i" aria-hidden="true">ı</span>T
        </h1>
        <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Yet another Useful Intelligence Tool</p>
        <p class="mt-4 max-w-sm text-base text-gray-700 dark:text-gray-200">
          Ask me about the church, or tell me what to add or change. I’ll check with you before I change anything.
        </p>

        <div class="mt-6 grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            v-for="starter in STARTERS"
            :key="starter.text"
            type="button"
            class="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left text-[15px] text-gray-800 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:ring-primary/30 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700"
            @click="ask(starter.text)"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <component :is="starter.icon" class="size-5" />
            </span>
            {{ starter.text }}
          </button>
        </div>
      </section>

      <ol v-else class="space-y-7 px-4 py-6 sm:px-6">
        <li v-for="(message, index) in messages" :key="index">
          <!-- What the person said. -->
          <div v-if="message.role === 'user'" class="flex justify-end">
            <p class="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-[15px] leading-relaxed text-white">
              {{ message.text }}
            </p>
          </div>

          <!-- His answer: a sentence or two, then cards. -->
          <div v-else class="space-y-3.5">
            <span v-if="message.pending" class="yunit-typing flex gap-1.5 py-2 text-gray-400" aria-label="YUNIT is thinking"><i></i><i></i><i></i></span>
            <div
              v-else-if="message.text"
              :class="['yunit-reply max-w-prose text-[15px] leading-relaxed', message.error ? 'rounded-2xl bg-red-50 px-4 py-3 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'text-gray-800 dark:text-gray-100']"
              v-html="html(message.text)"
            ></div>

            <!-- Records he is talking about. -->
            <div v-if="message.cards?.length" class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <component
                :is="card.link ? 'RouterLink' : 'div'"
                v-for="(card, cardIndex) in message.cards"
                :key="cardIndex"
                :to="card.link || undefined"
                :class="[
                  'yunit-card flex gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
                  card.link ? 'transition-colors hover:bg-gray-50 hover:ring-primary/30 dark:hover:bg-gray-700' : '',
                ]"
                :style="{ animationDelay: `${cardIndex * 60}ms` }"
              >
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
                  <component :is="CARD_ICONS[card.icon] || Info" class="size-5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold text-gray-900 dark:text-white">{{ card.title }}</span>
                  <span v-if="card.subtitle" class="block text-sm text-gray-500 dark:text-gray-400">{{ card.subtitle }}</span>
                  <span v-if="card.details?.length" class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <template v-for="(detail, detailIndex) in card.details" :key="detailIndex">
                      <span class="text-gray-500 dark:text-gray-400">{{ detail.label }}</span>
                      <span class="min-w-0 whitespace-pre-line wrap-break-word text-gray-800 dark:text-gray-200">{{ detail.value }}</span>
                    </template>
                  </span>
                </span>
              </component>
            </div>

            <!-- Changes waiting on the person. -->
            <div v-for="(action, actionIndex) in message.actions" :key="action.id" class="yunit-card rounded-2xl bg-white p-4 ring-1 dark:bg-gray-800" :class="action.destructive ? 'ring-red-200 dark:ring-red-500/30' : 'ring-primary/25 dark:ring-primary-light/30'">
              <div class="flex gap-3">
                <span
                  :class="[
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    action.destructive ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
                  ]"
                >
                  <component :is="actionIcon(action)" class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ action.title }}</p>
                  <p class="mt-0.5 text-[15px] text-gray-900 dark:text-white">{{ action.summary }}</p>
                </div>
              </div>

              <div v-if="action.state === 'waiting'" class="mt-3.5 flex gap-2">
                <button
                  type="button"
                  :class="[
                    'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white sm:flex-none',
                    action.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover',
                  ]"
                  @click="confirm(index, actionIndex)"
                >
                  <component :is="action.destructive ? Trash : Check" class="size-4" />
                  {{ action.destructive ? 'Delete' : 'Confirm' }}
                </button>
                <button
                  type="button"
                  class="flex h-10 flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 text-sm text-gray-700 hover:bg-gray-200 sm:flex-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  @click="cancel(index, actionIndex)"
                >
                  Cancel
                </button>
              </div>
              <p v-else-if="action.state === 'running'" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Doing it…</p>
              <p v-else-if="action.state === 'done'" class="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Check class="size-4" /> Done
              </p>
              <p v-else-if="action.state === 'cancelled'" class="mt-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <X class="size-4" /> Cancelled
              </p>
              <p v-else class="mt-3 text-sm text-red-600 dark:text-red-400">{{ action.note }}</p>
            </div>

            <!-- What the person might say next. -->
            <div v-if="index === lastAnswer && message.suggestions?.length && !sending" class="flex flex-wrap gap-2 pt-1">
              <button
                v-for="suggestion in message.suggestions"
                :key="suggestion"
                type="button"
                class="rounded-full bg-gray-100 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="ask(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
        </li>
      </ol>
    </div>

    <form class="yunit-composer shrink-0 px-4 pt-3 sm:px-6" @submit.prevent="send">
      <div class="flex items-end gap-2 rounded-3xl bg-gray-100 p-2 ring-1 ring-transparent transition-colors focus-within:bg-white focus-within:ring-primary/40 dark:bg-gray-800 dark:focus-within:bg-gray-900 dark:focus-within:ring-primary-light/40">
        <label for="yunit-input" class="sr-only">Message YUNIT</label>
        <textarea
          id="yunit-input"
          ref="input"
          v-model="draft"
          rows="1"
          maxlength="4000"
          placeholder="Ask or tell YUNIT…"
          class="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
          @keydown="onKeydown"
          @input="stir"
          @focus="(focused = true), stir()"
          @blur="focused = false"
        ></textarea>
        <button
          type="submit"
          :disabled="!draft.trim() || sending"
          aria-label="Send"
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
        >
          <PaperPlaneRight class="size-5" />
        </button>
      </div>
      <p class="py-2.5 text-center text-xs text-gray-400 dark:text-gray-500">YUNIT can be wrong. Nothing changes until you confirm it.</p>
    </form>
  </div>
</template>

<style scoped>
/* YUNIT's wordmark: a dotless i with his own blue dot over it, as in the
   logo. The blue is his, not the church's accent, for the same reason his
   petals are (BRAND.md). */
.yunit-i {
  position: relative;
  display: inline-block;
}

.yunit-i::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0.02em;
  width: 0.26em;
  height: 0.26em;
  border-radius: 9999px;
  background: #1a85ff;
  translate: -50% 0;
}

/* Clear of the home indicator on a phone, and of the bottom bar when it is
   on (the shell sets how much room that needs). */
.yunit-composer {
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--bottom-bar-space, 0px));
}

/* Cards come in one after another, fading up a little: the answer arriving,
   not decoration. */
.yunit-card {
  animation: yunit-card-in 0.35s ease-out backwards;
}

@keyframes yunit-card-in {
  from {
    opacity: 0;
    translate: 0 6px;
  }
}

/* The reply's Markdown, kept to what a short answer needs. */
.yunit-reply :deep(p + p),
.yunit-reply :deep(ul),
.yunit-reply :deep(ol) {
  margin-top: 0.5rem;
}

.yunit-reply :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}

.yunit-reply :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}

.yunit-reply :deep(strong) {
  font-weight: 600;
}

/* Three dots waiting for his answer. */
.yunit-typing i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: currentColor;
  opacity: 0.35;
  animation: yunit-typing 1.1s ease-in-out infinite;
}

.yunit-typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.yunit-typing i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes yunit-typing {
  30% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .yunit-typing i,
  .yunit-card {
    animation: none;
  }
}
</style>

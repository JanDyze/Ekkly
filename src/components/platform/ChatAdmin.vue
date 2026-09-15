<script setup>
import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChatsCircle, Loader2, PaperPlaneRight, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { agoFrom } from '../../composables/usePlatformConsole'

// Conversations visitors started from the front door's chat bubble, newest
// first, and the place to answer them. A reply reaches the visitor's bubble
// within a few seconds if they are still on the page; the list says who is.
//
// While this section is open the list is checked every few seconds and an open
// conversation more often, so a visitor typing shows up without a refresh.

const toast = useToast()
const chats = ref([])
const loading = ref(true)

const LIST_POLL_MS = 10 * 1000
const THREAD_POLL_MS = 4 * 1000

const loadList = async () => {
  try {
    chats.value = await callPlatform('chats')
  } catch (error) {
    console.error('Error loading chats:', error)
    if (loading.value) toast.error(error.message || 'Could not load the chats.')
  } finally {
    loading.value = false
  }
}

/* --------------------------------------------------------- conversation */

const open = ref(null)
const reply = ref('')
const sending = ref(false)
const scroller = ref(null)

const toBottom = async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

const loadThread = async (id) => {
  try {
    const thread = await callPlatform('chat', { id })
    if (open.value?.id !== id) return
    const grew = thread.messages.length !== open.value.messages?.length
    open.value = thread
    if (grew) toBottom()
    // Opening it read it, so the list's count comes down too.
    chats.value = chats.value.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
  } catch (error) {
    console.error('Error loading a chat:', error)
  }
}

const openChat = (chat) => {
  open.value = { ...chat, messages: [] }
  reply.value = ''
  loadThread(chat.id)
}

const close = () => {
  open.value = null
}

const send = async () => {
  const text = reply.value.trim()
  if (!text || !open.value || sending.value) return
  sending.value = true
  try {
    open.value = await callPlatform('replyChat', { id: open.value.id, text })
    reply.value = ''
    toBottom()
    loadList()
  } catch (error) {
    console.error('Error replying in chat:', error)
    toast.error(error.message || 'Could not send that reply. Please try again.')
  } finally {
    sending.value = false
  }
}

const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => Boolean(open.value), close)

/* --------------------------------------------------------------- polling */

let listTimer = 0
let threadTimer = 0

const start = () => {
  stop()
  loadList()
  listTimer = setInterval(() => document.visibilityState === 'visible' && loadList(), LIST_POLL_MS)
  threadTimer = setInterval(() => {
    if (open.value && document.visibilityState === 'visible') loadThread(open.value.id)
  }, THREAD_POLL_MS)
}

const stop = () => {
  clearInterval(listTimer)
  clearInterval(threadTimer)
}

// Kept alive by the console, so polling follows whether it is on screen.
onMounted(start)
onActivated(start)
onDeactivated(stop)
onUnmounted(stop)

watch(
  () => open.value?.id,
  (id) => id && toBottom()
)
</script>

<template>
  <SectionCard :icon="ChatsCircle" title="Live chat" subtitle="Visitors who messaged you from the front door">
    <div v-if="loading" class="space-y-1 p-2">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
    </div>

    <div v-else-if="!chats.length" class="flex flex-col items-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
      <ChatsCircle class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">No chats yet</p>
      <p class="text-sm">When a visitor sends a message from the front door, it lands here.</p>
    </div>

    <ul v-else class="space-y-1 p-2">
      <li v-for="chat in chats" :key="chat.id">
        <button
          type="button"
          @click="openChat(chat)"
          :class="[
            'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50',
            { 'bg-primary/5 dark:bg-primary-light/10': chat.unread },
          ]"
        >
          <span class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {{ chat.name.charAt(0).toUpperCase() || '?' }}
            <span v-if="chat.visitorHere" class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-800" title="On the page now"></span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-2">
              <span :class="['truncate text-sm text-gray-900 dark:text-white', chat.unread ? 'font-semibold' : 'font-medium']">{{ chat.name }}</span>
              <span class="shrink-0 text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ agoFrom(chat.updatedAt) }}</span>
            </span>
            <span class="mt-0.5 flex items-center gap-2">
              <span class="truncate text-sm text-gray-500 dark:text-gray-400">
                <template v-if="chat.lastFrom === 'host'">You: </template>{{ chat.lastText }}
              </span>
              <span v-if="chat.unread" class="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-bold tabular-nums text-white">
                {{ chat.unread }}
              </span>
            </span>
          </span>
        </button>
      </li>
    </ul>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-80 flex items-end justify-center sm:items-stretch sm:justify-end">
        <div class="absolute inset-0 bg-black/50" @click="close"></div>
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl sm:m-3 sm:max-h-none sm:max-w-lg sm:rounded-2xl sm:border-2 sm:border-primary/30 dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <div class="min-w-0">
              <h3 id="chat-title" class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <ChatsCircle class="h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
                <span class="truncate">{{ open.name }}</span>
              </h3>
              <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                <span v-if="open.visitorHere" class="font-semibold text-emerald-600 dark:text-emerald-400">On the page now</span>
                <span v-else>Left the page</span>
                <template v-if="open.email">
                  &middot; <a :href="`mailto:${open.email}`" class="font-medium text-primary hover:underline dark:text-primary-light">{{ open.email }}</a>
                </template>
                <template v-else> &middot; no email given</template>
              </p>
            </div>
            <button type="button" @click="close" aria-label="Close" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>

          <div ref="scroller" class="min-h-48 flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4 sm:p-6 dark:bg-gray-900/40">
            <p v-if="!open.messages.length" class="text-center text-sm text-gray-400">Loading the conversation…</p>
            <p
              v-for="(message, i) in open.messages"
              :key="`${message.at}-${i}`"
              :class="message.from === 'host' ? 'bubble-mine' : 'bubble-theirs'"
              :title="message.at ? new Date(message.at).toLocaleString() : ''"
            >
              {{ message.text }}
            </p>
          </div>

          <form class="flex shrink-0 items-end gap-2 border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-gray-700" @submit.prevent="send">
            <textarea
              v-model="reply"
              rows="2"
              maxlength="1000"
              placeholder="Write a reply"
              aria-label="Reply"
              class="max-h-40 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              @keydown="onKeydown"
            ></textarea>
            <button
              type="submit"
              :disabled="sending || !reply.trim()"
              class="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
            >
              <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
              <PaperPlaneRight v-else class="h-4 w-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </Teleport>
  </SectionCard>
</template>

<style scoped>
.bubble-mine,
.bubble-theirs {
  max-width: 85%;
  width: fit-content;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.35rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.bubble-theirs {
  border-radius: 1rem 1rem 1rem 0.375rem;
  background: white;
  color: var(--color-gray-800);
  box-shadow: 0 0 0 1px var(--color-gray-200);
}

.dark .bubble-theirs {
  background: var(--color-gray-800);
  color: var(--color-gray-100);
  box-shadow: 0 0 0 1px var(--color-gray-700);
}

.bubble-mine {
  margin-left: auto;
  border-radius: 1rem 1rem 0.375rem 1rem;
  background: var(--color-primary);
  color: white;
}

/* A dark page's accent is its light shade, too pale under white text. */
.dark .bubble-mine {
  background: color-mix(in oklab, var(--color-primary) 45%, var(--color-gray-900));
}
</style>

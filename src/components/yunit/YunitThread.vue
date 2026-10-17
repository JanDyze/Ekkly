<script setup>
import { computed } from 'vue'
import {
  CalendarBlank,
  Check,
  CheckSquare,
  Church,
  ClipboardText,
  FileText,
  HandsPraying,
  Info,
  MusicNotes,
  PencilSimple,
  Plus,
  Trash,
  User,
  UsersThree,
  Wallet,
  X,
} from '../../icons'
import AppArt from '../common/AppArt.vue'
import MemberAvatar from '../members/MemberAvatar.vue'
import { useYunitChat } from '../../composables/useYunitChat'
import { useMembers } from '../../composables/useMembers'
import { useAppSettings } from '../../composables/useAppSettings'
import { getFullName } from '../../utils/memberUtils'
import { markdownToHtml } from '../../utils/markdownUtils'

// A conversation with YUNIT, turn by turn: what the person said, and his
// answers. His answers are short on purpose: a sentence or two, then cards.
// A card is a record to open, or a change to confirm — nothing he proposes
// happens until someone presses Confirm on it (lib/yunit.js).
//
// Drawn the same wherever he is talked to — his own page and the home — so
// the two never drift apart. It measures its own width rather than the
// screen's (a container), so cards go two across only where there is room
// for them: on his page, not over a phone's home.
//
// `floating` is the home's, where the conversation rises from him over the
// home dimmed behind it rather than sitting on a page: there his words are
// in speech bubbles, white, so they read over whatever the home shows.

defineProps({
  floating: { type: Boolean, default: false },
})

const { messages, sending, ask, confirm, cancel } = useYunitChat()

// What a card wears, so it is recognised before it is read. A person wears
// their own face, as everywhere else in the app; the church its logo; a
// record the artwork of the app it lives in, the same picture as that app's
// tile on the home. Only a card that is none of these keeps a plain glyph.
const CARD_ART = {
  person: 'members',
  event: 'events',
  task: 'tasks',
  song: 'songs',
  prayer: 'prayer',
  group: 'smallgroups',
  money: 'finances',
  minute: 'minutes',
  attendance: 'attendance',
}

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

const { members } = useMembers()
const { church, logoUrl } = useAppSettings()

// The person a card is about, from the roll on this device rather than
// anything YUNIT sends, so a photo is never one he made up. By the record
// its link opens (either id the record page accepts), or else by the name on
// the card, when exactly one person on the roll has it.
const personFor = (card) => {
  if (card.icon !== 'person') return null
  const id = card.link?.match(/^\/members\/([\w-]+)$/)?.[1]
  if (id) {
    const found = members.value.find((m) => String(m.id) === id || String(m.firestoreId) === id)
    if (found) return found
  }
  const name = card.title.trim().toLowerCase()
  const named = members.value.filter((m) => getFullName(m).trim().toLowerCase() === name)
  return named.length === 1 ? named[0] : null
}

// What kind of change a card is, from its tool's name.
const actionIcon = (action) => (action.destructive ? Trash : /^(update|record)_/.test(action.tool) ? PencilSimple : Plus)

const html = (text) => markdownToHtml(text)

// Only the last answer's suggestions are offered: earlier ones have been
// overtaken by the conversation.
const lastAnswer = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i -= 1) if (messages.value[i].role === 'assistant') return i
  return -1
})
</script>

<template>
  <ol class="@container space-y-7">
    <li v-for="(message, index) in messages" :key="index">
      <!-- What the person said. -->
      <div v-if="message.role === 'user'" class="flex justify-end">
        <p class="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-[15px] leading-relaxed text-white">
          {{ message.text }}
        </p>
      </div>

      <!-- His answer: a sentence or two, then cards. -->
      <div v-else class="space-y-3.5">
        <span
          v-if="message.pending"
          :class="['yunit-typing flex gap-1.5 text-gray-400', floating ? 'w-fit rounded-3xl rounded-bl-lg bg-white px-4 py-4 dark:bg-gray-800' : 'py-2']"
          aria-label="YUNIT is thinking"
          ><i></i><i></i><i></i
        ></span>
        <div
          v-else-if="message.text"
          :class="[
            'yunit-reply max-w-prose text-[15px] leading-relaxed',
            message.error
              ? 'rounded-2xl bg-red-50 px-4 py-3 text-red-700 dark:bg-red-900/20 dark:text-red-300'
              : floating
                ? 'w-fit max-w-[92%] rounded-3xl rounded-bl-lg bg-white px-4 py-3 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-800 dark:text-gray-100',
          ]"
          v-html="html(message.text)"
        ></div>

        <!-- Records he is talking about. -->
        <div v-if="message.cards?.length" class="grid grid-cols-1 gap-2.5 @md:grid-cols-2">
          <component
            :is="card.link ? 'RouterLink' : 'div'"
            v-for="(card, cardIndex) in message.cards"
            :key="cardIndex"
            :to="card.link || undefined"
            :class="[
              'flex gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
              card.link ? 'transition-colors hover:bg-gray-50 hover:ring-primary/30 dark:hover:bg-gray-700' : '',
            ]"
          >
            <MemberAvatar v-if="personFor(card)" :member="personFor(card)" alt="" size="size-10" />
            <img
              v-else-if="card.icon === 'church' && logoUrl"
              :src="logoUrl"
              :alt="church.shortName || ''"
              class="size-10 shrink-0 object-contain"
            />
            <AppArt v-else-if="CARD_ART[card.icon]" :app-key="CARD_ART[card.icon]" class="size-10 shrink-0" />
            <span v-else class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
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
        <div v-for="(action, actionIndex) in message.actions" :key="action.id" class="rounded-2xl bg-white p-4 ring-1 dark:bg-gray-800" :class="action.destructive ? 'ring-red-200 dark:ring-red-500/30' : 'ring-primary/25 dark:ring-primary-light/30'">
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
                'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white @md:flex-none',
                action.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover',
              ]"
              @click="confirm(index, actionIndex)"
            >
              <component :is="action.destructive ? Trash : Check" class="size-4" />
              {{ action.destructive ? 'Delete' : 'Confirm' }}
            </button>
            <button
              type="button"
              class="flex h-10 flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 text-sm text-gray-700 hover:bg-gray-200 @md:flex-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
            :class="[
              'rounded-full px-3.5 py-2 text-sm',
              floating
                ? 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
            ]"
            @click="ask(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
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
  .yunit-typing i {
    animation: none;
  }
}
</style>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowCounterClockwise, PaperPlaneRight, SpeakerHigh, SpeakerSlash } from '../icons'
import YunitMascot from '../components/yunit/YunitMascot.vue'
import YunitThread from '../components/yunit/YunitThread.vue'
import YunitWordmark from '../components/yunit/YunitWordmark.vue'
import { useFollowReplies, useYunitChat } from '../composables/useYunitChat'
import { usePermissions } from '../composables/usePermissions'
import { tipsFor } from '../data/yunitTips'
import { setYunitSound, yunitSound } from '../utils/yunitFeedback'

// YUNIT's page: a conversation with him, and him reacting to it.
//
// There are no buttons to make him move. He moves because of what is
// happening — listening while you type, thinking while he looks through the
// records, talking as his answer comes up, then pleased, puzzled or sorry as
// it calls for (useYunitChat decides which).
//
// The conversation itself is YunitThread, the same one the home shows, and it
// is the same conversation: started on the home, it carries on here. The page
// is given room to breathe: one roomy column, space between turns, and him
// standing large until the conversation starts, then stepping up into a slim
// header.

const { messages, draft, sending, focused, mood, doing, cue, send, ask, clear, stir } = useYunitChat()
const { canView } = usePermissions()

const mascot = ref(null)
const scroller = ref(null)
const input = ref(null)
const chatting = computed(() => messages.value.length > 0)

// Ways to start, for someone who does not know what to ask (data/yunitTips.js,
// the same ones he offers on the home). The tile shows a short label so four
// fit two across on a phone; pressing it asks the full question.
const starters = computed(() => tipsFor(canView).slice(0, 4))

const status = computed(() => {
  if (doing.value) return `Looking at ${doing.value.toLowerCase()}…`
  if (sending.value) return mood.value === 'talking' ? 'Answering…' : 'Thinking…'
  return 'Your church’s assistant'
})

// Gestures the conversation asks for (a nod on sending, a celebration).
watch(cue, (next) => next && mascot.value?.play(next.name))

useFollowReplies(scroller)

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
      <YunitMascot ref="mascot" :mood="mood" :sparks="mood !== 'idle'" class="size-14 shrink-0" @wake="stir" />
      <div class="min-w-0 flex-1">
        <h1 class="text-lg font-black tracking-tight text-gray-900 dark:text-white"><YunitWordmark /></h1>
        <p class="truncate text-sm text-gray-500 dark:text-gray-400" aria-live="polite">{{ status }}</p>
      </div>
      <!-- His sounds, off for whoever is asking him things in a quiet room. -->
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        :aria-label="yunitSound ? 'Turn YUNIT’s sounds off' : 'Turn YUNIT’s sounds on'"
        :aria-pressed="yunitSound"
        @click="setYunitSound(!yunitSound)"
      >
        <SpeakerHigh v-if="yunitSound" class="size-5" />
        <SpeakerSlash v-else class="size-5" />
      </button>
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
      <section v-if="!chatting" class="flex min-h-full flex-col items-center justify-center px-4 py-4 text-center sm:px-6 sm:py-8">
        <YunitMascot ref="mascot" :mood="mood" class="size-[min(17dvh,12rem)]" @wake="stir" />
        <h1 class="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:mt-4 sm:text-5xl dark:text-white">
          <YunitWordmark />
        </h1>
        <p class="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">Yet another Useful Intelligence Tool</p>
        <p class="mt-3 max-w-xs text-sm text-gray-700 sm:mt-4 sm:max-w-sm sm:text-base dark:text-gray-200">
          Ask about the church, or tell me what to change. I’ll check with you first.
        </p>

        <div class="mt-5 grid w-full max-w-lg grid-cols-2 gap-2 sm:mt-6 sm:gap-2.5">
          <button
            v-for="starter in starters"
            :key="starter.key"
            type="button"
            :title="starter.ask"
            class="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left text-sm leading-snug text-gray-800 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:ring-primary/30 sm:gap-3 sm:px-4 sm:py-3.5 sm:text-[15px] dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700"
            @click="ask(starter.ask)"
          >
            <span class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-9 dark:bg-primary-light/15 dark:text-primary-light">
              <component :is="starter.icon" class="size-4.5 sm:size-5" />
            </span>
            {{ starter.label }}
          </button>
        </div>
      </section>

      <YunitThread v-else class="px-4 py-6 sm:px-6" />
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
      <p class="py-2 text-center text-xs text-gray-400 dark:text-gray-500">YUNIT can be wrong. Nothing changes until you confirm it.</p>
    </form>
  </div>
</template>

<style scoped>
/* Clear of the home indicator on a phone, and of the bottom bar when it is
   on (the shell sets how much room that needs). */
.yunit-composer {
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--bottom-bar-space, 0px));
}
</style>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { CaretDown, Check, CheckCircle, MapPin, PaperPlaneTilt, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { usePermissions } from '../../composables/usePermissions'
import { allowedGroups } from '../../data/navigation'
import { SENDABLE_KINDS, handledBy, kindOf, kindRing, kindTile } from '../../utils/ticketUtils'

// The form for sending a ticket, and for changing one already sent. A sheet
// from the bottom on a phone, a dialog on a desktop.
//
// It is built to be filled in without scrolling, because it is most often
// opened over a page someone is going through (QuickTicket) and every second
// spent on the form is a second away from the page. So: the kinds as one row
// of small tiles rather than a grid of cards; one writing surface, the
// sentence as its subject line and the rest under it, rather than three
// labelled boxes; and where it is from as a line of chips under that, already
// filled in when the form knows.
//
// The kind still sets what the boxes ask, so a word of thanks is not asked
// "what went wrong?", and one line under the row says what the chosen kind is
// for and who reads it, because "suggestion" and "complaint" are close enough
// that a word alone leaves someone guessing, and the two go to different
// people (lib/tickets.js, handledBy).
//
// After sending from the Tickets app, the sheet thanks them and says where to
// find the answer, rather than closing on a toast that is gone before it is
// read: someone who took the trouble to write should see that it landed.

const props = defineProps({
  show: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  // Set once the parent has saved a new one, to show the thanks.
  sent: { type: Boolean, default: false },
  // The ticket being changed, or null for a new one.
  ticket: { type: Object, default: null },
  // Which kind a new one starts on, when the screen it was opened from knows.
  startKind: { type: String, default: '' },
  // Which app "Where in Ekkly" starts on, and the page a new one is sent
  // from, when it is opened over that page (QuickTicket).
  startWhere: { type: String, default: '' },
  page: { type: String, default: '' },
})

const emit = defineEmits(['update:show', 'save', 'again'])

const { can, isAdmin } = usePermissions()

const kind = ref('')
const title = ref('')
const details = ref('')
const where = ref('')
const tried = ref(false)
const titleRef = ref(null)
const detailsRef = ref(null)
const editing = computed(() => Boolean(props.ticket))

const kinds = SENDABLE_KINDS
const chosen = computed(() => (kind.value ? kindOf(kind.value) : null))

// The apps this person can open, by name, for "Where in Ekkly". Only theirs:
// nobody reports a bug in a page they have never seen.
const places = computed(() =>
  allowedGroups(can, isAdmin.value)
    .flatMap((group) => group.items)
    .map((item) => item.name)
    .filter((name) => name !== 'Tickets')
)

// The box for the rest grows with what is written in it, up to a point, so
// a short note takes little room and a long one is not read through a slot.
const fitDetails = () => {
  const box = detailsRef.value
  if (!box) return
  box.style.height = 'auto'
  box.style.height = `${box.scrollHeight}px`
}

// A sheet that reopens holding the last ticket's words would have someone
// deleting what they sent before writing what they meant — unless it was
// opened on a ticket, in which case its words are exactly what it should hold.
const reset = () => {
  tried.value = false
  kind.value = props.ticket?.kind || props.startKind || ''
  title.value = props.ticket?.title || ''
  details.value = props.ticket?.details || ''
  where.value = props.ticket?.where || props.startWhere || ''
  nextTick(() => {
    fitDetails()
    // Opened on a kind already, what is left is the words, so the box for
    // them has the focus and a phone's keyboard comes up.
    if (editing.value || kind.value) titleRef.value?.focus()
  })
}

watch(
  () => props.show,
  (open) => {
    if (open) reset()
  }
)

// "Send another" keeps the sheet open and clears the thanks; the form under
// it starts empty, as a new one does.
watch(
  () => props.sent,
  (now, before) => {
    if (props.show && before && !now) reset()
  }
)

const pick = (key) => {
  kind.value = key
  nextTick(() => titleRef.value?.focus())
}

const close = () => emit('update:show', false)

// A tap beside the sheet closes it only while there is nothing in it to
// lose; once something is written, closing is the X, Cancel or Escape, all
// of which someone means.
const written = computed(() => Boolean(title.value.trim() || details.value.trim()))
const closeFromBackdrop = () => {
  if (!written.value) close()
}

const missing = computed(() => (!kind.value ? 'kind' : !title.value.trim() ? 'title' : ''))

// Checked when Send is pressed rather than by greying it out: a button that
// will not press and will not say why is the harder thing to work out.
const save = () => {
  tried.value = true
  if (missing.value === 'title') titleRef.value?.focus()
  if (missing.value) return
  emit('save', {
    kind: kind.value,
    title: title.value.trim(),
    details: details.value.trim(),
    where: where.value,
    ...(!editing.value && props.page ? { page: props.page } : {}),
  })
}

// Enter in the subject line moves on to the rest rather than sending half a
// ticket; Ctrl+Enter (⌘+Enter on a Mac) sends from anywhere in the form.
const onTitleEnter = () => detailsRef.value?.focus()
const sendKeys = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ Enter' : 'Ctrl Enter'

// What the thanks says, by what was sent and who it went to.
const thanks = computed(() => {
  switch (kind.value) {
    case 'praise':
      return { title: 'Thank you!', line: 'That is kind of you. Your church’s administrators will see it.' }
    case 'bug':
      return { title: 'Thanks for telling us', line: 'It has gone to the Ekkly team. What they find shows on this ticket.' }
    case 'suggestion':
      return { title: 'Thanks for the idea', line: 'It has gone to the Ekkly team. Their answer shows on this ticket.' }
    case 'question':
      return { title: 'Question sent', line: 'Your church’s administrators will answer it on this ticket.' }
    default:
      return { title: 'Thanks — it is sent', line: 'Your church’s administrators will read it and answer on this ticket.' }
  }
})

// What the chosen kind is for and who reads it, said before it is sent.
const goesTo = computed(() => {
  if (!chosen.value) return 'Pick one, and we will say who reads it.'
  const to = handledBy(chosen.value.key) === 'ekkly' ? 'the Ekkly team' : 'your church’s administrators'
  return `${chosen.value.hint}. Goes to ${to}, with your name on it.`
})

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, close)
</script>

<template>
  <Teleport to="body">
    <Transition name="ticket-sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-120 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        @click.self="closeFromBackdrop"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-composer-title"
          tabindex="-1"
          class="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 sm:max-w-lg sm:rounded-2xl"
          @click.stop
        >
          <div class="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
            <h3 id="ticket-composer-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ sent ? 'Sent' : editing ? 'Edit ticket' : 'Send feedback' }}
            </h3>
            <button
              type="button"
              aria-label="Close"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              @click="close"
            >
              <X class="size-5" />
            </button>
          </div>

          <!-- Sent: the thanks, and where the answer will be. -->
          <div v-if="sent" class="flex flex-1 flex-col items-center px-6 py-8 text-center" aria-live="polite">
            <span :class="['flex size-14 items-center justify-center rounded-2xl', kindTile(kind)]">
              <CheckCircle class="size-8" />
            </span>
            <p class="mt-4 text-xl font-bold text-gray-900 dark:text-white">{{ thanks.title }}</p>
            <p class="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">{{ thanks.line }}</p>
          </div>

          <form
            v-else
            class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2 sm:px-5"
            novalidate
            @submit.prevent="save"
            @keydown.enter.ctrl.prevent="save"
            @keydown.enter.meta.prevent="save"
          >
            <!-- 1. What kind of thing it is: one row, and a line saying what
                 the chosen one is for and who reads it. -->
            <fieldset>
              <legend class="sr-only">What would you like to tell us?</legend>
              <div class="grid grid-cols-5 gap-1">
                <button
                  v-for="option in kinds"
                  :key="option.key"
                  type="button"
                  :aria-pressed="kind === option.key"
                  :title="option.hint"
                  class="flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  @click="pick(option.key)"
                >
                  <span
                    :class="[
                      'flex size-10 items-center justify-center rounded-xl transition-colors',
                      kind === option.key
                        ? [kindTile(option.key), 'ring-2', kindRing(option.key)]
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400',
                    ]"
                  >
                    <component :is="option.icon" class="size-5" />
                  </span>
                  <span
                    :class="[
                      'w-full truncate text-center text-xs',
                      kind === option.key ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400',
                    ]"
                  >
                    {{ option.label }}
                  </span>
                </button>
              </div>
              <p
                :class="[
                  'mt-1.5 text-center text-xs',
                  tried && missing === 'kind' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
                ]"
              >
                {{ tried && missing === 'kind' ? 'Pick what kind of feedback this is.' : goesTo }}
              </p>
            </fieldset>

            <!-- 2. The words: the sentence as a subject line, the rest under
                 it, on one surface. -->
            <div
              :class="[
                'rounded-xl ring-1 transition-shadow focus-within:ring-2 focus-within:ring-primary',
                tried && missing === 'title' ? 'ring-red-400 dark:ring-red-500' : 'ring-gray-300 dark:ring-gray-600',
              ]"
            >
              <label for="ticket-title" class="sr-only">{{ chosen?.prompt || 'In a sentence' }}</label>
              <input
                id="ticket-title"
                ref="titleRef"
                v-model="title"
                type="text"
                maxlength="140"
                enterkeyhint="next"
                autocomplete="off"
                :placeholder="chosen?.prompt || 'Say it in a sentence'"
                :aria-invalid="tried && missing === 'title'"
                class="w-full rounded-t-xl bg-transparent px-3.5 pb-2 pt-3 text-base font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 dark:text-white"
                @keydown.enter.exact.prevent="onTitleEnter"
              />
              <div class="mx-3.5 border-t border-gray-100 dark:border-gray-700" />
              <label for="ticket-details" class="sr-only">Tell us more (optional)</label>
              <textarea
                id="ticket-details"
                ref="detailsRef"
                v-model="details"
                rows="3"
                :placeholder="chosen?.more || 'Anything that would help (optional)'"
                class="block max-h-[32dvh] min-h-20 w-full resize-none rounded-b-xl bg-transparent px-3.5 pb-3 pt-2 text-[15px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                @input="fitDetails"
              />
            </div>
            <p v-if="tried && missing === 'title'" class="-mt-1.5 text-sm text-red-600 dark:text-red-400">
              Say it in a few words first.
            </p>

            <!-- 3. Where it is from: the app, as a chip that opens the list,
                 and the page itself when the form was opened over one. -->
            <div class="flex min-w-0 items-center gap-2">
              <label
                :class="[
                  'relative flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-primary',
                  where
                    ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                ]"
              >
                <MapPin class="size-3.5" />
                <span>{{ where || 'Where in Ekkly' }}</span>
                <CaretDown class="size-3" />
                <select
                  v-model="where"
                  aria-label="Where in Ekkly"
                  class="absolute inset-0 cursor-pointer opacity-0"
                >
                  <option value="">Not one place</option>
                  <option v-for="place in places" :key="place" :value="place">{{ place }}</option>
                </select>
              </label>
              <span
                v-if="page && !editing"
                class="min-w-0 truncate font-mono text-xs text-gray-400 dark:text-gray-500"
                :title="`Sent with the page you are on: ${page}`"
              >
                {{ page }}
              </span>
            </div>
          </form>

          <!-- Footer. pb clears the phone's home indicator. -->
          <div
            class="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700 sm:px-5 sm:pb-3"
          >
            <template v-if="sent">
              <button
                type="button"
                class="h-10 rounded-lg bg-gray-100 px-4 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="emit('again')"
              >
                Send another
              </button>
              <button
                type="button"
                class="h-10 rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover"
                @click="close"
              >
                Done
              </button>
            </template>
            <template v-else>
              <span class="mr-auto hidden text-xs text-gray-400 sm:inline dark:text-gray-500">
                <kbd class="rounded bg-gray-100 px-1.5 py-0.5 font-sans dark:bg-gray-700">{{ sendKeys }}</kbd> to {{ editing ? 'save' : 'send' }}
              </span>
              <button
                type="button"
                class="h-10 rounded-lg bg-gray-100 px-4 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="close"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="saving"
                class="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                @click="save"
              >
                <component :is="editing ? Check : PaperPlaneTilt" class="size-4" />
                <template v-if="editing">{{ saving ? 'Saving…' : 'Save' }}</template>
                <template v-else>{{ saving ? 'Sending…' : 'Send' }}</template>
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ticket-sheet-enter-active,
.ticket-sheet-leave-active {
  transition: opacity 0.25s ease;
}

.ticket-sheet-enter-from,
.ticket-sheet-leave-to {
  opacity: 0;
}

/* A sheet rises from the bottom on a phone; on a desktop it is a dialog and
   simply fades with its backdrop. */
@media (max-width: 639px) {
  .ticket-sheet-enter-active > div,
  .ticket-sheet-leave-active > div {
    transition: transform 0.25s ease;
  }

  .ticket-sheet-enter-from > div,
  .ticket-sheet-leave-to > div {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticket-sheet-enter-active,
  .ticket-sheet-leave-active,
  .ticket-sheet-enter-active > div,
  .ticket-sheet-leave-active > div {
    transition: none;
  }
}
</style>

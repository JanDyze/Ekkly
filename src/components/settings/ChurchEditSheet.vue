<script setup>
// Editing the church as a record, a few questions at a time.
//
// The same shape as a person's record (MemberEditSheet.vue): the page behind
// this is something to read, and this is where it is changed. What was here
// before was two Edit/Done toggles over two blocks of live inputs, each field
// writing itself as you left it — so there was no way back out of a mistake,
// and nothing ever said what you were in the middle of.
//
// Three steps, tappable in any order: only the short name is required, and
// somebody who came to fix a phone number should not have to walk past the
// mission statement to reach Save.
import { computed, ref } from 'vue'
import { Building2, Check, ChevronLeft, ChevronRight, HandHeart, MapPin, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSwipeDismiss } from '../../composables/useSwipeDismiss'
import { useSwipePage } from '../../composables/useSwipePage'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import PairListEditor from './PairListEditor.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** The church as stored, with defaults and fallbacks already resolved. */
  church: { type: Object, default: () => ({}) },
  /** Which step to open on, so a row on the page can land on its own field. */
  startStep: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const STEPS = [
  {
    key: 'names',
    label: 'Church',
    title: 'What the church is called',
    icon: Building2,
    fields: ['shortName', 'fullName', 'branch', 'founded', 'affiliation'],
  },
  {
    key: 'words',
    label: 'Mission',
    title: 'Why the church is here',
    icon: HandHeart,
    fields: ['mission', 'vision', 'basisOfFaith', 'values'],
  },
  {
    key: 'place',
    label: 'Finding you',
    title: 'Where you are, and how to reach you',
    icon: MapPin,
    fields: ['address', 'mapUrl', 'phone', 'email', 'facebook'],
  },
]

const FIELDS = STEPS.flatMap((step) => step.fields)

// The two fields that are lists of pairs, and what each pair is called. The
// editor, the snapshot and the trim all read this, so adding another list means
// adding a line here and a component in the template.
const PAIRS = {
  basisOfFaith: {
    label: 'Basis of faith',
    first: { key: 'belief', placeholder: 'We believe the Bible is the Word of God' },
    second: { key: 'reference', label: 'Reference', placeholder: 'Scripture reference — optional' },
  },
  values: {
    label: 'Core values',
    first: { key: 'value', placeholder: 'Scripture first' },
    second: { key: 'note', label: 'Meaning', placeholder: 'What it means here — optional' },
  },
}

const LIST_FIELDS = Object.keys(PAIRS)

// Empty until the page opens the sheet, which seeds it through reset() below.
const draft = ref({})
const step = ref(0)
// Which way the last move went, so the next screen slides in from that side.
const direction = ref('forward')
const nameError = ref(false)

const snapshot = (church) => {
  const out = {}
  FIELDS.forEach((key) => {
    const value = church?.[key]
    if (LIST_FIELDS.includes(key)) {
      const { first, second } = PAIRS[key]
      out[key] = Array.isArray(value)
        ? value.map((entry) => ({
            [first.key]: entry[first.key] || '',
            [second.key]: entry[second.key] || '',
          }))
        : []
    } else out[key] = value ?? ''
  })
  return out
}

/** What the draft is measured against: the church as it stands. */
const baseline = () => snapshot(props.church)

// Called by the page as it opens the sheet, rather than watched on `show`: the
// settings document changes under here every time anything else on the page
// saves, and re-snapshotting then would wipe whatever is being typed.
// The step is passed in rather than read from the prop: a prop set in the
// same tick as this call has not reached the component yet, so a row asking
// for its own step would land on the last one instead.
const reset = (index = props.startStep) => {
  draft.value = baseline()
  step.value = Math.min(Math.max(index, 0), STEPS.length - 1)
  direction.value = 'forward'
  nameError.value = false
}

defineExpose({ reset })

const same = (a, b) =>
  Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify(a || []) === JSON.stringify(b || [])
    : String(a ?? '').trim() === String(b ?? '').trim()

/** An entry with nothing on its first line draws nothing, so it is dropped
 *  rather than stored as an empty card — the same rule the service rows and the
 *  discipleship stages follow. */
const cleanPairs = (key, list) => {
  const { first, second } = PAIRS[key]
  return (list || [])
    .filter((entry) => String(entry[first.key] || '').trim())
    .map((entry) => ({
      [first.key]: String(entry[first.key]).trim(),
      [second.key]: String(entry[second.key] || '').trim(),
    }))
}

const clean = (key, value) =>
  LIST_FIELDS.includes(key) ? cleanPairs(key, value) : String(value ?? '').trim()

/** Only what actually changed, trimmed. This is the write. */
const changes = computed(() => {
  const original = baseline()
  const out = {}
  FIELDS.forEach((key) => {
    const next = clean(key, draft.value[key])
    if (!same(next, original[key])) out[key] = next
  })
  return out
})

const dirty = computed(() => Object.keys(changes.value).length > 0)
const stepChanged = (s) => s.fields.some((key) => key in changes.value)

// The short name is on every screen and in every export filename, so it is the
// one thing the church cannot be without.
const nameMissing = computed(() => !String(draft.value.shortName || '').trim())
const canSave = computed(() => !props.busy && !nameMissing.value && dirty.value)
const isLast = computed(() => step.value === STEPS.length - 1)

const goTo = (index) => {
  if (index === step.value || index < 0 || index >= STEPS.length) return
  // Checked on the way out of its own step rather than only at the end, where
  // it would read as the sheet refusing to close for no visible reason.
  if (step.value === 0 && index > 0 && nameMissing.value) {
    nameError.value = true
    return
  }
  direction.value = index > step.value ? 'forward' : 'back'
  step.value = index
}

const next = () => (isLast.value ? save() : goTo(step.value + 1))
const back = () => goTo(step.value - 1)

const save = () => {
  if (props.busy) return
  if (nameMissing.value) {
    nameError.value = true
    direction.value = 'back'
    step.value = 0
    return
  }
  if (!dirty.value) {
    emit('close')
    return
  }
  emit('save', { ...changes.value })
}

/* ------------------------------------------------------------------ closing */

const confirmDiscard = ref(false)

const requestClose = () => {
  if (props.busy) return
  if (dirty.value) confirmDiscard.value = true
  else emit('close')
}

const discard = () => {
  confirmDiscard.value = false
  emit('close')
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show && !confirmDiscard.value, requestClose)

// Sideways between steps, the way you would leaf through cards.
const { swipeRef } = useSwipePage({
  onNext: () => goTo(step.value + 1),
  onPrevious: () => goTo(step.value - 1),
  enabled: () => props.show && !confirmDiscard.value,
})

// And downwards to put the whole thing away, the panel following the finger —
// the gesture a sheet that came up from the bottom invites. It defers to the
// step's scroller, so a long step still scrolls from anywhere in it and only a
// drag that starts at the top closes anything. Unsaved changes still stop and
// ask, because this goes through requestClose like the X does.
const { swipeTarget: dragSheet, swipeStyle: dragStyle } = useSwipeDismiss({
  direction: 'down',
  onDismiss: requestClose,
  enabled: () => props.show && !confirmDiscard.value,
})

const onEnter = (event) => {
  // Enter moves on, the way a phone keyboard's "next" key suggests it will.
  if (event.target.tagName === 'TEXTAREA') return
  event.preventDefault()
  next()
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="requestClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="church-edit-title"
          tabindex="-1"
          v-bind="dragSheet"
          :style="dragStyle()"
          class="sheet-panel flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:h-[min(640px,85dvh)] sm:max-w-lg sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <!-- Header: close, what is being edited, and Save the moment there
               is something to save. -->
          <div class="flex shrink-0 items-center gap-2 px-2 pt-2">
            <button
              type="button"
              @click="requestClose"
              aria-label="Close"
              class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X class="h-5 w-5" />
            </button>
            <div class="min-w-0 flex-1 text-center">
              <h2 id="church-edit-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                Church details
              </h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ draft.shortName || church.shortName || 'Your church' }}
              </p>
            </div>
            <button
              type="button"
              @click="save"
              :disabled="!canSave"
              :class="[
                'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                canSave
                  ? 'text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15'
                  : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
              ]"
            >
              {{ busy ? 'Saving…' : 'Save' }}
            </button>
          </div>

          <!-- Every step can be tapped: it says where you are, it is not a gate
               you have to pass. A dot marks a step you have changed. -->
          <nav aria-label="Church sections" class="shrink-0 px-4 pb-3 pt-3">
            <ol class="grid grid-cols-3 gap-2">
              <li v-for="(s, i) in STEPS" :key="s.key">
                <button
                  type="button"
                  @click="goTo(i)"
                  :aria-current="i === step ? 'step' : undefined"
                  class="group flex w-full flex-col gap-1.5 text-left"
                >
                  <span
                    :class="[
                      'block h-1 w-full rounded-full transition-colors duration-300',
                      i <= step ? 'bg-primary dark:bg-primary-light' : 'bg-gray-200 dark:bg-gray-700',
                    ]"
                  ></span>
                  <span class="flex min-w-0 items-center gap-1">
                    <span
                      :class="[
                        'truncate text-xs transition-colors',
                        i === step
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300',
                      ]"
                    >
                      {{ s.label }}
                    </span>
                    <span
                      v-if="stepChanged(s)"
                      class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary dark:bg-primary-light"
                      aria-label="changed"
                    ></span>
                  </span>
                </button>
              </li>
            </ol>
          </nav>

          <!-- One step at a time. -->
          <div :ref="swipeRef" class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <Transition :name="`step-${direction}`" mode="out-in">
              <form
                :key="step"
                class="space-y-5 px-4 pb-6 pt-2 sm:px-6"
                @submit.prevent="next"
                @keydown.enter="onEnter"
              >
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ STEPS[step].title }}</h3>

                <!-- What the church is called -->
                <template v-if="STEPS[step].key === 'names'">
                  <div>
                    <label :class="label" for="church-short-name">Short name</label>
                    <input
                      id="church-short-name"
                      v-model="draft.shortName"
                      type="text"
                      placeholder="Grace Community"
                      :class="[input, nameError && nameMissing ? 'ring-2 ring-red-500' : '']"
                    />
                    <p
                      v-if="nameError && nameMissing"
                      class="mt-1 text-xs font-semibold text-red-600 dark:text-red-400"
                    >
                      Your church needs a name.
                    </p>
                  </div>

                  <div>
                    <label :class="label" for="church-full-name">Full legal name</label>
                    <input
                      id="church-full-name"
                      v-model="draft.fullName"
                      type="text"
                      placeholder="Grace Community Church Inc."
                      :class="input"
                    />
                  </div>

                  <div>
                    <label :class="label" for="church-branch">Branch or outreach</label>
                    <input
                      id="church-branch"
                      v-model="draft.branch"
                      type="text"
                      placeholder="Bacolod"
                      :class="input"
                    />
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label :class="label" for="church-founded">Year founded</label>
                      <input
                        id="church-founded"
                        v-model="draft.founded"
                        type="text"
                        inputmode="numeric"
                        placeholder="1998"
                        :class="input"
                      />
                    </div>
                    <div>
                      <label :class="label" for="church-affiliation">Affiliation</label>
                      <input
                        id="church-affiliation"
                        v-model="draft.affiliation"
                        type="text"
                        placeholder="Convention of Philippine Baptist Churches"
                        :class="input"
                      />
                    </div>
                  </div>
                </template>

                <!-- Who we are. Every field here is published on the church's
                     own page, so the step says so once instead of repeating it
                     under each one. -->
                <template v-else-if="STEPS[step].key === 'words'">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Shown on your public page.</p>

                  <div>
                    <label :class="label" for="church-mission">Mission</label>
                    <textarea
                      id="church-mission"
                      v-model="draft.mission"
                      rows="2"
                      placeholder="What the church is here to do"
                      :class="input"
                    ></textarea>
                  </div>

                  <div>
                    <label :class="label" for="church-vision">Vision</label>
                    <textarea
                      id="church-vision"
                      v-model="draft.vision"
                      rows="2"
                      placeholder="What the church is working towards"
                      :class="input"
                    ></textarea>
                  </div>

                  <PairListEditor
                    v-for="(pair, key) in PAIRS"
                    :key="key"
                    v-model="draft[key]"
                    :label="pair.label"
                    :first="pair.first"
                    :second="pair.second"
                  />

                </template>

                <!-- Where you are -->
                <template v-else>
                  <div>
                    <label :class="label" for="church-address">Address</label>
                    <textarea id="church-address" v-model="draft.address" rows="2" :class="input"></textarea>
                  </div>

                  <div>
                    <label :class="label" for="church-map">Map link</label>
                    <input
                      id="church-map"
                      v-model="draft.mapUrl"
                      type="url"
                      placeholder="https://maps.app.goo.gl/..."
                      :class="input"
                    />
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label :class="label" for="church-phone">Phone</label>
                      <input id="church-phone" v-model="draft.phone" type="tel" :class="input" />
                    </div>
                    <div>
                      <label :class="label" for="church-email">Email</label>
                      <input id="church-email" v-model="draft.email" type="email" :class="input" />
                    </div>
                  </div>

                  <div>
                    <label :class="label" for="church-facebook">Facebook page</label>
                    <input
                      id="church-facebook"
                      v-model="draft.facebook"
                      type="url"
                      placeholder="https://facebook.com/..."
                      :class="input"
                    />
                  </div>
                </template>
              </form>
            </Transition>
          </div>

          <!-- Back and Next, where the thumb already is. -->
          <div
            class="flex shrink-0 items-center gap-3 border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700"
          >
            <button
              v-if="step > 0"
              type="button"
              @click="back"
              class="inline-flex h-11 items-center gap-1 rounded-lg bg-gray-100 pl-3 pr-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ChevronLeft class="h-4 w-4" />
              Back
            </button>
            <span class="flex-1 text-center text-xs tabular-nums text-gray-400 dark:text-gray-500">
              {{ step + 1 }} of {{ STEPS.length }}
            </span>
            <button
              type="button"
              @click="next"
              :disabled="busy"
              class="inline-flex h-11 items-center gap-1 rounded-lg bg-primary pl-4 pr-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              <template v-if="isLast">
                {{ busy ? 'Saving…' : dirty ? 'Save changes' : 'Done' }}
                <Check class="ml-0.5 h-4 w-4" />
              </template>
              <template v-else>
                Next
                <ChevronRight class="h-4 w-4" />
              </template>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmationModal
      :show="confirmDiscard"
      title="Discard changes"
      message="You have changes that are not saved. Close without saving them?"
      confirm-text="Discard"
      cancel-text="Keep editing"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="confirmDiscard = $event"
      @confirm="discard"
      @cancel="confirmDiscard = false"
    />
  </Teleport>
</template>

<style scoped>
/* The same entrance as the other sheets: up from the bottom on a phone, a
   slight grow on a desktop where it is a centred card. */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-leave-active .sheet-panel {
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: translateY(0.5rem) scale(0.96);
  }
}

/* Steps slide the way you are going: Next brings the new one in from the
   right, Back from the left. */
.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.step-forward-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}

.step-forward-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-1.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .step-forward-enter-active,
  .step-forward-leave-active,
  .step-back-enter-active,
  .step-back-leave-active {
    transition: opacity 0.12s ease;
  }

  .step-forward-enter-from,
  .step-back-leave-to,
  .step-forward-leave-to,
  .step-back-enter-from {
    transform: none;
  }
}
</style>

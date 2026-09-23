<script setup>
// Choosing the church's colours and its typeface.
//
// The same stepped sheet as the church's record and the public page, for the
// same reason: the card behind this says what the church is wearing, and this
// is where it is changed. What was here before was both choices live on the
// card under one "Save changes" — so a church that came to try a colour found
// the whole page shifting under it with no way back but remembering the old
// hex.
//
// Two steps rather than three, because there are two decisions. No FieldList
// here: a colour and a face are not words on a page, and the controls that
// pick them (ColourEditor, FontPicker) already exist and already show what
// they are doing.
import { computed, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSwipeDismiss } from '../../composables/useSwipeDismiss'
import { useSwipePage } from '../../composables/useSwipePage'
import { isHexColor, themeForStorage } from '../../../lib/platformDefaults.js'
import { themeFromBrandColour } from '../../utils/logoUtils'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import ColourEditor from '../common/ColourEditor.vue'
import FontPicker from '../common/FontPicker.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** The church's stored theme — empty while it wears the platform's. */
  theme: { type: Object, default: () => ({}) },
  /** What an unchosen colour or face falls back to: the platform's. */
  fallback: { type: Object, default: () => ({}) },
  /** Colours read off the church's own logo, offered as swatches. */
  logoColours: { type: Array, default: () => [] },
  startStep: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const STEPS = [
  { key: 'colour', label: 'Colour', title: 'The colour the church wears' },
  { key: 'type', label: 'Typeface', title: 'The face it is set in' },
]

const draft = ref({})
// Starts where the prop says, so the sheet agrees with its own prop even
// before reset() seeds it. The card calls reset() on the way in, which is
// what normally settles this.
const step = ref(Math.min(Math.max(props.startStep, 0), STEPS.length - 1))
const direction = ref('forward')

/** What the draft is measured against: the theme as it stands. */
const baseline = () => ({ ...(props.theme || {}) })

// Seeded by the card as it opens the sheet rather than watched on `show`: the
// settings document changes under here whenever anything else on the page
// saves, and re-snapshotting then would throw away a colour being tried.
const reset = (index = props.startStep) => {
  draft.value = baseline()
  step.value = Math.min(Math.max(index, 0), STEPS.length - 1)
  direction.value = 'forward'
}

defineExpose({ reset })

const stored = (value) => JSON.stringify(themeForStorage(value))
const dirty = computed(() => stored(draft.value) !== stored(props.theme))

// Only the colours can be typed wrong; the face is picked from a list.
const invalid = computed(() =>
  ['primary', 'primaryDark'].some((key) => draft.value[key] && !isHexColor(draft.value[key]))
)

const stepChanged = (s) => {
  const keys = s.key === 'colour' ? ['primary', 'primaryDark'] : ['font', 'fontFamily']
  const before = themeForStorage(props.theme)
  const after = themeForStorage(draft.value)
  return keys.some((key) => (before[key] || '') !== (after[key] || ''))
}

const canSave = computed(() => !props.busy && dirty.value && !invalid.value)
const isLast = computed(() => step.value === STEPS.length - 1)

/**
 * The pair a colour needs — one that carries white text on a light page, a
 * lighter one for the dark page — is worked out rather than asked for. The hex
 * boxes below are still there for anyone who does want to type one.
 */
const chooseColour = (hex) => {
  draft.value = { ...draft.value, ...themeFromBrandColour(hex) }
}

// Compared through the same conversion the swatch applies, because what is
// stored is the adjusted pair rather than the colour straight off the artwork.
const chosenColour = computed(
  () =>
    props.logoColours.find((hex) => themeFromBrandColour(hex).primary === draft.value.primary) || ''
)

/* ------------------------------------------------------------- navigation */

const goTo = (index) => {
  if (index === step.value || index < 0 || index >= STEPS.length) return
  direction.value = index > step.value ? 'forward' : 'back'
  step.value = index
}

const next = () => (isLast.value ? save() : goTo(step.value + 1))
const back = () => goTo(step.value - 1)

const save = () => {
  if (props.busy || invalid.value) return
  if (!dirty.value) {
    emit('close')
    return
  }
  // Written whole rather than as a patch: clearing a colour has to really
  // clear it, and a merge would leave the old one underneath.
  emit('save', { ...draft.value })
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

const { swipeRef } = useSwipePage({
  onNext: () => goTo(step.value + 1),
  onPrevious: () => goTo(step.value - 1),
  enabled: () => props.show && !confirmDiscard.value,
})

const { swipeTarget: dragSheet, swipeStyle: dragStyle } = useSwipeDismiss({
  direction: 'down',
  onDismiss: requestClose,
  enabled: () => props.show && !confirmDiscard.value,
})
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
          aria-labelledby="church-look-title"
          tabindex="-1"
          v-bind="dragSheet"
          :style="dragStyle()"
          class="sheet-panel flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:h-[min(640px,85dvh)] sm:max-w-lg sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
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
              <h2 id="church-look-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                Colours and type
              </h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ STEPS[step].label }}
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

          <nav aria-label="Look sections" class="shrink-0 px-4 pb-3 pt-3">
            <ol class="grid grid-cols-2 gap-2">
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

          <div :ref="swipeRef" class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <Transition :name="`step-${direction}`" mode="out-in">
              <div :key="step" class="space-y-5 px-4 pb-6 pt-2 sm:px-6">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ STEPS[step].title }}</h3>

                <template v-if="STEPS[step].key === 'colour'">
                  <!-- The colours the church's logo is already drawn in, so the
                       commonest answer is a tap rather than a hex code. -->
                  <div v-if="logoColours.length">
                    <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      From your logo
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="hex in logoColours"
                        :key="hex"
                        type="button"
                        :aria-label="`Use ${hex} from your logo`"
                        :aria-pressed="chosenColour === hex"
                        :class="[
                          'h-10 w-10 rounded-full border transition-transform hover:scale-105',
                          chosenColour === hex
                            ? 'border-transparent ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-800'
                            : 'border-black/10 dark:border-white/20',
                        ]"
                        :style="{ backgroundColor: hex }"
                        @click="chooseColour(hex)"
                      >
                        <Check v-if="chosenColour === hex" class="mx-auto h-4 w-4 text-white drop-shadow" />
                      </button>
                    </div>
                  </div>

                  <ColourEditor v-model="draft" :fallback="fallback" />
                </template>

                <template v-else-if="STEPS[step].key === 'type'">
                  <FontPicker
                    v-model="draft.font"
                    v-model:family="draft.fontFamily"
                    :fallback="fallback.font"
                    :fallback-family="fallback.fontFamily"
                  />
                </template>
              </div>
            </Transition>
          </div>

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
              :disabled="busy || (isLast && invalid)"
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

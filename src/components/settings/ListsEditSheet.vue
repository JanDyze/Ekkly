<script setup>
// Editing the church's lists, one list at a time.
//
// The same sheet as Church details (ChurchEditSheet.vue), because it is the
// same job: a record read on the page behind, changed here, written once. What
// this replaced was four lists each with an Edit of its own, each change saving
// itself — which meant four ways in, no way back out of a mistake, and a
// document write for every pill.
//
// One step per list. Nothing is required, so the steps can be tapped in any
// order and Save is live as soon as anything differs.
import { computed, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSwipeDismiss } from '../../composables/useSwipeDismiss'
import { useSwipePage } from '../../composables/useSwipePage'
import { useToast } from '../../composables/useToast'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import CategoryListEditor from './CategoryListEditor.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** The four lists, as ChurchListsAdmin describes them. */
  lists: { type: Array, required: true },
  /** What is stored now: { [key]: [...values] }. */
  values: { type: Object, default: () => ({}) },
  /** Which hue each event type wears now. */
  hues: { type: Object, default: () => ({}) },
  /** Which step to open on, so a list's own Edit lands on its own step. */
  startStep: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const toast = useToast()

const draft = ref({ values: {}, hues: {} })
const step = ref(0)
const direction = ref('forward')

const snapshot = () => ({
  values: Object.fromEntries(props.lists.map((list) => [list.key, [...(props.values[list.key] || [])]])),
  hues: { ...props.hues },
})

// Called by the page as it opens the sheet. The step comes in rather than being
// read off the prop, which has not reached the component yet.
const reset = (index = props.startStep) => {
  draft.value = snapshot()
  step.value = Math.min(Math.max(index, 0), props.lists.length - 1)
  direction.value = 'forward'
}

defineExpose({ reset })

const current = computed(() => props.lists[step.value] || props.lists[0])

const sameList = (a, b) => (a || []).join('\u0000') === (b || []).join('\u0000')

/** Only the lists that actually changed, plus the hues if any moved. */
const changes = computed(() => {
  const original = snapshot()
  const values = {}
  props.lists.forEach(({ key }) => {
    if (!sameList(draft.value.values[key], original.values[key])) values[key] = draft.value.values[key]
  })
  const hues =
    JSON.stringify(draft.value.hues) === JSON.stringify(original.hues) ? null : draft.value.hues
  return { values, hues }
})

const dirty = computed(
  () => Object.keys(changes.value.values).length > 0 || changes.value.hues !== null
)

const changedStep = (key) => key in changes.value.values
const isLast = computed(() => step.value === props.lists.length - 1)

const goTo = (index) => {
  if (index === step.value || index < 0 || index >= props.lists.length) return
  direction.value = index > step.value ? 'forward' : 'back'
  step.value = index
}

const next = () => (isLast.value ? save() : goTo(step.value + 1))
const back = () => goTo(step.value - 1)

const save = () => {
  if (props.busy) return
  if (!dirty.value) {
    emit('close')
    return
  }
  emit('save', { values: { ...changes.value.values }, hues: changes.value.hues })
}

/* ------------------------------------------------------ the lists themselves */

const listOf = (key) => draft.value.values[key] || []
const setList = (key, values) => {
  draft.value = { ...draft.value, values: { ...draft.value.values, [key]: values } }
}

const addEntry = (list, raw) => {
  const value = list.store ? list.store(raw) : raw.trim()
  if (!value) return
  const current = listOf(list.key)
  if (current.some((v) => String(v).toLowerCase() === value.toLowerCase())) {
    toast.info('That one is already on the list')
    return
  }
  setList(list.key, [...current, value])
}

const removeEntry = (list, value) => {
  setList(
    list.key,
    listOf(list.key).filter((v) => v !== value)
  )
  // A colour for something no longer on the list is a colour nothing reads.
  if (value in draft.value.hues) {
    const { [value]: _gone, ...rest } = draft.value.hues
    draft.value = { ...draft.value, hues: rest }
  }
}

// Puts back whichever built-in entries have been taken off, keeping everything
// the church added and the order it is in.
const restoreDefaults = (list) => {
  const current = listOf(list.key)
  const present = new Set(current.map((value) => String(value).toLowerCase()))
  const missing = (list.defaults || []).filter((value) => !present.has(String(value).toLowerCase()))
  if (!missing.length) return
  setList(list.key, [...current, ...missing])
}

const setHue = (value, hue) => {
  draft.value = { ...draft.value, hues: { ...draft.value.hues, [value]: hue } }
}

// The dot and the tick in the picker read the draft, not the stored settings:
// a colour chosen here is not the app's colour until Save.
const hueOf = (value) => draft.value.hues[value] || current.value?.hueOf?.(value) || ''
const dotOf = (value) => current.value?.dotFor?.(hueOf(value)) || ''

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

// Sideways between steps, and down to put the whole thing away.
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
          aria-labelledby="lists-edit-title"
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
              <h2 id="lists-edit-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                Lists
              </h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ current.label }}</p>
            </div>
            <button
              type="button"
              @click="save"
              :disabled="busy || !dirty"
              :class="[
                'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                !busy && dirty
                  ? 'text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15'
                  : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
              ]"
            >
              {{ busy ? 'Saving…' : 'Save' }}
            </button>
          </div>

          <nav aria-label="Lists" class="shrink-0 px-4 pb-3 pt-3">
            <ol class="grid grid-cols-4 gap-2">
              <li v-for="(list, i) in lists" :key="list.key">
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
                      {{ list.short }}
                    </span>
                    <span
                      v-if="changedStep(list.key)"
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
              <div :key="step" class="space-y-4 px-4 pb-6 pt-2 sm:px-6">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ current.label }}</h3>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ current.hint }}</p>
                </div>

                <CategoryListEditor
                  :label="current.label"
                  :values="listOf(current.key)"
                  :defaults="current.defaults || []"
                  :format="current.format || ((value) => value)"
                  :dot="current.dotFor ? dotOf : null"
                  :palette="current.palette || []"
                  :hue-of="current.palette && current.palette.length ? hueOf : null"
                  @add="(value) => addEntry(current, value)"
                  @remove="(value) => removeEntry(current, value)"
                  @reorder="(values) => setList(current.key, values)"
                  @restore="restoreDefaults(current)"
                  @hue="setHue"
                />
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
              {{ step + 1 }} of {{ lists.length }}
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
/* The same entrance, and the same page turn between steps, as the church's own
   sheet. Kept beside it rather than shared, because a style block is not the
   thing these two would drift over. */
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

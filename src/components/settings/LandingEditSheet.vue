<script setup>
// Editing what the public page says, a few questions at a time.
//
// The same shape as the church's own record (ChurchEditSheet.vue): the card
// behind this is something to read, and this is where it is changed.
//
// None of the fields are written out here. They are declared in
// src/data/landingSchema.js and drawn by FieldList.vue, which is the same
// vocabulary the /landing-lab prototype describes its section types in — so
// whichever way that experiment goes, a field is data in one file rather than
// markup in two. Everything below is the part that is genuinely this screen's:
// which fields belong to which step, what a draft is measured against, and
// what gets written.
//
// Not here: the hero photo, the switches and the album picker. Each is one tap
// with nothing to type alongside it, so each saves where it stands, on the
// card — the rule the logo already follows in ChurchSettings.vue.
import { computed, ref } from 'vue'
import { Check, ChevronLeft, ChevronRight, Plus, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSwipeDismiss } from '../../composables/useSwipeDismiss'
import { useSwipePage } from '../../composables/useSwipePage'
import {
  useRecurringSchedules,
  WEEKDAYS,
  OCCURRENCES,
  sortOccurrences,
} from '../../composables/useRecurringSchedules'
import { formatTime } from '../../../lib/occurrences'
import { SETTINGS_FIELDS, SETTINGS_STEPS } from '../../data/landingSchema'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import FieldList from './FieldList.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** The landing block as stored, with the starting values already merged in. */
  landing: { type: Object, default: () => ({}) },
  /** Which step to open on, so a group on the card can land on its own fields. */
  startStep: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const STEPS = SETTINGS_STEPS

// Empty until the card opens the sheet, which seeds it through reset() below.
const draft = ref({})
// Starts where the prop says, so the sheet agrees with its own prop even
// before reset() seeds it. The card calls reset() on the way in, which is
// what normally settles this.
const step = ref(Math.min(Math.max(props.startStep, 0), STEPS.length - 1))
// Which way the last move went, so the next screen slides in from that side.
const direction = ref('forward')

/** The stored page, as a draft: every field present, in its own shape. */
const snapshot = (landing) => {
  const out = {}
  SETTINGS_FIELDS.forEach((field) => {
    const value = landing?.[field.key]
    if (field.type === 'words') out[field.key] = Array.isArray(value) ? [...value] : []
    else if (field.type === 'list') {
      out[field.key] = Array.isArray(value)
        ? value.map((row) => Object.fromEntries(field.item.map((s) => [s.key, row?.[s.key] || ''])))
        : []
    } else out[field.key] = value ?? ''
  })
  return out
}

/** What the draft is measured against: the page as it stands. */
const baseline = () => snapshot(props.landing)

// Called by the card as it opens the sheet, rather than watched on `show`: the
// settings document changes under here every time a switch on the card saves,
// and re-snapshotting then would wipe whatever is being typed.
// The step is passed in rather than read from the prop: a prop set in the same
// tick as this call has not reached the component yet, so a group asking for
// its own step would land on the last one instead.
const reset = (index = props.startStep) => {
  draft.value = baseline()
  step.value = Math.min(Math.max(index, 0), STEPS.length - 1)
  direction.value = 'forward'
}

defineExpose({ reset })

const same = (a, b) =>
  Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify(a || []) === JSON.stringify(b || [])
    : String(a ?? '').trim() === String(b ?? '').trim()

/**
 * A field's value, trimmed and ready to store.
 *
 * A row whose first line is blank draws nothing on the page, so it is dropped
 * rather than stored as an empty card — the same rule the church's values and
 * its basis of faith follow.
 */
const clean = (field, value) => {
  if (field.type === 'words') return (value || []).map((word) => word.trim()).filter(Boolean)
  if (field.type === 'list') {
    const [first, ...rest] = field.item
    return (value || [])
      .filter((row) => String(row[first.key] || '').trim())
      .map((row) => ({
        [first.key]: String(row[first.key]).trim(),
        ...Object.fromEntries(rest.map((s) => [s.key, String(row[s.key] || '').trim()])),
      }))
  }
  return String(value ?? '').trim()
}

/** Only what actually changed, trimmed. This is the write. */
const changes = computed(() => {
  const original = baseline()
  const out = {}
  SETTINGS_FIELDS.forEach((field) => {
    const next = clean(field, draft.value[field.key])
    if (!same(next, original[field.key])) out[field.key] = next
  })
  return out
})

const dirty = computed(() => Object.keys(changes.value).length > 0)
const stepChanged = (s) => s.fields.some((field) => field.key in changes.value)

// Nothing on this page is required: a church with no verse chosen, or no
// service times yet, has a page that simply leaves those sections out.
const canSave = computed(() => !props.busy && dirty.value)
const isLast = computed(() => step.value === STEPS.length - 1)

/* ----------------------------------------------------------- the services */
// The weekly schedule already knows when the church meets. Retyping it here is
// how the two drift apart, so each one is offered as a chip that fills in a
// row the admin can then word however they like.
const { schedules } = useRecurringSchedules()

const scheduleWhen = (schedule) => {
  const weekday = WEEKDAYS.find((w) => w.value === schedule.weekday)?.label || ''
  const weeks = sortOccurrences(schedule.occurrences || [])
  const which = weeks.length
    ? `${weeks.map((v) => OCCURRENCES.find((o) => o.value === v)?.label || v).join(' & ')} ${weekday}`
    : `Every ${weekday}`
  return [which.trim(), formatTime(schedule.time)].filter(Boolean).join(', ')
}

/** Only what is not already on the list, and only what runs. */
const suggestions = computed(() => {
  const listed = new Set(
    (draft.value.services || []).map((service) => (service.name || '').trim().toLowerCase())
  )
  return schedules.value
    .filter((schedule) => schedule.enabled !== false && schedule.title)
    .filter((schedule) => !listed.has(schedule.title.trim().toLowerCase()))
    .map((schedule) => ({ id: schedule.id, name: schedule.title, when: scheduleWhen(schedule) }))
})

const addSuggestion = (suggestion) => {
  draft.value.services = [
    ...(draft.value.services || []),
    { name: suggestion.name, when: suggestion.when, note: '' },
  ]
}

/* ------------------------------------------------------------- navigation */

const goTo = (index) => {
  if (index === step.value || index < 0 || index >= STEPS.length) return
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

// And downwards to put the whole thing away, the panel following the finger.
// It defers to the step's scroller, so a long step still scrolls from anywhere
// in it and only a drag that starts at the top closes anything. Unsaved
// changes still stop and ask, because this goes through requestClose like the
// X does.
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
          aria-labelledby="landing-edit-title"
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
              <h2 id="landing-edit-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                Public page
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

          <!-- Every step can be tapped: it says where you are, it is not a gate
               you have to pass. A dot marks a step you have changed. -->
          <nav aria-label="Public page sections" class="shrink-0 px-4 pb-3 pt-3">
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

          <!-- One step at a time, each drawn from its own field list. -->
          <div :ref="swipeRef" class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <Transition :name="`step-${direction}`" mode="out-in">
              <form
                :key="step"
                class="space-y-5 px-4 pb-6 pt-2 sm:px-6"
                @submit.prevent="next"
                @keydown.enter="onEnter"
              >
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ STEPS[step].title }}</h3>

                <FieldList :fields="STEPS[step].fields" :model="draft" id-prefix="landing">
                  <!-- The one thing no descriptor can express: the times the
                       weekly schedule already knows, offered rather than
                       retyped. -->
                  <template #list:services>
                    <div v-if="suggestions.length" class="mb-2 flex flex-wrap gap-1.5">
                      <button
                        v-for="suggestion in suggestions"
                        :key="suggestion.id"
                        type="button"
                        @click="addSuggestion(suggestion)"
                        class="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:text-primary-light"
                      >
                        <Plus class="h-3 w-3" />
                        {{ suggestion.name }}
                      </button>
                    </div>
                  </template>
                </FieldList>
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

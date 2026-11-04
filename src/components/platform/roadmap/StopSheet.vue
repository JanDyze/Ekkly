<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowBendUpRight, ArrowDown, ArrowUp, MapPin, Star, StarFill, Trash2, X } from '../../../icons'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { SIDE_STATUSES, STEP_STATUSES, newStopId, shortDate } from '../../../utils/roadmap'

// Adding or changing one stop on a roadmap: a step on the road, or a
// sidetrack off it. A bottom sheet on a phone and a centred card on a
// desktop, like the other sheets. Moving a stop and branching a sidetrack off
// a step happen at once, from the sheet, since there is nothing to type for
// them.

const props = defineProps({
  show: { type: Boolean, default: false },
  // The stop being changed, or null for a new one.
  stop: { type: Object, default: null },
  kind: { type: String, default: 'step' },
  // For a step, its number on the road; for a sidetrack, the step it left.
  number: { type: Number, default: 0 },
  parentTitle: { type: String, default: '' },
  moves: { type: Object, default: () => ({ earlier: false, later: false }) },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save', 'delete', 'move', 'add-side'])

const isSide = computed(() => props.kind === 'side')
const isNew = computed(() => !props.stop)
const statuses = computed(() => (isSide.value ? SIDE_STATUSES : STEP_STATUSES))

const form = ref({ title: '', note: '', status: 'next', stars: 0 })
const titleInput = ref(null)

// Filled afresh on opening, and again when the open sheet turns to another
// stop (a step's "Add a sidetrack"); moving the stop keeps what is typed.
watch(
  () => [props.show, props.stop?.id, props.kind],
  ([open]) => {
    if (!open) return
    form.value = props.stop
      ? { title: props.stop.title, note: props.stop.note, status: props.stop.status, stars: props.stop.stars || 0 }
      : { title: '', note: '', status: isSide.value ? 'open' : 'next', stars: 0 }
  },
  { immediate: true }
)

const heading = computed(() => {
  if (isSide.value) return isNew.value ? 'New sidetrack' : 'Sidetrack'
  return isNew.value ? 'New step' : `Step ${props.number}`
})

const hint = computed(() => {
  if (isSide.value) return props.parentTitle ? `Off step ${props.number}: ${props.parentTitle}` : 'A detour off the road'
  if (props.stop?.status === 'done' && props.stop.doneOn) return `Done ${shortDate(props.stop.doneOn)}`
  return isNew.value ? 'The next stop on the road' : 'A stop on the road'
})

const canSave = computed(() => form.value.title.trim().length > 0 && !props.saving)

const save = () => {
  if (!canSave.value) return
  emit('save', {
    ...(props.stop || { id: newStopId(), kind: props.kind, doneOn: '' }),
    title: form.value.title.trim(),
    note: form.value.note.trim(),
    status: form.value.status,
    stars: form.value.status === 'done' ? form.value.stars : 0,
  })
}

// A tap on the star already lit turns it back off, so none is a choice too.
const setStars = (n) => {
  form.value.stars = form.value.stars === n ? 0 : n
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stop-sheet-title"
          tabindex="-1"
          class="sheet-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-linear-to-r from-primary/10 to-transparent px-4 py-3.5 dark:border-gray-700 dark:from-primary-light/10"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="shrink-0 rounded-xl bg-primary p-2.5">
                <component :is="isSide ? ArrowBendUpRight : MapPin" class="h-5 w-5 text-white" />
              </div>
              <div class="min-w-0">
                <h2 id="stop-sheet-title" class="truncate text-base font-bold text-gray-900 dark:text-white">{{ heading }}</h2>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ hint }}</p>
              </div>
            </div>
            <button
              type="button"
              @click="emit('close')"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <form class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" @submit.prevent="save">
            <div>
              <label for="stop-title" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ isSide ? 'What the detour was' : 'What the step is' }}
              </label>
              <input
                id="stop-title"
                ref="titleInput"
                v-model="form.title"
                maxlength="140"
                autocomplete="off"
                :placeholder="isSide ? 'Rebuilt sign-in after the Google change' : 'Every church can take payments by card'"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label for="stop-note" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ isSide ? 'Why it was taken' : 'Notes' }}
              </label>
              <textarea
                id="stop-note"
                v-model="form.note"
                rows="3"
                maxlength="2000"
                :placeholder="isSide ? 'What pulled us off the road, and what came of it' : 'What done looks like, or what it took'"
                class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>

            <div>
              <p class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Where it stands</p>
              <div role="radiogroup" aria-label="Where it stands" class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700/60">
                <button
                  v-for="s in statuses"
                  :key="s.key"
                  type="button"
                  role="radio"
                  :aria-checked="form.status === s.key"
                  :title="s.hint"
                  @click="form.status = s.key"
                  :class="[
                    'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    form.status === s.key
                      ? 'bg-primary text-white dark:bg-primary-light dark:text-gray-900'
                      : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800',
                  ]"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>

            <!-- How it went, for a finished stop only. -->
            <Transition name="grow">
              <div v-if="form.status === 'done'">
                <p class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">How did it go?</p>
                <div class="flex items-center gap-1">
                  <button
                    v-for="n in 3"
                    :key="n"
                    type="button"
                    :aria-label="`${n} star${n > 1 ? 's' : ''}`"
                    :aria-pressed="form.stars >= n"
                    @click="setStars(n)"
                    class="rounded-lg p-1.5 transition-colors hover:bg-amber-50 dark:hover:bg-amber-400/10"
                  >
                    <StarFill v-if="form.stars >= n" class="size-8 text-amber-400" />
                    <Star v-else class="size-8 text-gray-300 dark:text-gray-600" />
                  </button>
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {{ ['No stars', 'Got there', 'Went well', 'Couldn’t have gone better'][form.stars] }}
                  </span>
                </div>
              </div>
            </Transition>

            <!-- What can be done to a stop already on the road, at once. -->
            <div v-if="!isNew" class="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
              <button
                v-if="!isSide"
                type="button"
                @click="emit('add-side', stop.id)"
                class="flex h-9 items-center gap-1.5 rounded-lg bg-violet-50 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100 dark:bg-violet-400/10 dark:text-violet-300 dark:hover:bg-violet-400/20"
              >
                <ArrowBendUpRight class="size-4" />
                Add a sidetrack
              </button>
              <button
                v-if="moves.earlier"
                type="button"
                @click="emit('move', stop.id, -1)"
                class="flex h-9 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <ArrowDown class="size-4" />
                Earlier
              </button>
              <button
                v-if="moves.later"
                type="button"
                @click="emit('move', stop.id, 1)"
                class="flex h-9 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <ArrowUp class="size-4" />
                Later
              </button>
            </div>
          </form>

          <div
            class="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700"
          >
            <button
              v-if="!isNew"
              type="button"
              @click="emit('delete', stop.id)"
              class="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 class="size-4" />
              Delete
            </button>
            <button
              type="button"
              @click="emit('close')"
              class="ml-auto h-10 rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="save"
              :disabled="!canSave"
              class="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {{ isNew ? 'Add' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* The sheet fades in where it stands rather than sliding up. */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

/* The stars open out under the choice rather than appearing. */
.grow-enter-active,
.grow-leave-active {
  transition:
    opacity 0.2s ease,
    clip-path 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.grow-enter-from,
.grow-leave-to {
  opacity: 0;
  clip-path: inset(0 0 100% 0);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .grow-enter-active,
  .grow-leave-active {
    transition: none;
  }
}
</style>

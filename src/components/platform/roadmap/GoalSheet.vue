<script setup>
import { computed, ref, watch } from 'vue'
import { Trash2, Trophy, X } from '../../../icons'
import { useFocusTrap } from '../../../composables/useFocusTrap'

// Starting a roadmap, or changing its end goal: what the road leads to, and
// why it is worth the trip. Deleting the whole roadmap lives here too.

const props = defineProps({
  show: { type: Boolean, default: false },
  // The roadmap being changed, or null for a new one.
  roadmap: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save', 'delete'])

const form = ref({ title: '', why: '' })

watch(
  () => props.show,
  (open) => {
    if (open) form.value = { title: props.roadmap?.title || '', why: props.roadmap?.why || '' }
  },
  { immediate: true }
)

const isNew = computed(() => !props.roadmap)
const canSave = computed(() => form.value.title.trim().length > 0 && !props.saving)

const save = () => {
  if (canSave.value) emit('save', { title: form.value.title.trim(), why: form.value.why.trim() })
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
          aria-labelledby="goal-sheet-title"
          tabindex="-1"
          class="sheet-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-linear-to-r from-primary/10 to-transparent px-4 py-3.5 dark:border-gray-700 dark:from-primary-light/10"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="shrink-0 rounded-xl bg-primary p-2.5">
                <Trophy class="h-5 w-5 text-white" />
              </div>
              <div class="min-w-0">
                <h2 id="goal-sheet-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                  {{ isNew ? 'New roadmap' : 'End goal' }}
                </h2>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">Where the road leads, and why it is worth the trip</p>
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
              <label for="goal-title" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">The end goal</label>
              <input
                id="goal-title"
                v-model="form.title"
                maxlength="140"
                autocomplete="off"
                placeholder="A hundred churches on Ekkly"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label for="goal-why" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Why it matters</label>
              <textarea
                id="goal-why"
                v-model="form.why"
                rows="4"
                maxlength="2000"
                placeholder="What it frees churches to do once we are there"
                class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>
          </form>

          <div
            class="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700"
          >
            <button
              v-if="!isNew"
              type="button"
              @click="emit('delete')"
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
              {{ isNew ? 'Start the roadmap' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
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
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel {
    transition: none;
  }
}
</style>

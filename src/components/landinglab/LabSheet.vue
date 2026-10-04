<script setup>
import { ref } from 'vue'
import { X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'

// A bottom sheet for editing the public page from its own preview.
//
// The same shape as SortSheet, with two differences that both come from what
// it is for: the backdrop is barely there, and the panel stops a little over
// halfway up. The point of editing from the page is watching the page change,
// so the sheet must not cover it — the part being edited is scrolled to the
// top of the screen before this opens, and stays in view above it.

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, () => emit('close'))
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="show"
      class="fixed inset-0 z-100 flex items-end justify-center bg-black/15 sm:items-center sm:p-4"
      @click.self="emit('close')"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-sheet-title"
        tabindex="-1"
        class="sheet-panel flex max-h-[58dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-h-[80dvh] sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
      >
        <div
          class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700"
        >
          <h2 id="lab-sheet-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
            {{ title }}
          </h2>
          <button
            class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Done"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* As SortSheet: the backdrop fades while the panel rises from the bottom edge
   on a phone, and grows a little on a desktop, where it is a centred card. */
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

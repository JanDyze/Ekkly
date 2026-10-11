<script setup>
import { ref } from 'vue'
import { X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'

// The sheet the Inventory app asks its small questions in — who is borrowing
// this, what is wrong with it — the way a drawer is drawn everywhere in Ekkly
// (DESIGN.md, "Drawer"): a sheet up from the foot on a phone, a card in the
// middle on a computer, an icon and a title, the form, and the buttons on the
// right at the foot. Escape and the backdrop close it, and the page behind
// holds still while it is open (useFocusTrap).

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, required: true },
  icon: { type: [Object, Function], default: null },
})

const emit = defineEmits(['close'])

const close = () => emit('close')
const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, close)
</script>

<template>
  <Teleport to="body">
    <Transition name="inventory-sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-80 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        @click.self="close"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white focus:outline-none dark:bg-gray-800 sm:max-w-md sm:rounded-2xl sm:ring-1 sm:ring-gray-200 sm:dark:ring-gray-700"
        >
          <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-6">
            <span v-if="icon" class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <component :is="icon" class="size-5" />
            </span>
            <h2 class="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Close"
              @click="close"
            >
              <X class="size-5" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-gray-700 sm:px-6"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.inventory-sheet-enter-active,
.inventory-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.inventory-sheet-enter-active > div,
.inventory-sheet-leave-active > div {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.inventory-sheet-enter-from,
.inventory-sheet-leave-to {
  opacity: 0;
}
.inventory-sheet-enter-from > div,
.inventory-sheet-leave-to > div {
  transform: translateY(2rem);
}
@media (prefers-reduced-motion: reduce) {
  .inventory-sheet-enter-active > div,
  .inventory-sheet-leave-active > div {
    transition: none;
  }
}
</style>

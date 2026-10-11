<script setup>
import { Heart, Save, X } from '../../../../icons'

// The concern's form as PrayerConcernDrawer raises it on a phone: a sheet
// along the foot over the dimmed list, its heading, its fields, and Cancel
// and Save (or Update) under them.
//
// It grows into place from the foot rather than sliding up from below it, so
// none of it ever hangs outside the phone's screen, and its lower corners
// follow the screen's own rounding.

const props = defineProps({
  open: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  ready: { type: Boolean, default: true },
  saving: { type: Boolean, default: false },
})
</script>

<template>
  <Transition name="prayer-sheet">
    <div v-if="props.open" class="absolute inset-0 z-10 flex flex-col justify-end">
      <div class="absolute inset-0 rounded-[28px] bg-black/50" />
      <div class="prayer-sheet-panel relative flex flex-col rounded-b-[28px] rounded-t-2xl border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 class="flex items-center gap-2 text-base font-semibold">
            <Heart class="size-5 text-primary dark:text-primary-light" />
            {{ props.edit ? 'Edit prayer concern' : 'New prayer concern' }}
          </h3>
          <X class="size-5 text-gray-400" />
        </div>

        <div class="relative flex flex-col gap-3 p-4">
          <slot />
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-4 pb-4 pt-3 dark:border-gray-700">
          <span class="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">Cancel</span>
          <span
            :class="[
              'relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm',
              props.ready ? 'st-filled bg-primary text-white' : 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
              props.saving ? 'st-tap bg-primary-hover' : '',
            ]"
          >
            <Save class="size-4" />
            {{ props.edit ? 'Update' : 'Save' }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.prayer-sheet-enter-active {
  animation: prayer-sheet-fade 0.25s ease both;
}
.prayer-sheet-leave-active {
  animation: prayer-sheet-fade 0.2s ease reverse both;
}
.prayer-sheet-enter-active .prayer-sheet-panel {
  animation: prayer-sheet-grow 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.prayer-sheet-leave-active .prayer-sheet-panel {
  animation: prayer-sheet-grow 0.2s ease reverse both;
}
.prayer-sheet-panel {
  transform-origin: bottom center;
}

@keyframes prayer-sheet-fade {
  from {
    opacity: 0;
  }
}
@keyframes prayer-sheet-grow {
  from {
    transform: scale(0.94);
  }
}

@media (prefers-reduced-motion: reduce) {
  .prayer-sheet-enter-active,
  .prayer-sheet-leave-active,
  .prayer-sheet-enter-active .prayer-sheet-panel,
  .prayer-sheet-leave-active .prayer-sheet-panel {
    animation: none;
  }
}
</style>

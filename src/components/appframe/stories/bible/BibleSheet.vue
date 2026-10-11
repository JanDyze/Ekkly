<script setup>
import { ChevronLeft, X } from '../../../../icons'

// A sheet over the reader, the way the Bible page raises its book picker and
// its translation list: the page dimmed behind, the sheet along the foot.
//
// It grows into place from the foot rather than sliding up from below it, so
// at no moment does any of it hang outside the phone's screen. Its lower
// corners follow the screen's own rounding for the same reason.

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  back: { type: Boolean, default: false },
})
</script>

<template>
  <Transition name="bible-sheet">
    <div v-if="props.open" class="absolute inset-0 z-10 flex flex-col justify-end">
      <div class="absolute inset-0 rounded-[28px] bg-black/40" />
      <div class="bible-sheet-panel relative rounded-b-[28px] rounded-t-2xl border-t border-gray-200 bg-white pb-3 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <ChevronLeft v-if="props.back" class="-ml-1 size-5 text-gray-500 dark:text-gray-400" />
          <h2 class="min-w-0 flex-1 truncate text-sm font-bold">{{ props.title }}</h2>
          <X class="size-5 text-gray-500 dark:text-gray-400" />
        </div>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Keyframes rather than transitions: the sheet comes and goes once each, and
   an animation plays the same in every browser, including a phone's that is
   saving power. */
.bible-sheet-enter-active {
  animation: bible-sheet-fade 0.25s ease both;
}
.bible-sheet-leave-active {
  animation: bible-sheet-fade 0.2s ease reverse both;
}
.bible-sheet-enter-active .bible-sheet-panel {
  animation: bible-sheet-grow 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.bible-sheet-leave-active .bible-sheet-panel {
  animation: bible-sheet-grow 0.2s ease reverse both;
}

@keyframes bible-sheet-fade {
  from {
    opacity: 0;
  }
}
@keyframes bible-sheet-grow {
  from {
    transform: scale(0.94);
  }
}
.bible-sheet-panel {
  transform-origin: bottom center;
}

@media (prefers-reduced-motion: reduce) {
  .bible-sheet-enter-active,
  .bible-sheet-leave-active,
  .bible-sheet-enter-active .bible-sheet-panel,
  .bible-sheet-leave-active .bible-sheet-panel {
    animation: none;
  }
}
</style>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Plus, ClipboardCheck, SquaresFour, List } from "../../icons";
import { useFocusTrap } from "../../composables/useFocusTrap";

// The plus button on Attendance, built like the one on People. There is still
// nothing to add here - gatherings come from the calendar - so it carries the
// two things the page does do: take the next count that is owed, and switch
// how the list is laid out.

const props = defineProps({
  /** The oldest gathering still to record, or null: { key, count }. */
  awaiting: { type: Object, default: null },
  /** "list" or "grid" on a phone; null where there is no choice to make. */
  view: { type: String, default: null },
});

const emit = defineEmits(["record", "toggle-view"]);

const open = ref(false);

const actions = computed(() => {
  const list = [];
  // The way in to clearing the backlog, which used to be an amber banner over
  // the list. It names how many are waiting, so the number is not lost.
  if (props.awaiting) {
    list.push({
      key: "record",
      label: "Record next",
      hint: `${props.awaiting.count} still to record`,
      icon: ClipboardCheck,
      event: "record",
    });
  }
  // Named for where it takes you, with the icon of that view.
  if (props.view) {
    const toGrid = props.view === "list";
    list.push({
      key: "view",
      label: toGrid ? "Show as grid" : "Show as list",
      icon: toGrid ? SquaresFour : List,
      event: "toggle-view",
    });
  }
  return list;
});

const close = () => {
  open.value = false;
};

const toggle = () => {
  open.value = !open.value;
};

const run = (action) => {
  close();
  emit(action.event);
};

const fabRef = ref(null);

// Non-modal: the list behind stays live, so Tab is not trapped - Escape and
// focus restoration still come from here.
useFocusTrap(fabRef, open, close, { trap: false });

const handleDocumentClick = (event) => {
  if (!fabRef.value?.contains(event.target)) close();
};

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("click", handleDocumentClick);
  else document.removeEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
  <!-- Nothing to offer, no button: a floating plus that opens an empty menu
       is worse than none. -->
  <div
    v-if="actions.length"
    ref="fabRef"
    tabindex="-1"
    class="absolute bottom-4 bottom-bar! right-4 z-50 flex flex-col items-end gap-2.5 focus:outline-none"
  >
    <Transition name="fab-actions">
      <div v-if="open" role="menu" class="flex flex-col items-end gap-2.5">
        <button
          v-for="action in actions"
          :key="action.key"
          role="menuitem"
          @click="run(action)"
          class="flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-4 pr-1.5 shadow-lg ring-1 ring-gray-200/70 backdrop-blur-xl transition-transform active:scale-95 hover:bg-white dark:bg-gray-800/80 dark:ring-white/10 dark:hover:bg-gray-800"
        >
          <span class="flex flex-col items-end leading-tight">
            <span class="whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
              {{ action.label }}
            </span>
            <span
              v-if="action.hint"
              class="whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400"
            >
              {{ action.hint }}
            </span>
          </span>
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            <component :is="action.icon" class="h-5 w-5" />
          </span>
        </button>
      </div>
    </Transition>

    <button
      @click="toggle"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="open ? 'Close actions' : 'Attendance actions'"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform active:scale-95 hover:bg-primary-hover"
    >
      <Plus
        class="h-6 w-6 transition-transform duration-300 ease-in-out"
        :class="{ 'rotate-45': open }"
      />
    </button>
  </div>
</template>

<style scoped>
.fab-actions-enter-active,
.fab-actions-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fab-actions-enter-from,
.fab-actions-leave-to {
  opacity: 0;
  transform: translateY(0.5rem) scale(0.95);
  transform-origin: bottom right;
}
</style>

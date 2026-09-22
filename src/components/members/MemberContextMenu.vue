<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { Edit2, Trash2, CheckCircle } from '../../icons';
import HoldFocus from '../common/HoldFocus.vue';
import { placeMenu } from '../../utils/menuPlacement';

const props = defineProps({
  show: Boolean,
  x: Number,
  y: Number,
  member: Object,
  // The row or card that was held, from a long press only (see HoldFocus).
  anchor: { type: Object, default: null },
});

const emit = defineEmits(["close", "edit", "delete", "select"]);

const menuRef = ref(null);
// Placed once it has been drawn and can be measured; hidden until then, so
// it never shows for a frame at the raw finger position and jumps.
const position = ref(null);
watch(
  () => [props.show, props.x, props.y, props.anchor],
  async ([show]) => {
    position.value = null;
    if (!show) return;
    await nextTick();
    const menu = menuRef.value;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    position.value = placeMenu({ x: props.x, y: props.y, width, height, anchor: props.anchor });
  },
  { immediate: true }
);

// Close on click outside
const handleClickOutside = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    emit("close");
  }
};

// Close on escape
const handleKeydown = (event) => {
  if (event.key === "Escape") {
    emit("close");
  }
};

// The menu is pinned to the spot the finger or cursor was on, so once the
// list moves it is pointing at somebody else. Any scroll closes it - captured,
// because the list scrolls inside its own container and a scroll event does
// not bubble up to the document.
const handleScrollOrResize = () => {
  if (props.show) emit("close");
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
  window.addEventListener("resize", handleScrollOrResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("scroll", handleScrollOrResize, { capture: true });
  window.removeEventListener("resize", handleScrollOrResize);
});

// The things you would hold a person to do. Opening them is a tap, and
// calling or emailing is one tap further on their profile, so the menu does
// not repeat either: three actions read at a glance where ten had to be read.
const menuItems = [
  // Starts picking mode with this person already ticked — the way into
  // tagging a group without opening anyone.
  { id: "select", label: "Select", icon: CheckCircle, event: "select" },
  { id: "edit", label: "Edit", icon: Edit2, event: "edit" },
  { id: "divider1", divider: true },
  { id: "delete", label: "Delete", icon: Trash2, event: "delete", danger: true },
];

const handleAction = (item) => {
  emit(item.event, props.member);
  emit("close");
};

const isItemVisible = (item) => {
  if (item.condition) {
    return item.condition(props.member);
  }
  return true;
};

// Check if divider should show (has visible items after it)
const shouldShowDivider = (index) => {
  const nextItems = menuItems.slice(index + 1);
  const nextNonDivider = nextItems.find(item => !item.divider);
  if (!nextNonDivider) return false;
  return isItemVisible(nextNonDivider);
};
</script>

<template>
  <!-- The held row, lifted above a dimmed screen while its menu is open. -->
  <HoldFocus :show="show && !!member" :anchor="anchor" @close="emit('close')" />

  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="show && member"
        ref="menuRef"
        class="fixed z-9999 min-w-45 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
        :style="position ? { left: `${position.left}px`, top: `${position.top}px` } : { left: `${x}px`, top: `${y}px`, visibility: 'hidden' }"
      >
        <template v-for="(item, index) in menuItems" :key="item.id">
          <!-- Divider -->
          <div
            v-if="item.divider && shouldShowDivider(index)"
            class="h-px bg-gray-200 dark:bg-gray-700 my-1"
          />
          
          <!-- Menu Item -->
          <button
            v-else-if="!item.divider && isItemVisible(item)"
            @click="handleAction(item)"
            :class="[
              'w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors',
              item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarClock, Trash2 } from '../../icons'
import HoldFocus from '../common/HoldFocus.vue'
import { placeMenu } from '../../utils/menuPlacement'

// The things you would hold a gathering's row to do, on right-click or a long
// press - the same menu, placed and dismissed the same way, as People's
// (MemberContextMenu). Recording or editing the count is the row's own tap, so
// the menu does not repeat it; what is left is the pair that used to sit on
// every row as two small grey icons.
const props = defineProps({
  show: Boolean,
  x: Number,
  y: Number,
  record: Object,
  // Worked out by the row, which already knows what the gathering is, so the
  // menu cannot offer something the row would have refused.
  canMark: Boolean,
  canDelete: Boolean,
  // The row or card that was held, from a long press only (see HoldFocus).
  anchor: { type: Object, default: null },
})

const emit = defineEmits(['close', 'mark', 'delete'])

const menuRef = ref(null)
// Placed once it has been drawn and can be measured; hidden until then, so
// it never shows for a frame at the raw finger position and jumps.
const position = ref(null)
watch(
  () => [props.show, props.x, props.y, props.anchor],
  async ([show]) => {
    position.value = null
    if (!show) return
    await nextTick()
    const menu = menuRef.value
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    position.value = placeMenu({ x: props.x, y: props.y, width, height, anchor: props.anchor })
  },
  { immediate: true }
)

const handleClickOutside = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) emit('close')
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') emit('close')
}

// Pinned to where the finger or cursor was, so once the list moves it points
// at a different gathering. Any scroll closes it - captured, because the list
// scrolls inside its own container and a scroll does not bubble.
const handleScrollOrResize = () => {
  if (props.show) emit('close')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true })
  window.addEventListener('resize', handleScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('scroll', handleScrollOrResize, { capture: true })
  window.removeEventListener('resize', handleScrollOrResize)
})

// Calling a gathering off is about the plan; deleting is about the count. The
// divider keeps the one that throws work away apart from the one that does not.
const items = computed(() =>
  [
    props.canMark && { id: 'mark', label: 'Cancel, postpone or skip', icon: CalendarClock, event: 'mark' },
    props.canMark && props.canDelete && { id: 'divider', divider: true },
    props.canDelete && { id: 'delete', label: 'Delete attendance', icon: Trash2, event: 'delete', danger: true },
  ].filter(Boolean)
)

const handleAction = (item) => {
  emit(item.event, props.record)
  emit('close')
}
</script>

<template>
  <!-- The held row, lifted above a dimmed screen while its menu is open. -->
  <HoldFocus :show="show && !!record && items.length > 0" :anchor="anchor" @close="emit('close')" />

  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="show && record && items.length"
        ref="menuRef"
        role="menu"
        class="fixed z-9999 min-w-45 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        :style="position ? { left: `${position.left}px`, top: `${position.top}px` } : { left: `${x}px`, top: `${y}px`, visibility: 'hidden' }"
      >
        <template v-for="item in items" :key="item.id">
          <div v-if="item.divider" class="my-1 h-px bg-gray-200 dark:bg-gray-700" />
          <button
            v-else
            type="button"
            role="menuitem"
            @click="handleAction(item)"
            :class="[
              'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
              item.danger
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
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
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

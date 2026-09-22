<script setup>
// The floating button a page keeps its actions behind, as People does: tap to
// fan the actions out, tap one, tap anywhere to put them away. This one takes
// its actions as a prop rather than naming them itself, so a page with a
// changing set (the attendance recorder, whose actions depend on what it is
// recording) does not need a component of its own.
//
// Each action: { key, label, hint?, icon, danger? }.
import { onBeforeUnmount, ref, watch } from 'vue'
import { Plus } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'

const props = defineProps({
  actions: { type: Array, default: () => [] },
  /** What the closed button says it opens. */
  label: { type: String, default: 'Actions' },
  // Whether the phone's bottom bar is under this page. A focus page has none,
  // and making room for one leaves the button hovering in mid-air.
  aboveBottomBar: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const open = ref(false)

const close = () => {
  open.value = false
}

const toggle = () => {
  open.value = !open.value
}

const run = (action) => {
  close()
  emit('select', action.key)
}

const fabRef = ref(null)

// Non-modal: the page behind stays live, so Tab is not trapped - Escape and
// focus restoration still come from here.
useFocusTrap(fabRef, open, close, { trap: false })

const handleDocumentClick = (event) => {
  if (!fabRef.value?.contains(event.target)) close()
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('click', handleDocumentClick)
  else document.removeEventListener('click', handleDocumentClick)
})

// A page can drop an action while the menu is open (the recorder does, when a
// mode changes); an empty menu should not stay hanging there.
watch(
  () => props.actions.length,
  (count) => {
    if (!count) close()
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    v-if="actions.length"
    ref="fabRef"
    tabindex="-1"
    :class="[
      'absolute right-4 z-50 flex flex-col items-end gap-2.5 focus:outline-none',
      aboveBottomBar ? 'bottom-4 bottom-bar!' : 'bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))]',
    ]"
  >
    <Transition name="fab-actions">
      <div v-if="open" role="menu" class="flex max-h-[60dvh] flex-col items-end gap-2.5 overflow-y-auto">
        <button
          v-for="action in actions"
          :key="action.key"
          role="menuitem"
          @click="run(action)"
          class="flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-4 pr-1.5 shadow-lg ring-1 ring-gray-200/70 backdrop-blur-xl transition-transform active:scale-95 hover:bg-white dark:bg-gray-800/80 dark:ring-white/10 dark:hover:bg-gray-800"
        >
          <span class="flex flex-col items-end leading-tight">
            <span
              :class="[
                'whitespace-nowrap text-sm font-medium',
                action.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white',
              ]"
            >
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
            :class="[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              action.danger
                ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
            ]"
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
      :aria-label="open ? 'Close actions' : label"
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

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '../../icons'

// The whole of one of the desktop home's lists (HomeAttention, HomeCommunity),
// in a panel from the right over the page: the home keeps to one screen and
// shows only what fits, so the rest opens here rather than making the page,
// or a box on it, scroll. Escape, the close button or a click beside it puts
// it away; following a link in it leaves the home, and it with it.

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
})
const emit = defineEmits(['close'])

const panel = ref(null)
const onKey = (event) => {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      window.addEventListener('keydown', onKey)
      await nextTick()
      panel.value?.focus()
    } else {
      window.removeEventListener('keydown', onKey)
    }
  }
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="home-sheet">
      <div v-if="open" class="fixed inset-0 z-100 flex justify-end bg-black/40 backdrop-blur-sm" @click.self="emit('close')">
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="home-sheet-panel flex h-full w-[32rem] max-w-full flex-col bg-white shadow-xl outline-none dark:bg-gray-900"
        >
          <header class="flex shrink-0 items-center gap-2.5 border-b border-gray-100 px-5 py-4 dark:border-white/10">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
            <span v-if="count" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">{{ count }}</span>
            <button
              type="button"
              class="ml-auto flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
              aria-label="Close"
              @click="emit('close')"
            >
              <X class="size-5" />
            </button>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.home-sheet-enter-active,
.home-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.home-sheet-enter-active .home-sheet-panel,
.home-sheet-leave-active .home-sheet-panel {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.home-sheet-enter-from,
.home-sheet-leave-to {
  opacity: 0;
}
.home-sheet-enter-from .home-sheet-panel,
.home-sheet-leave-to .home-sheet-panel {
  transform: translateX(2rem);
}
</style>

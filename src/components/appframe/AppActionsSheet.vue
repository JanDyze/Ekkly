<script setup>
/**
 * Everything waiting on this person inside an app, in one list: a Sunday to
 * plan, a month left in draft, newcomers to call.
 *
 * An app's home keeps them off its face — it shows the one thing that is true
 * today and the doors — and offers this instead, behind a single button with
 * the count on it. Each line goes where the job is done; choosing one closes
 * the sheet on the way.
 *
 * Items: `{ key, icon, tone: 'action' | 'warn' | 'mine', text, hint, to }`.
 * Things that need acting on are 'warn' and wear a bell.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { BellRinging, ChevronRight, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'

const props = defineProps({
  show: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  title: { type: String, default: 'Needs you' },
})

const emit = defineEmits(['close'])

const router = useRouter()
const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, () => emit('close'))

const go = (item) => {
  emit('close')
  router.push(item.to)
}

const TONES = {
  action: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  mine: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
}
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
          aria-labelledby="actions-sheet-title"
          tabindex="-1"
          class="sheet-panel flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-linear-to-r from-primary/10 to-transparent px-4 py-3.5 dark:border-gray-700 dark:from-primary-light/10"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="shrink-0 rounded-xl bg-primary p-2.5">
                <BellRinging class="h-5 w-5 text-white" />
              </div>
              <div class="min-w-0">
                <h2 id="actions-sheet-title" class="truncate text-base font-bold text-gray-900 dark:text-white">{{ title }}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ items.length }} {{ items.length === 1 ? 'thing' : 'things' }}, soonest first
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="emit('close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <li v-for="item in items" :key="item.key">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/60"
                @click="go(item)"
              >
                <span :class="['flex size-9 shrink-0 items-center justify-center rounded-xl', TONES[item.tone] || TONES.action]">
                  <component :is="item.icon" class="size-4.5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ item.text }}</span>
                  <span v-if="item.hint" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ item.hint }}</span>
                </span>
                <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
              </button>
            </li>
          </ul>
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

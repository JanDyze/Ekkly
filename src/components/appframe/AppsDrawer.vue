<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { X } from '../../icons'
import AppArt from '../common/AppArt.vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useAppOrder, HOME_SLOTS } from '../../composables/useAppOrder'
import { useDragReorder } from '../../composables/useDragReorder'
import { prefetchRoute } from '../../router/prefetch'

// Every app, behind More apps on the home of all apps (src/views/Apps.vue) —
// the same idea as the drawer the bottom bar used to open.
//
// The first few are the ones on the home, on a shelf of their own; the rest
// sit under it. A tap opens an app. Pressing and holding picks one up, the way
// a phone's home screen does, and dragging it onto the shelf puts it on the
// home. The order is the person's own and follows their account
// (useAppOrder), so it is the same on their phone and their laptop.

const props = defineProps({
  show: { type: Boolean, default: false },
  // Every app this person may open, in the navigation's order.
  apps: { type: Array, required: true },
})

const emit = defineEmits(['close'])

const router = useRouter()
const panel = ref(null)
useFocusTrap(panel, () => props.show, () => emit('close'))

const { ordered, setOrder, resetOrder } = useAppOrder(computed(() => props.apps))

/* -------------------------------------------------------------- dragging */

// The list the grids render. It follows the saved order except mid-drag,
// when it is the thing being rearranged.
const dragList = ref([])

/**
 * A drop that touches the shelf swaps the two apps rather than shifting the
 * list. Dragging the tenth app onto the second slot with an insert would push
 * the second into third, the third into fourth, and knock the last one off
 * the home entirely — changes nobody asked for. A swap moves exactly the two
 * apps involved. Below the shelf the order is just an order, and shifting
 * neighbours is what you would expect.
 */
const swapWithinShelf = (list, from, to) => {
  const next = [...list]
  if (from >= HOME_SLOTS && to >= HOME_SLOTS) {
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

const { draggingIndex, dragItem } = useDragReorder(
  () => dragList.value,
  (next) => {
    dragList.value = next
  },
  { reorder: swapWithinShelf, holdDelay: 350 }
)

watch(
  ordered,
  (rows) => {
    if (draggingIndex.value === null) dragList.value = [...rows]
  },
  { immediate: true }
)

// Written once, on release — not on every swap under the finger. A drag that
// ends over the tile it started on would otherwise land as a click and open
// the app, so that one click is let go.
const justDragged = ref(false)
watch(draggingIndex, (now, before) => {
  if (before === null || now !== null) return
  setOrder(dragList.value)
  justDragged.value = true
  setTimeout(() => (justDragged.value = false), 0)
})

const shelf = computed(() => dragList.value.slice(0, HOME_SLOTS))
const rest = computed(() => dragList.value.slice(HOME_SLOTS))

const open = (item) => {
  if (justDragged.value) return
  emit('close')
  router.push(item.path)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="show"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apps-drawer-title"
          tabindex="-1"
          class="drawer-panel flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl sm:max-w-lg sm:rounded-3xl dark:bg-gray-900"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
            <h2 id="apps-drawer-title" class="text-lg font-bold text-gray-900 dark:text-white">All apps</h2>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                @click="resetOrder"
              >
                Reset
              </button>
              <button
                type="button"
                aria-label="Close"
                class="-mr-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
                @click="emit('close')"
              >
                <X class="size-5" />
              </button>
            </div>
          </div>

          <!-- overscroll-contain: a flick down at the top of this list would
               otherwise be handed to the browser, and Chrome on Android turns
               that into pull-to-refresh. -->
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <!-- The shelf: one block, because it is one idea — these are the
                 apps on the home. -->
            <section class="rounded-2xl bg-primary/[0.07] p-2.5 ring-1 ring-inset ring-primary/15 dark:bg-primary-light/[0.07] dark:ring-primary-light/15">
              <div class="mb-1.5 flex items-center gap-2 px-1">
                <span class="text-xs font-bold text-primary dark:text-primary-light">On your home</span>
                <span class="h-px flex-1 bg-primary/20 dark:bg-primary-light/20" />
                <span class="text-[11px] text-gray-500 dark:text-gray-400">Hold and drag to change</span>
              </div>
              <div class="grid grid-cols-4 gap-1 sm:grid-cols-5">
                <div
                  v-for="(item, index) in shelf"
                  :key="item.path"
                  v-bind="dragItem(index)"
                  :class="draggingIndex === index ? 'opacity-90' : ''"
                >
                  <button
                    type="button"
                    class="flex w-full flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 transition-colors active:bg-white/70 dark:active:bg-gray-800/70"
                    @pointerdown="prefetchRoute(router, item.path)"
                    @click="open(item)"
                  >
                    <span class="grid size-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
                      <AppArt :app-key="item.art" class="size-10" />
                    </span>
                    <span class="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-800 dark:text-gray-200">{{ item.name }}</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Everything else. -->
            <div v-if="rest.length" class="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-5">
              <div
                v-for="(item, i) in rest"
                :key="item.path"
                v-bind="dragItem(i + HOME_SLOTS)"
                :class="draggingIndex === i + HOME_SLOTS ? 'opacity-90' : ''"
              >
                <button
                  type="button"
                  class="flex w-full flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 transition-colors active:bg-gray-200/60 dark:active:bg-gray-800/70"
                  @pointerdown="prefetchRoute(router, item.path)"
                  @click="open(item)"
                >
                  <span class="grid size-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
                    <AppArt :app-key="item.art" class="size-10" />
                  </span>
                  <span class="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-leave-active .drawer-panel {
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .drawer-enter-from .drawer-panel,
  .drawer-leave-to .drawer-panel {
    transform: translateY(0.5rem) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active .drawer-panel,
  .drawer-leave-active .drawer-panel {
    transition: none;
  }
}
</style>

<script setup>
// What a long press opens a menu *about*. The rest of the screen dims and
// blurs, and the row or card that was held lifts out above it, a touch larger
// and with a shadow - the way a phone's own hold menu makes it plain which of
// forty rows the menu belongs to.
//
// The item is copied rather than raised. The real one sits in a scrolling list
// whose sections contain their own painting (content-visibility), so no
// z-index can bring it above a screen-wide backdrop. A copy placed exactly
// over it, in a layer of its own, looks the same and can go anywhere.
//
// Sits just under the context menus (z-9999), which stay on top of it.
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** The element that was held, or null for a menu opened without one. */
  anchor: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const hostRef = ref(null)
const box = ref(null)

watch(
  () => [props.show, props.anchor],
  async ([show, anchor]) => {
    if (!show || !anchor) {
      box.value = null
      return
    }
    const rect = anchor.getBoundingClientRect()
    box.value = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    await nextTick()
    const host = hostRef.value
    if (!host) return
    const copy = anchor.cloneNode(true)
    // The original was mid-squeeze from the hold; the copy starts full size
    // and does its own lift.
    copy.style.transform = 'none'
    copy.style.transition = 'none'
    copy.style.width = '100%'
    copy.style.height = '100%'
    copy.removeAttribute('id')
    // A copy for looking at, not for using: nothing in it should be focusable
    // or read out twice.
    copy.setAttribute('aria-hidden', 'true')
    copy.setAttribute('inert', '')
    host.replaceChildren(copy)
  },
  { flush: 'post' }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="hold-focus">
      <div v-if="show && box" class="fixed inset-0 z-9990" @click="emit('close')">
        <div class="absolute inset-0 bg-black/35 backdrop-blur-sm" />
        <!-- A plain ground behind the copy: a list row has none of its own,
             and would otherwise show the blur straight through it. -->
        <div
          ref="hostRef"
          class="hold-focus-lift absolute overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
          :style="{
            top: `${box.top}px`,
            left: `${box.left}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hold-focus-enter-active,
.hold-focus-leave-active {
  transition: opacity 0.18s ease;
}

.hold-focus-enter-from,
.hold-focus-leave-to {
  opacity: 0;
}

/* Lifts from exactly where the item was, so it reads as the same thing
   coming forward rather than a new card appearing. */
.hold-focus-lift {
  animation: hold-focus-lift 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes hold-focus-lift {
  from {
    scale: 1;
  }
  to {
    scale: 1.03;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hold-focus-lift {
    animation: none;
  }
}
</style>

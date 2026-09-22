<script setup>
// The explanation a field only needs once: an (i) beside the label, opened
// when somebody wants it.
//
// These used to be a grey line under every field and every list, which on a
// settings screen adds up to more explaining than settings. A phone has no
// hover, so this is a tap rather than a title attribute — though the title is
// there too, for a mouse.
import { onBeforeUnmount, ref, watch } from 'vue'
import { Info } from '../../icons'

const props = defineProps({
  text: { type: String, required: true },
  /** What the button says it explains, for a screen reader. */
  label: { type: String, default: '' },
})

const open = ref(false)
const root = ref(null)

const toggle = () => {
  open.value = !open.value
}

const handleDocumentClick = (event) => {
  if (!root.value?.contains(event.target)) open.value = false
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <span ref="root" class="relative inline-flex align-middle">
    <button
      type="button"
      @click.stop="toggle"
      :aria-expanded="open"
      :aria-label="label ? `About ${label}` : 'More about this'"
      :title="text"
      class="rounded-full p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      <Info class="h-3.5 w-3.5" />
    </button>

    <Transition name="info-hint">
      <!-- Hangs under the (i) and is allowed to be wider than it, but never
           wider than a phone. -->
      <span
        v-if="open"
        role="tooltip"
        class="absolute left-0 top-full z-50 mt-1 w-56 max-w-[min(14rem,70vw)] rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-normal leading-snug text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        {{ text }}
      </span>
    </Transition>
  </span>
</template>

<style scoped>
.info-hint-enter-active,
.info-hint-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.info-hint-enter-from,
.info-hint-leave-to {
  opacity: 0;
  transform: translateY(-0.15rem);
}
</style>

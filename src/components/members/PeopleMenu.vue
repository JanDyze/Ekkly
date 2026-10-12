<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { DotsThree } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'

// The roll's less frequent actions, behind the header's "…": picking people
// to tag or place, adding a whole list at once, exporting. Each is a few
// times a month at most, so a tap more is fair, and the screen's foot is left
// to search, which is every visit.

const props = defineProps({
  // [{ key, label, icon }]
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['pick'])

const open = ref(false)
const root = ref(null)
const close = () => {
  open.value = false
}

// Non-modal: the list behind stays live. Escape and focus coming back to the
// button still come from here.
useFocusTrap(root, open, close, { trap: false })

const onDocumentClick = (event) => {
  if (!root.value?.contains(event.target)) close()
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('click', onDocumentClick)
  else document.removeEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

const pick = (item) => {
  close()
  emit('pick', item.key)
}
</script>

<template>
  <div v-if="props.items.length" ref="root" tabindex="-1" class="relative shrink-0 focus:outline-none">
    <button
      type="button"
      class="flex size-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      aria-label="More"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <DotsThree class="size-6" />
    </button>
    <Transition name="people-menu">
      <div
        v-if="open"
        role="menu"
        class="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-2xl bg-white py-1.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <button
          v-for="item in props.items"
          :key="item.key"
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700/60"
          @click="pick(item)"
        >
          <component :is="item.icon" class="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
          {{ item.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.people-menu-enter-active,
.people-menu-leave-active {
  transition: opacity 0.15s ease;
}

.people-menu-enter-from,
.people-menu-leave-to {
  opacity: 0;
}
</style>

<script setup>
import SearchPanel from './SearchPanel.vue'

// Search everything, by meaning as well as by words. The sheet is only the
// backdrop and the coming and going; the panel inside (SearchPanel) holds the
// search, so its subscriptions start when the sheet opens and stop when it
// closes, and nothing is subscribed or indexed for someone who never searches.

defineProps({
  show: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-100 flex items-start justify-center sm:px-4 sm:pt-[10dvh]">
        <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="emit('close')" />
        <SearchPanel @close="emit('close')" />
      </div>
    </Transition>
  </Teleport>
</template>

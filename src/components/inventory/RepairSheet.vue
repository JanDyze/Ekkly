<script setup>
import { ref, watch } from 'vue'
import { Warning } from '../../icons'
import InventorySheet from './InventorySheet.vue'

// Saying something is broken, and what is wrong with it, so whoever takes it
// to be fixed knows what to tell the repair shop without testing it again.

const props = defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const note = ref('')
watch(
  () => props.show,
  (open) => {
    if (open) note.value = props.item?.repairNote || ''
  }
)
</script>

<template>
  <InventorySheet :show="show" title="Needs repair" :icon="Warning" @close="emit('close')">
    <form id="inventory-repair" class="space-y-4" @submit.prevent="emit('save', note)">
      <div>
        <label for="repair-note" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">What is wrong with it</label>
        <textarea
          id="repair-note"
          v-model="note"
          rows="3"
          placeholder="Left speaker crackles when the volume is up"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">It shows under Needs repair until someone marks it fixed.</p>
      </div>
    </form>
    <template #footer>
      <button
        type="button"
        class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="inventory-repair"
        :disabled="saving"
        class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save
      </button>
    </template>
  </InventorySheet>
</template>

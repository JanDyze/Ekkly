<script setup>
import { computed, ref } from 'vue'
import { Loader2, ShieldAlert } from '../../../icons'
import SectionCard from '../../common/SectionCard.vue'
import ConfirmationModal from '../../common/ConfirmationModal.vue'
import { callPlatform } from '../../../api/platformService'
import { useToast } from '../../../composables/useToast'

// Closing a church. Nothing is deleted: its records stay exactly where they
// are, its address shows that it is closed, and the API serves nothing from
// it until it is reopened.

const props = defineProps({ church: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const toast = useToast()

const isClosed = computed(() => props.church.status === 'closed')
const asking = ref(false)
const busy = ref(false)

const message = computed(() =>
  isClosed.value
    ? `Reopen ${props.church.name}? Everyone with access can sign in again straight away.`
    : `Close ${props.church.name}? Nobody can open its app until it is reopened. Its records are kept.`
)

const apply = async () => {
  busy.value = true
  // Read before the save: the prop changes underneath once the result is in.
  const status = isClosed.value ? 'active' : 'closed'
  try {
    emit('updated', await callPlatform('setChurchStatus', { churchId: props.church.id, status }))
    toast.success(status === 'closed' ? 'Church closed' : 'Church reopened')
  } catch (error) {
    console.error('Error changing church status:', error)
    toast.error(error.message || 'Could not change that. Please try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SectionCard
    :icon="ShieldAlert"
    :title="isClosed ? 'This church is closed' : 'Close this church'"
    :subtitle="isClosed ? 'Its records are kept. Reopening lets everyone back in.' : 'For a church that has left or stopped paying. Its records are kept.'"
  >
    <div class="flex justify-end p-4">
      <button
        type="button"
        @click="asking = true"
        :disabled="busy"
        :class="[
          'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60',
          isClosed
            ? 'bg-primary text-white hover:bg-primary-hover'
            : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
        ]"
      >
        <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
        {{ isClosed ? 'Reopen church' : 'Close church' }}
      </button>
    </div>

    <ConfirmationModal
      :show="asking"
      :title="isClosed ? 'Reopen church' : 'Close church'"
      :message="message"
      :confirm-text="isClosed ? 'Reopen' : 'Close'"
      cancel-text="Cancel"
      :confirm-button-class="isClosed ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-red-600 text-white hover:bg-red-700'"
      @update:show="asking = $event"
      @confirm="apply"
      @cancel="asking = false"
    />
  </SectionCard>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Buildings, Loader2, Save } from '../../../icons'
import SectionCard from '../../common/SectionCard.vue'
import { callPlatform } from '../../../api/platformService'
import { useToast } from '../../../composables/useToast'

// A church's name and timezone. The name is the one on its sign-in page; it is
// carried into the church's own settings too, unless the church has already
// given itself a different one there. The timezone decides when "today" is for
// its calendar, its emails and its monthly counts.

const props = defineProps({ church: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const toast = useToast()

const name = ref('')
const timezone = ref('')
watch(
  () => props.church,
  (church) => {
    name.value = church.name
    timezone.value = church.timezone
  },
  { immediate: true }
)

const zones = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
})()

const changed = computed(() => name.value.trim() !== props.church.name || timezone.value !== props.church.timezone)
const valid = computed(() => Boolean(name.value.trim()))
const saving = ref(false)

const save = async () => {
  if (!changed.value || !valid.value) return
  saving.value = true
  try {
    emit('updated', await callPlatform('updateChurch', { churchId: props.church.id, name: name.value, timezone: timezone.value }))
    toast.success('Saved')
  } catch (error) {
    console.error('Error saving church:', error)
    toast.error(error.message || 'Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <SectionCard :icon="Buildings" title="Church" subtitle="What it is called and which timezone it keeps">
    <form class="space-y-4 p-4" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="church-name" :class="label">Name <span class="text-red-500">*</span></label>
          <input id="church-name" v-model="name" type="text" maxlength="120" required :class="input" />
        </div>
        <div>
          <label for="church-timezone" :class="label">Timezone</label>
          <select v-if="zones.length" id="church-timezone" v-model="timezone" :class="input">
            <option v-for="zone in zones" :key="zone" :value="zone">{{ zone }}</option>
          </select>
          <input v-else id="church-timezone" v-model="timezone" type="text" placeholder="Asia/Manila" :class="input" />
        </div>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Created {{ church.createdAt ? new Date(church.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'before dates were kept' }}.
      </p>
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="!changed || !valid || saving"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            changed && valid
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save
        </button>
      </div>
    </form>
  </SectionCard>
</template>

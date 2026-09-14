<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Palette, Save } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import SectionCardSkeleton from '../common/SectionCardSkeleton.vue'
import ColourEditor from '../common/ColourEditor.vue'
import { useToast } from '../../composables/useToast'
import { usePlatformConsole } from '../../composables/usePlatformConsole'
import { DEFAULT_THEME, isHexColor, themeForStorage } from '../../../lib/platformDefaults.js'

// The colours every church starts with, and the front door wears. A church's
// administrators can choose their own in their Settings; a church that has not
// follows these, and follows them again the moment it resets.

const toast = useToast()
const { config, loadConfig, saveConfig } = usePlatformConsole()

const theme = ref({})
const fill = () => {
  theme.value = { ...(config.value?.theme || {}) }
}

onMounted(async () => {
  try {
    await loadConfig()
  } catch (error) {
    toast.error(error.message || 'Could not load the colours.')
  }
})
watch(() => config.value?.theme, fill, { immediate: true })

const invalid = computed(() => Object.values(theme.value).some((v) => v && !isHexColor(v)))
const changed = computed(() => JSON.stringify(themeForStorage(theme.value)) !== JSON.stringify(themeForStorage(config.value?.theme)))

const saving = ref(false)
const save = async (value) => {
  saving.value = true
  try {
    await saveConfig('saveTheme', { theme: value })
    toast.success('Colours saved')
  } catch (error) {
    console.error('Error saving colours:', error)
    toast.error(error.message || 'Could not save the colours. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SectionCardSkeleton v-if="!config" variant="form" :rows="2" />
  <SectionCard v-else :icon="Palette" title="Colours" subtitle="The accent every church starts with. Churches can choose their own.">
    <div class="space-y-4 p-4">
      <ColourEditor v-model="theme" :fallback="DEFAULT_THEME" />
      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          v-if="Object.keys(config?.theme || {}).length"
          type="button"
          @click="save({})"
          :disabled="saving"
          class="mr-auto rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Back to the original colours
        </button>
        <button
          type="button"
          @click="save(theme)"
          :disabled="!changed || invalid || saving"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            changed && !invalid ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save colours
        </button>
      </div>
    </div>
  </SectionCard>
</template>

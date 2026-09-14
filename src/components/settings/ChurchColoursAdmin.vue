<script setup>
import { computed, ref, watch } from 'vue'
import { Loader2, Palette, Save } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ColourEditor from '../common/ColourEditor.vue'
import { useAppSettings } from '../../composables/useAppSettings'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { useToast } from '../../composables/useToast'
import { isHexColor, resolveTheme, themeForStorage } from '../../../lib/platformDefaults.js'

// This church's own accent colours. Until it chooses some it wears the
// platform's, and a reset puts it back on them — including whatever the
// platform changes them to later.

const toast = useToast()
const { theme: saved, saveTheme } = useAppSettings()
const { branding, platformTheme } = usePlatformConfig()

const theme = ref({})
watch(saved, (value) => {
  theme.value = { ...(value || {}) }
}, { immediate: true })

// What an empty colour becomes: the platform's, or the original.
const fallback = computed(() => resolveTheme(platformTheme.value, {}))
const hasOwn = computed(() => Object.keys(themeForStorage(saved.value)).length > 0)

const invalid = computed(() => Object.values(theme.value).some((v) => v && !isHexColor(v)))
const changed = computed(() => JSON.stringify(themeForStorage(theme.value)) !== JSON.stringify(themeForStorage(saved.value)))

const saving = ref(false)
const save = async (value) => {
  saving.value = true
  try {
    await saveTheme(value)
    toast.success(Object.keys(themeForStorage(value)).length ? 'Colours saved' : `Back to ${branding.value.name}’s colours`)
  } catch (error) {
    console.error('Error saving colours:', error)
    toast.error('Could not save the colours. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SectionCard
    :icon="Palette"
    title="Colours"
    :subtitle="hasOwn ? 'Your church’s own accent' : `Using ${branding.name}’s colours. Choose your own if you like.`"
  >
    <div class="space-y-4 p-4">
      <ColourEditor v-model="theme" :fallback="fallback" />
      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          v-if="hasOwn"
          type="button"
          @click="save({})"
          :disabled="saving"
          class="mr-auto rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Use {{ branding.name }}’s colours
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

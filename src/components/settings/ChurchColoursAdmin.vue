<script setup>
import { computed, ref, watch } from 'vue'
import { Check, Loader2, Palette, Save } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ColourEditor from '../common/ColourEditor.vue'
import FontPicker from '../common/FontPicker.vue'
import { useAppSettings } from '../../composables/useAppSettings'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { useToast } from '../../composables/useToast'
import { brandColoursFromUrl, themeFromBrandColour } from '../../utils/logoUtils'
import { isHexColor, resolveTheme, themeForStorage } from '../../../lib/platformDefaults.js'

// This church's own accent colours and typeface. Until it chooses its own it
// wears the platform's, and a reset puts it back on them — including whatever
// the platform changes them to later.

const toast = useToast()
const { theme: saved, saveTheme, lightLogoUrl, hasCustomLogo } = useAppSettings()
const { branding, platformTheme } = usePlatformConfig()

const theme = ref({})
watch(saved, (value) => {
  theme.value = { ...(value || {}) }
}, { immediate: true })

// What an unchosen colour or face becomes: the platform's, or the original.
const fallback = computed(() => resolveTheme(platformTheme.value, {}))
const hasOwn = computed(() => Object.keys(themeForStorage(saved.value)).length > 0)

// Only the colours can be typed wrong; the face is picked from a list.
const invalid = computed(() => ['primary', 'primaryDark'].some((key) => theme.value[key] && !isHexColor(theme.value[key])))
const changed = computed(() => JSON.stringify(themeForStorage(theme.value)) !== JSON.stringify(themeForStorage(saved.value)))

// The colours the church's logo is drawn in, read off the stored artwork.
//
// The setup guide offers these the moment a logo is picked, and then never
// again — so a church that chose its colours before it had a logo, or uploaded
// one from Settings, had no way to reach them. Read here rather than handed
// over by the picker for the same reason: this card can offer them whenever it
// is opened.
//
// Only the church's own logo. The built-in mark is the platform's, and offering
// its colours as "yours" would be a lie in four shades.
const logoColours = ref([])
watch(
  [lightLogoUrl, hasCustomLogo],
  async ([url, own]) => {
    logoColours.value = own ? await brandColoursFromUrl(url) : []
  },
  { immediate: true }
)

// Compared through the same conversion the swatch applies, because what is
// stored is the adjusted pair rather than the colour straight off the artwork.
const chosenColour = computed(
  () =>
    logoColours.value.find((hex) => themeFromBrandColour(hex).primary === theme.value.primary) || ''
)

// The pair a colour needs — one that carries white text on a light page, a
// lighter one for the dark page — is worked out rather than asked for. The hex
// boxes below are still there for anyone who does want to type one.
const chooseColour = (hex) => {
  theme.value = { ...theme.value, ...themeFromBrandColour(hex) }
}

const saving = ref(false)
const save = async (value) => {
  saving.value = true
  try {
    await saveTheme(value)
    toast.success(Object.keys(themeForStorage(value)).length ? 'Saved' : `Back to ${branding.value.name}’s look`)
  } catch (error) {
    console.error('Error saving the look:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SectionCard
    head-class="section-head"
    :icon="Palette"
    title="Colours and type"
    :subtitle="hasOwn ? 'Your church’s own look' : `Using ${branding.name}’s look. Choose your own if you like.`"
  >
    <div class="space-y-6 p-4">
      <div v-if="logoColours.length">
        <h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">From your logo</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="hex in logoColours"
            :key="hex"
            type="button"
            :aria-label="`Use ${hex} from your logo`"
            :aria-pressed="chosenColour === hex"
            :class="[
              'h-10 w-10 rounded-full border transition-transform hover:scale-105',
              chosenColour === hex
                ? 'border-transparent ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-800'
                : 'border-black/10 dark:border-white/20',
            ]"
            :style="{ backgroundColor: hex }"
            @click="chooseColour(hex)"
          >
            <Check v-if="chosenColour === hex" class="mx-auto h-4 w-4 text-white drop-shadow" />
          </button>
        </div>
      </div>

      <ColourEditor v-model="theme" :fallback="fallback" />
      <div>
        <h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Typeface</h3>
        <FontPicker
          v-model="theme.font"
          v-model:family="theme.fontFamily"
          :fallback="fallback.font"
          :fallback-family="fallback.fontFamily"
        />
      </div>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          v-if="hasOwn"
          type="button"
          @click="save({})"
          :disabled="saving"
          class="mr-auto rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Use {{ branding.name }}’s look
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
          Save changes
        </button>
      </div>
    </div>
  </SectionCard>
</template>

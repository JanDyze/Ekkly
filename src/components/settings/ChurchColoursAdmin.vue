<script setup>
// This church's own accent colours and typeface, read the way its record is.
//
// Until it chooses its own it wears the platform's, and a reset puts it back on
// them — including whatever the platform changes them to later.
//
// It used to be both choices live on the card under one "Save changes", which
// meant trying a colour rearranged the page you were standing on and the only
// way back was remembering the old hex. Now the card shows what the church is
// wearing and ChurchLookSheet.vue is where it is changed, the shape
// ChurchSettings.vue and LandingPageAdmin.vue already use.
//
// The one thing still on the card is going back to the platform's look: one
// tap, nothing to type, and nothing to undo afterwards that the sheet could
// help with.
import { computed, ref, watch } from 'vue'
import { Palette, Pencil, RotateCcw } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ChurchLookSheet from './ChurchLookSheet.vue'
import { useAppSettings } from '../../composables/useAppSettings'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { useToast } from '../../composables/useToast'
import { brandColoursFromUrl } from '../../utils/logoUtils'
import { BRAND_FONTS, resolveTheme, themeForStorage } from '../../../lib/platformDefaults.js'

const toast = useToast()
const { theme: saved, saveTheme, lightLogoUrl, hasCustomLogo } = useAppSettings()
const { branding, platformTheme } = usePlatformConfig()

// What an unchosen colour or face becomes: the platform's, or the original.
const fallback = computed(() => resolveTheme(platformTheme.value, {}))
const hasOwn = computed(() => Object.keys(themeForStorage(saved.value)).length > 0)

/** The look as it is actually drawn — the church's choices over the platform's. */
const inUse = computed(() => resolveTheme(platformTheme.value, saved.value))

/** Whether each half is the church's own or inherited, so the card can say so. */
const ownColour = computed(() => !!themeForStorage(saved.value).primary)
const ownFont = computed(() => !!themeForStorage(saved.value).font)

const fontLabel = computed(() => {
  const face = inUse.value.font
  if (face === 'custom') return inUse.value.fontFamily || 'A face of your own'
  return BRAND_FONTS.find((f) => f.key === face)?.label || 'System default'
})

// The colours the church's logo is drawn in, read off the stored artwork.
//
// Read here rather than handed over by the logo picker, so the sheet can offer
// them whenever it is opened — a church that chose its colours before it had a
// logo would otherwise never be shown them.
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

/* ------------------------------------------------------------------ editing */

const sheet = ref(null)
const showEditor = ref(false)
const editorStep = ref(0)
const saving = ref(false)

const openEditor = (step = 0) => {
  editorStep.value = step
  // Seeded before it is shown, and told which step it is opening on: the prop
  // set on the line above has not reached the sheet yet.
  sheet.value?.reset(step)
  showEditor.value = true
}

const save = async (value, { close = true } = {}) => {
  saving.value = true
  try {
    await saveTheme(value)
    if (close) showEditor.value = false
    toast.success(
      Object.keys(themeForStorage(value)).length ? 'Saved' : `Back to ${branding.value.name}’s look`
    )
  } catch (error) {
    console.error('Error saving the look:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const usePlatformLook = () => save({}, { close: false })
</script>

<template>
  <SectionCard
    head-class="section-head"
    :icon="Palette"
    title="Colours and type"
    :subtitle="
      hasOwn ? 'Your church’s own look' : `Using ${branding.name}’s look. Choose your own if you like.`
    "
  >
    <template #actions>
      <button
        type="button"
        @click="openEditor(0)"
        class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
      >
        <Pencil class="h-3.5 w-3.5" />
        Edit
      </button>
    </template>

    <!-- Colour -->
    <div class="border-b border-gray-100 p-4 dark:border-gray-700">
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Colour
        </h3>
        <button
          type="button"
          @click="openEditor(0)"
          aria-label="Edit colour"
          class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
        >
          <Pencil class="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <!-- The pair, because a colour that carries white text on a light page is
           not the one that works on a dark one. -->
      <div class="flex items-center gap-3">
        <div class="flex shrink-0 items-center gap-2">
          <span
            class="h-9 w-9 rounded-full border border-black/10 dark:border-white/20"
            :style="{ backgroundColor: inUse.primary }"
            :aria-label="`Light pages: ${inUse.primary}`"
          ></span>
          <span
            class="h-9 w-9 rounded-full border border-black/10 dark:border-white/20"
            :style="{ backgroundColor: inUse.primaryDark }"
            :aria-label="`Dark pages: ${inUse.primaryDark}`"
          ></span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium tabular-nums text-gray-900 dark:text-white">
            {{ inUse.primary }} · {{ inUse.primaryDark }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ ownColour ? 'Your own' : `${branding.name}’s` }} · light and dark pages
          </p>
        </div>
      </div>
    </div>

    <!-- Typeface -->
    <div class="border-b border-gray-100 p-4 dark:border-gray-700">
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Typeface
        </h3>
        <button
          type="button"
          @click="openEditor(1)"
          aria-label="Edit typeface"
          class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
        >
          <Pencil class="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ fontLabel }}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ ownFont ? 'Your own' : `${branding.name}’s` }}
      </p>
    </div>

    <!-- One tap, nothing to type: it stays on the card rather than behind the
         editor, the way the hero photo's reset does. -->
    <div v-if="hasOwn" class="p-4">
      <button
        type="button"
        @click="usePlatformLook"
        :disabled="saving"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        Use {{ branding.name }}’s look
      </button>
    </div>

    <ChurchLookSheet
      ref="sheet"
      :show="showEditor"
      :theme="saved"
      :fallback="fallback"
      :logo-colours="logoColours"
      :start-step="editorStep"
      :busy="saving"
      @close="showEditor = false"
      @save="save"
    />
  </SectionCard>
</template>

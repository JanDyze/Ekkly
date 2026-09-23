<script setup>
import { ref } from 'vue'
import { ImagePlus, Loader2, RotateCcw } from '../../icons'
import { prepareLogo } from '../../utils/logoUtils'
import { uploadImage } from '../../api/blobService'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import InfoHint from '../common/InfoHint.vue'

const toast = useToast()
const { church, lightLogoUrl, darkLogoUrl, hasCustomLogo, saveLogo, saveLogoDark } = useAppSettings()

const lightInput = ref(null)
const darkInput = ref(null)
const busy = ref(null)

// What the last upload did, so a background that was cut away can be put back.
// The same offer the setup guide makes: the cut is right for a wordmark
// exported on white and wrong for a crest that was meant to sit on its cream
// disc, and only the person looking at it knows which this is.
const work = ref(null)

const pick = (mode) => {
  if (busy.value) return
  if (mode === 'dark') darkInput.value?.click()
  else lightInput.value?.click()
}

const handleFile = async (mode, event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  busy.value = mode
  try {
    // Compressed in the browser as before, then stored rather than kept.
    // The logo rides in appSettings/church, which every signed-in screen
    // subscribes to in full — as a data URL it was downloaded once per
    // session on every device; as a URL it is a hundred characters.
    //
    // prepareLogo, the same call the setup guide makes, so a logo uploaded
    // here and a logo uploaded there come out identical: a flat background is
    // cut away, and anything else is left exactly as it arrived. The colours it
    // reads off the artwork are not used here — the colours card offers those,
    // and it reads them back off the stored logo itself, so the offer does not
    // depend on having just uploaded one.
    const prepared = await prepareLogo(file)
    const stored = await uploadImage(prepared.dataUrl, 'branding')
    const cut = prepared.removed ? ', background removed' : ''
    if (mode === 'dark') {
      await saveLogoDark(stored)
      toast.success(`Dark-mode logo updated${cut}`)
    } else {
      await saveLogo(stored)
      toast.success(`Light-mode logo updated${cut}`)
    }
    work.value = { mode, original: prepared.original, removed: prepared.removed }
  } catch (error) {
    console.error(`Error saving the ${mode} logo:`, error)
    toast.error('Could not save that image. Try a smaller PNG or JPG.')
  } finally {
    busy.value = null
  }
}

// Puts the logo back as it arrived, background and all.
const keepBackground = async () => {
  if (!work.value?.removed) return
  const { mode, original } = work.value
  busy.value = mode
  try {
    const stored = await uploadImage(original, 'branding')
    if (mode === 'dark') await saveLogoDark(stored)
    else await saveLogo(stored)
    work.value = { ...work.value, removed: false }
  } catch (error) {
    console.error('Error restoring the logo background:', error)
    toast.error('Could not change that back. Please try again.')
  } finally {
    busy.value = null
  }
}

const revert = async (mode) => {
  busy.value = mode
  try {
    if (mode === 'dark') {
      await saveLogoDark('')
      toast.success('Dark-mode logo reset to the main logo')
    } else {
      await saveLogo('')
      toast.success('Light-mode logo reset to the built-in logo')
    }
    // Whatever the last upload did is no longer on screen to undo.
    if (work.value?.mode === mode) work.value = null
  } catch (error) {
    console.error(`Error clearing the ${mode} logo:`, error)
    toast.error('Could not reset the logo.')
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div>
    <p class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      Logo
      <InfoHint
        label="the logo"
        text="The app switches between the light and dark logos automatically when the theme changes. A PNG with a transparent background works best; it is resized and saved for you."
      />
    </p>

    <div class="grid grid-cols-2 gap-2">
      <!-- A swatch of the light theme: fixed colours, no dark: variants. -->
      <div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <img :src="lightLogoUrl" alt="" class="h-12 w-auto max-w-full object-contain" />
        <span class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Light mode</span>
        <input ref="lightInput" type="file" accept="image/*" class="hidden" @change="handleFile('light', $event)" />
        <button
          type="button"
          @click="pick('light')"
          :disabled="busy !== null"
          class="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50"
        >
          <Loader2 v-if="busy === 'light'" class="h-3.5 w-3.5 animate-spin" />
          <ImagePlus v-else class="h-3.5 w-3.5" />
          {{ hasCustomLogo ? 'Replace' : 'Upload' }}
        </button>
      </div>

      <!-- And a swatch of the dark theme, on its own fixed ground. -->
      <div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 p-3">
        <img :src="darkLogoUrl" alt="" class="h-12 w-auto max-w-full object-contain" />
        <span class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Dark mode</span>
        <input ref="darkInput" type="file" accept="image/*" class="hidden" @change="handleFile('dark', $event)" />
        <button
          type="button"
          @click="pick('dark')"
          :disabled="busy !== null"
          class="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-gray-100 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
        >
          <Loader2 v-if="busy === 'dark'" class="h-3.5 w-3.5 animate-spin" />
          <ImagePlus v-else class="h-3.5 w-3.5" />
          {{ church.logoDark ? 'Replace' : 'Upload' }}
        </button>
      </div>
    </div>

    <!-- Everything that is not "upload one", under both swatches rather than
         inside them: the undo for a background that was cut, and the way back
         to the built-in mark. -->
    <div
      v-if="work?.removed || hasCustomLogo || church.logoDark"
      class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      <button
        v-if="work?.removed"
        type="button"
        @click="keepBackground"
        :disabled="busy !== null"
        class="rounded-lg px-1 py-1 text-xs font-medium text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Keep background
      </button>

      <div class="ml-auto flex items-center gap-1">
        <button
          v-if="hasCustomLogo"
          type="button"
          @click="revert('light')"
          :disabled="busy !== null"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-red-400"
        >
          <RotateCcw class="h-3 w-3" />
          Reset light
        </button>
        <button
          v-if="church.logoDark"
          type="button"
          @click="revert('dark')"
          :disabled="busy !== null"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-red-400"
        >
          <RotateCcw class="h-3 w-3" />
          Reset dark
        </button>
      </div>
    </div>
  </div>
</template>

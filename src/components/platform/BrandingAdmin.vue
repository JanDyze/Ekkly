<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Save, SlidersHorizontal } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import SectionCardSkeleton from '../common/SectionCardSkeleton.vue'
import { useToast } from '../../composables/useToast'
import { usePlatformConsole } from '../../composables/usePlatformConsole'
import { DEFAULT_BRANDING } from '../../../lib/platformDefaults.js'
import mark from '../../assets/ekkly-mark.svg'

// The platform's name and the words on its front door — the page a
// congregation's leader lands on to ask for a church. A blank field falls back
// to the wording the app shipped with, shown as the placeholder.

const toast = useToast()
const { config, loadConfig, saveConfig } = usePlatformConsole()

const form = ref(null)
const fill = () => {
  const stored = config.value?.storedBranding || {}
  form.value = {
    name: stored.name || '',
    tagline: stored.tagline || '',
    contactEmail: stored.contactEmail || '',
    frontDoor: { headline: stored.frontDoor?.headline || '', intro: stored.frontDoor?.intro || '' },
  }
}

onMounted(async () => {
  try {
    await loadConfig()
  } catch (error) {
    toast.error(error.message || 'Could not load the branding.')
  }
})
watch(() => config.value?.storedBranding, fill, { immediate: true })

const fallbackName = import.meta.env.VITE_PLATFORM_NAME || 'Ekkly'
const preview = computed(() => ({
  name: form.value?.name.trim() || fallbackName,
  headline: form.value?.frontDoor.headline.trim() || DEFAULT_BRANDING.frontDoor.headline,
  intro: form.value?.frontDoor.intro.trim() || DEFAULT_BRANDING.frontDoor.intro,
}))

const saving = ref(false)
const save = async () => {
  saving.value = true
  try {
    await saveConfig('saveBranding', { branding: form.value })
    toast.success('Saved — the front door shows it now')
  } catch (error) {
    console.error('Error saving branding:', error)
    toast.error(error.message || 'Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="space-y-4">
    <SectionCardSkeleton v-if="!config" variant="form" :rows="4" />
    <SectionCard v-else :icon="SlidersHorizontal" title="Name & front door" subtitle="What the platform is called, and what its front door says">
      <form v-if="form" class="space-y-4 p-4" @submit.prevent="save">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="brand-name" :class="label">Platform name</label>
            <input id="brand-name" v-model="form.name" type="text" maxlength="60" :placeholder="fallbackName" :class="input" />
          </div>
          <div>
            <label for="brand-email" :class="label">Contact email</label>
            <input id="brand-email" v-model="form.contactEmail" type="email" maxlength="120" placeholder="hello@yourplatform.com" :class="input" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Shown on the front door, for questions before signing in.</p>
          </div>
        </div>
        <div>
          <label for="brand-tagline" :class="label">Tagline</label>
          <input id="brand-tagline" v-model="form.tagline" type="text" maxlength="120" :placeholder="DEFAULT_BRANDING.tagline" :class="input" />
        </div>
        <div>
          <label for="brand-headline" :class="label">Front door headline</label>
          <input id="brand-headline" v-model="form.frontDoor.headline" type="text" maxlength="120" :placeholder="DEFAULT_BRANDING.frontDoor.headline" :class="input" />
        </div>
        <div>
          <label for="brand-intro" :class="label">Front door introduction</label>
          <textarea id="brand-intro" v-model="form.frontDoor.intro" rows="3" maxlength="400" :placeholder="DEFAULT_BRANDING.frontDoor.intro" :class="[input, 'resize-none']"></textarea>
        </div>
        <div class="flex justify-end">
          <button type="submit" :disabled="saving" class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-60">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Save
          </button>
        </div>
      </form>
    </SectionCard>

    <!-- A small copy of the front door's header, so the words can be judged
         where they will be read. -->
    <div v-if="form" class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700" aria-label="Front door preview">
      <div class="bg-gradient-to-b from-primary to-primary-hover px-5 py-6">
        <p class="flex items-center gap-2">
          <span class="flex items-center justify-center rounded-lg bg-white p-1 shadow-sm">
            <img :src="mark" alt="" class="h-5 w-5" />
          </span>
          <span class="font-[Poppins,system-ui,sans-serif] text-lg font-medium tracking-tight text-white">{{ preview.name }}</span>
        </p>
        <p class="mt-4 text-xl font-black tracking-tight text-white">{{ preview.headline }}</p>
        <p class="mt-1.5 max-w-lg text-xs leading-relaxed text-white/75">{{ preview.intro }}</p>
      </div>
    </div>
  </div>
</template>

import { computed, ref } from 'vue'
import { subscribeToPlatformPublic } from '../api/platformService'
import { withBrandingDefaults } from '../../lib/platformDefaults.js'
import { mergeCatalog } from '../../lib/apps.js'

// The platform's public settings — its name, its front door's wording, its
// colours and the app prices — shared by every page, the front door and each
// church alike. Started once from main.js, before the app mounts, so the
// colours are right on the first paint that has them.

const stored = ref(null)
const loaded = ref(false)
let firstAnswer = null

/**
 * Starts the live settings, once. Resolves when the first answer arrives, so
 * main.js can hold the loading screen for the platform's colours for a moment
 * rather than show the built-in ones and change.
 */
export const initPlatformConfig = () => {
  if (firstAnswer) return firstAnswer
  firstAnswer = new Promise((resolve) => {
    subscribeToPlatformPublic((data) => {
      stored.value = data
      loaded.value = true
      resolve()
    })
  })
  return firstAnswer
}

const fallbackName = () => import.meta.env.VITE_PLATFORM_NAME || 'Ekkly'

/** Non-reactive, for code outside components (the spreadsheet exporters). */
export const getPlatformTheme = () => stored.value?.theme || {}

export function usePlatformConfig() {
  const branding = computed(() => withBrandingDefaults(stored.value?.branding, fallbackName()))
  const platformTheme = computed(() => stored.value?.theme || {})
  const catalog = computed(() => mergeCatalog(stored.value?.apps))
  return { branding, platformTheme, catalog, loaded }
}

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
let started = false

export const initPlatformConfig = () => {
  if (started) return
  started = true
  subscribeToPlatformPublic((data) => {
    stored.value = data
    loaded.value = true
  })
}

const fallbackName = () => import.meta.env.VITE_PLATFORM_NAME || 'Church App'

export function usePlatformConfig() {
  const branding = computed(() => withBrandingDefaults(stored.value?.branding, fallbackName()))
  const platformTheme = computed(() => stored.value?.theme || {})
  const catalog = computed(() => mergeCatalog(stored.value?.apps))
  return { branding, platformTheme, catalog, loaded }
}

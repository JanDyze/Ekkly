import { computed, ref } from 'vue'
import { subscribeToAppSettings, saveAppSettings, replaceAppSettingsField } from '../api/appSettingsService'
import {
  DEFAULT_CATEGORIES,
  withChurchDefaults,
  withLandingDefaults,
} from '../data/appDefaults'
import { scheduleRolesFrom } from '../data/scheduleRoles'
import bundledLogo from '../assets/ekkly-mark.svg'
import { useTheme } from './useTheme'
import { getChurchId, getChurchName } from '../api/church'
import { themeForStorage } from '../../lib/platformDefaults.js'

// Module-level with an explicit init, like usePermissions: the church name is
// needed by plain utility modules (the spreadsheet exporters) that have no
// component lifecycle to subscribe from.
const stored = ref(null)
let started = false

// Started by useChurchAccess once the account is known to belong to the church,
// never on a page serving no church at all.
export const initAppSettings = () => {
  if (started || !getChurchId()) return
  started = true
  subscribeToAppSettings((data) => {
    stored.value = data
  })
}

// The merges themselves live with the defaults, because the public page reads
// the same settings through the server rather than through Firestore and has
// to arrive at exactly the same object.
//
// Until the settings arrive — or for somebody not yet allowed to read them —
// the name comes from the church's public profile rather than the defaults,
// which only say "Church".
const publicIdentity = () => {
  const name = getChurchName()
  return name ? { shortName: name, fullName: name, branch: '' } : undefined
}
const churchOf = (data) => withChurchDefaults(data?.church ?? publicIdentity())
const categoriesOf = (data) => ({ ...DEFAULT_CATEGORIES, ...(data?.categories || {}) })
const landingOf = (data) => withLandingDefaults(data?.landing)

/**
 * Non-reactive read for modules outside the component tree — the xlsx
 * exporters build a workbook once, at the moment the button is pressed.
 */
export const getChurchIdentity = () => churchOf(stored.value)

/** The church's own accent colours, non-reactively; empty when it chose none. */
export const getChurchTheme = () => stored.value?.theme || {}

/** The uploaded logo, or the bundled one while none has been set. Everything
 *  that draws the mark reads this, so one upload changes them all at once. */
export const getChurchLogo = () => {
  const info = churchOf(stored.value)
  const lightLogo = info.logo || bundledLogo
  const darkLogo = info.logoDark || lightLogo
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  return isDark ? darkLogo : lightLogo
}

/**
 * Non-reactive read for the router guard, which decides whether "/" shows the
 * public page before any component exists. While the document is still loading
 * this reports the default (shown) — see the watch in Landing.vue, which sends
 * visitors on once a "hidden" setting actually arrives.
 */
export const getLandingEnabled = () => landingOf(stored.value).enabled !== false

export function useAppSettings() {
  const { isDark } = useTheme()
  const church = computed(() => churchOf(stored.value))
  const lightLogoUrl = computed(() => church.value.logo || bundledLogo)
  const darkLogoUrl = computed(() => church.value.logoDark || lightLogoUrl.value)
  const logoUrl = computed(() => (isDark.value ? darkLogoUrl.value : lightLogoUrl.value))
  const hasCustomLogo = computed(() => Boolean(church.value.logo || church.value.logoDark))
  const categories = computed(() => categoriesOf(stored.value))
  const landing = computed(() => landingOf(stored.value))
  // The jobs a Sunday is staffed with. Here with the other lists a different
  // congregation would name differently, and read by the MCP connector from
  // the same document through the same defaults.
  const scheduleRoles = computed(() => scheduleRolesFrom(stored.value?.scheduleRoles))
  // The church's own accent colours, if it chose any. Empty means the
  // platform's; useBrandTheme does the falling back.
  const theme = computed(() => stored.value?.theme || {})

  // True once the document exists; until then the views run on defaults.
  const isConfigured = computed(() => stored.value !== null)

  const saveChurch = (church) => saveAppSettings({ church })
  const saveCategories = (categories) => saveAppSettings({ categories })
  // Nested maps merge, so writing the logo alone cannot drop the names.
  const saveLogo = (logo) => saveAppSettings({ church: { logo } })
  const saveLogoDark = (logoDark) => saveAppSettings({ church: { logoDark } })
  // setDoc's merge does not replace arrays element-wise, so the whole landing
  // block is written at once and the services list stays exactly as edited.
  const saveLanding = (landing) => saveAppSettings({ landing })
  // The whole list every time, for the same reason: its order is the order a
  // service is shown in, and a merge cannot express a reorder.
  const saveScheduleRoles = (roles) => saveAppSettings({ scheduleRoles: roles })
  // Written whole, so clearing a colour really clears it: a merge would keep
  // the old value underneath and the reset would do nothing.
  const saveTheme = (value) => replaceAppSettingsField('theme', themeForStorage(value))

  return {
    church,
    logoUrl,
    lightLogoUrl,
    darkLogoUrl,
    hasCustomLogo,
    categories,
    landing,
    scheduleRoles,
    theme,
    isConfigured,
    saveChurch,
    saveCategories,
    saveLogo,
    saveLogoDark,
    saveLanding,
    saveScheduleRoles,
    saveTheme,
  }
}

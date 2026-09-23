import { computed, ref } from 'vue'
import { subscribeToAppSettings, saveAppSettings, replaceAppSettingsField } from '../api/appSettingsService'
import {
  DEFAULT_CATEGORIES,
  MOVED_FROM_LANDING,
  withChurchDefaults,
  withLandingDefaults,
} from '../data/appDefaults'
import { scheduleRolesFrom } from '../data/scheduleRoles'
import { setEventTypeHues } from '../utils/eventColors'
import bundledLogo from '../assets/ekkly-mark.svg'
import { useTheme } from './useTheme'
import { getChurchId, getChurchName } from '../api/church'
import { themeForStorage } from '../../lib/platformDefaults.js'

// Module-level with an explicit init, like usePermissions: the church name is
// needed by plain utility modules (the spreadsheet exporters) that have no
// component lifecycle to subscribe from.
const stored = ref(null)
let started = false

// Resolved by the first snapshot, the same way initPermissions and
// initChurchApps report. The router guard has to know whether this church has
// been through the setup guide before it resolves a route, and a listener that
// has not answered yet would read as "already set up" and let an administrator
// past the one screen they were meant to land on.
let resolveReady
const ready = new Promise((resolve) => {
  resolveReady = resolve
})

// Started by useChurchAccess once the account is known to belong to the church,
// never on a page serving no church at all.
export const initAppSettings = () => {
  if (started || !getChurchId()) {
    // Nothing will ever arrive on a page serving no church, so anything
    // waiting on the first answer would wait for good.
    if (!getChurchId()) resolveReady()
    return ready
  }
  started = true
  subscribeToAppSettings((data) => {
    stored.value = data
    // The calendar's colours live in a module of their own, because a hundred
    // templates ask for them and none of them should have to hold a composable
    // to do it. Handed over here, as they arrive.
    setEventTypeHues(data?.eventColours)
    resolveReady()
  })
  return ready
}

/** Resolves once the settings document has reported for the first time. */
export const appSettingsReady = () => ready

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
// The landing block goes in as well: the church's mission, address and the
// rest were stored there until v0.29.4, and withChurchDefaults reads the old
// copy while the new one is empty.
const churchOf = (data) => withChurchDefaults(data?.church ?? publicIdentity(), data?.landing)
const categoriesOf = (data) => ({ ...DEFAULT_CATEGORIES, ...(data?.categories || {}) })
const landingOf = (data) => withLandingDefaults(data?.landing)

/**
 * Non-reactive read for modules outside the component tree — the xlsx
 * exporters build a workbook once, at the moment the button is pressed.
 */
export const getChurchIdentity = () => churchOf(stored.value)

/** The church's own accent colours, non-reactively; empty when it chose none. */
export const getChurchTheme = () => stored.value?.theme || {}

/**
 * Whether this church still owes us the setup guide.
 *
 * `setup.done === false` is written by /api/platform when the church is made,
 * and the guide turns it true — whether the administrator filled every step in
 * or skipped the lot. A document with no `setup` field at all is a church from
 * before the guide existed, and those are left alone: being sold the app in
 * March is not a reason to be marched through a wizard in September.
 */
const setupOf = (data) => data?.setup || {}

/** Non-reactive, for the router guard, which runs before any component. */
export const isSetupPending = () => setupOf(stored.value).done === false

/** The uploaded logo, or the bundled one while none has been set. Everything
 *  that draws the mark reads this, so one upload changes them all at once. */
export const getChurchLogo = () => {
  const info = churchOf(stored.value)
  const lightLogo = info.logo || bundledLogo
  const darkLogo = info.logoDark || lightLogo
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  return isDark ? darkLogo : lightLogo
}

export function useAppSettings() {
  const { isDark } = useTheme()
  const church = computed(() => churchOf(stored.value))
  const lightLogoUrl = computed(() => church.value.logo || bundledLogo)
  const darkLogoUrl = computed(() => church.value.logoDark || lightLogoUrl.value)
  const logoUrl = computed(() => (isDark.value ? darkLogoUrl.value : lightLogoUrl.value))
  const hasCustomLogo = computed(() => Boolean(church.value.logo || church.value.logoDark))
  const categories = computed(() => categoriesOf(stored.value))
  // Which hue each event type wears, as { [type]: hue }. Empty means every type
  // is still on the colour it was built with.
  const eventColours = computed(() => stored.value?.eventColours || {})
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

  // Whether the setup guide is still owed, reactively — the Landing page
  // watches this to move an administrator on once the answer lands.
  const setupPending = computed(() => setupOf(stored.value).done === false)

  const saveChurch = (church) => saveAppSettings({ church })

  /**
   * The church as a record — its names, what it believes, where it is.
   *
   * Writes the fields that used to live in the landing block, and blanks the
   * copy there in the same write. Without that, clearing a mission on purpose
   * would simply uncover the old one again, because the fallback in
   * withChurchDefaults cannot tell "never written" from "deliberately empty".
   */
  const saveChurchIdentity = (fields) => {
    const legacy = Object.fromEntries(
      Object.keys(fields)
        .filter((key) => MOVED_FROM_LANDING.includes(key))
        .map((key) => [key, ''])
    )
    return saveAppSettings(
      Object.keys(legacy).length ? { church: fields, landing: legacy } : { church: fields }
    )
  }
  const saveCategories = (categories) => saveAppSettings({ categories })
  // Written whole, like the lists: a type that has gone back to its built-in
  // colour is a key removed, and a merge cannot say that.
  const saveEventColours = (map) => replaceAppSettingsField('eventColours', map)
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

  // The guide is over. Written whether every step was filled in or every one
  // was skipped: it records that the administrator has been shown the screen,
  // not that the church is finished. Settings links straight to /setup for
  // anyone who wants to walk it again, so there is nothing to un-write.
  const finishSetup = () => replaceAppSettingsField('setup', { done: true, at: new Date().toISOString() })

  return {
    church,
    logoUrl,
    lightLogoUrl,
    darkLogoUrl,
    hasCustomLogo,
    categories,
    eventColours,
    landing,
    scheduleRoles,
    theme,
    isConfigured,
    setupPending,
    saveChurch,
    saveChurchIdentity,
    saveCategories,
    saveEventColours,
    saveLogo,
    saveLogoDark,
    saveLanding,
    saveScheduleRoles,
    saveTheme,
    finishSetup,
  }
}

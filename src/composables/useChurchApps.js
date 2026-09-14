import { computed, ref } from 'vue'
import { subscribeToChurchApps } from '../api/subscriptionService'
import { APP_KEYS, appOfCapability, enabledAppsFrom } from '../../lib/apps.js'
import { getChurchId } from '../api/church'

// Which apps this church has switched on.
//
// Module-level with an explicit init, like initPermissions: usePermissions().can
// consults it, and so does the router guard, before any component exists.
// Started by useChurchAccess once the account is known to belong to the church.
//
// No document means every app — a church from before apps were sold must not
// lose its pages — and so does a read that failed.

const enabled = ref(null) // Set of keys, or null for every app
let started = false
let resolveReady
const ready = new Promise((resolve) => {
  resolveReady = resolve
})

export const initChurchApps = () => {
  if (started) return ready
  if (!getChurchId()) {
    resolveReady()
    return ready
  }
  started = true
  subscribeToChurchApps((data) => {
    enabled.value = enabledAppsFrom(data)
    resolveReady()
  })
  return ready
}

/** Resolves once the first answer is in. The router guard waits on it. */
export const churchAppsReady = () => ready

/** Reactive when read inside a computed or a template. */
export const isAppEnabled = (key) => {
  if (!key) return true
  const set = enabled.value
  return set ? set.has(key) : true
}

/** False when the capability belongs to an app this church has switched off. */
export const capabilityAppEnabled = (capability) => isAppEnabled(appOfCapability(capability))

export function useChurchApps() {
  const enabledApps = computed(() => (enabled.value ? [...enabled.value] : [...APP_KEYS]))
  return { enabledApps, isAppEnabled, ready }
}

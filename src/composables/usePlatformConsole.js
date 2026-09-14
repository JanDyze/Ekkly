import { ref } from 'vue'
import { callPlatform } from '../api/platformService'

// What the platform console has loaded, shared between its sections.
//
// Module-level so moving from Churches to Apps & prices and back does not
// fetch the same list twice, and so a price saved in one section is the price
// the church page shows in another. Everything comes from /api/platform rather
// than straight from Firestore: the console is the platform acting on churches
// from outside them, which the rules deliberately do not let a browser do.

const config = ref(null)
const churches = ref([])
const usage = ref({})
const churchesLoaded = ref(false)
const loadingChurches = ref(false)

export function usePlatformConsole() {
  const loadConfig = async ({ force = false } = {}) => {
    if (config.value && !force) return config.value
    config.value = await callPlatform('config')
    return config.value
  }

  // Each save returns the whole config again, so every section sees the result.
  const saveConfig = async (action, body) => {
    config.value = await callPlatform(action, body)
    return config.value
  }

  const loadChurches = async ({ force = false } = {}) => {
    if (churchesLoaded.value && !force) return churches.value
    loadingChurches.value = true
    try {
      churches.value = await callPlatform('listChurches')
      churchesLoaded.value = true
    } finally {
      loadingChurches.value = false
    }
    // Counting is slower than listing, so it follows on without holding the
    // list back.
    callPlatform('usage')
      .then((result) => {
        usage.value = result
      })
      .catch((error) => console.error('Error loading usage:', error))
    return churches.value
  }

  /** After a church page changes something, the list reflects it without a refetch. */
  const updateChurchInList = (church) => {
    if (!church?.id) return
    const index = churches.value.findIndex((c) => c.id === church.id)
    const { payments, catalog, usage: churchUsage, domainDetails, ...summary } = church
    if (index >= 0) churches.value.splice(index, 1, { ...churches.value[index], ...summary })
    if (churchUsage) usage.value = { ...usage.value, [church.id]: churchUsage }
  }

  return {
    config,
    churches,
    usage,
    loadingChurches,
    loadConfig,
    saveConfig,
    loadChurches,
    updateChurchInList,
  }
}

/** "3 days ago", "just now" — for last-active and log times, from an ISO string. */
export const agoFrom = (isoString) => {
  if (!isoString) return 'never'
  const seconds = Math.round((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`
  return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

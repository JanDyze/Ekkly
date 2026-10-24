import { ref, onMounted, onUnmounted } from 'vue'
import { usePermissions } from './usePermissions'
import { subscribeToPrayerConcerns, addPrayerConcern, updatePrayerConcern, deletePrayerConcern } from '../api/prayerConcernsService'

// Shared across callers, like useTasks and useMembers: the Prayer app's home,
// each of its lists and the home of all apps' line ("3 open") all want the
// same concerns, and there is no reason for each to open its own listener.
const prayerConcerns = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0
let releaseTimer = null

// How long the listener outlives its last user. Going from the app's home
// into a list unmounts the one before mounting the other, and without a grace
// period every step would close the listener and open it again.
const GRACE_MS = 30_000

const retain = () => {
  subscribers += 1
  clearTimeout(releaseTimer)
  releaseTimer = null
  if (unsubscribe) return
  // Read only by those who may see prayer concerns (firestore.rules); anyone
  // else's listener would only be refused.
  if (!usePermissions().can('prayer.view')) {
    loading.value = false
    return
  }
  // Only the first load shows placeholders. A reconnect after the grace
  // period keeps showing what it already has until the fresh list lands.
  if (!prayerConcerns.value.length) loading.value = true
  unsubscribe = subscribeToPrayerConcerns((data) => {
    prayerConcerns.value = data
    loading.value = false
  })
}

const release = () => {
  subscribers = Math.max(0, subscribers - 1)
  if (subscribers > 0 || !unsubscribe) return
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => {
    releaseTimer = null
    if (subscribers > 0 || !unsubscribe) return
    unsubscribe()
    unsubscribe = null
  }, GRACE_MS)
}

export function usePrayerConcerns() {
  onMounted(retain)
  onUnmounted(release)

  const addPrayerConcernToFirestore = async (concernData) => {
    return await addPrayerConcern(concernData)
  }

  const updatePrayerConcernInFirestore = async (concern, updatedData) => {
    return await updatePrayerConcern(concern, updatedData)
  }

  const removePrayerConcern = async (concern) => {
    return await deletePrayerConcern(concern)
  }

  return {
    prayerConcerns,
    loading,
    addPrayerConcernToFirestore,
    updatePrayerConcernInFirestore,
    removePrayerConcern
  }
}

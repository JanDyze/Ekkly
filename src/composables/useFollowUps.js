import { onMounted, onUnmounted, ref } from 'vue'
import { usePermissions } from './usePermissions'
import { useAuth } from './useAuth'
import { FOLLOW_UP_STEPS, blankFollowUp, saveFollowUp, subscribeToFollowUps } from '../api/followUpsService'

// Shared across callers, like useTasks: the Welcome section and anything that
// shows where a newcomer stands read the same notes.
const followUps = ref({})
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useFollowUps() {
  const { user } = useAuth()

  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    // Read only by those who may see follow-up notes (firestore.rules); anyone
    // else's listener would only be refused.
    if (!usePermissions().can('consolidation.view')) {
      loading.value = false
      return
    }
    unsubscribe = subscribeToFollowUps((data) => {
      followUps.value = data
      loading.value = false
    })
  })

  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0 && unsubscribe) {
      unsubscribe()
      unsubscribe = null
      subscribers = 0
    }
  })

  const followUpOf = (memberId) => followUps.value[String(memberId)] || blankFollowUp(String(memberId))

  return {
    followUps,
    loading,
    steps: FOLLOW_UP_STEPS,
    followUpOf,
    save: (memberId, followUp) => saveFollowUp(memberId, followUp, user.value),
  }
}

import { onMounted, onUnmounted, ref } from 'vue'
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

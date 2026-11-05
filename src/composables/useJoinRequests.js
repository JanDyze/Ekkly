import { onMounted, onUnmounted, ref } from 'vue'
import { usePermissions } from './usePermissions'
import { subscribeToJoinRequests } from '../api/churchService'

// People who signed in and asked to be let into the church, pending, for its
// administrators: the home's Needs attention counts them (useToday). One
// shared, ref-counted listener, started only for an administrator, since the
// rules refuse everyone else and the read would only be wasted.

const joinRequests = ref([])
let unsubscribe = null
let subscribers = 0

export function useJoinRequests() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe || !usePermissions().isAdmin.value) return
    unsubscribe = subscribeToJoinRequests((list) => {
      joinRequests.value = list
    })
  })

  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0 && unsubscribe) {
      unsubscribe()
      unsubscribe = null
      subscribers = 0
      joinRequests.value = []
    }
  })

  return { joinRequests }
}

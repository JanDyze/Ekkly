import { onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from './useAuth'
import { blankSermon, deleteSermon, saveSermon, subscribeToSermons } from '../api/sermonsService'

// Shared across callers, like useTasks: the Preaching section, a Sunday's
// screen and the presenter all read the same messages.
const sermons = ref({})
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useSermons() {
  const { user } = useAuth()

  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToSermons((data) => {
      sermons.value = data
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

  /** The message for a date, or null when nobody has written one. */
  const sermonOn = (date) => sermons.value[date] || null

  return {
    sermons,
    loading,
    sermonOn,
    blankSermon,
    save: (date, sermon) => saveSermon(date, sermon, user.value),
    remove: deleteSermon,
  }
}

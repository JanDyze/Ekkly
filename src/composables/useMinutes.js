import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeToMinutes, addMinute, updateMinute, deleteMinute } from '../api/minutesService'

// Shared across callers, like useTasks: the Minutes app's home and its
// sections, search and the attendance recorder all want the same list, and
// there is no reason for each to open its own Firestore listener.
const minutes = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useMinutes() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToMinutes((data) => {
      minutes.value = data
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

  const addMinuteToFirestore = async (minuteData) => {
    return await addMinute(minuteData)
  }

  const updateMinuteInFirestore = async (minute, updatedData) => {
    return await updateMinute(minute, updatedData)
  }

  const removeMinute = async (minute) => {
    return await deleteMinute(minute)
  }

  return {
    minutes,
    loading,
    addMinuteToFirestore,
    updateMinuteInFirestore,
    removeMinute
  }
}

import { onMounted, onUnmounted, ref } from 'vue'
import {
  blankMonth,
  defaultSettings,
  resetMonthVideo,
  saveMonthVideo,
  saveVideoSettings,
  subscribeToAnnouncementVideos,
} from '../api/announcementVideosService'

// Shared across callers, like useTasks: the Videos home, the studio and the
// look-and-sound screen all read the same settings, and moving between them
// should not reopen the listener each time.
const settings = ref(defaultSettings())
const months = ref({})
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useAnnouncementVideos() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToAnnouncementVideos((data) => {
      settings.value = data.settings
      months.value = data.months
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

  const monthOf = (key) => months.value[key] || blankMonth(key)

  return {
    settings,
    months,
    loading,
    monthOf,
    saveSettings: saveVideoSettings,
    saveMonth: saveMonthVideo,
    resetMonth: resetMonthVideo,
  }
}

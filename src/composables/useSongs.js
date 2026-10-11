import { onMounted, onUnmounted, ref } from 'vue'
import { subscribeToSongs, addSong, updateSong, deleteSong } from '../api/songsService'

// The song list, shared across callers the way useTasks is: the Songs app's
// home, its sections and a song's own page all want the same list, and moving
// between them should not close one Firestore listener only to open another.
const songs = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useSongs() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToSongs((data) => {
      songs.value = data
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

  return {
    songs,
    loading,
    addSong,
    updateSong,
    removeSong: deleteSong,
  }
}

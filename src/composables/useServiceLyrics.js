import { onMounted, onUnmounted, ref } from 'vue'
import { subscribeToSongs } from '../api/songsService'
import { useToast } from './useToast'
import { copyText } from '../utils/clipboard'
import { formatServiceDate } from '../utils/lineupUtils'
import { formatLyricsSheet, songLyricsText } from '../utils/songUtils'

// The song list, and the one thing a service does with it outside the editor:
// hand the tech team every song's words in order.
//
// The words live on the song, so a service sheet is assembled on the fly from
// whatever the schedule currently points at — rename or re-key a song and the
// next copy is already right. The schedule's own key wins over the song's,
// because that is the key this Sunday is actually sung in.

export function useServiceLyrics() {
  const toast = useToast()

  // Read straight from the song list, so a schedule always offers what the
  // church currently sings.
  const songs = ref([])
  let unsubscribe = null
  onMounted(() => {
    unsubscribe = subscribeToSongs((data) => {
      songs.value = data
    })
  })
  onUnmounted(() => unsubscribe?.())

  // The date whose words were just copied, for the button to say so.
  const copiedDate = ref(null)

  const copyLyrics = async (sunday) => {
    const entries = (sunday?.songs || []).map((item) => {
      const song = songs.value.find((s) => s.id === item.songId)
      return {
        title: item.title || song?.title || 'Untitled',
        key: item.key || '',
        lyrics: song?.lyrics || '',
      }
    })
    if (!entries.length) {
      toast.warning('No songs picked for this service yet.')
      return
    }
    const heading = [formatServiceDate(sunday.date), sunday.theme].filter(Boolean).join(' — ')
    if (!(await copyText(formatLyricsSheet(entries, heading)))) {
      toast.error('Could not copy the lyrics.')
      return
    }
    copiedDate.value = sunday.date
    setTimeout(() => {
      if (copiedDate.value === sunday.date) copiedDate.value = null
    }, 2000)
    const missing = entries.filter((entry) => !songLyricsText(entry)).length
    if (missing) {
      toast.warning(`Lyrics copied — ${missing} song${missing > 1 ? 's have' : ' has'} none saved yet.`)
    } else {
      toast.success(`Lyrics copied — ${entries.length} song${entries.length > 1 ? 's' : ''}`)
    }
  }

  return { songs, copiedDate, copyLyrics }
}

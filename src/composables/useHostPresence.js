import { computed, onUnmounted, watch } from 'vue'
import { useAuth } from './useAuth'
import { usePlatformConfig } from './usePlatformConfig'
import { sendPresenceBeat } from '../api/platformService'

// Tells the front door's chat bubble that its host is around.
//
// While the person named as the chat's host (console → Name & front door) has
// any Ekkly page open and visible — the front door, the console, a church — it
// sends a beat a minute. The bubble says "online" for a couple of minutes after
// the last one, so closing the laptop turns it to "away" on its own.
//
// Started once, from App.vue. Everyone else's tab sends nothing: whether this
// is the host is decided here from the public settings, and checked again on
// the server.

const BEAT_MS = 60 * 1000

export function useHostPresence() {
  const { user } = useAuth()
  const { branding } = usePlatformConfig()

  const isHost = computed(() => {
    const chat = branding.value.chat
    const email = String(user.value?.email || '').toLowerCase()
    return Boolean(chat.enabled && email && email === chat.hostEmail)
  })

  let timer = 0

  const beat = () => {
    if (document.visibilityState === 'visible') sendPresenceBeat()
  }

  // Coming back to the tab counts straight away, rather than up to a minute on.
  const onVisibility = () => beat()

  const stop = () => {
    clearInterval(timer)
    timer = 0
    document.removeEventListener('visibilitychange', onVisibility)
  }

  watch(
    isHost,
    (host) => {
      stop()
      if (!host) return
      beat()
      timer = setInterval(beat, BEAT_MS)
      document.addEventListener('visibilitychange', onVisibility)
    },
    { immediate: true }
  )

  onUnmounted(stop)
}

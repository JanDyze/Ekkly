import { computed, ref, watch } from 'vue'
import { initAuth, useAuth } from './useAuth'
import { subscribeToMyChurchRequests } from '../api/platformService'
import { churchOrigin } from '../../lib/churchId.js'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'

// The churches this account has asked for, live, for whichever front door page
// wants to know. Get started lists them; the home page says where the newest
// one stands rather than selling the app to someone who has already asked.
//
// One listener however many pages ask, started as soon as somebody is signed
// in and dropped when they sign out.

const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''

const requests = ref([])
const ready = ref(false)
let unsubscribe = null
let started = false

const start = () => {
  if (started) return
  started = true
  const { user } = useAuth()
  initAuth().then(() => {
    watch(
      () => user.value?.uid,
      (uid) => {
        unsubscribe?.()
        unsubscribe = null
        requests.value = []
        ready.value = !uid
        if (!uid) return
        unsubscribe = subscribeToMyChurchRequests(uid, (list) => {
          requests.value = list
          ready.value = true
        })
      },
      { immediate: true }
    )
  })
}

/**
 * Where an approved church opens. On localhost there is no domain to give it a
 * subdomain under, so it opens on this same address instead (devChurchOverride).
 */
export const churchLink = (request) =>
  rootDomain
    ? churchOrigin(request.churchId, { rootDomain })
    : canSwitchChurchHere() && request.churchId
      ? devChurchLink(request.churchId)
      : ''

export const churchLinkLabel = (request) => churchLink(request).replace(/^https:\/\//, '').replace(/^\/\?church=/, 'localhost ▸ ')

export function useChurchRequests() {
  start()

  // The newest, which is the one a visitor is waiting on.
  const latest = computed(() => requests.value[0] || null)

  return {
    requests: computed(() => requests.value),
    ready: computed(() => ready.value),
    latest,
    hasPending: computed(() => requests.value.some((request) => request.status === 'pending')),
    approved: computed(() => requests.value.find((request) => request.status === 'approved') || null),
  }
}

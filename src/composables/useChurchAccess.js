import { computed, ref } from 'vue'
import {
  getChurchProfile,
  requestToJoin,
  subscribeToMyAccess,
  subscribeToMyJoinRequest,
} from '../api/churchService'
import { recordSignIn } from '../api/userAccountsService'
import { setChurchName } from '../api/church'
import { initAppSettings } from './useAppSettings'
import { initAppOrder } from './useAppOrder'
import { initChurchApps } from './useChurchApps'

// Whether the signed-in account may open this church, answered live.
//
// Module-level with an explicit init, like initAuth and initPermissions: the
// router guard has to know before a route resolves. Both documents it watches
// are the account's own, so the answer changes on screen the moment an
// administrator approves — the join page turns into the app without anybody
// refreshing — and a removal takes effect just as fast.
//
//   granted    access document exists
//   pending    asked, not answered yet
//   declined   asked, and an administrator said no
//   none       has not asked
//   signed-out nobody to ask about

const profile = ref(null)
const status = ref('signed-out')
const joinRequest = ref(null)

let watchingUid = null
let firstAnswer = Promise.resolve('signed-out')
let unsubscribers = []
const grantedFor = new Set()

/** Loaded once at startup: whether this church exists, what it is called, whether it is open. */
export const loadChurchProfile = async () => {
  profile.value = await getChurchProfile()
  setChurchName(profile.value?.name)
  return profile.value
}

export const isChurchOpen = () => Boolean(profile.value?.exists) && profile.value?.status === 'active'

const stop = () => {
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  unsubscribers = []
}

/**
 * Everything that reads the church's records for the whole session starts
 * here, once access is known — not at page load, where the rules would refuse
 * it and the listener would die before the approval arrived.
 */
const onGranted = (user) => {
  if (grantedFor.has(user.uid)) return
  grantedFor.add(user.uid)
  initAppSettings()
  initAppOrder()
  initChurchApps()
  // Deliberately not awaited: a slow write must never hold up the app.
  recordSignIn(user).catch((error) => console.error('Error recording sign-in:', error))
}

/**
 * Starts watching the account's access to this church, and resolves with the
 * first answer. Safe to call on every navigation: the same account is only
 * ever watched once.
 */
export const initChurchAccess = (user) => {
  const uid = user?.uid || null
  if (uid === watchingUid) return firstAnswer

  stop()
  watchingUid = uid
  joinRequest.value = null

  if (!uid) {
    status.value = 'signed-out'
    firstAnswer = Promise.resolve('signed-out')
    return firstAnswer
  }

  status.value = 'checking'
  firstAnswer = new Promise((resolve) => {
    let hasAccess = null
    let requestLoaded = false

    const settle = () => {
      // Access alone is enough to answer yes; a no waits for the request too,
      // so the join page does not flash "ask to join" at somebody who has.
      if (hasAccess === null || (!hasAccess && !requestLoaded)) return
      const request = joinRequest.value
      const next = hasAccess
        ? 'granted'
        : request?.status === 'pending'
          ? 'pending'
          : request?.status === 'declined'
            ? 'declined'
            : 'none'
      status.value = next
      if (next === 'granted') onGranted(user)
      resolve(next)
    }

    unsubscribers.push(
      subscribeToMyAccess(uid, (exists) => {
        hasAccess = exists
        settle()
      }),
      subscribeToMyJoinRequest(uid, (request) => {
        joinRequest.value = request
        requestLoaded = true
        settle()
      })
    )
  })

  return firstAnswer
}

export function useChurchAccess() {
  const churchName = computed(() => profile.value?.name || '')
  const isGranted = computed(() => status.value === 'granted')

  return {
    profile,
    status,
    joinRequest,
    churchName,
    isGranted,
    requestToJoin,
  }
}

import { ref, onMounted, onUnmounted } from 'vue'
import { usePermissions } from './usePermissions'
import {
  subscribeToSmallGroups,
  subscribeToAllSgSessions,
  addSmallGroup,
  updateSmallGroup,
  deleteSmallGroup,
} from '../api/smallGroupsService'

// Shared across callers, like useTasks: the Small groups app's home and its
// sections, People, Videos and search all want the same list of groups, and
// there is no reason for each to open its own Firestore listener.
const groups = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useSmallGroups() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToSmallGroups((data) => {
      groups.value = data
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

  const createGroup = (groupData) => addSmallGroup(groupData)
  const saveGroup = (groupId, updatedData) => updateSmallGroup(groupId, updatedData)
  const removeGroup = (groupId) => deleteSmallGroup(groupId)

  const findGroup = (groupId) =>
    groups.value.find((g) => g.firestoreId === groupId || g.id === groupId) || null

  return { groups, loading, createGroup, saveGroup, removeGroup, findGroup }
}

// Every group's sessions, newest first, shared the same way. Only the Small
// groups app's home and its Sessions section want all of them at once; a
// group's own page still listens to just its own (subscribeToGroupSessions).
const sessions = ref([])
const sessionsLoading = ref(true)
let unsubscribeSessions = null
let sessionSubscribers = 0

export function useAllSgSessions() {
  onMounted(() => {
    sessionSubscribers += 1
    if (unsubscribeSessions) return
    // Read only by those who may see small groups (firestore.rules).
    if (!usePermissions().can('smallgroups.view')) {
      sessionsLoading.value = false
      return
    }
    unsubscribeSessions = subscribeToAllSgSessions((data) => {
      sessions.value = data
      sessionsLoading.value = false
    })
  })

  onUnmounted(() => {
    sessionSubscribers -= 1
    if (sessionSubscribers <= 0 && unsubscribeSessions) {
      unsubscribeSessions()
      unsubscribeSessions = null
      sessionSubscribers = 0
    }
  })

  return { sessions, loading: sessionsLoading }
}

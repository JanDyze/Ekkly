import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePermissions } from './usePermissions'
import {
  addItem,
  deleteItem,
  extendLoan,
  lendItem,
  returnLoan,
  setCondition,
  subscribeToInventory,
  updateItem,
  uploadItemPhoto,
} from '../api/inventoryService'

// One live list of the church's things, shared by every screen of the
// Inventory app and counted like useTasks: the home, a section and an item's
// page open together during a transition, and there is no reason for each to
// hold its own Firestore listener.
const items = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useInventory() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    // Read only by those who may see the inventory (firestore.rules); anyone
    // else's listener would only be refused.
    if (!usePermissions().can('inventory.view')) {
      loading.value = false
      return
    }
    unsubscribe = subscribeToInventory((data) => {
      items.value = data
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

  /** One item by id, or null while it loads or once it is gone. */
  const itemById = (id) => items.value.find((item) => item.id === id || item.firestoreId === id) || null

  // Every category and place the church has used, most used first, so the
  // form offers what is already on the shelves before anything new.
  const tally = (pick) =>
    computed(() => {
      const counts = new Map()
      for (const item of items.value) {
        const value = pick(item).trim()
        if (!value) continue
        const key = value.toLowerCase()
        const seen = counts.get(key)
        counts.set(key, { value: seen?.value || value, count: (seen?.count || 0) + 1 })
      }
      return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)).map((e) => e.value)
    })

  const categories = tally((item) => item.category)
  const locations = tally((item) => item.location)

  return {
    items,
    loading,
    itemById,
    categories,
    locations,
    addItem,
    updateItem,
    uploadItemPhoto,
    setCondition,
    lendItem,
    returnLoan,
    extendLoan,
    removeItem: deleteItem,
  }
}

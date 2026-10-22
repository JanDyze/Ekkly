import { onMounted, onUnmounted, ref } from 'vue'
import { subscribeToLinks } from '../api/linksService'

// The links the church hands out (forms, giving, where to find it online),
// for anything that shows them besides the Links page: the home's Quick
// links panel. One listener shared across callers, the same arrangement as
// useTasks, so a panel and the page open together do not read them twice.

const links = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useLinks() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToLinks((data) => {
      links.value = data
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

  return { links, loading }
}

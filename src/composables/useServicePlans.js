import { onMounted, onUnmounted, ref } from 'vue'
import { subscribeToServicePlans } from '../api/servicePlansService'

// Every run sheet the tech team has built, keyed by date — what the
// Presentation app's home and its list of services say about each Sunday
// beyond what the schedule already does.

export function useServicePlans() {
  const plans = ref({})
  const loading = ref(true)
  let unsubscribe = null

  onMounted(() => {
    unsubscribe = subscribeToServicePlans((map) => {
      plans.value = map
      loading.value = false
    })
  })

  onUnmounted(() => unsubscribe?.())

  return { plans, loading }
}

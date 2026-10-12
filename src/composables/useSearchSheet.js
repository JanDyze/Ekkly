import { ref } from 'vue'

// Whether the search over everything (SearchSheet) is open. Shared, because
// it is opened from more than one place: the top bar's magnifying glass and
// Ctrl+K, and the search field on a desktop's home of all apps.
const open = ref(false)

export function useSearchSheet() {
  return {
    open,
    show: () => {
      open.value = true
    },
  }
}

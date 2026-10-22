import { ref, reactive, watch, onMounted } from 'vue'

const isDark = ref(false)

// Light or dark imposed by a screen for as long as it shows, over the
// person's own setting, or null: the home lit as its live sky is (Apps.vue).
// Here rather than on the page directly, so a component applying the theme
// as it mounts cannot undo it.
export const themeOverride = ref(null)

const applyTheme = () => {
  const dark = themeOverride.value ?? isDark.value
  document.documentElement.classList.toggle('dark', dark)
}
watch(themeOverride, applyTheme)
const isTransitioning = ref(false)
const transitionOrigin = reactive({ x: 0, y: 0 })

export function useTheme() {
  const initTheme = () => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme')
    if (stored) {
      isDark.value = stored === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  const toggleTheme = (event) => {
    // Get click position for circle origin
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      transitionOrigin.x = rect.left + rect.width / 2
      transitionOrigin.y = rect.top + rect.height / 2
    } else {
      // Fallback to top-right
      transitionOrigin.x = window.innerWidth - 60
      transitionOrigin.y = 32
    }

    // Start transition
    isTransitioning.value = true
    
    // Change theme after short delay (let circle start expanding)
    setTimeout(() => {
      isDark.value = !isDark.value
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
      applyTheme()
    }, 150)
    
    // End transition after animation completes
    setTimeout(() => {
      isTransitioning.value = false
    }, 600)
  }

  onMounted(() => {
    initTheme()
  })

  watch(isDark, applyTheme)

  return {
    isDark,
    isTransitioning,
    transitionOrigin,
    toggleTheme
  }
}

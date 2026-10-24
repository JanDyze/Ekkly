import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePermissions } from './usePermissions'
import { addTeachingClass, subscribeToTeachingClasses, updateTeachingClass } from '../api/teachingClassesService'
import { AGE_BANDS } from '../utils/ageBands'

// Shared across callers, like useTasks: one listener for the Sunday school
// classes, however many screens are asking.
const classes = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

const bandRank = (key) => {
  const index = AGE_BANDS.findIndex((band) => band.key === key)
  return index === -1 ? AGE_BANDS.length : index
}

export function useTeachingClasses() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    // Read only by those who may see Sunday school classes (firestore.rules); anyone
    // else's listener would only be refused.
    if (!usePermissions().can('teaching.view')) {
      loading.value = false
      return
    }
    unsubscribe = subscribeToTeachingClasses((data) => {
      classes.value = data
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

  // The youngest first, the way a Sunday school is walked round: the little
  // ones' room, then the older children, then the youth and the adults.
  const activeClasses = computed(() =>
    classes.value
      .filter((cls) => !cls.archived)
      .sort((a, b) => bandRank(a.band) - bandRank(b.band) || a.order - b.order || a.name.localeCompare(b.name))
  )

  const classById = (id) => classes.value.find((cls) => cls.id === id) || null

  return {
    classes,
    activeClasses,
    loading,
    classById,
    addClass: addTeachingClass,
    updateClass: updateTeachingClass,
  }
}

import { onMounted, onUnmounted, ref } from 'vue'
import { addLesson, blankLesson, deleteLesson, saveLessonReview, subscribeToLessons, updateLesson } from '../api/lessonsService'

// Shared across callers, like useTasks: the Teaching app's home, its sections
// and a lesson's own screen all read the same lessons through one listener.
const lessons = ref([])
const loading = ref(true)
let unsubscribe = null
let subscribers = 0

export function useLessons() {
  onMounted(() => {
    subscribers += 1
    if (unsubscribe) return
    unsubscribe = subscribeToLessons((data) => {
      lessons.value = data
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

  /** The lesson a class is taught on a date, or null when none is planned. */
  const lessonFor = (classId, date) =>
    lessons.value.find((lesson) => lesson.classId === classId && lesson.date === date) || null

  const lessonById = (id) => lessons.value.find((lesson) => lesson.id === id) || null

  return {
    lessons,
    loading,
    lessonFor,
    lessonById,
    blankLesson,
    addLesson,
    updateLesson,
    saveLessonReview,
    removeLesson: deleteLesson,
  }
}

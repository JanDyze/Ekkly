<script setup>
/**
 * The lesson sheet with everything around it — saving, the toast, deleting
 * with its confirmation, and opening a new lesson once it is written — so
 * each Teaching screen that writes lessons (a class, the library, the
 * calendar, a lesson itself) does it the same way. A screen calls `open()`
 * with a lesson to change it, or with a draft (`{ classId, date }`, or a plan
 * to teach again) to start one.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { useLessons } from '../../composables/useLessons'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { getFullName } from '../../utils/memberUtils'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import LessonEditorSheet from './LessonEditorSheet.vue'

const router = useRouter()
const toast = useToast()
const { user } = useAuth()
const { addLesson, updateLesson, removeLesson } = useLessons()
const {
  lessons,
  activeClasses,
  members,
  myMember,
  teachingRole,
  comingDates,
  today,
  suggestedTeacherIds,
  canManageTeaching,
  canEditLesson,
} = useTeachingOverview()

const show = ref(false)
const lesson = ref(null)
const draft = ref(null)
const saving = ref(false)
const confirming = ref(false)

/** A lesson to change, or a draft to start a new one from. */
const open = (target = {}) => {
  if (target.id) {
    lesson.value = target
    draft.value = null
  } else {
    lesson.value = null
    draft.value = target
  }
  show.value = true
}

defineExpose({ open })

// Whoever runs Teaching may delete any lesson; a teacher, only one they wrote.
const canDelete = computed(
  () => canManageTeaching.value || Boolean(lesson.value && user.value && lesson.value.createdBy === user.value.uid)
)

const deleteMessage = computed(() => `Delete "${lesson.value?.title || 'this lesson'}"? This cannot be undone.`)

const handleSave = async (data) => {
  saving.value = true
  try {
    if (lesson.value) {
      if (!canEditLesson(lesson.value)) throw new Error('Not allowed to change this lesson')
      await updateLesson(lesson.value.id, data)
      toast.success('Lesson saved')
      show.value = false
    } else {
      const id = await addLesson(data, {
        uid: user.value?.uid,
        name: myMember.value ? getFullName(myMember.value) : user.value?.displayName || '',
      })
      toast.success(data.date ? 'Lesson planned' : 'Lesson plan saved')
      show.value = false
      router.push({ name: 'TeachingLesson', params: { id } })
    }
  } catch (error) {
    console.error('Error saving a lesson:', error)
    toast.error('Could not save that lesson. Please try again.')
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  const target = lesson.value
  confirming.value = false
  if (!target) return
  try {
    await removeLesson(target.id)
    show.value = false
    toast.success('Lesson deleted')
    if (router.currentRoute.value.name === 'TeachingLesson') router.replace({ name: 'TeachingPlans' })
  } catch (error) {
    console.error('Error deleting a lesson:', error)
    toast.error('Could not delete that lesson. Please try again.')
  }
}
</script>

<template>
  <LessonEditorSheet
    v-model:show="show"
    :lesson="lesson"
    :draft="draft"
    :classes="activeClasses"
    :members="members"
    :teaching-role="teachingRole"
    :plans="lessons"
    :dates="comingDates"
    :today="today"
    :suggest="suggestedTeacherIds"
    :saving="saving"
    :can-delete="canDelete"
    @save="handleSave"
    @delete="confirming = true"
  />
  <ConfirmationModal
    :show="confirming"
    title="Delete lesson"
    :message="deleteMessage"
    confirm-text="Delete"
    confirm-button-class="bg-red-600 text-white hover:bg-red-700"
    @update:show="confirming = $event"
    @confirm="handleDelete"
  />
</template>

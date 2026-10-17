<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PencilSimple, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import ClassEditorSheet from '../../components/teaching/ClassEditorSheet.vue'
import LessonEditor from '../../components/teaching/LessonEditor.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { useTeachingClasses } from '../../composables/useTeachingClasses'
import { useToast } from '../../composables/useToast'
import { findRosterMember } from '../../utils/lineupUtils'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'
import { classLine, referencesOf } from '../../utils/teachingUtils'

// One class's Sundays: the ones coming this month and next, each with its
// lesson or, for whoever may plan it, the way to start one; then what the
// class has been taught, newest first, so next term's teacher can see what
// the children have already heard.
//
// A Sunday with no lesson says who the schedule has on Sunday school that day,
// so the lesson is planned with the person who will teach it.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { updateClass } = useTeachingClasses()
const {
  loading,
  lessons,
  members,
  teachingRole,
  comingDates,
  today,
  isMe,
  classById,
  lessonFor,
  canPlanFor,
  canManageTeaching,
  scheduledTeachersOn,
} = useTeachingOverview()

const classId = computed(() => String(route.params.classId || ''))
const cls = computed(() => classById(classId.value))

const namesOf = (people) => listPhrase(people.map(getDisplayName))
const teachers = computed(() => (cls.value?.teacherIds || []).map((id) => findRosterMember(members.value, id)).filter(Boolean))

const taught = computed(() =>
  lessons.value
    .filter((lesson) => lesson.classId === classId.value && lesson.date && lesson.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
)

const lessonLine = (lesson) => {
  const people = lesson.teacherIds.map((id) => findRosterMember(members.value, id)).filter(Boolean)
  return [people.length ? namesOf(people) : lesson.teacherNames.join(', '), referencesOf(lesson.passages)].filter(Boolean).join(' · ')
}

const emptyLine = (date) => {
  const people = scheduledTeachersOn(date)
  return people.length ? `${namesOf(people)} on the schedule` : 'Nobody on the schedule yet'
}

/* ------------------------------------------------------------ planning */

const editor = ref(null)
const plan = (date) => editor.value?.open({ classId: classId.value, date, band: cls.value?.band || '' })

/* --------------------------------------------------------- the class */

const showClassSheet = ref(false)
const savingClass = ref(false)

const saveClass = async (data) => {
  savingClass.value = true
  try {
    await updateClass(classId.value, { ...cls.value, ...data })
    showClassSheet.value = false
    toast.success('Class saved')
  } catch (error) {
    console.error('Error saving a class:', error)
    toast.error('Could not save that class. Please try again.')
  } finally {
    savingClass.value = false
  }
}

// Put away, never deleted: its lessons keep saying which class they were for.
const archiveClass = async () => {
  try {
    await updateClass(classId.value, { ...cls.value, archived: true })
    showClassSheet.value = false
    toast.success(`${cls.value.name} is no longer listed`)
    router.replace({ name: 'TeachingSchool' })
  } catch (error) {
    console.error('Error putting a class away:', error)
    toast.error('Could not stop that class. Please try again.')
  }
}
</script>

<template>
  <AppScreen
    :title="cls?.name || 'Class'"
    :subtitle="cls ? [classLine(cls), teachers.length ? `Taught by ${namesOf(teachers)}` : ''].filter(Boolean).join(' · ') : ''"
    :back="{ name: 'TeachingSchool' }"
    root="/teaching" desk
  >
    <template v-if="canManageTeaching && cls" #action>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Edit class"
        @click="showClassSheet = true"
      >
        <PencilSimple class="size-5" />
      </button>
    </template>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!cls">
      <ListRow title="This class is no longer running" subtitle="Its lessons are still in Lesson plans." muted />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup title="Coming Sundays" :count="comingDates.length">
        <template v-for="date in comingDates" :key="date">
          <ListRow
            v-if="lessonFor(cls.id, date)"
            :to="{ name: 'TeachingLesson', params: { id: lessonFor(cls.id, date).id } }"
            :title="lessonFor(cls.id, date).title"
            :subtitle="lessonLine(lessonFor(cls.id, date))"
          >
            <template #leading><DateTile :date="date" :highlight="lessonFor(cls.id, date).teacherIds.some(isMe)" /></template>
          </ListRow>
          <ListRow v-else-if="canPlanFor(cls.id, date)" title="Plan a lesson" :subtitle="emptyLine(date)" warn @click="plan(date)">
            <template #leading><DateTile :date="date" /></template>
            <template #trailing><Plus class="size-4 shrink-0 text-amber-600 dark:text-amber-400" /></template>
          </ListRow>
          <ListRow v-else title="No lesson yet" :subtitle="emptyLine(date)" muted>
            <template #leading><DateTile :date="date" /></template>
          </ListRow>
        </template>
      </ListGroup>

      <ListGroup v-if="taught.length" title="Taught" :count="taught.length">
        <ListRow
          v-for="lesson in taught"
          :key="lesson.id"
          :to="{ name: 'TeachingLesson', params: { id: lesson.id } }"
          :title="lesson.title"
          :subtitle="lessonLine(lesson)"
        >
          <template #leading><DateTile :date="lesson.date" past /></template>
        </ListRow>
      </ListGroup>
    </div>

    <LessonEditor ref="editor" />
    <ClassEditorSheet
      v-model:show="showClassSheet"
      :cls="cls"
      :members="members"
      :teaching-role="teachingRole"
      :saving="savingClass"
      @save="saveClass"
      @archive="archiveClass"
    />
  </AppScreen>
</template>

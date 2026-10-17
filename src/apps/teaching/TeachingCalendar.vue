<script setup>
import { computed, ref } from 'vue'
import { BookOpen, Microphone, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import LessonEditor from '../../components/teaching/LessonEditor.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { hasSermonNotes } from '../../api/sermonsService'
import { findRosterMember, formatServiceDate } from '../../utils/lineupUtils'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'
import { referencesOf } from '../../utils/teachingUtils'

// What is taught when: Sunday by Sunday, the message and every class's lesson
// side by side, so the children's lesson can follow the sermon and nobody
// teaches the same story to the same class twice in a month. The Sundays to
// come this month and next, then the four just gone.

const {
  loading,
  members,
  isMe,
  comingDates,
  pastDates,
  sermonOn,
  themeOn,
  preachersOn,
  preacherIdsOn,
  classLessonsOn,
  canPlanFor,
  scheduledTeachersOn,
} = useTeachingOverview()

const showEarlier = ref(false)
const editor = ref(null)

const namesOf = (people) => listPhrase(people.map(getDisplayName))

const weeks = computed(() => [
  ...comingDates.value.map((date) => ({ date, past: false })),
  ...(showEarlier.value ? pastDates(4).map((date) => ({ date, past: true })) : []),
])

const sermonTitle = (date) => sermonOn(date)?.title || themeOn(date) || 'No message yet'
const sermonLine = (date) => {
  const preachers = preachersOn(date)
  return [preachers.length ? namesOf(preachers) : 'Nobody preaching yet', referencesOf(sermonOn(date)?.passages || [])].filter(Boolean).join(' · ')
}

const lessonLine = (row, date) => {
  const people = (row.lesson?.teacherIds || []).map((id) => findRosterMember(members.value, id)).filter(Boolean)
  const who = people.length ? namesOf(people) : row.lesson?.teacherNames?.join(', ')
  if (row.lesson) return [row.cls?.name || 'Sunday school', who].filter(Boolean).join(' · ')
  const scheduled = scheduledTeachersOn(date)
  return [row.cls?.name, scheduled.length ? `${namesOf(scheduled)} on the schedule` : ''].filter(Boolean).join(' · ')
}

const isMine = (row) => (row.lesson?.teacherIds || []).some(isMe)
</script>

<template>
  <AppScreen title="What’s taught" subtitle="The message and every class, Sunday by Sunday" :back="{ name: 'TeachingHome' }" root="/teaching" desk>
    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 3" :key="n" class="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="week in weeks" :key="week.date" :title="formatServiceDate(week.date)">
        <ListRow
          :to="{ name: 'TeachingSermon', params: { date: week.date } }"
          :title="sermonTitle(week.date)"
          :subtitle="sermonLine(week.date)"
          :muted="!hasSermonNotes(sermonOn(week.date)) && !themeOn(week.date)"
        >
          <template #leading>
            <span
              :class="[
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                preacherIdsOn(week.date).some(isMe) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
              ]"
            >
              <Microphone class="size-5" />
            </span>
          </template>
        </ListRow>

        <template v-for="row in classLessonsOn(week.date)" :key="row.lesson?.id || row.cls?.id">
          <ListRow
            v-if="row.lesson"
            :to="{ name: 'TeachingLesson', params: { id: row.lesson.id } }"
            :title="row.lesson.title"
            :subtitle="lessonLine(row, week.date)"
          >
            <template #leading>
              <span
                :class="[
                  'flex size-10 shrink-0 items-center justify-center rounded-xl',
                  isMine(row) ? 'bg-primary text-white' : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
                ]"
              >
                <BookOpen class="size-5" />
              </span>
            </template>
          </ListRow>
          <ListRow
            v-else-if="!week.past && row.cls && canPlanFor(row.cls.id, week.date)"
            title="Plan a lesson"
            :subtitle="lessonLine(row, week.date)"
            warn
            @click="editor?.open({ classId: row.cls.id, date: week.date, band: row.cls.band })"
          >
            <template #leading>
              <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Plus class="size-5" />
              </span>
            </template>
          </ListRow>
          <ListRow v-else title="No lesson" :subtitle="lessonLine(row, week.date)" muted>
            <template #leading>
              <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                <BookOpen class="size-5" />
              </span>
            </template>
          </ListRow>
        </template>
      </ListGroup>

      <button
        v-if="!showEarlier"
        type="button"
        class="h-11 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="showEarlier = true"
      >
        Show the last four Sundays
      </button>
    </div>

    <LessonEditor ref="editor" />
  </AppScreen>
</template>

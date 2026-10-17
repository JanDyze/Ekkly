<script setup>
import { computed, ref } from 'vue'
import { Notebook, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import LessonEditor from '../../components/teaching/LessonEditor.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { bandLabel, lessonWhere, referencesOf } from '../../utils/teachingUtils'

// The library: every lesson the church has written, grouped by series, each
// saying where it stands — still waiting in the library, or which class it
// was taught to and when. Found by title, passage, series or memory verse, so
// "that lesson on Zacchaeus from last year" is a search, and Teach this again
// on it copies it onto a class's Sunday.

const { loading, lessons, classById, canWritePlans } = useTeachingOverview()

const search = ref('')
const editor = ref(null)

const matches = (lesson, q) =>
  !q ||
  [lesson.title, lesson.series, lesson.objective, referencesOf(lesson.passages), lesson.memoryVerse?.reference, bandLabel(lesson.band), classById(lesson.classId)?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q)

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return lessons.value.filter((lesson) => matches(lesson, q))
})

// A series' lessons in the order they were taught, the untaught after them;
// the lessons in no series last.
const groups = computed(() => {
  const bySeries = new Map()
  shown.value.forEach((lesson) => {
    const key = lesson.series || ''
    if (!bySeries.has(key)) bySeries.set(key, [])
    bySeries.get(key).push(lesson)
  })
  return [...bySeries.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([series, rows]) => ({
      series,
      rows: rows.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title)),
    }))
})

const subtitleOf = (lesson) => [lessonWhere(lesson, classById(lesson.classId)), bandLabel(lesson.band), referencesOf(lesson.passages)].filter(Boolean).join(' · ')
</script>

<template>
  <AppScreen title="Lesson plans" :subtitle="loading ? '' : `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}`" :back="{ name: 'TeachingHome' }" root="/teaching" desk>
    <template v-if="canWritePlans" #action>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover"
        aria-label="New lesson plan"
        @click="editor?.open({})"
      >
        <Plus class="size-5" />
      </button>
    </template>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else-if="!lessons.length" class="flex flex-col items-center justify-center px-8 py-16 text-center text-gray-500 dark:text-gray-400">
      <Notebook class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">No lessons yet</p>
      <p class="text-sm">
        {{ canWritePlans ? 'Write the first one: what it is for, the passage, the memory verse and what happens in the room.' : 'Lessons show here once the teachers write them.' }}
      </p>
    </div>

    <div v-else class="flex flex-col gap-5">
      <input
        v-if="lessons.length > 6"
        v-model="search"
        type="search"
        aria-label="Search the lessons"
        placeholder="Search by title, passage or series"
        class="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />

      <ListGroup v-if="!groups.length">
        <ListRow :title="`Nothing matches “${search}”`" subtitle="Try a book of the Bible, a series or a word from the title." muted />
      </ListGroup>

      <ListGroup v-for="group in groups" :key="group.series || '-'" :title="group.series || 'Not in a series'" :count="group.rows.length">
        <ListRow
          v-for="lesson in group.rows"
          :key="lesson.id"
          :to="{ name: 'TeachingLesson', params: { id: lesson.id } }"
          :title="lesson.title || 'Untitled lesson'"
          :subtitle="subtitleOf(lesson)"
        />
      </ListGroup>
    </div>

    <LessonEditor ref="editor" />
  </AppScreen>
</template>

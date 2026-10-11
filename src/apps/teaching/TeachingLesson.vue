<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { BookmarkSimple, BookOpen, Copy, ListChecks, PencilSimple } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import LessonEditor from '../../components/teaching/LessonEditor.vue'
import TeachingText from '../../components/teaching/TeachingText.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { findRosterMember, formatServiceDate } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'
import { bandLabel } from '../../utils/teachingUtils'

// One lesson, laid out the way a teacher reads it before class: what the
// children should leave knowing, the Scripture with its words, the memory
// verse, how the lesson goes, what to bring and what they take home. On a
// class's Sunday it also says the class, the day and who is teaching, and
// once the day has passed, how it went.
//
// Teach this again copies it onto another class's Sunday, leaving this one as
// it was taught.

const route = useRoute()
const { loading, members, lessonById, classById, canEditLesson, canWritePlans, sermonOn, today } = useTeachingOverview()

const id = computed(() => String(route.params.id || ''))
const lesson = computed(() => lessonById(id.value))
const cls = computed(() => classById(lesson.value?.classId))
const teachers = computed(() => (lesson.value?.teacherIds || []).map((tid) => findRosterMember(members.value, tid)).filter(Boolean))
const canEdit = computed(() => canEditLesson(lesson.value))
// The message that Sunday, so a lesson meant to follow the sermon can say so.
const sermon = computed(() => (lesson.value?.date ? sermonOn(lesson.value.date) : null))

const editor = ref(null)

const teachAgain = () => {
  const l = lesson.value
  editor.value?.open({
    title: l.title,
    series: l.series,
    band: l.band,
    objective: l.objective,
    passages: l.passages,
    memoryVerse: l.memoryVerse,
    activities: l.activities,
    materials: l.materials,
    takeHome: l.takeHome,
    fromId: l.fromId || l.id,
  })
}

const subtitle = computed(() => {
  const l = lesson.value
  if (!l) return ''
  if (l.date) return [cls.value?.name, formatServiceDate(l.date)].filter(Boolean).join(' · ')
  return [l.series, bandLabel(l.band), 'In the library'].filter(Boolean).join(' · ')
})

const back = computed(() =>
  lesson.value?.classId && cls.value ? { name: 'TeachingClass', params: { classId: lesson.value.classId } } : { name: 'TeachingPlans' }
)
</script>

<template>
  <AppScreen :title="lesson?.title || 'Lesson'" :subtitle="subtitle" :back="back" root="/teaching">
    <template v-if="lesson" #action>
      <button
        v-if="canWritePlans"
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Teach this again"
        title="Teach this again"
        @click="teachAgain"
      >
        <Copy class="size-5" />
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
        @click="editor?.open(lesson)"
      >
        <PencilSimple class="h-4 w-4" />
        Edit
      </button>
    </template>

    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!lesson">
      <ListRow title="This lesson is no longer here" subtitle="Someone may have deleted it." muted />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <!-- Who is teaching it, on a class's Sunday -->
      <ListGroup v-if="lesson.date">
        <ListRow
          :title="teachers.length ? teachers.map(getDisplayName).join(' and ') : lesson.teacherNames.join(', ') || 'Nobody teaching yet'"
          :subtitle="sermon?.title ? `The message that Sunday: ${sermon.title}` : cls?.room || 'Teaching'"
          :muted="!teachers.length && !lesson.teacherNames.length"
        >
          <template #leading>
            <div class="flex -space-x-2">
              <MemberAvatar v-for="t in teachers.slice(0, 3)" :key="t.id || t.firestoreId" :member="t" alt="" size="h-10 w-10" plain-class="ring-2 ring-white dark:ring-gray-800" />
              <span v-if="!teachers.length" class="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                <BookOpen class="size-5" />
              </span>
            </div>
          </template>
        </ListRow>
      </ListGroup>

      <!-- What they should leave knowing -->
      <div v-if="lesson.objective" class="rounded-2xl bg-primary/5 px-4 py-3.5 ring-1 ring-primary/15 dark:bg-primary-light/10 dark:ring-primary-light/20">
        <p class="text-xs font-bold uppercase tracking-wide text-primary dark:text-primary-light">They should leave knowing</p>
        <p class="mt-1 text-[17px] font-semibold leading-snug text-gray-900 dark:text-white">{{ lesson.objective }}</p>
      </div>

      <!-- Scripture, with its words -->
      <ListGroup v-if="lesson.passages.length" title="Scripture" :count="lesson.passages.length">
        <div v-for="(passage, index) in lesson.passages" :key="`${passage.reference}-${index}`" class="px-4 py-3">
          <p class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <BookOpen class="size-4 shrink-0 text-primary dark:text-primary-light" />
            {{ passage.reference }}
            <span class="text-xs font-normal text-gray-500 dark:text-gray-400">{{ passage.version }}</span>
          </p>
          <p class="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <template v-for="verse in passage.verses" :key="`${verse.chapter}:${verse.verse}`">
              <sup class="mr-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500">{{ verse.verse }}</sup>{{ verse.text }}
            </template>
          </p>
        </div>
      </ListGroup>

      <!-- The memory verse -->
      <section v-if="lesson.memoryVerse">
        <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Memory verse</h2>
        <div class="flex gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
          <BookmarkSimple class="mt-0.5 size-5 shrink-0 text-primary dark:text-primary-light" />
          <div class="min-w-0">
            <p class="text-[15px] leading-relaxed text-gray-900 dark:text-white">“{{ lesson.memoryVerse.text }}”</p>
            <p class="mt-1 text-sm font-semibold text-primary dark:text-primary-light">
              {{ lesson.memoryVerse.reference }}
              <span class="font-normal text-gray-500 dark:text-gray-400">{{ lesson.memoryVerse.version }}</span>
            </p>
          </div>
        </div>
      </section>

      <!-- How the lesson goes -->
      <section v-if="lesson.activities">
        <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">How the lesson goes</h2>
        <div class="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
          <TeachingText :text="lesson.activities" />
        </div>
      </section>

      <!-- What to bring -->
      <ListGroup v-if="lesson.materials.length" title="What to bring" :count="lesson.materials.length">
        <ListRow v-for="(item, index) in lesson.materials" :key="index" :title="item">
          <template #leading><ListChecks class="size-5 shrink-0 text-gray-400 dark:text-gray-500" /></template>
        </ListRow>
      </ListGroup>

      <!-- What they take home -->
      <section v-if="lesson.takeHome">
        <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">What they take home</h2>
        <div class="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
          <p class="whitespace-pre-line text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">{{ lesson.takeHome }}</p>
        </div>
      </section>

      <!-- How it went -->
      <section v-if="lesson.review || (lesson.date && lesson.date < today && canEdit)">
        <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">How it went</h2>
        <div class="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
          <p v-if="lesson.review" class="whitespace-pre-line text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">{{ lesson.review }}</p>
          <button v-else type="button" class="text-sm font-semibold text-primary dark:text-primary-light" @click="editor?.open(lesson)">
            Note how it went, for whoever teaches it next
          </button>
        </div>
      </section>
    </div>

    <LessonEditor ref="editor" />
  </AppScreen>
</template>

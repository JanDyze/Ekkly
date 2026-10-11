<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookOpen, Microphone, PencilSimple, Slideshow } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import SermonNotesSheet from '../../components/teaching/SermonNotesSheet.vue'
import TeachingText from '../../components/teaching/TeachingText.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { usePermissions } from '../../composables/usePermissions'
import { useToast } from '../../composables/useToast'
import { hasSermonNotes } from '../../api/sermonsService'
import { formatServiceDate } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'

// One Sunday's message, as the preacher prepared it: who preaches and the
// series (the schedule's), the one thing to take home, the passages with
// their words, the outline and the preaching notes. The lessons that Sunday
// are a tap away on What's taught.
//
// The slides and the recording are the preaching sheet's, in Schedules; this
// screen says whether they are in and leads there, rather than offering a
// second place to upload them.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { can } = usePermissions()
const { loading, sermonOn, saveNotes, themeOn, preachersOn, canEditSermon, classLessonsOn, today } = useTeachingOverview()

const date = computed(() => String(route.params.date || ''))
const sermon = computed(() => sermonOn(date.value))
const preachers = computed(() => preachersOn(date.value))
const theme = computed(() => themeOn(date.value))
const canEdit = computed(() => canEditSermon(date.value))
const written = computed(() => hasSermonNotes(sermon.value))
const lessonsThatDay = computed(() => classLessonsOn(date.value).filter((row) => row.lesson))

const showSheet = ref(false)
const saving = ref(false)

// Arriving to write it (the home's card) opens the sheet as soon as the
// message has loaded, and takes ?edit= back out of the address so a reload
// does not open it again.
watch(
  [loading, () => route.query.edit],
  ([isLoading, edit]) => {
    if (isLoading || !edit) return
    if (canEdit.value) showSheet.value = true
    const { edit: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

const handleSave = async (notes) => {
  saving.value = true
  try {
    await saveNotes(date.value, notes)
    showSheet.value = false
    toast.success('Message saved')
  } catch (error) {
    console.error('Error saving the message notes:', error)
    toast.error('Could not save the message. Please try again.')
  } finally {
    saving.value = false
  }
}

const title = computed(() => sermon.value?.title || theme.value || 'No message yet')
const screenFor = computed(() => {
  const s = sermon.value
  if (!s) return ''
  return [s.slides?.length ? `${s.slides.length} slides` : '', s.audio ? 'the recording' : ''].filter(Boolean).join(' and ')
})
</script>

<template>
  <AppScreen :title="title" :subtitle="formatServiceDate(date)" :back="{ name: 'TeachingSermons' }" root="/teaching">
    <template v-if="canEdit" #action>
      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
        @click="showSheet = true"
      >
        <PencilSimple class="h-4 w-4" />
        {{ written ? 'Edit' : 'Write' }}
      </button>
    </template>

    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 3" :key="n" class="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <!-- Who, and the series: the schedule's -->
      <ListGroup>
        <ListRow
          :title="preachers.length ? preachers.map(getDisplayName).join(' and ') : 'Nobody preaching yet'"
          :subtitle="theme ? `Series · ${theme}` : 'No series set'"
          :muted="!preachers.length"
        >
          <template #leading>
            <MemberAvatar v-if="preachers[0]" :member="preachers[0]" alt="" size="h-10 w-10" />
            <span v-else class="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              <Microphone class="size-5" />
            </span>
          </template>
        </ListRow>
      </ListGroup>

      <!-- Nothing yet -->
      <div v-if="!written" class="flex flex-col items-center justify-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
        <Microphone class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">Nothing written yet</p>
        <p class="text-sm">
          {{ canEdit ? 'Write the title, the passages and your notes, and the screen team has them too.' : 'The preacher’s notes show here once they are written.' }}
        </p>
      </div>

      <template v-else>
        <!-- The one thing to take home -->
        <div
          v-if="sermon.bigIdea"
          class="rounded-2xl bg-primary/5 px-4 py-3.5 ring-1 ring-primary/15 dark:bg-primary-light/10 dark:ring-primary-light/20"
        >
          <p class="text-xs font-bold uppercase tracking-wide text-primary dark:text-primary-light">To take home</p>
          <p class="mt-1 text-[17px] font-semibold leading-snug text-gray-900 dark:text-white">{{ sermon.bigIdea }}</p>
        </div>

        <!-- Passages, with their words -->
        <ListGroup v-if="sermon.passages.length" title="Passages" :count="sermon.passages.length">
          <div v-for="(passage, index) in sermon.passages" :key="`${passage.reference}-${index}`" class="px-4 py-3">
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

        <!-- Outline -->
        <ListGroup v-if="sermon.points.length" title="Outline">
          <ListRow v-for="(point, index) in sermon.points" :key="index" :title="point">
            <template #leading>
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary dark:bg-primary-light/15 dark:text-primary-light">
                {{ index + 1 }}
              </span>
            </template>
          </ListRow>
        </ListGroup>

        <!-- Preaching notes -->
        <section v-if="sermon.manuscript">
          <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Preaching notes</h2>
          <div class="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
            <TeachingText :text="sermon.manuscript" />
          </div>
        </section>
      </template>

      <!-- The rest of the Sunday: the screen, and the lessons that follow it -->
      <ListGroup v-if="can('lineups.view') || lessonsThatDay.length" title="The same Sunday">
        <ListRow
          v-if="can('lineups.view')"
          :to="{ name: 'SchedulesSunday', params: { date } }"
          :title="screenFor ? `On the screen: ${screenFor}` : 'Slides and the recording'"
          :subtitle="screenFor ? 'In Schedules, with the rest of the Sunday' : 'Added in Schedules, by the preaching team'"
        >
          <template #leading>
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              <Slideshow class="size-5" />
            </span>
          </template>
        </ListRow>
        <ListRow
          v-for="row in lessonsThatDay"
          :key="row.lesson.id"
          :to="{ name: 'TeachingLesson', params: { id: row.lesson.id } }"
          :title="row.lesson.title"
          :subtitle="row.cls?.name || 'Sunday school'"
        >
          <template #leading>
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <BookOpen class="size-5" />
            </span>
          </template>
        </ListRow>
      </ListGroup>

      <p v-if="date < today && !written" class="px-1 text-xs text-gray-500 dark:text-gray-400">This Sunday has passed.</p>
    </div>

    <SermonNotesSheet
      v-model:show="showSheet"
      :date="date"
      :sermon="sermon"
      :preachers="preachers"
      :theme="theme"
      :saving="saving"
      @save="handleSave"
    />
  </AppScreen>
</template>

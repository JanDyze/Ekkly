<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, UsersFour } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import ClassEditorSheet from '../../components/teaching/ClassEditorSheet.vue'
import { useTeachingOverview } from '../../composables/useTeachingOverview'
import { useTeachingClasses } from '../../composables/useTeachingClasses'
import { useToast } from '../../composables/useToast'
import { findRosterMember, formatShortDate } from '../../utils/lineupUtils'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'
import { AGE_BANDS } from '../../utils/ageBands'
import { classLine } from '../../utils/teachingUtils'

// Sunday school: every class, youngest first, each saying whether it has a
// lesson for this coming Sunday. A class opens into its Sundays — the ones
// coming, each with its lesson or the way to plan one, and what it has been
// taught. Whoever runs Teaching adds the classes here.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { addClass } = useTeachingClasses()
const { loading, activeClasses, members, teachingRole, thisSunday, lessonFor, canManageTeaching, isMe } = useTeachingOverview()

const teachersOf = (cls) =>
  listPhrase(cls.teacherIds.map((id) => findRosterMember(members.value, id)).filter(Boolean).map(getDisplayName))

const subtitleOf = (cls) => [classLine(cls), teachersOf(cls)].filter(Boolean).join(' · ') || 'No teacher yet'

// Grouped by band, the way the rooms are walked round.
const groups = computed(() => {
  const bands = [...AGE_BANDS, { key: '', label: 'Any age' }]
  return bands
    .map((band) => ({ ...band, classes: activeClasses.value.filter((cls) => (cls.band || '') === band.key) }))
    .filter((group) => group.classes.length)
})

/* -------------------------------------------------------------- adding */

const showSheet = ref(false)
const saving = ref(false)

watch(
  () => route.query.add,
  (add) => {
    if (!add) return
    if (canManageTeaching.value) showSheet.value = true
    const { add: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

const handleSave = async (data) => {
  saving.value = true
  try {
    await addClass({ ...data, order: activeClasses.value.length })
    showSheet.value = false
    toast.success(`${data.name.trim()} added`)
  } catch (error) {
    console.error('Error adding a class:', error)
    toast.error('Could not add that class. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppScreen
    title="Sunday school"
    :subtitle="thisSunday ? `Lessons for ${formatShortDate(thisSunday)}` : ''"
    :back="{ name: 'TeachingHome' }"
    root="/teaching"
  >
    <template v-if="canManageTeaching" #action>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover"
        aria-label="New class"
        @click="showSheet = true"
      >
        <Plus class="size-5" />
      </button>
    </template>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else-if="!activeClasses.length" class="flex flex-col items-center justify-center px-8 py-16 text-center text-gray-500 dark:text-gray-400">
      <UsersFour class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">No classes yet</p>
      <p class="text-sm">
        {{ canManageTeaching ? 'Add each class the church runs, with who it is for and who teaches it.' : 'The classes show here once someone running Sunday school adds them.' }}
      </p>
      <button
        v-if="canManageTeaching"
        type="button"
        class="mt-4 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        @click="showSheet = true"
      >
        Add a class
      </button>
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.key" :title="group.label" :count="group.classes.length">
        <ListRow
          v-for="cls in group.classes"
          :key="cls.id"
          :to="{ name: 'TeachingClass', params: { classId: cls.id } }"
          :title="cls.name"
          :subtitle="subtitleOf(cls)"
        >
          <template #leading>
            <span
              :class="[
                'flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                cls.teacherIds.some(isMe) ? 'bg-primary text-white' : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
              ]"
            >
              {{ cls.name.slice(0, 1).toUpperCase() }}
            </span>
          </template>
          <template #trailing>
            <span
              v-if="thisSunday && lessonFor(cls.id, thisSunday)"
              class="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              Ready
            </span>
            <span
              v-else-if="thisSunday"
              class="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            >
              No lesson
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </div>

    <ClassEditorSheet v-model:show="showSheet" :members="members" :teaching-role="teachingRole" :saving="saving" @save="handleSave" />
  </AppScreen>
</template>

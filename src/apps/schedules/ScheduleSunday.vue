<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EyeOff, Pencil } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ScheduleServicePanel from '../../components/schedules/ScheduleServicePanel.vue'
import ScheduleEditorDrawer from '../../components/schedules/ScheduleEditorDrawer.vue'
import PreachingSheet from '../../components/schedules/PreachingSheet.vue'
import { useLineup } from '../../composables/useLineups'
import { useMembers } from '../../composables/useMembers'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useServiceLyrics } from '../../composables/useServiceLyrics'
import { useToast } from '../../composables/useToast'
import { useSermons } from '../../composables/useSermons'
import { useTeamDuties } from '../../composables/useTeamDuties'
import { deleteImages } from '../../api/blobService'
import { TEAM_KEYS, mergeTeamEdit } from '../../data/scheduleTeams'
import { formatServiceDate, formatMonthLabel, monthKeyOfIso, todayIso } from '../../utils/lineupUtils'

// One Sunday, on a screen of its own: everyone on it role by role, the songs,
// and, for whoever plans, the editor. Putting it on the screen is the
// Presentation app's, reached from there.
//
// The month is a list of these; this is one of them opened out, reached from
// the app's home, from My turns, from the calendar, or from a team's section.
//
// Each team plans its own part from here: the panel has a Plan button per
// team for whoever plans it, and ?edit=<team> arrives straight into it. What
// a team saves is laid over the Sunday as it stands at that moment
// (mergeTeamEdit), so two teams planning the same Sunday at once cannot write
// over each other.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { members } = useMembers()
const { canPlan, canPlanTeam, canPlanAny, roles, myRolesOn, upcoming } = useScheduleOverview()
const { sermonOn, save: saveSermon } = useSermons()
const { progressOn } = useTeamDuties()
// The song list, for the editor to pick from.
const { songs } = useServiceLyrics()

const date = computed(() => String(route.params.date || ''))
const month = computed(() => monthKeyOfIso(date.value))

const { loading, sundays, isPublished, saveSunday, clearSunday } = useLineup(month)

const sunday = computed(() => sundays.value.find((s) => s.date === date.value) || null)

// A Sunday in a month still being arranged is the planners' own, here as on
// the calendar.
const hidden = computed(() => !loading.value && !isPublished.value && !canPlanAny.value)

const sermon = computed(() => sermonOn(date.value))
const ushersDuties = computed(() => progressOn(date.value, 'ushers'))

/* ----------------------------------------------------------- editing */

const showEditor = ref(false)
const showPreaching = ref(false)
// The team being planned, or '' for the whole Sunday.
const editTeam = ref('')
const saving = ref(false)

/** Opens the right editor for a team's part, or the whole Sunday for ''. */
const openEditor = (team = '') => {
  if (team && !canPlanTeam(team)) return
  if (!team && !canPlan.value) return
  if (team === 'preaching') {
    showPreaching.value = true
    return
  }
  editTeam.value = team
  showEditor.value = true
}

// Arriving to plan it — the Calendar's Plan button, the home's main action, a
// team's section — opens the editor as soon as the month is in, and takes
// ?edit= back out of the address so a reload does not open it again.
watch(
  [loading, () => route.query.edit],
  ([isLoading, edit]) => {
    if (isLoading || !edit) return
    if (sunday.value) openEditor(TEAM_KEYS.includes(edit) ? edit : '')
    const { edit: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

const handleSave = async (next) => {
  saving.value = true
  try {
    // A team's part goes onto the live Sunday; the whole Sunday replaces it.
    await saveSunday(editTeam.value ? mergeTeamEdit(sunday.value, next, editTeam.value, roles.value) : next)
    showEditor.value = false
    toast.success('Service saved')
  } catch (error) {
    console.error('Error saving schedule service:', error)
    toast.error('Could not save the service. Please try again.')
  } finally {
    saving.value = false
  }
}

const handlePreachingSave = async ({ sunday: part, sermon: message, discardedSlides }) => {
  saving.value = true
  try {
    await saveSunday(mergeTeamEdit(sunday.value, part, 'preaching', roles.value))
    await saveSermon(date.value, message)
    if (discardedSlides.length) deleteImages(discardedSlides).catch((e) => console.error('Could not delete old slides:', e))
    showPreaching.value = false
    toast.success('Message saved')
  } catch (error) {
    console.error('Error saving the message:', error)
    toast.error('Could not save the message. Please try again.')
  } finally {
    saving.value = false
  }
}

const handleClear = async (when) => {
  saving.value = true
  try {
    await clearSunday(when)
    showEditor.value = false
    toast.success('Service cleared')
  } catch (error) {
    console.error('Error clearing schedule service:', error)
    toast.error('Could not clear the service.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppScreen
    :title="formatServiceDate(date)"
    :subtitle="sunday?.theme || formatMonthLabel(month)"
    :back="{ name: 'SchedulesHome' }"
    root="/schedules"
  >
    <!-- The whole Sunday, for whoever plans every team; each team's own Plan
         is on its group below. -->
    <template v-if="canPlan && sunday && sunday.date >= todayIso()" #action>
      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
        @click="openEditor('')"
      >
        <Pencil class="size-4" />
        Edit all
      </button>
    </template>
    <div v-if="loading" class="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />

    <div v-else-if="hidden" class="p-8 text-center text-gray-500 dark:text-gray-400">
      <EyeOff class="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
      <p class="font-medium text-gray-700 dark:text-gray-300">Not published yet</p>
      <p class="mt-1 text-sm">The schedule for {{ formatMonthLabel(month) }} is still being put together.</p>
    </div>

    <div v-else-if="sunday">
      <ScheduleServicePanel
        class="animate-rise"
        :sunday="sunday"
        :members="members"
        :roles="roles"
        :can-edit="canPlan"
        :can-edit-team="canPlanTeam"
        :sermon="sermon"
        :duties="ushersDuties"
        :my-roles="myRolesOn(sunday)"
        :is-next="sunday.date === upcoming[0]?.date"
        :is-past="sunday.date < todayIso()"
        @edit="openEditor"
      />

    </div>

    <ScheduleEditorDrawer
      v-if="sunday"
      v-model:show="showEditor"
      :sunday="sunday"
      :members="members"
      :songs="songs"
      :roles="roles"
      :team="editTeam"
      :saving="saving"
      @save="handleSave"
      @clear="handleClear"
    />

    <PreachingSheet
      v-if="sunday"
      v-model:show="showPreaching"
      :sunday="sunday"
      :sermon="sermon"
      :members="members"
      :roles="roles"
      :saving="saving"
      @save="handlePreachingSave"
    />
  </AppScreen>
</template>

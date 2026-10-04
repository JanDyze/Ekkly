<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EyeOff } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ScheduleServicePanel from '../../components/schedules/ScheduleServicePanel.vue'
import ScheduleEditorDrawer from '../../components/schedules/ScheduleEditorDrawer.vue'
import { useLineup } from '../../composables/useLineups'
import { useMembers } from '../../composables/useMembers'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useServiceLyrics } from '../../composables/useServiceLyrics'
import { useToast } from '../../composables/useToast'
import { formatServiceDate, formatMonthLabel, monthKeyOfIso, todayIso } from '../../utils/lineupUtils'

// One Sunday, on a screen of its own: everyone on it role by role, the songs,
// and, for whoever plans, the editor. Putting it on the screen is the
// Presentation app's, reached from there.
//
// The month is a list of these; this is one of them opened out, reached from
// the app's home, from My turns, or from the calendar.

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { members } = useMembers()
const { canPlan, roles, myRolesOn, upcoming } = useScheduleOverview()
// The song list, for the editor to pick from.
const { songs } = useServiceLyrics()

const date = computed(() => String(route.params.date || ''))
const month = computed(() => monthKeyOfIso(date.value))

const { loading, sundays, isPublished, saveSunday, clearSunday } = useLineup(month)

const sunday = computed(() => sundays.value.find((s) => s.date === date.value) || null)

// A Sunday in a month still being arranged is the planners' own, here as on
// the calendar.
const hidden = computed(() => !loading.value && !isPublished.value && !canPlan.value)

/* ----------------------------------------------------------- editing */

const showEditor = ref(false)
const saving = ref(false)

// Arriving to plan it — the Calendar's Plan button, the home's main action —
// opens the editor as soon as the month is in, and takes ?edit= back out of
// the address so a reload does not open it again.
watch(
  [loading, () => route.query.edit],
  ([isLoading, edit]) => {
    if (isLoading || !edit) return
    if (canPlan.value && sunday.value) showEditor.value = true
    const { edit: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

const handleSave = async (next) => {
  saving.value = true
  try {
    await saveSunday(next)
    showEditor.value = false
    toast.success('Service saved')
  } catch (error) {
    console.error('Error saving schedule service:', error)
    toast.error('Could not save the service. Please try again.')
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
    <div v-if="loading" class="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />

    <div v-else-if="hidden" class="p-8 text-center text-gray-500 dark:text-gray-400">
      <EyeOff class="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
      <p class="font-medium text-gray-700 dark:text-gray-300">Not published yet</p>
      <p class="mt-1 text-sm">The schedule for {{ formatMonthLabel(month) }} is still being put together.</p>
    </div>

    <div v-else-if="sunday" class="flex flex-col gap-3">
      <ScheduleServicePanel
        class="animate-rise"
        :sunday="sunday"
        :members="members"
        :roles="roles"
        :can-edit="canPlan"
        :my-roles="myRolesOn(sunday)"
        :is-next="sunday.date === upcoming[0]?.date"
        :is-past="sunday.date < todayIso()"
        @edit="showEditor = true"
      />

    </div>

    <ScheduleEditorDrawer
      v-if="sunday"
      v-model:show="showEditor"
      :sunday="sunday"
      :members="members"
      :songs="songs"
      :roles="roles"
      :saving="saving"
      @save="handleSave"
      @clear="handleClear"
    />
  </AppScreen>
</template>

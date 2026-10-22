<script setup>
import { usePageSearch } from '../../composables/usePageSearch'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMinutes } from '../../composables/useMinutes'
import { useMinutesOverview } from '../../composables/useMinutesOverview'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import MinutesToolbar from '../../components/minutes/MinutesToolbar.vue'
import MinutesFab from '../../components/minutes/MinutesFab.vue'
import MinuteListItem from '../../components/minutes/MinuteListItem.vue'
import MinuteEditorDrawer from '../../components/minutes/MinuteEditorDrawer.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import { useMyMember } from '../../composables/useMyMember'
import { getFullName } from '../../utils/memberUtils'
import { matchesMinuteQuery } from '../../utils/minuteSummary'
import { FileText, Pencil, Trash2 } from '../../icons'

// Every meeting, newest month first, with this week's coming meetings at the
// top as rows that do not exist yet (useScheduledMinutes). This was the
// Minutes page before Minutes was an app; it is the app's first section now,
// and what the page used to say above the list — how many were never written
// up — is the home's to say (MinutesHome), and a section of its own.

const router = useRouter()
const { addMinuteToFirestore, updateMinuteInFirestore, removeMinute } = useMinutes()
const { minutes, loading, canEdit, scheduledMinutes, startingId, openMeeting } = useMinutesOverview()
const { myMember } = useMyMember()

const searchQuery = ref('')
// Search is a mode, opened from the floating button. Closing it clears the
// query: a bar you cannot see must not still be filtering the list.
const searchOpen = ref(false)
const openSearch = () => { searchOpen.value = true }
// Ctrl+G opens it too (usePageSearch).
usePageSearch(openSearch)
const closeSearch = () => {
  searchOpen.value = false
  searchQuery.value = ''
}

const showAddMinute = ref(false)
const showEditMinute = ref(false)
const editingMinute = ref(null)

// The row's overflow menu — the only place edit and delete live now that a tap
// on the row opens the minute itself.
const rowMenu = ref({ show: false, minute: null, top: 0, left: 0 })
const closeRowMenu = () => { rowMenu.value = { show: false, minute: null, top: 0, left: 0 } }

const blankMinute = () => ({
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  attendees: [],
  agenda: []
})
const newMinuteData = ref(blankMinute())

// Confirmation modal state
const showConfirmation = ref(false)
const confirmationConfig = ref({
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmButtonClass: 'bg-primary text-white hover:bg-primary-hover',
  onConfirm: null
})

const showConfirmModal = (config) => {
  confirmationConfig.value = { ...confirmationConfig.value, ...config }
  showConfirmation.value = true
}

const handleConfirmation = () => {
  if (confirmationConfig.value.onConfirm) {
    confirmationConfig.value.onConfirm()
  }
}

// Ghosts are hidden while searching. A search is a hunt through what was said
// at meetings that happened, and a row with nothing in it can never be the
// answer to one.
const allRows = computed(() =>
  searchQuery.value.trim() ? minutes.value : [...scheduledMinutes.value, ...minutes.value]
)

// One box reaching the whole record — the agenda, the notes, the write-up, and
// the words the row shows rather than stores, so "written up" and "notes" can
// simply be typed instead of being offered as a filter drawer.
const filteredMinutes = computed(() =>
  searchQuery.value.trim()
    ? minutes.value.filter((minute) => matchesMinuteQuery(minute, searchQuery.value))
    : allRows.value
)

// Each month a heading with its count over its meetings in one white block,
// the way every list in an app reads (ListGroup). Newest month first.
const minutesByMonth = computed(() => {
  const grouped = {}

  filteredMinutes.value.forEach(minute => {
    if (!minute.date) return

    const date = new Date(minute.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        label: monthLabel,
        minutes: []
      }
    }

    grouped[monthKey].minutes.push(minute)
  })

  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, value]) => ({ key, ...value }))
})

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = minutes.value.length
  return `${n.toLocaleString()} ${n === 1 ? 'meeting' : 'meetings'}`
})

const handleNewMinute = () => {
  newMinuteData.value = blankMinute()
  showEditMinute.value = false
  showAddMinute.value = true
}

// Placed here rather than in the template: `window` is not in template scope,
// and a menu on the last row of a long list has to open upward or it opens
// off the bottom of the screen.
const handleRowMenu = ({ minute, event }) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const MENU_HEIGHT = 96
  const below = window.innerHeight - rect.bottom > MENU_HEIGHT + 16
  rowMenu.value = {
    show: true,
    minute,
    top: below ? rect.bottom + 4 : rect.top - MENU_HEIGHT - 4,
    left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
  }
}

const handleEditMinute = (minute) => {
  const target = minute || rowMenu.value.minute
  closeRowMenu()
  if (!target) return
  editingMinute.value = { ...target }
  const { firestoreId, id, createdAt, updatedAt, structure, ...minuteData } = target
  // Extract agenda from structure if it exists
  newMinuteData.value = {
    ...minuteData,
    agenda: structure?.agenda || []
  }
  showAddMinute.value = false
  showEditMinute.value = true
}

const handleSaveMinute = async () => {
  try {
    if (showEditMinute.value && editingMinute.value) {
      // When editing, move agenda to structure
      const { agenda, ...minuteDataWithoutAgenda } = newMinuteData.value
      const currentStructure = editingMinute.value.structure || {
        agenda: [],
        discussions: {},
        decisions: {},
        actionItems: []
      }
      const updatedStructure = {
        ...currentStructure,
        agenda: agenda || []
      }
      await updateMinuteInFirestore(editingMinute.value, {
        ...minuteDataWithoutAgenda,
        structure: updatedStructure
      })
      showAddMinute.value = false
      showEditMinute.value = false
      editingMinute.value = null
      newMinuteData.value = blankMinute()
    } else {
      // Create new minute and redirect to editor
      const { agenda, ...minuteDataWithoutAgenda } = newMinuteData.value
      const structure = {
        agenda: agenda || [],
        discussions: {},
        decisions: {},
        actionItems: []
      }
      const minuteId = await addMinuteToFirestore({
        ...minuteDataWithoutAgenda,
        structure,
        // Recorded against the linked member when there is one, so the name on
        // the minutes matches the member list rather than a Google display name.
        createdBy: myMember.value ? getFullName(myMember.value) : ''
      })
      showAddMinute.value = false
      router.push({ name: 'MinuteDetails', params: { id: minuteId } })
    }
  } catch (error) {
    console.error('Error saving minute:', error)
    showConfirmModal({
      title: 'Could not save',
      message: 'Could not save that meeting. Please try again.',
      confirmText: 'OK',
      cancelText: '',
      onConfirm: () => {},
    })
  }
}

const handleDeleteMinute = (minute) => {
  const target = minute || rowMenu.value.minute
  closeRowMenu()
  if (!target) return

  showConfirmModal({
    title: 'Delete meeting',
    message: `Delete "${target.title}"? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'bg-red-600 text-white hover:bg-red-700',
    onConfirm: async () => {
      try {
        await removeMinute(target)
      } catch (error) {
        console.error('Error deleting minute:', error)
        showConfirmModal({
          title: 'Could not delete',
          message: 'Could not delete that meeting. Please try again.',
          confirmText: 'OK',
          cancelText: '',
          onConfirm: () => {},
        })
      }
    }
  })
}

const handleCancelMinute = () => {
  showAddMinute.value = false
  showEditMinute.value = false
  editingMinute.value = null
  newMinuteData.value = blankMinute()
}
</script>

<template>
  <div class="relative h-full">
    <AppScreen title="Meetings" :subtitle="subtitle" :back="{ name: 'MinutesHome' }" root="/minutes" desk>
      <!-- Opened from the floating button rather than always sitting there. -->
      <MinutesToolbar
        :search-query="searchQuery"
        :open="searchOpen"
        :result-count="filteredMinutes.length"
        :total-count="minutes.length"
        @update:search-query="searchQuery = $event"
        @close="closeSearch"
      />

      <div
        v-if="loading"
        class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
      >
        <div v-for="i in 8" :key="`skeleton-${i}`" class="flex items-center gap-4 p-3 sm:p-4">
          <div class="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-600"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
            <div class="h-3 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
          </div>
        </div>
      </div>

      <div v-else-if="filteredMinutes.length === 0" class="px-6 py-16 text-center">
        <FileText class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ searchQuery ? 'No meeting matches that.' : 'No minutes yet' }}
        </p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
          {{ searchQuery
            ? 'Try the month, or a word from the notes.'
            : 'Start one before the meeting: set the agenda, then type into it as you go.' }}
        </p>
        <button
          v-if="!searchQuery && canEdit"
          @click="handleNewMinute"
          class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          New meeting
        </button>
      </div>

      <div v-else class="flex flex-col gap-5">
        <ListGroup
          v-for="monthGroup in minutesByMonth"
          :key="monthGroup.key"
          :title="monthGroup.label"
          :count="monthGroup.minutes.length"
        >
          <MinuteListItem
            v-for="minute in monthGroup.minutes"
            :key="minute.id || minute.firestoreId"
            :minute="minute"
            :can-edit="canEdit"
            :starting="startingId === minute.id"
            @open="openMeeting"
            @menu="handleRowMenu"
          />
        </ListGroup>
      </div>
    </AppScreen>

    <!-- Add/Edit Minute Drawer -->
    <MinuteEditorDrawer
      :show="showAddMinute || showEditMinute"
      :is-edit="showEditMinute"
      :minute-data="newMinuteData"
      @update:show="handleCancelMinute"
      @update:minute-data="newMinuteData = $event"
      @save="handleSaveMinute"
      @cancel="handleCancelMinute"
    />

    <!-- Floating actions -->
    <MinutesFab
      v-if="!showAddMinute && !showEditMinute"
      @search="openSearch"
      @add="handleNewMinute"
    />

    <!-- Row overflow: editing the meeting's details, and deleting it. -->
    <Teleport to="body">
      <div v-if="rowMenu.show" class="fixed inset-0 z-90" @click="closeRowMenu">
        <div
          class="absolute w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 dark:border-gray-600 dark:bg-gray-800"
          :style="{ top: `${rowMenu.top}px`, left: `${rowMenu.left}px` }"
          @click.stop
        >
          <button
            @click="handleEditMinute()"
            class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Pencil class="h-4 w-4 shrink-0 text-gray-400" />
            Edit details
          </button>
          <button
            @click="handleDeleteMinute()"
            class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 class="h-4 w-4 shrink-0" />
            Delete
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      :show="showConfirmation"
      :title="confirmationConfig.title"
      :message="confirmationConfig.message"
      :confirm-text="confirmationConfig.confirmText"
      :cancel-text="confirmationConfig.cancelText"
      :confirm-button-class="confirmationConfig.confirmButtonClass"
      @update:show="showConfirmation = $event"
      @confirm="handleConfirmation"
      @cancel="showConfirmation = false"
    />
  </div>
</template>

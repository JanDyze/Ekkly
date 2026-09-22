<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAttendance } from '../composables/useAttendance'
import { useAttendanceStats } from '../composables/useAttendanceStats'
import { useMembers } from '../composables/useMembers'
import { usePermissions } from '../composables/usePermissions'
import { useEventStatus } from '../composables/useEventStatus'
import { useToast } from '../composables/useToast'
import { useMediaQuery } from '../composables/useMediaQuery'
import AttendanceListItem from '../components/attendance/AttendanceListItem.vue'
import AttendanceFab from '../components/attendance/AttendanceFab.vue'
import MemberBandHeader from '../components/members/MemberBandHeader.vue'
import AttendanceContextMenu from '../components/attendance/AttendanceContextMenu.vue'
import EventStatusSheet from '../components/events/EventStatusSheet.vue'
import ConfirmationModal from '../components/common/ConfirmationModal.vue'

// No toolbar, and nothing to add. Attendance follows the calendar rather than
// the other way round: a gathering is created on Events or in Settings, and
// this page is where its turnout gets written down. Everything past and
// unrecorded is already sitting in the list, so there is nothing here to
// invent. The plus button takes the oldest of them, and switches the layout.
//
// Laid out like People: a list or a grid of cards on a phone, the grid on a
// desktop, under the same sticky month headings.

const router = useRouter()
const toast = useToast()
const { canManage } = usePermissions()

const { aggregatedAttendance, loading, skipRecording, resumeRecording, removeAttendance } =
  useAttendance()
const { members } = useMembers()
const { setStatus } = useEventStatus()

const { stats } = useAttendanceStats(aggregatedAttendance, members)

// The one line of the old warnings banner that asked for something: the
// oldest gathering still to record. It lives on the plus button now.
const awaiting = computed(() =>
  !loading.value && canManage('attendance') ? stats.value.awaiting : null
)

// List or grid, as on People, remembered on this device only. Blocked or
// private-mode storage just falls back to the list.
const isMobile = useMediaQuery('(max-width: 1023px)')
const VIEW_KEY = 'ekkly:attendance-view'
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}
const mobileView = ref(readView())
const toggleMobileView = () => {
  mobileView.value = mobileView.value === 'grid' ? 'list' : 'grid'
  try {
    localStorage.setItem(VIEW_KEY, mobileView.value)
  } catch {
    // Not remembered this time; the switch itself still happened.
  }
}
const showGrid = computed(() => !isMobile.value || mobileView.value === 'grid')
// Two cards across a phone - a gathering has a title to fit, where a person
// is mostly a face - and three or four on a desktop.
const gridClass = computed(() =>
  isMobile.value ? 'grid grid-cols-2 gap-2 p-2' : 'grid grid-cols-3 gap-3 p-3 xl:grid-cols-4'
)

// Grouped on the raw 'YYYY-MM' prefix rather than a parsed Date, for the same
// reason the warnings are: `new Date('2026-08-01')` is UTC midnight and would
// file the first of the month under the previous one west of Greenwich. The
// two have to agree, or "this month" would report on a different set of
// gatherings than the month header directly beneath it.
const attendanceByMonth = computed(() => {
  const grouped = new Map()

  aggregatedAttendance.value.forEach((record) => {
    const key = String(record.date || '').slice(0, 7)
    if (!key) return

    if (!grouped.has(key)) {
      const [year, month] = key.split('-')
      grouped.set(key, {
        key,
        label: new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        records: [],
      })
    }
    grouped.get(key).records.push(record)
  })

  return [...grouped.values()].sort((a, b) => b.key.localeCompare(a.key))
})

// Recording is a screen of its own: the route carries only a key, and the
// record page looks the rest up from the same live list this page renders.
const openRecorder = (query = {}) => router.push({ name: 'RecordAttendance', query })

const handleRecordAttendance = (record) => openRecorder({ key: record?.occurrenceKey || record?.id })

const handleEditAttendance = (record) => openRecorder({ id: record?.firestoreId || record?.id })

// The menu a right-click or a long press on a row opens: calling the gathering
// off, or deleting its count. The row decides which of the two it can offer.
const contextMenu = ref({ show: false, x: 0, y: 0, record: null, canMark: false, canDelete: false })

// `el` comes only with a long press: the held row is lifted above a dimmed
// screen while its menu is open (HoldFocus.vue).
const openContextMenu = ({ record, x, y, canMark, canDelete, el = null }) => {
  contextMenu.value = { show: true, x, y, record, canMark, canDelete, el }
}

const closeContextMenu = () => {
  contextMenu.value.show = false
}

// Calling a gathering off, or deciding not to count it, from the list itself —
// the same sheet the Events page opens, so the answer means the same thing on
// both. A row is marked far more often from here, where the unrecorded ones
// are piling up, than from the calendar.
const showStatusSheet = ref(false)
const statusTarget = ref(null)

// Cancelling and postponing are calendar facts, and only a row that came from
// the calendar has somewhere to write them. A meeting or an already-saved
// record can still be left out of the count.
const statusAllowed = computed(() => {
  const row = statusTarget.value
  return row?.rowType === 'event' || row?.rowType === 'recurring'
})

// A write is in flight. Marking is one tap on the sheet's button and the sheet
// stays put while Firestore answers, so without this a double tap writes twice.
const marking = ref(false)

const openStatusSheet = (record) => {
  if (!canManage('attendance')) return
  statusTarget.value = record
  showStatusSheet.value = true
}

const closeStatusSheet = () => {
  showStatusSheet.value = false
  statusTarget.value = null
}

// A row carries the shape of whatever generated it, which is not the shape the
// calendar works in: the status writer wants the event or occurrence behind it.
const asCalendarEntry = (row) => ({
  ...row,
  id: row.occurrenceKey || row.id,
  firestoreId: row.rowType === 'recurring' ? null : row.firestoreId,
  isVirtual: row.rowType === 'recurring',
  title: row.eventTitle,
  type: row.eventType,
})

const applyStatus = async (change) => {
  const row = statusTarget.value
  if (!row || marking.value) return
  marking.value = true
  try {
    await setStatus(asCalendarEntry(row), change)
    closeStatusSheet()
  } catch (error) {
    console.error('Error changing status:', error)
    toast.error('Could not change that. Please try again.')
  } finally {
    marking.value = false
  }
}

const skipRow = async () => {
  const row = statusTarget.value
  if (!row || marking.value) return
  marking.value = true
  try {
    await skipRecording(row)
    closeStatusSheet()
    toast.success("Left out — it won't be asked for again")
  } catch (error) {
    console.error('Error skipping gathering:', error)
    toast.error('Could not skip that. Please try again.')
  } finally {
    marking.value = false
  }
}

// Deleting the count itself, which is nothing like calling a gathering off:
// the gathering happened, what goes is the record of who was there. It returns
// to the list as "Not recorded", ready to be done again — so this is also the
// way out of a count taken against the wrong Sunday.
const pendingDelete = ref(null)
const showConfirmDelete = ref(false)

const askDelete = (record) => {
  if (!canManage('attendance')) return
  pendingDelete.value = record
  showConfirmDelete.value = true
}

// Built here rather than inline: a `:message="..."` attribute cannot hold a
// straight double quote, and ConfirmationModal renders text, not HTML.
const confirmDeleteMessage = computed(() => {
  const row = pendingDelete.value
  const title = row?.eventTitle || 'this gathering'
  const when = row?.date ? ` on ${row.date}` : ''
  return `Delete the attendance recorded for "${title}"${when}? Everyone marked is wiped and it goes back to the list ready to record again. The gathering itself is untouched.`
})

const deleteRow = async () => {
  const row = pendingDelete.value
  if (!row) return
  try {
    await removeAttendance(row)
    toast.success('Attendance deleted')
  } catch (error) {
    console.error('Error deleting attendance:', error)
    toast.error('Could not delete that. Please try again.')
  } finally {
    pendingDelete.value = null
  }
}

const unskipRow = async () => {
  const row = statusTarget.value
  if (!row || marking.value) return
  marking.value = true
  try {
    await resumeRecording(row)
    closeStatusSheet()
  } catch (error) {
    console.error('Error restoring gathering:', error)
    toast.error('Could not undo that. Please try again.')
  } finally {
    marking.value = false
  }
}
</script>

<template>
  <div class="relative flex h-full flex-col">
    <!-- Square-cornered and edge to edge, like People: the list is the page,
         not a card set on it. -->
    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <!-- Room at the foot for the plus button and the bottom bar it floats
           over, so the last gathering scrolls clear of both. -->
      <div class="min-h-0 flex-1 overflow-y-auto pb-28 max-lg:pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <template v-if="loading">
          <div v-if="showGrid" :class="gridClass">
            <div
              v-for="i in 8"
              :key="`skeleton-${i}`"
              class="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50"
            >
              <div class="flex justify-between">
                <div class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
                <div class="h-12 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-gray-600"></div>
              </div>
              <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
              <div class="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
            </div>
          </div>
          <div v-else>
            <div v-for="i in 10" :key="`skeleton-${i}`" class="flex items-center gap-3 py-2 pl-4 pr-3">
              <div class="h-9 w-10 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
                <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
              </div>
              <div class="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-600"></div>
            </div>
          </div>
        </template>

        <p
          v-else-if="attendanceByMonth.length === 0"
          class="p-8 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          Nothing to show yet. Once an event, meeting or service has passed it appears here ready
          to record.
        </p>

        <!-- A month to a section, under the same sticky heading People uses.
             A month well off screen is skipped when the page is laid out. -->
        <section
          v-else
          v-for="monthGroup in attendanceByMonth"
          :key="monthGroup.key"
          class="[content-visibility:auto] [contain-intrinsic-size:auto_600px]"
        >
          <MemberBandHeader :band="monthGroup" :count="monthGroup.records.length" />
          <div :class="showGrid ? gridClass : ''">
            <AttendanceListItem
              v-for="record in monthGroup.records"
              :key="record.id"
              :record="record"
              :members="members"
              :can-manage="canManage('attendance')"
              :stacked="showGrid"
              @record-attendance="handleRecordAttendance(record)"
              @edit-attendance="handleEditAttendance(record)"
              @mark="openStatusSheet(record)"
              @delete="askDelete(record)"
              @contextmenu="openContextMenu"
            />
          </div>
        </section>
      </div>
    </div>

    <AttendanceFab
      :awaiting="awaiting"
      :view="isMobile ? mobileView : null"
      @record="openRecorder({ key: awaiting.key })"
      @toggle-view="toggleMobileView"
    />

    <AttendanceContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :record="contextMenu.record"
      :anchor="contextMenu.el"
      :can-mark="contextMenu.canMark"
      :can-delete="contextMenu.canDelete"
      @close="closeContextMenu"
      @mark="openStatusSheet"
      @delete="askDelete"
    />

    <!-- Cancelled, postponed, or simply not being counted. The same sheet the
         calendar opens, plus the one option only this page has. -->
    <EventStatusSheet
      :show="showStatusSheet"
      :event="statusTarget"
      :allow-skip="true"
      :allow-status="statusAllowed"
      :busy="marking"
      :skipped="Boolean(statusTarget?.skipped)"
      @close="closeStatusSheet"
      @apply="applyStatus"
      @skip="skipRow"
      @unskip="unskipRow"
    />

    <ConfirmationModal
      :show="showConfirmDelete"
      title="Delete attendance"
      :message="confirmDeleteMessage"
      confirm-text="Delete"
      cancel-text="Keep"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="showConfirmDelete = $event"
      @confirm="deleteRow"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, EyeSlash } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import SwipeRow from '../../components/appframe/SwipeRow.vue'
import { useAttendanceOverview } from '../../composables/useAttendanceOverview'
import { useToast } from '../../composables/useToast'
import { eventTypeLabel } from '../../utils/eventColors'

// Every gathering that has happened and nobody has counted, oldest first,
// and the way to say one will not be.
//
// The list of gatherings carries these as "Not recorded" rows among the rest,
// which leaves finding them all to scrolling. This is just them, each opening
// straight into the recorder.
//
// Some will never be counted, and that is a fact rather than a failing: the
// service happened but nobody had the list, the prayer meeting was four
// people in a kitchen. Swiping a row left says so (SwipeRow) — it is an
// occasional thing, so it waits behind the row rather than sitting on every
// one as a button — and the gathering stops being asked for: here, on the
// home, on the home of all apps. It is not
// calling the gathering off: it happened, and the calendar still says so.
// Called off is a calendar fact, marked from Gatherings by holding a row.
// What was left out waits at the foot, each with an Undo, so a leaving-out
// can be taken back.

const { loading, awaiting, leftOut, skipRecording, resumeRecording } = useAttendanceOverview()
const toast = useToast()

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = awaiting.value.length
  return n ? `${n} still to count` : 'Everything is counted'
})

const keyOf = (row) => String(row.occurrenceKey || row.id)
const recorderOf = (row) => ({ name: 'RecordAttendance', query: { key: keyOf(row) } })

const detailOf = (row) =>
  [eventTypeLabel(row.eventType), row.expectedAttendees ? `${row.expectedAttendees} expected` : ''].filter(Boolean).join(' · ')

const shortDate = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

// The row a write is in flight for, so a second tap cannot write twice.
const busy = ref(null)

const leaveOut = async (row) => {
  if (busy.value) return
  busy.value = keyOf(row)
  try {
    await skipRecording(row)
    toast.success(`${row.eventTitle || 'That gathering'} left out — it won't be asked for again`)
  } catch (error) {
    console.error('Error leaving a gathering out:', error)
    toast.error('Could not leave that out. Please try again.')
  } finally {
    busy.value = null
  }
}

const countAfterAll = async (row) => {
  if (busy.value) return
  busy.value = keyOf(row)
  try {
    await resumeRecording(row)
    toast.success(`${row.eventTitle || 'That gathering'} is back on the list to count`)
  } catch (error) {
    console.error('Error putting a gathering back:', error)
    toast.error('Could not undo that. Please try again.')
  } finally {
    busy.value = null
  }
}

// The last few left out are enough to take one back; the rest are history.
const SHOWN = 10
</script>

<template>
  <AppScreen title="To record" :subtitle="subtitle" :back="{ name: 'AttendanceHome' }" root="/attendance">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <ListGroup
        v-if="awaiting.length"
        title="Oldest first"
        :count="awaiting.length"
        note="Swipe one left to leave it out: it happened, and nobody will count it. To say it never happened, hold its row in Gatherings."
      >
        <SwipeRow
          v-for="row in awaiting"
          :key="keyOf(row)"
          label="Leave out"
          :busy="busy === keyOf(row)"
          @action="leaveOut(row)"
        >
          <template #icon>
            <EyeSlash class="size-5" />
          </template>
          <RouterLink
            :to="recorderOf(row)"
            draggable="false"
            class="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/40 dark:active:bg-gray-700/60"
          >
            <DateTile :date="row.date" past />
            <span class="min-w-0 flex-1 pointer-fine:pr-10">
              <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">
                {{ row.eventTitle || 'Untitled' }}
              </span>
              <span v-if="detailOf(row)" class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">{{ detailOf(row) }}</span>
            </span>
            <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </RouterLink>
        </SwipeRow>
      </ListGroup>

      <ListGroup v-else>
        <ListRow title="Every gathering is counted" muted />
      </ListGroup>

      <!-- What was left out, newest first, each one tap from coming back. -->
      <ListGroup
        v-if="leftOut.length"
        title="Left out"
        :count="leftOut.length"
        note="These happened, and nobody is counting them. They no longer appear as owed anywhere."
      >
        <ListRow
          v-for="row in leftOut.slice(0, SHOWN)"
          :key="row.firestoreId || row.id"
          :title="row.eventTitle || 'Untitled'"
          :subtitle="shortDate(row.date)"
          muted
        >
          <template #trailing>
            <button
              type="button"
              :disabled="Boolean(busy)"
              :aria-label="`Count ${row.eventTitle || 'this gathering'} after all`"
              class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 dark:text-primary-light"
              @click="countAfterAll(row)"
            >
              {{ busy === keyOf(row) ? '…' : 'Undo' }}
            </button>
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>

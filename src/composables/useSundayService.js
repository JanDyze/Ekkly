import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { subscribeToRecurringSchedules } from '../api/recurringSchedulesService'
import { scheduleFallsOn, toDateString } from '../../lib/occurrences'
import { yunitHushed } from '../utils/yunitFeedback'

// Whether the church is at its Sunday service right now, read off the weekly
// services in Settings: a worship service on a Sunday, from a little before it
// starts (people are finding their seats) until it has had time to finish.
// While it is, YUNIT wears a tie and makes no sound at all (yunitHushed).
//
// A schedule has a start time and no end, so the end is a guess: two and a
// half hours covers a long service and the prayer after it.
const BEFORE = 30
const LENGTH = 150

// Shared across callers, like useTasks: the home and the YUNIT page both ask,
// and one listener is enough.
const schedules = ref([])
const now = ref(Date.now())
const preview = ref(null)
let unsubscribe = null
let clock = null
let subscribers = 0

const minutesOf = (time) => {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

const inService = computed(() => {
  if (preview.value !== null) return preview.value
  const at = new Date(now.value)
  if (at.getDay() !== 0) return false
  const today = toDateString(at)
  const minute = at.getHours() * 60 + at.getMinutes()
  return schedules.value.some((schedule) => {
    if (!schedule.enabled || schedule.weekday !== 0 || schedule.type !== 'worship') return false
    if (!scheduleFallsOn(schedule, today)) return false
    const start = minutesOf(schedule.time)
    return minute >= start - BEFORE && minute < start + LENGTH
  })
})

watch(inService, (on) => (yunitHushed.value = on), { immediate: true })

// A service to look at without waiting for Sunday, as `?sky=` is for the sky:
// `?service=on` puts it on, `?service=off` takes it off, on that page only.
const previewOf = () => {
  try {
    const asked = new URLSearchParams(window.location.search).get('service')
    return asked === 'on' ? true : asked === 'off' ? false : null
  } catch {
    return null
  }
}

export function useSundayService() {
  onMounted(() => {
    subscribers += 1
    preview.value = previewOf()
    now.value = Date.now()
    if (unsubscribe) return
    unsubscribe = subscribeToRecurringSchedules((data) => (schedules.value = data))
    // The service starts and ends on the clock, not on any change to the data.
    clock = setInterval(() => (now.value = Date.now()), 60 * 1000)
  })

  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0 && unsubscribe) {
      unsubscribe()
      unsubscribe = null
      clearInterval(clock)
      clock = null
      subscribers = 0
      preview.value = null
    }
  })

  return { inService }
}

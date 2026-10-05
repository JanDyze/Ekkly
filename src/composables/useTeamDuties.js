import { onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from './useAuth'
import { useMyMember } from './useMyMember'
import { saveTeamDay, saveTeamDuties, subscribeToTeamDays, subscribeToTeamDuties } from '../api/teamDutiesService'
import { getDisplayName } from '../utils/memberUtils'

// Shared across callers, like useTasks: each team's weekly list, and every
// Sunday's ticks against it.
const duties = ref({})
const days = ref({})
const loading = ref(true)
let stop = null
let subscribers = 0

export function useTeamDuties() {
  const { user } = useAuth()
  const { myMember } = useMyMember()

  onMounted(() => {
    subscribers += 1
    if (stop) return
    let pending = 2
    const settle = () => {
      pending -= 1
      if (pending <= 0) loading.value = false
    }
    const offDuties = subscribeToTeamDuties((data) => {
      duties.value = data
      settle()
    })
    const offDays = subscribeToTeamDays((data) => {
      days.value = data
      settle()
    })
    stop = () => {
      offDuties()
      offDays()
    }
  })

  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0 && stop) {
      stop()
      stop = null
      subscribers = 0
    }
  })

  const dutiesOf = (team) => duties.value[team] || []
  const doneOn = (date, team) => days.value[date]?.[team] || {}

  /** How far a team got on a Sunday: `{ done, total }`, counting only jobs still on the list. */
  const progressOn = (date, team) => {
    const list = dutiesOf(team)
    const done = doneOn(date, team)
    return { done: list.filter((d) => done[d.id]).length, total: list.length }
  }

  /** Ticks or unticks one job, saying who did it. */
  const toggle = (date, team, dutyId) => {
    const done = { ...doneOn(date, team) }
    if (done[dutyId]) delete done[dutyId]
    else {
      done[dutyId] = {
        by: myMember.value ? getDisplayName(myMember.value) : user.value?.displayName || user.value?.email || '',
        at: new Date().toISOString(),
      }
    }
    return saveTeamDay(date, team, done)
  }

  return {
    duties,
    days,
    loading,
    dutiesOf,
    doneOn,
    progressOn,
    toggle,
    saveDuties: saveTeamDuties,
  }
}

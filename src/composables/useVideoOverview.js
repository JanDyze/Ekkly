import { computed } from 'vue'
import { useAnnouncementVideos } from './useAnnouncementVideos'
import { useEvents } from './useEvents'
import { useRecurringSchedules } from './useRecurringSchedules'
import { useSmallGroups } from './useSmallGroups'
import { useAllLineups } from './useLineups'
import { useMembers } from './useMembers'
import { useAppSettings } from './useAppSettings'
import { isAppEnabled } from './useChurchApps'
import { monthKeyOf, shiftMonth, todayIso } from '../utils/lineupUtils'
import { applyEdits, automaticScenes, monthName, secondsFor } from '../utils/video/scenes'
import { churchLink } from '../utils/video/assets'

// Every month's announcement video as the Videos app sees it: what the
// calendar and the rest of the church's records say, with the church's own
// changes laid over. One reading, so the home's hero, its tiles and the studio
// cannot disagree about what October's video holds.
//
// The video is the same for everyone who opens it. It is not narrowed to what
// the viewer may browse elsewhere: the person who made it chose what it says,
// and it is made to be shown to the whole church. An app the church has
// switched off is left out, because then there is nothing to announce.

const HANDOVER = 0.7

export function useVideoOverview() {
  const videos = useAnnouncementVideos()
  const { settings, monthOf } = videos
  const { events, loading: eventsLoading } = useEvents()
  const { schedules, loading: schedulesLoading } = useRecurringSchedules()
  const { groups, loading: groupsLoading } = useSmallGroups()
  const { lineups, loading: lineupsLoading } = useAllLineups()
  const { members } = useMembers()
  const { church } = useAppSettings()

  const loading = computed(
    () =>
      videos.loading.value ||
      eventsLoading.value ||
      schedulesLoading.value ||
      (isAppEnabled('smallgroups') && groupsLoading.value) ||
      (isAppEnabled('lineups') && lineupsLoading.value)
  )

  const today = todayIso()
  const thisMonth = monthKeyOf()
  const nextMonth = shiftMonth(thisMonth, 1)

  /** Every scene of a month, the left-out ones flagged `hidden`, each with its length. */
  const scenesFor = (monthKey) => {
    const auto = automaticScenes({
      monthKey,
      today,
      events: events.value,
      schedules: schedules.value,
      groups: isAppEnabled('smallgroups') ? groups.value : [],
      lineups: isAppEnabled('lineups') ? lineups.value : [],
      members: members.value,
      church: church.value,
      sources: settings.value.sources,
      words: settings.value.words,
      split: { ...settings.value.split, ...monthOf(monthKey).split },
      link: churchLink(),
    })
    const base = Number(settings.value.style.seconds) || 6
    // `secondsChosen` is what someone set by hand, kept apart from the length
    // worked out, so the edit sheet can tell "6 seconds" from "automatic".
    return applyEdits(auto, monthOf(monthKey)).map((scene) => ({
      ...scene,
      secondsChosen: Number(scene.seconds) || 0,
      seconds: secondsFor(scene, base),
    }))
  }

  const shown = (scenes) => scenes.filter((scene) => !scene.hidden)

  /** What is being announced — everything but the opening and closing cards. */
  const announcements = (scenes) =>
    shown(scenes).filter((scene) => scene.kind !== 'intro' && scene.kind !== 'outro')

  /** Seconds, as the player will run it: scenes overlap while they hand over. */
  const lengthOf = (scenes) => {
    const list = shown(scenes)
    if (!list.length) return 0
    return list.reduce((sum, scene) => sum + scene.seconds, 0) - HANDOVER * (list.length - 1)
  }

  const thisMonthScenes = computed(() => scenesFor(thisMonth))
  const nextMonthScenes = computed(() => scenesFor(nextMonth))

  return {
    ...videos,
    loading,
    today,
    thisMonth,
    nextMonth,
    thisMonthScenes,
    nextMonthScenes,
    scenesFor,
    shown,
    announcements,
    lengthOf,
    monthName,
  }
}

/** "0:54", "1:12" */
export const formatLength = (seconds) => {
  const s = Math.max(0, Math.round(seconds || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

import { computed } from 'vue'
import { useAnnouncementVideos } from './useAnnouncementVideos'
import { useEvents } from './useEvents'
import { useRecurringSchedules } from './useRecurringSchedules'
import { useSmallGroups } from './useSmallGroups'
import { useAllLineups } from './useLineups'
import { useMembers } from './useMembers'
import { useAppSettings } from './useAppSettings'
import { isAppEnabled } from './useChurchApps'
import { monthKeyOf, parseIso, shiftMonth, todayIso } from '../utils/lineupUtils'
import { daysBetween } from '../utils/taskUtils'
import { scheduleFallsOn } from '../../lib/occurrences'
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
//
// The home's deck is earned the way the other apps' are — a card only for
// something whoever posts the video would act on this week:
//
//   - the video for the month's first gathering, in the week before it. A
//     month's announcements are shown, or posted, as the month opens, and the
//     first time the church meets in it is the day they are for. That day is
//     read from the church's own main service (the one the closing card
//     names), not assumed to be a Sunday, and the week before it is when the
//     file has to be made, checked and posted;
//   - a change of plan in the next fortnight: something called off, put
//     back or moved. A video already posted still says it is on, so people
//     may turn up for it; it is the one announcement that cannot wait for
//     next month's;
//   - events that reached the calendar after somebody arranged a month's
//     running order. They arrive on their own, but just before the closing
//     card rather than in date order, so whoever arranged it should look
//     again. Only events, special Sundays and changes of plan count: those
//     are what other people add, whereas an announcement written by hand, or
//     a list split into one card each, is the arranger's own doing.
//
// Left out on purpose: "the video is ready to download" (it always is — the
// video is drawn afresh whenever it is opened, so that is the card that is
// always there, not news); the look and the music (chosen once, used every
// month, never a weekly job); wording changed by hand that the calendar has
// since moved past (with no record of when either changed, a deliberate
// rewording cannot be told from a stale one); the church's own music missing
// on this device (only known by decoding the audio, which the home should not
// do just to be opened); and whether the file was made or posted at all,
// which nothing records — putting the card away is how somebody says so.

const HANDOVER = 0.7

// How far ahead a change of plan is worth a card: two Sundays, the most a
// video posted at the start of the month can still mislead before the next.
const CHANGES_AHEAD = 14

// The week before a month's first gathering, when its video is made.
const POSTING_WEEK = 7

// Announcements that come from somebody else adding to the calendar.
const CALENDAR_KINDS = ['event', 'change', 'occasion']

/** Every `YYYY-MM-DD` in a month. */
const daysIn = (monthKey) => {
  const [year, month] = String(monthKey).split('-').map(Number)
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`)
}

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
  // The two months the home shows are worked out once; any other is drawn
  // when asked for.
  const scenesOf = (monthKey) => {
    if (monthKey === thisMonth) return thisMonthScenes.value
    if (monthKey === nextMonth) return nextMonthScenes.value
    return scenesFor(monthKey)
  }

  /* ------------------------------------------------------ what to act on */

  // The church's main service, as the closing card picks it: the Sunday one
  // where there is one, otherwise the first it keeps.
  const mainService = computed(() => {
    const enabled = schedules.value.filter((s) => s.enabled !== false)
    return enabled.find((s) => s.weekday === 0) || enabled[0] || null
  })

  /** The first day of a month the church meets: its main service, or the first Sunday without one. */
  const firstGathering = (monthKey) => {
    const main = mainService.value
    return daysIn(monthKey).find((day) => (main ? scheduleFallsOn(main, day) : parseIso(day)?.getDay() === 0)) || ''
  }

  /**
   * The month whose video is shown next, the day it is shown and how many
   * days off that is: this month's while its first gathering is still to
   * come, otherwise next month's.
   */
  const upNext = computed(() => {
    const ahead = firstGathering(thisMonth)
    const monthKey = ahead && ahead >= today ? thisMonth : nextMonth
    const date = monthKey === thisMonth ? ahead : firstGathering(nextMonth)
    return { monthKey, date, days: date ? daysBetween(today, date) : Infinity }
  })

  /** The same, only in the week before that day, when its video is to be made. */
  const dueSoon = computed(() => (upNext.value.days <= POSTING_WEEK ? upNext.value : null))

  /** Changes of plan still in a video, in the next fortnight, soonest first. */
  const changesAhead = computed(() =>
    [...shown(thisMonthScenes.value), ...shown(nextMonthScenes.value)]
      .filter((scene) => scene.kind === 'change' && scene.date >= today && daysBetween(today, scene.date) <= CHANGES_AHEAD)
      .sort((a, b) => a.date.localeCompare(b.date))
  )

  /**
   * What reached the calendar after a month's running order was arranged:
   * nothing for a month nobody has arranged, which follows the calendar's own
   * order and so has nothing out of place.
   */
  const arrivedSince = (monthKey) => {
    const order = monthOf(monthKey).order
    if (!order.length) return []
    const placed = new Set(order)
    return shown(scenesOf(monthKey)).filter((scene) => CALENDAR_KINDS.includes(scene.kind) && !placed.has(scene.id))
  }

  return {
    ...videos,
    loading,
    today,
    thisMonth,
    nextMonth,
    thisMonthScenes,
    nextMonthScenes,
    scenesFor,
    scenesOf,
    firstGathering,
    upNext,
    dueSoon,
    changesAhead,
    arrivedSince,
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

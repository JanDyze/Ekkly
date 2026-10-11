import { computed, onMounted, onUnmounted, ref } from 'vue'
import { subscribeToSongs } from '../api/songsService'
import { useScheduleOverview } from './useScheduleOverview'
import { useServicePlans } from './useServicePlans'
import { useSermons } from './useSermons'
import { usePermissions } from './usePermissions'
import { reconcileWithLineup, reconcileWithSermon, runSheetFromSunday } from '../utils/presentation'
import { hasLyrics } from '../utils/songUtils'
import { parseIso, todayIso } from '../utils/lineupUtils'

/**
 * What the Presentation app's home says about the services there are to run,
 * in one place, so its deck and its tiles cannot disagree (the way
 * useMinutesOverview and useScheduleOverview serve their homes).
 *
 * The run sheet is worked out the way the presenter works it out
 * (views/Present.vue): the tech team's saved one, or the lineup's songs when
 * there is none, then brought into line with the lineup and the preacher's
 * message. Only the operator's own edits are ever saved, so the stored
 * document alone would miss every reading the message has added since — and
 * the home would call a Sunday bare that the booth will find full.
 *
 * The deck is earned the way the other apps' are — a card only for something
 * the tech team would act on this week:
 *
 *   - the next service's items that would put up a blank screen: a song with
 *     no words saved, or no longer in the song list, a reading never looked
 *     up, a notice with nothing typed in. Each is a dead slide in front of the
 *     congregation, and every one of them is fixed in a minute on a weekday
 *     and not at all mid-song;
 *   - a reading or the notices missing from this Sunday when this church
 *     nearly always has them. Earned from the church's own habit — the last
 *     eight Sundays — not from a rule that every service needs a reading,
 *     because plenty of churches never project notices at all, and a card
 *     telling them to every week would soon be one nobody reads.
 *
 * Left out on purpose:
 *   - what is live right now. The booth holds that in its own browser and
 *     never saves it (PRESENTER_CHANNEL), so no other device can know — and
 *     the one person who could act on it is already looking at it;
 *   - songs not yet picked, roles nobody is on, a message not yet written.
 *     Those are the worship team's, the planners' and the preacher's to do,
 *     and Schedules' home already gives each of them the card. Here they
 *     appear only as the reason a reading is missing;
 *   - this month's announcement video, which is the Videos app's card;
 *   - a service with no run sheet of its own. The presenter starts it from
 *     the lineup by itself, so "not prepared" was never something to do.
 */

// How many past Sundays say what a church usually puts on the screen: two
// months, long enough that one odd week does not set the habit.
const HABIT_SUNDAYS = 8

export function usePresentationOverview() {
  const { loading: scheduleLoading, services, upcoming, next, leaderOf } = useScheduleOverview()
  const { plans, loading: plansLoading } = useServicePlans()
  const { sermonOn, loading: sermonsLoading } = useSermons()
  const { can, canManage, myMember } = usePermissions()

  // The song list, for whether each song on a run sheet has its words.
  const songs = ref([])
  const songsLoading = ref(true)
  let unsubscribeSongs = null
  onMounted(() => {
    unsubscribeSongs = subscribeToSongs((data) => {
      songs.value = data
      songsLoading.value = false
    })
  })
  onUnmounted(() => unsubscribeSongs?.())

  const songsById = computed(() => Object.fromEntries(songs.value.map((song) => [String(song.id), song])))

  // A song only reads as missing once the list has arrived; before that every
  // song would.
  const loading = computed(
    () => scheduleLoading.value || plansLoading.value || sermonsLoading.value || songsLoading.value
  )

  // Editing a run sheet is whoever plans Schedules (the presenter's own
  // test); putting words on a song is whoever manages the song list.
  const canRun = computed(() => canManage('lineups'))
  const canFixWords = computed(() => canManage('songs'))
  const canSeeSongs = computed(() => can('songs.view'))

  const today = todayIso()

  const daysUntil = (iso) => {
    const from = parseIso(today)
    const to = parseIso(iso)
    return from && to ? Math.round((to - from) / 86400000) : 0
  }

  /** The run sheet a service will open with in the presenter. */
  const runSheetOf = (sunday) => {
    const saved = plans.value[sunday.date]
    const base = saved ? saved.items : runSheetFromSunday(sunday, songsById.value)
    return reconcileWithSermon(reconcileWithLineup(base, sunday, songsById.value), sermonOn(sunday.date))
  }

  /** Why an item would put up nothing, or '' when it is fine. */
  const blankReason = (item) => {
    if (item.type === 'song') {
      const song = songsById.value[String(item.songId)]
      if (!song) return 'Not in the song list'
      return hasLyrics(song) ? '' : 'No words yet'
    }
    if (item.type === 'scripture') return item.verses?.length || String(item.body || '').trim() ? '' : 'Never looked up'
    if (item.type === 'text' || item.type === 'announcement') return String(item.body || '').trim() ? '' : 'Nothing typed in'
    // A video or a deck from another program is a cue the operator plays, and
    // whether its file is on the booth's machine is not something saved.
    return ''
  }

  /** A notice is anything typed for the screen that the message did not put there. */
  const isNotice = (item) => item.type === 'announcement' || (item.type === 'text' && !item.fromSermon)

  /** One service as the booth sees it: what is in it, and what would show nothing. */
  const summarise = (sunday) => {
    const items = runSheetOf(sunday)
    const blanks = items
      .map((item) => ({ item, reason: blankReason(item) }))
      .filter((row) => row.reason)
    return {
      date: sunday.date,
      sunday,
      items,
      prepared: Boolean(plans.value[sunday.date]),
      days: daysUntil(sunday.date),
      counts: {
        songs: items.filter((i) => i.type === 'song').length,
        readings: items.filter((i) => i.type === 'scripture').length,
        notices: items.filter(isNotice).length,
        other: items.filter((i) => ['video', 'slides'].includes(i.type)).length,
      },
      blanks,
      // Songs alone, for the card that says so in a song's words.
      onlySongs: blanks.length > 0 && blanks.every((row) => row.item.type === 'song'),
    }
  }

  /** The service being prepared: the next one on the schedule. */
  const nextService = computed(() => (next.value ? summarise(next.value) : null))

  /** The next service, when it falls within the week — the one there is still time to fix. */
  const thisWeek = computed(() => (nextService.value && nextService.value.days <= 6 ? nextService.value : null))

  /* ------------------------------------------------------ the church's habit */

  const recent = computed(() =>
    services.value
      .filter((sunday) => sunday.date < today)
      .slice(-HABIT_SUNDAYS)
      .map(runSheetOf)
  )

  /**
   * The kinds of thing this church nearly always puts up and the coming
   * Sunday does not have yet, each with how often it was there. Four Sundays
   * at least before anything counts as a habit, and three in four of them.
   */
  const usuallyMissing = computed(() => {
    const service = thisWeek.value
    const past = recent.value
    if (!service || past.length < 4) return []
    return [
      { kind: 'reading', has: (items) => items.some((i) => i.type === 'scripture') },
      { kind: 'notices', has: (items) => items.some(isNotice) },
    ]
      .map(({ kind, has }) => ({ kind, had: past.filter(has).length, of: past.length, missing: !has(service.items) }))
      .filter((row) => row.missing && row.had / row.of >= 0.75)
  })

  /* ------------------------------------------------------ the sections */

  /**
   * Every song on the services still to come, once each, with the Sundays it
   * is sung on and whether its words are in — those still to fix first, then
   * in the order they are sung.
   */
  const songsAhead = computed(() => {
    const bySong = new Map()
    upcoming.value.forEach((sunday) => {
      runSheetOf(sunday)
        .filter((item) => item.type === 'song')
        .forEach((item) => {
          const id = String(item.songId || item.title)
          if (!bySong.has(id)) {
            const song = songsById.value[String(item.songId)] || null
            bySong.set(id, { key: id, song, title: song?.title || item.title || 'Untitled', reason: blankReason(item), dates: [] })
          }
          const row = bySong.get(id)
          if (!row.dates.includes(sunday.date)) row.dates.push(sunday.date)
        })
    })
    const rows = [...bySong.values()]
    return [...rows.filter((row) => row.reason), ...rows.filter((row) => !row.reason)]
  })
  const wordsMissing = computed(() => songsAhead.value.filter((row) => row.reason))

  /**
   * Every passage read on a Sunday, newest Sunday first: the reading from
   * three weeks ago is what someone opens an old run sheet to find.
   */
  const readings = computed(() =>
    [...services.value]
      .reverse()
      .flatMap((sunday) =>
        runSheetOf(sunday)
          .filter((item) => item.type === 'scripture' && (item.reference || item.title))
          .map((item, index) => ({
            key: `${sunday.date}:${item.id || index}`,
            date: sunday.date,
            reference: item.reference || item.title,
            version: item.version || '',
            verses: item.verses || [],
            fromSermon: Boolean(item.fromSermon),
            past: sunday.date < today,
          }))
      )
  )

  return {
    loading,
    myMember,
    canRun,
    canFixWords,
    canSeeSongs,
    upcoming,
    next,
    nextService,
    thisWeek,
    usuallyMissing,
    songsAhead,
    wordsMissing,
    readings,
    sermonOn,
    leaderOf,
    daysUntil,
  }
}

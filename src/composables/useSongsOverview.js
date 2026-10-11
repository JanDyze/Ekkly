import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSongs } from './useSongs'
import { useMembers } from './useMembers'
import { usePermissions } from './usePermissions'
import { isSundayPlanned } from './useLineups'
import { subscribeToLineups } from '../api/lineupsService'
import { SONG_LEADER_ROLE, assignmentsOf } from '../data/scheduleRoles'
import { TEAMS } from '../data/scheduleTeams'
import { findRosterMember, isoDateOf, keyForLeader, todayIso } from '../utils/lineupUtils'
import { getDisplayName } from '../utils/memberUtils'
import { hasLyrics } from '../utils/songUtils'
import { daysBetween } from '../utils/taskUtils'

/**
 * What the Songs app's home says about the song list, in one place, so its
 * deck, its tiles and its sections cannot disagree (the way useMinutesOverview
 * and usePeopleOverview serve theirs).
 *
 * A song list on its own is a reference book: nobody acts on it until a Sunday
 * asks something of it. So almost everything here is read through the
 * schedules (worshipLineups): which songs are on the coming Sunday, which have
 * been sung and when. Someone who cannot see the schedules still gets the
 * list and the songs missing their words; they just do not get the Sundays.
 *
 * The deck is earned the way the other apps' are — a card only for something
 * somebody would act on this week:
 *
 *   - this week's Sunday and its songs, said once with whatever is missing
 *     from them: a song with no lyrics is a slide the tech team cannot make,
 *     and one with no key is a band that starts in the wrong place. Amber only
 *     for someone who can fix one of the two — songs.manage the words, the
 *     worship planners the keys — because to anyone else it is news, not a job;
 *   - songs added lately that no Sunday has used yet, for the worship
 *     planners: a song is added because somebody wants the church to learn
 *     it, and one left on the list unplanned is forgotten by the time the
 *     month is planned;
 *   - every song still without its words, for whoever edits songs — a
 *     standing chore, remembered until the pile grows, the way People's
 *     records to complete are.
 *
 * Left out on purpose:
 *   - "Sunday has no songs yet." Planning the songs is the worship team's part
 *     of a Sunday, and the Schedules home already asks them for it; a second
 *     card here would be one job reminded twice.
 *   - "Not sung in a long time." Worth looking at while choosing songs, never
 *     a thing to do this week. It is a section (Most sung), where the
 *     songs resting longest are listed for whoever is choosing.
 *   - The most sung songs as a card. A fact, not a task: the same section.
 *   - A song with no recording. The link is required to save a song at all.
 */

const RECENT_DAYS = 30
// Long enough that a song is not called resting between two Sundays it was
// sung on, short enough that a quarter without it is noticed.
const RESTING_DAYS = 90

/** Titles as the schedule and the list might each have spelled them. */
const titleKey = (title) => String(title || '').toLowerCase().replace(/\s+/g, ' ').trim()

const dateOfCreated = (song) => {
  const value = song?.createdAt
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function useSongsOverview() {
  const { songs, loading: songsLoading } = useSongs()
  const { members } = useMembers()
  const { can, canManage } = usePermissions()

  const today = todayIso()

  const canEdit = computed(() => canManage('songs'))
  // The Sundays are the schedules' to show, so only someone who may see them
  // gets anything read from them here.
  const seesSundays = computed(() => can('lineups.view'))
  // Whoever plans the worship sets the key a Sunday is sung in.
  const canPlanWorship = computed(() => canManage('lineups') || canManage('worship'))
  // A month still in draft is shown only to whoever plans any part of it, as
  // in Schedules (useScheduleOverview).
  const canPlanAny = computed(() => canManage('lineups') || TEAMS.some((team) => canManage(team.area)))

  /* ------------------------------------------------------- the schedules */

  // Listened to only while the schedules may be seen: someone without them
  // would otherwise have a listener refused on every visit.
  const lineups = ref([])
  const lineupsLoading = ref(true)
  let stopLineups = null
  let mounted = false

  const startLineups = () => {
    if (stopLineups || !mounted || !seesSundays.value) return
    stopLineups = subscribeToLineups((data) => {
      lineups.value = data
      lineupsLoading.value = false
    })
  }
  const endLineups = () => {
    stopLineups?.()
    stopLineups = null
  }

  onMounted(() => {
    mounted = true
    startLineups()
  })
  onUnmounted(() => {
    mounted = false
    endLineups()
  })
  watch(seesSundays, (yes) => (yes ? startLineups() : endLineups()))

  const loading = computed(() => songsLoading.value)
  const sundaysLoading = computed(() => seesSundays.value && lineupsLoading.value)

  /** Every planned service the account may see, soonest first, with its month. */
  const services = computed(() =>
    lineups.value
      .filter((month) => canPlanAny.value || month.status === 'published')
      .flatMap((month) => month.sundays.map((sunday) => ({ ...sunday, month: month.month, draft: month.status !== 'published' })))
      .filter((sunday) => sunday.date && isSundayPlanned(sunday))
      .sort((a, b) => a.date.localeCompare(b.date))
  )

  /* ------------------------------------------------- songs and their sets */

  const byId = computed(() => new Map(songs.value.map((song) => [String(song.id), song])))
  const byTitle = computed(() => new Map(songs.value.map((song) => [titleKey(song.title), song])))

  /**
   * The song on the list a schedule's entry means: by its id, or by its title
   * for an entry typed before the two were linked. Null for one that has since
   * been deleted from the list.
   */
  const songFor = (entry) =>
    byId.value.get(String(entry?.songId || '')) || byTitle.value.get(titleKey(entry?.title)) || null

  const idOf = (song) => String(song.id)

  const leaderIdOf = (sunday) => assignmentsOf(sunday)[SONG_LEADER_ROLE]?.[0] || null

  /** Who leads a Sunday, by the name the church calls them. */
  const leaderOf = (sunday) => {
    const member = findRosterMember(members.value, leaderIdOf(sunday))
    return member ? getDisplayName(member) : ''
  }

  /**
   * A Sunday's songs, each with what it still needs: its words on the list,
   * and a key — the schedule's own for that Sunday, or else the one its
   * leader sings it in, as the schedule itself falls back.
   */
  const setOf = (sunday) => {
    const leaderId = leaderIdOf(sunday)
    return (sunday?.songs || []).map((entry, index) => {
      const song = songFor(entry)
      const key = entry.key || keyForLeader(song, leaderId)
      return {
        id: `${sunday.date}:${index}`,
        entry,
        song,
        title: entry.title || song?.title || 'Untitled',
        musicKey: key,
        notOnList: !song,
        noLyrics: !song || !hasLyrics(song),
        noKey: !key,
      }
    })
  }

  /** The services still to come that have songs on them, soonest first. */
  const comingSets = computed(() =>
    services.value.filter((sunday) => sunday.date >= today && sunday.songs?.length)
  )

  /** This week's: the next service with songs, when it is within six days. */
  const nextSet = computed(() => {
    const next = comingSets.value[0]
    return next && daysBetween(today, next.date) <= 6 ? next : null
  })

  /**
   * What the next set still needs, kept to what this account could fix: the
   * words for whoever edits songs, the keys for whoever plans the worship.
   */
  const nextGaps = computed(() => {
    const rows = nextSet.value ? setOf(nextSet.value) : []
    return {
      rows,
      lyrics: rows.filter((row) => row.noLyrics),
      keys: rows.filter((row) => row.noKey),
      mine: rows.filter((row) => (canEdit.value && row.noLyrics) || (canPlanWorship.value && row.noKey)),
    }
  })

  /* ----------------------------------------------------------- history */

  const yearAgo = (() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 1)
    return isoDateOf(date)
  })()

  /**
   * How often each song on the list has been sung, from every Sunday that has
   * happened: the count over the last twelve months, and the last time.
   */
  const history = computed(() => {
    const map = new Map()
    services.value
      .filter((sunday) => sunday.date <= today)
      .forEach((sunday) => {
        // A song sung twice in one service counts once for that Sunday.
        const seen = new Set()
        ;(sunday.songs || []).forEach((entry) => {
          const song = songFor(entry)
          if (!song || seen.has(idOf(song))) return
          seen.add(idOf(song))
          const row = map.get(idOf(song)) || { count: 0, total: 0, last: '' }
          row.total += 1
          if (sunday.date >= yearAgo) row.count += 1
          if (sunday.date > row.last) row.last = sunday.date
          map.set(idOf(song), row)
        })
      })
    return map
  })

  /** The next Sunday each song is planned for, if any. */
  const nextPlanned = computed(() => {
    const map = new Map()
    comingSets.value.forEach((sunday) =>
      (sunday.songs || []).forEach((entry) => {
        const song = songFor(entry)
        if (song && !map.has(idOf(song))) map.set(idOf(song), sunday.date)
      })
    )
    return map
  })

  const historyOf = (song) => history.value.get(idOf(song)) || { count: 0, total: 0, last: '' }

  /** Sung in the last twelve months, the most sung first. */
  const mostSung = computed(() =>
    songs.value
      .filter((song) => historyOf(song).count > 0)
      .sort((a, b) => historyOf(b).count - historyOf(a).count || historyOf(b).last.localeCompare(historyOf(a).last))
  )

  /** Sung before, not for a quarter or more, and not planned again: resting longest first. */
  const resting = computed(() =>
    songs.value
      .filter((song) => {
        const { last } = historyOf(song)
        return last && daysBetween(last, today) >= RESTING_DAYS && !nextPlanned.value.has(idOf(song))
      })
      .sort((a, b) => historyOf(a).last.localeCompare(historyOf(b).last))
  )

  /** On the list and never sung at a service on file, newest first. */
  const neverSung = computed(() =>
    songs.value.filter((song) => !historyOf(song).total)
  )

  /** Added in the last month, never sung, and on no Sunday to come. */
  const newUnsung = computed(() => {
    const since = Date.now() - RECENT_DAYS * 86_400_000
    return neverSung.value.filter((song) => {
      const created = dateOfCreated(song)
      return created && created.getTime() >= since && !nextPlanned.value.has(idOf(song))
    })
  })

  /** How many different songs were sung in the last twelve months. */
  const sungThisYear = computed(() => mostSung.value.length)

  /* ------------------------------------------------------------- lyrics */

  const withoutLyrics = computed(() => songs.value.filter((song) => !hasLyrics(song)))

  /**
   * The songs without words that a coming Sunday needs, the soonest first,
   * each with that Sunday: the ones to type out first.
   */
  const lyricsNeeded = computed(() => {
    const rows = []
    const seen = new Set()
    comingSets.value.forEach((sunday) =>
      setOf(sunday).forEach((row) => {
        if (!row.song || !row.noLyrics || seen.has(idOf(row.song))) return
        seen.add(idOf(row.song))
        rows.push({ song: row.song, date: sunday.date })
      })
    )
    return rows
  })

  return {
    songs,
    loading,
    sundaysLoading,
    canEdit,
    canPlanWorship,
    seesSundays,
    services,
    comingSets,
    nextSet,
    nextGaps,
    setOf,
    leaderOf,
    songFor,
    historyOf,
    nextPlanned,
    mostSung,
    resting,
    neverSung,
    newUnsung,
    sungThisYear,
    withoutLyrics,
    lyricsNeeded,
    today,
  }
}

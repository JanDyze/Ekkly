<script setup>
import { computed, ref } from 'vue'
import { MusicNotes, Sparkle, TextT } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import SongThumb from './SongThumb.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useSongsOverview } from '../../composables/useSongsOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { formatShortDate, parseIso } from '../../utils/lineupUtils'
import { getYoutubeThumbnail } from '../../utils/songUtils'
import { daysBetween } from '../../utils/taskUtils'

// The Songs app's home, built the way People's and Minutes' are. One screen,
// and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useSongsOverview explains: this week's Sunday and what its songs
//      still need, the new songs no Sunday has used yet, and the songs still
//      without their words. Under them, the card that is always there: the
//      song list itself, and the songs the church sings most along its foot.
//   2. The doors: every song, the coming Sundays' songs, how often each is
//      sung, and the songs still without lyrics — each its name alone, with a
//      count on the corner only for what is waiting on you.
//
// It used to be one long list with a search bar over it. The list is a
// section now (SongsAll), and what a Sunday needs from the songs — the
// thing a worship leader opens the song list to check — is on the home.

const {
  songs,
  loading,
  sundaysLoading,
  canEdit,
  canPlanWorship,
  seesSundays,
  comingSets,
  nextSet,
  nextGaps,
  leaderOf,
  setOf,
  mostSung,
  newUnsung,
  sungThisYear,
  withoutLyrics,
  today,
} = useSongsOverview()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Today", "Tomorrow", "This Sunday" or the weekday: when a service is, said as a person would. */
const whenOf = (date) => {
  const days = daysBetween(today, date)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  const day = parseIso(date)
  if (!day) return date
  return day.getDay() === 0 ? 'This Sunday' : `This ${day.toLocaleDateString('en-US', { weekday: 'long' })}`
}

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // This week's songs, said once, with what they still need. Keyed by what
  // is on it and what is missing, so a song added or a gap filled is news.
  const sunday = nextSet.value
  if (sunday && !sundaysLoading.value) {
    const { rows, lyrics, keys, mine } = nextGaps.value
    const leader = leaderOf(sunday)
    const gaps = [
      lyrics.length ? `${lyrics.length} without lyrics` : '',
      keys.length ? `${keys.length} without a key` : '',
    ].filter(Boolean)
    list.push({
      kind: 'sunday',
      key: `sunday:${sunday.date}:${rows.map((row) => row.song?.id || row.title).join(',')}:${lyrics.length}:${keys.length}`,
      tone: mine.length ? 'warn' : 'plain',
      icon: MusicNotes,
      dismissible: true,
      kicker: whenOf(sunday.date),
      title: leader ? `${leader} leads ${plural(rows.length, 'song', 'songs')}` : `${plural(rows.length, 'song', 'songs')} to sing`,
      detail: gaps.length ? gaps.join(' · ') : 'Every song has its words and its key.',
      to: { name: 'SongsSunday' },
      date: sunday.date,
      // The key beside each title, because it is what the band looks for.
      chips: rows.map((row) => ({ key: row.id, label: row.musicKey ? `${row.title} · ${row.musicKey}` : row.title })),
    })
  }

  // New songs nobody has planned yet, for whoever plans the worship. Keyed by
  // which, so another song added brings the card back.
  if (seesSundays.value && canPlanWorship.value && !sundaysLoading.value && newUnsung.value.length) {
    list.push({
      key: `new:${newUnsung.value.map((song) => song.id).join(',')}`,
      tone: 'plain',
      icon: Sparkle,
      dismissible: true,
      kicker: 'Added lately',
      title: `${plural(newUnsung.value.length, 'new song', 'new songs')} on no Sunday yet`,
      detail: 'Plan one in while the team still remembers why it was added.',
      to: { name: 'SongsSung' },
      chips: newUnsung.value.map((song) => ({ key: song.id, label: song.title })),
    })
  }

  // A standing chore, so put away it stays away until the pile grows
  // (AppHeroDeck's `remember`): passed in even when empty, so the deck can
  // follow the pile down.
  if (canEdit.value) {
    const total = songs.value.length
    const done = total - withoutLyrics.value.length
    list.push({
      kind: 'lyrics',
      key: 'lyrics',
      tone: 'plain',
      icon: TextT,
      dismissible: true,
      remember: true,
      level: withoutLyrics.value.length,
      kicker: 'Still to do',
      // Said as what goes wrong: a song with no words saved is a song the
      // tech team cannot put on the screen.
      title: `${plural(withoutLyrics.value.length, 'song', 'songs')} without lyrics`,
      detail: 'Add the words so they can go on the screen.',
      to: { name: 'SongsLyrics' },
      done,
      total,
      share: total ? done / total : 0,
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: the song list, and what the church sings. */
const alwaysCard = computed(() => {
  const total = songs.value.length
  const parts = []
  if (total) parts.push(`${(total - withoutLyrics.value.length).toLocaleString()} with lyrics`)
  if (total && seesSundays.value && !sundaysLoading.value) parts.push(`${sungThisYear.value.toLocaleString()} sung this year`)
  return {
    kind: 'list',
    key: 'list',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Songs' : total ? plural(total, 'song', 'songs') : 'No songs yet',
    detail: loading.value
      ? ''
      : total
        ? parts.join(' · ')
        : canEdit.value
          ? 'Add the songs the church sings, with their words and their keys.'
          : 'Songs show here once the worship team adds them.',
    to: { name: 'SongList' },
    total,
    ready: !loading.value && total > 0,
  }
})

/* ------------------------------------------------- the songs, as pictures */

// The songs along the always card's foot: the ones sung most, or the newest
// while nothing has been sung yet — a song list is its songs, as a roll is
// its people. Only songs with a recording have a picture to show.
const HERO_SONGS = 5
const failed = ref({})
const heroSongs = computed(() => {
  const pool = mostSung.value.length ? mostSung.value : songs.value
  return pool
    .map((song) => ({ id: song.id, src: getYoutubeThumbnail(song.youtubeUrl) }))
    .filter((song) => song.src && !failed.value[song.id])
    .slice(0, HERO_SONGS)
})

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): the songs of the coming
// Sundays, each Sunday a small label over its set, each song with its key and
// whether its words are on the list, so a worship leader can look a month of
// sets over at once.
const comingSongs = computed(() =>
  seesSundays.value
    ? comingSets.value.slice(0, 4).flatMap((sunday) => [
        {
          key: `day:${sunday.date}`,
          heading: [formatShortDate(sunday.date), leaderOf(sunday)].filter(Boolean).join(' · '),
          today: daysBetween(today, sunday.date) <= 6,
        },
        ...setOf(sunday).map((row) => ({
          key: row.id,
          to: row.song ? { name: 'SongDetails', params: { id: row.song.id } } : null,
          song: row.song,
          title: row.title,
          line: row.musicKey ? `Key of ${row.musicKey}` : '',
          aside: row.notOnList ? 'Not on the list' : row.noLyrics ? 'No words' : '',
          tone: 'warn',
        })),
      ])
    : []
)

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what is waiting on
// you — amber when this week's Sunday needs it.
const doors = computed(() => {
  const ready = !loading.value
  const soon = nextSet.value ? daysBetween(today, nextSet.value.date) <= 3 : false
  return [
    { key: 'all', title: 'All songs', art: 'songs-all', to: { name: 'SongList' } },
    ...(seesSundays.value
      ? [
          {
            key: 'sunday',
            title: 'Sundays',
            art: 'songs-sunday',
            to: { name: 'SongsSunday' },
            badge: ready && !sundaysLoading.value ? nextGaps.value.mine.length : 0,
            urgent: soon && nextGaps.value.mine.length > 0,
          },
          { key: 'sung', title: 'Most sung', art: 'songs-sung', to: { name: 'SongsSung' } },
        ]
      : []),
    ...(canEdit.value
      ? [
          {
            key: 'lyrics',
            title: 'Missing lyrics',
            art: 'songs-lyrics',
            to: { name: 'SongsLyrics' },
            badge: ready ? withoutLyrics.value.length : 0,
          },
        ]
      : []),
  ]
})

// Simple view's figures (AppHome's `stats`), each opening what it counts.
const simpleStats = computed(() => [
  { key: 'songs', label: 'Songs', value: songs.value.length, to: { name: 'SongList' } },
  { key: 'sung', label: 'Sung this year', value: sungThisYear.value, to: { name: 'SongsSung' } },
  { key: 'sundays', label: 'Sundays planned', value: comingSets.value.length, to: { name: 'SongsSunday' } },
  { key: 'lyrics', label: 'Without lyrics', value: withoutLyrics.value.length, to: { name: 'SongsLyrics' } },
])
</script>

<template>
  <AppHome :stats="simpleStats" :loading="loading" :cards="cards" scope="songs" label="Songs this week" :doors="doors" name="Songs">
    <!-- 1. What the songs need this week, most important on top -->
    <template #card="{ card }">
      <!-- This week's Sunday, dated the way a calendar shows it, its
           songs and their keys along the foot. -->
      <DeckCard
        v-if="card.kind === 'sunday'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        inset
      >
        <template #leading>
          <DateTile :date="card.date" highlight />
        </template>
        <DeckChips :tone="card.tone" :items="card.chips" :max="3" />
      </DeckCard>

      <!-- The songs without words: how much of the list has them. -->
      <DeckCard
        v-else-if="card.kind === 'lyrics'"
        tone="plain"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        inset
      >
        <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div class="h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${Math.round(card.share * 100)}%` }" />
        </div>
        <p class="mt-1.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {{ card.done.toLocaleString() }} of {{ card.total.toLocaleString() }} have lyrics
        </p>
      </DeckCard>

      <DeckCard
        v-else-if="card.tone !== 'accent'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <DeckChips v-if="card.chips?.length" :tone="card.tone" :items="card.chips" :max="3" />
      </DeckCard>

      <!-- The song list: its number, large, and its songs along the foot. -->
      <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
        <template #art>
          <CardPanes />
        </template>
        <template v-if="card.ready" #title>
          <span class="text-5xl font-bold tabular-nums tracking-tight">{{ card.total.toLocaleString() }}</span>
          <span class="ml-2 text-lg font-semibold text-white/80">{{ card.total === 1 ? 'song' : 'songs' }}</span>
        </template>
        <!-- The Songs artwork, on white because its orange and blue are
             Ekkly's and need a white ground on a coloured card (BRAND.md). -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="songs" :play="1" class="size-10" />
          </span>
        </template>
        <!-- The songs themselves, by their recordings' pictures. -->
        <template v-if="card.ready && heroSongs.length" #default>
          <div class="flex items-center">
            <div class="flex -space-x-3">
              <img
                v-for="song in heroSongs"
                :key="song.id"
                :src="song.src"
                alt=""
                loading="lazy"
                class="h-10 w-16 rounded-xl object-cover ring-2 ring-white/70"
                @error="failed[song.id] = true"
              />
            </div>
            <span
              v-if="card.total > heroSongs.length"
              class="ml-2 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
            >
              +{{ (card.total - heroSongs.length).toLocaleString() }}
            </span>
          </div>
        </template>
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        title="Coming Sundays"
        :rows="comingSongs"
        :loading="loading || sundaysLoading"
        :link="{ to: { name: 'SongsSunday' }, label: 'See all' }"
        doodle="hammock"
        few="Nothing planned after these."
        :empty="{ title: 'No songs planned yet', line: 'Each Sunday’s songs show here once they are chosen.' }"
      >
        <template #picture="{ row }">
          <SongThumb :url="row.song?.youtubeUrl || ''" />
        </template>
      </AppSidePanel>
    </template>
  </AppHome>
</template>

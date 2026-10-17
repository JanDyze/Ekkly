<script setup>
import { computed } from 'vue'
import { BookOpen, Megaphone, MusicNotes, ProjectorScreen, Slideshow, TextT, VideoCamera } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import { usePresentationOverview } from '../../composables/usePresentationOverview'
import { useMembers } from '../../composables/useMembers'
import { findRosterMember, formatServiceDate, formatShortDate } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'

// The Presentation app's home: the booth, the week before a service.
//
// Its own app rather than a corner of Schedules, because it is somebody
// else's job. Schedules is the worship team and whoever serves, deciding who
// is on during the week; this is the tech team putting the service on the
// screen, and it draws on the song list and Scripture as well as the schedule.
// The two point at each other — a Sunday in Schedules has a Present button,
// and this lists the Sundays Schedules has planned.
//
// Built the way People's and Minutes' homes are. One screen, two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way usePresentationOverview explains: the slides that would come up
//      blank this Sunday, and a reading or the notices this church nearly
//      always has and this Sunday does not yet. Under them, the card that is
//      always there: the next service, in the order it runs, which opens the
//      presenter.
//   2. The doors: every service, the words of the songs coming up, every
//      reading, and the two apps this one draws on — that Sunday in
//      Schedules, and the song list.
//
// It used to be one hero with a Run button and the run order under it. The
// run order is the always-true card's foot now, and the button is the card.

const {
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
  wordsMissing,
  sermonOn,
  leaderOf,
  summarise,
} = usePresentationOverview()
const { members } = useMembers()

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Today", "This Sunday", or "Oct 18": how far off a service is. */
const labelOf = (service) => (service.days === 0 ? 'Today' : service.days <= 6 ? 'This Sunday' : formatShortDate(service.date))
/** The same, inside a sentence. */
const inSentence = (service) => (service.days === 0 ? 'today' : service.days <= 6 ? 'this Sunday' : formatShortDate(service.date))

const present = (date) => ({ name: 'Present', params: { date } })

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []
  const service = thisWeek.value

  // Slides that would come up blank. Whoever runs the service sees every
  // one; whoever keeps the song list sees the songs, the part they can fix.
  // Amber the day before and on the day, when it is no longer early.
  const blanks = service
    ? canRun.value
      ? service.blanks
      : canFixWords.value
        ? service.blanks.filter((row) => row.item.type === 'song')
        : []
    : []
  if (blanks.length) {
    const onlySongs = blanks.every((row) => row.item.type === 'song')
    const n = blanks.length
    const first = blanks[0].item
    list.push({
      kind: 'dated',
      key: `blanks:${service.date}:${blanks.map((row) => row.item.id).join(',')}`,
      tone: service.days <= 1 ? 'warn' : 'plain',
      icon: onlySongs ? MusicNotes : ProjectorScreen,
      dismissible: true,
      kicker: labelOf(service),
      title: onlySongs
        ? `${plural(n, 'song has', 'songs have')} no words yet`
        : `${plural(n, 'slide', 'slides')} would come up blank`,
      detail: onlySongs ? 'The screen would go blank mid-song.' : 'Fill them in, or take them off.',
      // Songs are fixed in the song list: one opens straight into it, more
      // open the list of what is coming up. Anything else is fixed on the
      // run sheet itself.
      to: onlySongs && canSeeSongs.value
        ? n === 1 && first.songId && blanks[0].reason !== 'Not in the song list'
          ? `/songs/${first.songId}`
          : { name: 'PresentationLyrics' }
        : present(service.date),
      date: service.date,
      chips: blanks.map((row) => ({ key: row.item.id, label: row.item.title || row.item.reference || 'Untitled' })),
    })
  }

  // What this church nearly always puts up, not here yet. A missing reading
  // usually means the message is not written, and saying so tells the booth
  // it is waiting on the preacher rather than on itself.
  if (service && canRun.value && usuallyMissing.value.length) {
    const kinds = usuallyMissing.value.map((row) => row.kind)
    const reading = kinds.includes('reading')
    const notices = kinds.includes('notices')
    const when = inSentence(service)
    const row = usuallyMissing.value[0]
    list.push({
      kind: 'dated',
      key: `usual:${service.date}:${kinds.join(',')}`,
      tone: 'plain',
      icon: reading ? BookOpen : Megaphone,
      dismissible: true,
      kicker: 'Still to add',
      title: reading && notices ? `No reading or notices for ${when} yet` : reading ? `No reading for ${when} yet` : `No notices for ${when} yet`,
      detail:
        reading && !sermonOn(service.date)
          ? 'It comes with the message, still to be written.'
          : kinds.length > 1
            ? 'Most Sundays here have both.'
            : `${row.had} of the last ${row.of} Sundays had ${reading ? 'one' : 'them'}.`,
      to: present(service.date),
      date: service.date,
    })
  }

  list.push(alwaysCard.value)
  return list
})

const ICONS = { song: MusicNotes, scripture: BookOpen, announcement: Megaphone, text: TextT, video: VideoCamera, slides: Slideshow }

/** The run order as a strip, the blank ones drawn as empty frames. Six fit
 *  a phone's card beside its chevron, with room for the "+N". */
const STRIP = 6
const strip = computed(() => {
  const service = nextService.value
  if (!service) return []
  const blank = new Set(service.blanks.map((row) => row.item.id))
  return service.items.map((item, index) => ({
    key: item.id || index,
    icon: ICONS[item.type] || TextT,
    title: item.title || item.reference || 'Untitled',
    blank: blank.has(item.id),
  }))
})

/** The theme and who leads: what the booth's title slide and cues hang on. */
const caption = computed(() => {
  const sunday = next.value
  if (!sunday) return ''
  const leader = findRosterMember(members.value, leaderOf(sunday))
  return [sunday.theme ? `Theme · ${sunday.theme}` : '', leader ? `${getDisplayName(leader)} leading` : ''].filter(Boolean).join(' · ')
})

/** The card that is always there: the next service, which opens the presenter. */
const alwaysCard = computed(() => {
  const service = nextService.value
  if (loading.value || !service) {
    return {
      kind: 'next',
      key: 'next',
      tone: 'accent',
      kicker: greeting.value,
      title: loading.value ? 'Presentation' : 'Nothing to run yet',
      detail: loading.value ? '' : 'A Sunday shows here once it has been scheduled.',
      to: loading.value ? null : { name: 'Services' },
    }
  }
  const { songs, readings, notices, other } = service.counts
  const ready = service.items.length > 0 && !service.blanks.length
  // Ready only when nothing in it would come up blank. A service further off
  // than this week is named in full, the way the presenter names it.
  const name = service.days <= 6 ? labelOf(service) : formatServiceDate(service.date)
  return {
    kind: 'next',
    key: 'next',
    tone: 'accent',
    kicker: greeting.value,
    title: ready ? `${labelOf(service)} is ready to run` : name,
    detail: service.items.length
      ? [
          plural(songs, 'song'),
          readings ? plural(readings, 'reading') : '',
          notices ? plural(notices, 'notice') : '',
          other ? plural(other, 'cue') : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : 'Nothing in the order yet',
    to: present(service.date),
  }
})

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): every service planned
// from here on, each with what it holds and how many of its slides would come
// up blank, so the booth can see the coming weeks, not only this Sunday.
const comingServices = computed(() =>
  upcoming.value.slice(0, 12).map((sunday) => {
    const service = summarise(sunday)
    const { songs, readings } = service.counts
    return {
      key: service.date,
      to: present(service.date),
      date: service.date,
      title: sunday.theme || formatServiceDate(service.date),
      line: [plural(songs, 'song'), readings ? plural(readings, 'reading') : ''].filter(Boolean).join(' · '),
      aside: service.blanks.length ? `${service.blanks.length} blank` : service.prepared ? 'Ready' : '',
      tone: service.blanks.length ? 'warn' : 'accent',
    }
  })
)

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what is waiting on
// whoever keeps the song list: the songs coming up with no words.
const doors = computed(() => [
  { key: 'services', title: 'Services', art: 'presentation-services', to: { name: 'Services' } },
  ...(canSeeSongs.value
    ? [
        {
          key: 'lyrics',
          title: 'Lyrics',
          art: 'presentation-lyrics',
          to: { name: 'PresentationLyrics' },
          badge: canFixWords.value && !loading.value ? wordsMissing.value.length : 0,
          urgent: Boolean(thisWeek.value?.days <= 1 && thisWeek.value.blanks.some((row) => row.item.type === 'song')),
        },
      ]
    : []),
  { key: 'readings', title: 'Readings', art: 'presentation-readings', to: { name: 'PresentationReadings' } },
  // Doorways into the apps this one draws on, in their own artwork.
  {
    key: 'schedule',
    title: 'Schedule',
    art: 'lineups',
    to: next.value ? { name: 'SchedulesSunday', params: { date: next.value.date } } : { name: 'SchedulesHome' },
  },
  ...(canSeeSongs.value ? [{ key: 'songs', title: 'Songs', art: 'songs', to: '/songs' }] : []),
])
</script>

<template>
  <AppHome :cards="cards" scope="presentation" label="Presentation this week" :doors="doors" name="Presentation">
    <!-- 1. What the booth should see to this week, most important on top -->
    <template #card="{ card }">
      <!-- Something about this Sunday: its date, the way a calendar shows it. -->
      <DeckCard
        v-if="card.kind === 'dated'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <template #leading>
          <DateTile :date="card.date" class="size-14! rounded-2xl!" />
        </template>
        <DeckChips v-if="card.chips?.length" :tone="card.tone" :items="card.chips" :max="3" />
      </DeckCard>

      <!-- The next service, in the order it runs. -->
      <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
        <template #art>
          <CardPanes />
        </template>
        <!-- The Presentation artwork, on white because its orange and
             blue are Ekkly's and need a white ground on a coloured card. -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="presentation" :play="1" class="size-10" />
          </span>
        </template>
        <!-- Each thing in the order as its kind, so the shape of the
             service reads at a glance; one that would come up blank is
             an empty frame. -->
        <template v-if="!loading && strip.length" #default>
          <ol class="flex items-center gap-1.5" aria-label="The order of service">
            <li
              v-for="item in strip.slice(0, STRIP)"
              :key="item.key"
              :title="item.title"
              :class="[
                'flex size-8 shrink-0 items-center justify-center rounded-[10px]',
                item.blank ? 'border-2 border-dashed border-white/50 text-white/60' : 'bg-white/18 text-white',
              ]"
            >
              <component :is="item.icon" class="size-4" aria-hidden="true" />
              <span class="sr-only">{{ item.title }}</span>
            </li>
            <li
              v-if="strip.length > STRIP"
              class="ml-0.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
            >
              +{{ strip.length - STRIP }}
            </li>
          </ol>
          <p v-if="caption" class="mt-2 truncate text-xs text-white/80">{{ caption }}</p>
        </template>
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        title="Coming services"
        :rows="comingServices"
        :loading="loading"
        :link="{ to: { name: 'Services' }, label: 'See all' }"
        doodle="hammock"
        few="Nothing planned after these."
        :empty="{ title: 'Nothing planned yet', line: 'Services show here once Schedules plans them.' }"
      />
    </template>
  </AppHome>
</template>

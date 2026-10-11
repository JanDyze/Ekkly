<script setup>
import { computed } from 'vue'
import { Bell, ChatCircleText, CheckCircle, HandsPraying } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import DeckFaces from '../../components/appframe/DeckFaces.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import AppArt from '../../components/common/AppArt.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePrayerOverview, dayLabel, raisedOn } from '../../composables/usePrayerOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName, listPhrase } from '../../utils/memberUtils'

// The Prayer app's home, built the way People's and Minutes' are. One screen,
// and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way usePrayerOverview explains: the requests marked urgent, the ones
//      raised this week, the prayers answered lately, and — for whoever looks
//      after the list — the ones with no news in a long while. Under them,
//      the card that is always there: how many needs the church is holding,
//      and the faces of the people it is praying for.
//   2. The doors: praying now, ongoing, answered and every concern, each its
//      name alone, with a count on the corner only for what asks for prayer
//      first.
//
// It used to be one long list of every concern by month, with a search bar
// and an Add button over it. The list is a section now (PrayerList, told by
// its route which concerns), so what is being prayed for this week, and what
// God has answered, are a tap from the home rather than a scroll.

const {
  loading,
  canEdit,
  today,
  personOf,
  open,
  pressing,
  urgent,
  newThisWeek,
  quiet,
  answeredLately,
  answeredThisYear,
  prayedFor,
} = usePrayerOverview()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`
const idOf = (concern) => concern.firestoreId || concern.id
const chipsOf = (list) => list.map((c) => ({ key: idOf(c), label: c.title || 'Prayer concern' }))

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** Who a handful of concerns are for, the first two by name. */
const whoFor = (list) => {
  const names = [...new Set(list.map((c) => (c.memberName || '').trim()).filter(Boolean))]
  if (!names.length) return ''
  const shown = names.slice(0, 2)
  if (names.length > 2) shown.push(plural(names.length - 2, 'other', 'others'))
  return `For ${listPhrase(shown)}`
}

/** One concern's line under its title: who it is for, and when it was raised. */
const lineOf = (concern, day = raisedOn(concern)) =>
  [concern.memberName ? `For ${concern.memberName}` : '', dayLabel(day, today)].filter(Boolean).join(' · ')

/** Where a card about one concern leads: that concern, open over its list. */
const openOne = (name, concern) => ({ name, query: { open: idOf(concern) } })

/** The faces a card's foot shows, for the concerns that are about somebody. */
const facesOf = (list) => {
  const seen = new Set()
  return list
    .map(personOf)
    .filter((person) => person && !seen.has(person.firestoreId || person.id) && seen.add(person.firestoreId || person.id))
}

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // Asked to be prayed for first. Amber only when one is urgent: high is a
  // request to put it near the top, not an alarm. Keyed by which, so a new
  // one brings a dismissed card back.
  if (pressing.value.length) {
    const one = pressing.value.length === 1 ? pressing.value[0] : null
    const anyUrgent = urgent.value.length > 0
    list.push({
      key: `pressing:${pressing.value.map(idOf).join(',')}`,
      tone: anyUrgent ? 'warn' : 'plain',
      icon: HandsPraying,
      dismissible: true,
      kicker: anyUrgent ? 'Urgent' : 'Pray for first',
      title: one
        ? one.title || 'Prayer concern'
        : anyUrgent
          ? `${plural(pressing.value.length, 'request', 'requests')} marked urgent or high`
          : `${plural(pressing.value.length, 'request', 'requests')} marked high`,
      detail: one ? lineOf(one) : whoFor(pressing.value) || 'The most pressing first.',
      to: one ? openOne('PrayerNow', one) : { name: 'PrayerNow' },
      chips: one ? [] : chipsOf(pressing.value),
      faces: one ? facesOf([one]) : [],
    })
  }

  // Shared this week, so it is prayed for on Sunday.
  if (newThisWeek.value.length) {
    const one = newThisWeek.value.length === 1 ? newThisWeek.value[0] : null
    list.push({
      key: `new:${newThisWeek.value.map(idOf).join(',')}`,
      tone: 'plain',
      icon: Bell,
      dismissible: true,
      kicker: 'New this week',
      title: one ? one.title || 'Prayer concern' : plural(newThisWeek.value.length, 'new request', 'new requests'),
      detail: one ? lineOf(one) : whoFor(newThisWeek.value) || 'Worth praying for together on Sunday.',
      to: one ? openOne('PrayerConcerns', one) : { name: 'PrayerConcerns', query: { show: 'new' } },
      chips: one ? [] : chipsOf(newThisWeek.value),
      faces: one ? facesOf([one]) : [],
    })
  }

  // Answered: told to the church while it is still news.
  if (answeredLately.value.length) {
    const one = answeredLately.value.length === 1 ? answeredLately.value[0] : null
    list.push({
      key: `answered:${answeredLately.value.map(idOf).join(',')}`,
      tone: 'plain',
      icon: CheckCircle,
      dismissible: true,
      kicker: one ? 'Answered prayer' : 'Answered prayers',
      title: one ? one.title || 'Prayer concern' : `${plural(answeredLately.value.length, 'prayer', 'prayers')} answered`,
      detail: 'Worth giving thanks for together.',
      to: one ? openOne('PrayerAnswered', one) : { name: 'PrayerAnswered' },
      chips: one ? [] : chipsOf(answeredLately.value),
      faces: facesOf(answeredLately.value),
    })
  }

  // A standing chore for whoever looks after the list, remembered until
  // there are more of them. Passed in even when there are none, so the deck
  // can follow the pile down.
  if (canEdit.value) {
    list.push({
      key: 'quiet',
      tone: 'plain',
      icon: ChatCircleText,
      dismissible: true,
      remember: true,
      level: quiet.value.length,
      kicker: 'No news lately',
      title: `${plural(quiet.value.length, 'concern has', 'concerns have')} had no news in a while`,
      detail: 'Worth asking how they are, and noting what has changed.',
      to: { name: 'PrayerConcerns', query: { show: 'quiet' } },
      chips: chipsOf(quiet.value),
      faces: [],
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: what the church is holding in prayer. */
const alwaysCard = computed(() => {
  const n = open.value.length
  return {
    key: 'open',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Prayer' : n ? plural(n, 'need', 'needs') : 'Nothing on the prayer list',
    detail: loading.value
      ? ''
      : n
        ? answeredThisYear.value
          ? `Being prayed for · ${plural(answeredThisYear.value, 'prayer', 'prayers')} answered this year`
          : 'Being prayed for across the church'
        : canEdit.value
          ? 'Add the first one, and the church can pray for it together.'
          : 'Requests show here once someone adds them.',
    to: { name: 'PrayerNow' },
    ready: !loading.value && n > 0,
    total: n,
  }
})

const HERO_FACES = 6
const heroFaces = computed(() =>
  [...prayedFor.value].sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image))).slice(0, HERO_FACES)
)
const keyOf = (member) => member.firestoreId || member.id

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what asks to be
// prayed for first (urgent), and — for whoever looks after the list — the
// concerns with no news in a long while.
const doors = computed(() => {
  const ready = !loading.value
  return [
    {
      key: 'now',
      title: 'Praying now',
      art: 'prayer-now',
      to: { name: 'PrayerNow' },
      badge: ready ? urgent.value.length : 0,
      urgent: true,
    },
    { key: 'ongoing', title: 'Ongoing', art: 'prayer-ongoing', to: { name: 'PrayerOngoing' } },
    { key: 'answered', title: 'Answered', art: 'prayer-answered', to: { name: 'PrayerAnswered' } },
    {
      key: 'all',
      title: 'All concerns',
      art: 'prayer-all',
      to: { name: 'PrayerConcerns' },
      badge: canEdit.value && ready ? quiet.value.length : 0,
    },
  ]
})
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What to pray for this week, most pressing on top -->
      <AppHeroDeck :cards="cards" scope="prayer" label="Prayer this week" class="animate-rise">
        <template #card="{ card }">
          <DeckCard
            v-if="card.tone !== 'accent'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            :inset="card.dismissible"
          >
            <!-- One concern: the face of who it is for. Several: what they
                 are, a few of them. -->
            <DeckFaces v-if="!card.chips.length && card.faces.length" :tone="card.tone" :members="card.faces" />
            <DeckChips v-else-if="card.chips.length" :tone="card.tone" :items="card.chips" :max="3" />
          </DeckCard>

          <!-- How many needs the church is holding, and the people in them. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <CardPanes />
            </template>
            <template v-if="card.ready" #title>
              <span class="text-5xl font-bold tabular-nums tracking-tight">{{ card.total.toLocaleString() }}</span>
              <span class="ml-2 text-lg font-semibold text-white/80">{{ card.total === 1 ? 'need' : 'needs' }}</span>
            </template>
            <!-- The Prayer artwork, on white because its orange and blue are
                 Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                <AppArt app-key="prayer" :play="1" class="size-10" />
              </span>
            </template>
            <!-- The people being prayed for, along the foot. -->
            <template v-if="card.ready && heroFaces.length" #default>
              <div class="flex items-center">
                <div class="flex -space-x-2.5">
                  <MemberAvatar
                    v-for="member in heroFaces"
                    :key="keyOf(member)"
                    :member="member"
                    alt=""
                    size="h-10 w-10"
                    plain-class="ring-2 ring-white/70"
                  />
                </div>
                <span
                  v-if="prayedFor.length > HERO_FACES"
                  class="ml-2 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
                >
                  +{{ (prayedFor.length - HERO_FACES).toLocaleString() }}
                </span>
              </div>
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Prayer" />
    </div>
  </AppScreen>
</template>

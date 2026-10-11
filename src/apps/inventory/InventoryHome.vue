<script setup>
import { computed } from 'vue'
import { ArrowsLeftRight, Camera, Clock, Warning } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHeroDeck from '../../components/appframe/AppHeroDeck.vue'
import AppShortcuts from '../../components/appframe/AppShortcuts.vue'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import ItemThumb from '../../components/inventory/ItemThumb.vue'
import { useInventoryOverview } from '../../composables/useInventoryOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { loanDueLabel } from '../../utils/inventoryUtils'
import { formatMoney } from '../../utils/moneyUtils'

// The Inventory app's home, built the way People's and Minutes' are. One
// screen, and two things on it:
//
//   1. A deck of cards (AppHeroDeck), the most important on top, earned the
//      way useInventoryOverview explains: what is overdue to come back, what
//      is due back this week, what you have borrowed yourself, what is waiting
//      for repair and what has never been photographed. Under them, the card
//      that is always there: how many things the church has, with a few of
//      them along its foot.
//   2. The doors: everything, what is out, what needs repair, the places
//      things are kept, and — for whoever keeps the records — what still
//      needs a photo, each its name alone, with a count on the corner only
//      for what is waiting on somebody.

const {
  items,
  loading,
  canEdit,
  overdue,
  dueSoon,
  mine,
  needsRepair,
  longestRepair,
  unphotographed,
  counts,
  today,
} = useInventoryOverview()
const { myMember } = usePermissions()

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/** "Projector · Ana Reyes": what, and who has it. */
const loanChip = ({ item, loan }) => ({ key: `${item.id}:${loan.id}`, label: `${item.name} · ${loan.to || 'someone'}` })

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  if (loading.value) return [alwaysCard.value]
  const list = []

  // Overdue leads: a thing not back is a thing missing on the day it is
  // needed. Keyed by which loans, so a new one late is news again.
  if (canEdit.value && overdue.value.length) {
    const first = overdue.value[0]
    list.push({
      kind: 'loans',
      key: `overdue:${overdue.value.map((row) => row.loan.id).join(',')}`,
      tone: 'warn',
      icon: Clock,
      dismissible: true,
      kicker: 'Not back yet',
      title:
        overdue.value.length === 1
          ? `${first.item.name} is with ${first.loan.to || 'someone'}`
          : `${plural(overdue.value.length, 'thing', 'things')} still out`,
      detail: overdue.value.length === 1 ? loanDueLabel(first.loan, today) : 'Past the day they were due back, or out a month with no day given.',
      to: overdue.value.length === 1 ? { name: 'InventoryItem', params: { id: first.item.id } } : { name: 'InventoryBorrowed' },
      chips: overdue.value.map(loanChip),
    })
  }

  // What you borrowed: the card a member without the storeroom key can act
  // on. Shown to anyone, because it is theirs.
  if (mine.value.length) {
    const first = mine.value[0]
    list.push({
      kind: 'item',
      key: `mine:${mine.value.map((row) => row.loan.id).join(',')}`,
      tone: first.state === 'overdue' ? 'warn' : 'plain',
      icon: ArrowsLeftRight,
      dismissible: true,
      kicker: 'You borrowed',
      title: mine.value.length === 1 ? first.item.name : `${plural(mine.value.length, 'thing', 'things')} from the church`,
      detail: mine.value.length === 1 ? loanDueLabel(first.loan, today) : mine.value.map((row) => row.item.name).join(', '),
      to: { name: 'InventoryItem', params: { id: first.item.id } },
      item: first.item,
    })
  }

  // Due back this week: asked for before the Sunday it is needed.
  if (canEdit.value && dueSoon.value.length) {
    const first = dueSoon.value[0]
    list.push({
      kind: 'loans',
      key: `soon:${dueSoon.value.map((row) => row.loan.id).join(',')}`,
      tone: 'plain',
      icon: ArrowsLeftRight,
      dismissible: true,
      kicker: 'Due back this week',
      title:
        dueSoon.value.length === 1
          ? `${first.item.name}, from ${first.loan.to || 'someone'}`
          : `${plural(dueSoon.value.length, 'thing', 'things')} coming back`,
      detail: dueSoon.value.length === 1 ? loanDueLabel(first.loan, today) : 'A reminder now saves a search on Sunday.',
      to: dueSoon.value.length === 1 ? { name: 'InventoryItem', params: { id: first.item.id } } : { name: 'InventoryBorrowed' },
      chips: dueSoon.value.map(loanChip),
    })
  }

  // Waiting for repair: a standing chore, so put away it stays away until
  // something else breaks (AppHeroDeck's `remember`). Passed in even at zero,
  // so the mark can follow the pile down.
  if (canEdit.value) {
    list.push({
      kind: 'items',
      key: 'repair',
      tone: longestRepair.value > 30 ? 'warn' : 'plain',
      icon: Warning,
      dismissible: true,
      remember: true,
      level: needsRepair.value.length,
      kicker: 'Needs repair',
      title: `${plural(needsRepair.value.length, 'thing is', 'things are')} broken`,
      detail:
        longestRepair.value > 30
          ? `The oldest has waited ${Math.round(longestRepair.value / 7)} weeks.`
          : 'Get them fixed, or decide to let them go.',
      to: { name: 'InventoryRepair' },
      items: needsRepair.value,
    })
  }

  // Never photographed: the same kind of chore, remembered the same way.
  if (canEdit.value) {
    list.push({
      kind: 'items',
      key: 'photos',
      tone: 'plain',
      icon: Camera,
      dismissible: true,
      remember: true,
      level: unphotographed.value.length,
      kicker: 'No photo yet',
      title: `${plural(unphotographed.value.length, 'thing has', 'things have')} no picture`,
      detail: 'A photo is how a new volunteer finds it without asking.',
      to: { name: 'InventoryPhotos' },
      chips: unphotographed.value.map((item) => ({ key: item.id, label: item.name })),
    })
  }

  list.push(alwaysCard.value)
  return list
})

/** The card that is always there: everything the church has. */
const alwaysCard = computed(() => {
  const { items: total, out, places, value } = counts.value
  return {
    kind: 'always',
    key: 'always',
    tone: 'accent',
    kicker: greeting.value,
    title: loading.value ? 'Inventory' : total ? plural(total, 'thing', 'things') : 'Nothing listed yet',
    detail: loading.value
      ? ''
      : total
        ? [out ? `${out} out on loan` : 'All here', places ? plural(places, 'place', 'places') : '', value ? `${formatMoney(value)} in all` : '']
            .filter(Boolean)
            .join(' · ')
        : canEdit.value
          ? 'Photograph the first thing, and the church can see what it has.'
          : 'Things show here once they are added.',
    // An empty list's card says to add the first thing, so it leads there.
    to: total ? { name: 'InventoryAll' } : canEdit.value ? { name: 'InventoryAdd' } : null,
    total,
    ready: !loading.value && total > 0,
  }
})

/** Pictures for the always-true card: things with a photo, cut-outs first. */
const SHOWN = 5
const pictured = computed(() =>
  items.value
    .filter((item) => item.thumb)
    .sort((a, b) => Number(b.photoCut) - Number(a.photoCut))
    .slice(0, SHOWN)
)

/* -------------------------------------------------------------- the doors */

// A door is its name, with a count on the corner only for what is waiting —
// red when something is overdue. Adding an item is not a tile: it is
// something you do, not a place you go, and it is the + on All items (and the
// card above while the list is empty).
const doors = computed(() => {
  const ready = !loading.value
  return [
    { key: 'all', title: 'All items', art: 'inventory-all', to: { name: 'InventoryAll' } },
    {
      key: 'borrowed',
      title: 'Borrowed',
      art: 'inventory-borrowed',
      to: { name: 'InventoryBorrowed' },
      badge: canEdit.value && ready ? overdue.value.length : 0,
      urgent: true,
    },
    {
      key: 'repair',
      title: 'Needs repair',
      art: 'inventory-repair',
      to: { name: 'InventoryRepair' },
      badge: canEdit.value && ready ? needsRepair.value.length : 0,
    },
    { key: 'places', title: 'Places', art: 'inventory-places', to: { name: 'InventoryPlaces' } },
    ...(canEdit.value
      ? [
          {
            key: 'photos',
            title: 'To photograph',
            art: 'inventory-photos',
            to: { name: 'InventoryPhotos' },
            badge: ready ? unphotographed.value.length : 0,
          },
        ]
      : []),
  ]
})
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-4">
      <!-- 1. What needs doing, most important on top -->
      <AppHeroDeck :cards="cards" scope="inventory" label="Inventory this week" class="animate-rise">
        <template #card="{ card }">
          <!-- Loans: which things, and who has them. -->
          <DeckCard
            v-if="card.kind === 'loans'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <DeckChips :tone="card.tone" :items="card.chips" :max="2" />
          </DeckCard>

          <!-- Something of yours: its picture is the headline's companion. -->
          <DeckCard
            v-else-if="card.kind === 'item'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <template #leading>
              <ItemThumb :item="card.item" size="size-14 rounded-2xl" />
            </template>
          </DeckCard>

          <!-- A pile of things: their pictures, or their names when they
               have none to show. -->
          <DeckCard
            v-else-if="card.kind === 'items'"
            :tone="card.tone"
            :icon="card.icon"
            :kicker="card.kicker"
            :title="card.title"
            :detail="card.detail"
            :to="card.to"
            inset
          >
            <div v-if="card.items?.some((item) => item.thumb)" class="flex items-center gap-1.5">
              <ItemThumb v-for="item in card.items.slice(0, 5)" :key="item.id" :item="item" size="size-10 rounded-xl" />
              <span v-if="card.items.length > 5" class="ml-1 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                +{{ card.items.length - 5 }}
              </span>
            </div>
            <DeckChips v-else-if="card.chips?.length || card.items?.length" :tone="card.tone" :items="card.chips || card.items.map((item) => ({ key: item.id, label: item.name }))" :max="3" />
          </DeckCard>

          <!-- Everything the church has: its number, large, and a few of the
               things themselves along the foot. -->
          <DeckCard v-else tone="accent" :kicker="card.kicker" :title="card.title" :detail="card.detail" :to="card.to">
            <template #art>
              <CardPanes />
            </template>
            <template v-if="card.ready" #title>
              <span class="text-5xl font-bold tabular-nums tracking-tight">{{ card.total.toLocaleString() }}</span>
              <span class="ml-2 text-lg font-semibold text-white/80">{{ card.total === 1 ? 'thing' : 'things' }}</span>
            </template>
            <!-- The Inventory artwork, on white because its orange and blue
                 are Ekkly's and need a white ground on a coloured card. -->
            <template #trailing>
              <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                <AppArt app-key="inventory" :play="1" class="size-10" />
              </span>
            </template>
            <template v-if="card.ready && pictured.length" #default>
              <div class="flex items-center gap-1.5">
                <span
                  v-for="item in pictured"
                  :key="item.id"
                  class="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-2 ring-white/70"
                >
                  <img :src="item.thumb" alt="" loading="lazy" :class="item.photoCut ? 'size-full object-contain p-1' : 'size-full object-cover'" />
                </span>
                <span
                  v-if="card.total > pictured.length"
                  class="ml-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
                >
                  +{{ (card.total - pictured.length).toLocaleString() }}
                </span>
              </div>
            </template>
            <template v-else-if="!loading && !card.total && canEdit" #default>
              <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90">
                <Camera class="size-4" />
                Take the first photo
              </span>
            </template>
          </DeckCard>
        </template>
      </AppHeroDeck>

      <!-- 2. The doors -->
      <AppShortcuts :doors="doors" label="Inventory" />
    </div>
  </AppScreen>
</template>

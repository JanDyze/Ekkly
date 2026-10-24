<script setup>
import { computed } from 'vue'
import { ArrowCircleDown, ArrowCircleUp, ArrowsLeftRight, Bank, ChartBar, Coins, FileText, HandCoins, Scales, Tag, Wallet } from '../../icons'
import AppHome from '../../components/appframe/AppHome.vue'
import AppSidePanel from '../../components/appframe/AppSidePanel.vue'
import { categoryLabel } from '../../data/financeChart'
import CardPanes from '../../components/appframe/CardPanes.vue'
import DeckCard from '../../components/appframe/DeckCard.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import DeckChips from '../../components/appframe/DeckChips.vue'
import AppArt from '../../components/common/AppArt.vue'
import { useFinanceOverview } from '../../composables/useFinanceOverview'
import { usePermissions } from '../../composables/usePermissions'
import { getDisplayName } from '../../utils/memberUtils'
import { formatMoney } from '../../utils/moneyUtils'
import { formatMonthLabel, monthKeyOf } from '../../utils/ledgerUtils'

// The Finances app's home, built the way the other apps' are. One screen, and
// two things on it:
//
//   1. A deck of cards (AppHeroDeck). Which cards there are, and why only
//      these, is decided in useFinanceOverview: the opening balance when there
//      is none, the Sunday offerings a weekly-entering church has not entered,
//      last month's statement in the days a committee asks for it, and entries
//      no statement line can hold. Each is something to act on this week.
//      Under them, the card that is always there: what the church has, today,
//      and how this month is going.
//   2. The doors: the book, the statement, the accounts and the months, each
//      its name alone. The figures are the deck's and the sections' to show.
//
// It used to be the book itself, with the balances in three boxes above it and
// a Book/Statement switch. The book and the statement are sections now, and
// what the balances could not say — what is owed by the treasurer, and what
// the committee will ask — leads.

const {
  loading,
  entries,
  opening,
  canManage,
  balancesToday,
  current,
  months,
  missedSundays,
  lastMonth,
  unclassified,
} = useFinanceOverview()
const { myMember } = usePermissions()

/** Whole pesos, for a tile or a card: centavos are for the book. */
const peso = (centavos) => {
  const pesos = Math.round(Math.abs(Number(centavos) || 0) / 100)
  return `${centavos < 0 ? '−' : ''}₱${pesos.toLocaleString('en-PH')}`
}
const shortDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
const monthName = (key) => formatMonthLabel(key).split(' ')[0]

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value ? getDisplayName(myMember.value) : ''
  return name ? `${part}, ${name}` : part
})

/* -------------------------------------------------------------- the deck */

const cards = computed(() => {
  const list = []
  if (loading.value) {
    list.push(balanceCard.value)
    return list
  }

  // Every figure is counted up from the opening balance, so it leads.
  if (canManage.value && !opening.value.isSet) {
    list.push({
      kind: 'plain',
      key: 'opening',
      tone: 'warn',
      icon: Scales,
      dismissible: true,
      kicker: 'Before anything else',
      title: 'Set the opening balance',
      detail: 'Until it is set, every balance counts only what has been entered here.',
      to: { name: 'FinancesAccounts', query: { set: 'opening' } },
      // What the balances count today without it, so the gap is plain.
      chips: [
        { key: 'cash', label: `Cash ${peso(balancesToday.value.cash)}` },
        { key: 'bank', label: `Bank ${peso(balancesToday.value.bank)}` },
      ],
    })
  }

  // Sunday offerings a weekly-entering church has not entered. The card opens
  // the oldest one, already filled in but for the amount.
  const missed = missedSundays.value
  if (canManage.value && missed.length) {
    const oldest = missed[0]
    list.push({
      kind: 'dated',
      key: `sundays:${missed.join(',')}`,
      tone: 'plain',
      icon: HandCoins,
      dismissible: true,
      kicker: 'Sunday offering',
      title: missed.length === 1 ? `Enter ${shortDate(oldest)}'s offering` : `${missed.length} Sundays' offerings to enter`,
      detail: missed.length === 1 ? 'Nothing has been entered for it yet.' : `From ${shortDate(oldest)}, the oldest first.`,
      to: { name: 'Finances', params: { month: monthKeyOf(oldest) }, query: { new: 'offering', date: oldest } },
      date: oldest,
      chips: missed.map((sunday) => ({ key: sunday, label: shortDate(sunday) })),
    })
  }

  // Last month's statement, in the days the committee asks for it.
  if (lastMonth.value) {
    const month = lastMonth.value
    list.push({
      kind: 'statement',
      key: `statement:${month.key}`,
      tone: 'plain',
      icon: FileText,
      dismissible: true,
      kicker: `${monthName(month.key)} statement`,
      title: `${month.net >= 0 ? 'Up' : 'Down'} ${peso(Math.abs(month.net))} in ${monthName(month.key)}`,
      detail: `${peso(month.income)} in · ${peso(month.expenses)} out`,
      to: { name: 'FinancesStatement', params: { month: month.key } },
      month,
    })
  }

  // Entries the statement has nowhere to put.
  if (canManage.value && unclassified.value.length) {
    const n = unclassified.value.length
    list.push({
      kind: 'plain',
      key: `unclassified:${n}`,
      tone: 'warn',
      icon: Tag,
      dismissible: true,
      kicker: 'Needs a category',
      title: `${n} ${n === 1 ? 'entry has' : 'entries have'} no statement line`,
      detail: 'The statement files them under Unclassified until each is given one.',
      to: { name: 'Finances', params: { month: monthKeyOf(unclassified.value[0].date) } },
      // The entries themselves, by what they were for.
      chips: unclassified.value.map((e) => ({ key: e.id || e.firestoreId, label: e.description || peso(e.amount) })),
      chipMax: 3,
    })
  }

  list.push(balanceCard.value)
  return list
})

/** The card that is always there: what the church has today. */
const balanceCard = computed(() => ({
  kind: 'balance',
  key: 'balance',
  tone: 'accent',
  kicker: greeting.value,
  title: loading.value ? 'Finances' : peso(balancesToday.value.total),
  detail: loading.value
    ? ''
    : opening.value.isSet
      ? `${peso(balancesToday.value.cash)} on hand · ${peso(balancesToday.value.bank)} in the bank`
      : 'Counted from what has been entered here, with no opening balance',
  to: { name: 'FinancesAccounts' },
}))

/** This month's in and out, as two bars against the larger of them. */
const monthBars = computed(() => {
  const larger = Math.max(current.value.income, current.value.expenses, 1)
  return {
    income: Math.round((current.value.income / larger) * 100),
    expenses: Math.round((current.value.expenses / larger) * 100),
  }
})

/* -------------------------------------------------------------- the side */

// Beside the cards on a desktop (AppHome's `side`): the latest entries in the
// book, newest first, each with its amount — what came in, what went out, and
// what moved between accounts — so the treasurer can see the last few without
// opening the month.
const latestEntries = computed(() =>
  [...entries.value]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 25)
    .map((entry) => ({
      key: String(entry.id),
      to: { name: 'Finances', params: { month: monthKeyOf(entry.date) } },
      icon: entry.direction === 'in' ? ArrowCircleDown : entry.direction === 'out' ? ArrowCircleUp : ArrowsLeftRight,
      title: entry.description || entry.payee || categoryLabel(entry),
      line: [shortDate(entry.date), entry.description || entry.payee ? categoryLabel(entry) : ''].filter(Boolean).join(' · '),
      aside: `${entry.direction === 'in' ? '+' : entry.direction === 'out' ? '−' : ''}${peso(Math.abs(entry.amount))}`,
      tone: entry.direction === 'in' ? 'accent' : '',
    }))
)

/* -------------------------------------------------------------- the doors */

// A door is its name and nothing more. The month's result, the balances and
// the bars are what each section shows the moment it opens, and the deck above
// already carries whatever in them needs acting on this week.
const doors = computed(() => [
  { key: 'book', title: 'Book', art: 'finances-book', to: { name: 'Finances' } },
  { key: 'statement', title: 'Statement', art: 'finances-statement', to: { name: 'FinancesStatement' } },
  { key: 'accounts', title: 'Accounts', art: 'finances-accounts', to: { name: 'FinancesAccounts' } },
  { key: 'months', title: 'By month', art: 'finances-months', to: { name: 'FinancesMonths' } },
])

// Simple view's figures (AppHome's `stats`), each opening what it counts.
const simpleStats = computed(() => [
  { key: 'balance', label: 'Balance today', value: peso(balancesToday.value.total), to: { name: 'FinancesAccounts' } },
  { key: 'in', label: 'Money in this month', value: peso(current.value.income), to: { name: 'FinancesStatement' } },
  { key: 'out', label: 'Money out this month', value: peso(current.value.expenses), to: { name: 'FinancesStatement' } },
  {
    key: 'missed',
    label: 'Offerings to enter',
    value: missedSundays.value.length,
    to: { name: 'FinancesMonths' },
    warn: missedSundays.value.length > 0,
  },
])

// On a desktop the sections show themselves (AppHome's `columns`): the book's
// latest lines, each month's totals, and what is in each account today.
const columns = computed(() => [
  { key: 'book', title: 'Latest in the book', to: { name: 'Finances' }, rows: latestEntries.value, empty: 'Nothing entered yet.' },
  {
    key: 'months',
    title: 'By month',
    to: { name: 'FinancesMonths' },
    rows: months.value.map((m) => ({
      key: m.key,
      icon: ChartBar,
      title: m.label,
      line: `${peso(m.income)} in · ${peso(m.expenses)} out`,
      aside: `${m.net < 0 ? '−' : '+'}${peso(m.net)}`,
      tone: m.net < 0 ? 'urgent' : 'accent',
      to: { name: 'Finances', params: { month: m.key } },
    })),
    empty: 'No months entered yet.',
  },
  {
    key: 'accounts',
    title: 'Accounts today',
    to: { name: 'FinancesAccounts' },
    rows: [
      { key: 'cash', icon: Wallet, title: 'Cash on hand', aside: peso(balancesToday.value.cash), to: { name: 'FinancesAccounts' } },
      { key: 'bank', icon: Bank, title: 'Cash in bank', aside: peso(balancesToday.value.bank), to: { name: 'FinancesAccounts' } },
      { key: 'total', icon: Coins, title: 'Together', aside: peso(balancesToday.value.total), to: { name: 'FinancesAccounts' } },
    ],
  },
])
</script>

<template>
  <AppHome :columns="columns" :stats="simpleStats" :loading="loading" :cards="cards" scope="finances" label="Finances today" :doors="doors" name="Finances">
    <!-- 1. What needs doing about the money, most important on top -->
    <template #card="{ card }">
      <!-- A Sunday whose offering is missing: its date. -->
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
        <DeckChips :tone="card.tone" :items="card.chips" />
      </DeckCard>

      <!-- Last month's statement: its in and out, side by side. -->
      <DeckCard
        v-else-if="card.kind === 'statement'"
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <div class="flex flex-col gap-1.5" aria-hidden="true">
          <span
            class="block h-2 rounded-full bg-green-500"
            :style="{ width: `${Math.round((card.month.income / Math.max(card.month.income, card.month.expenses, 1)) * 100)}%` }"
          />
          <span
            class="block h-2 rounded-full bg-red-400"
            :style="{ width: `${Math.round((card.month.expenses / Math.max(card.month.income, card.month.expenses, 1)) * 100)}%` }"
          />
        </div>
      </DeckCard>

      <!-- What the church has today, and how this month is going. -->
      <DeckCard
        v-else-if="card.kind === 'balance'"
        tone="accent"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
      >
        <template #art>
          <CardPanes />
        </template>
        <!-- The Finances artwork, on white because its orange and blue
             are Ekkly's and need a white ground on a coloured card. -->
        <template #trailing>
          <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
            <AppArt app-key="finances" :play="1" class="size-10" />
          </span>
        </template>
        <template v-if="!loading" #title>
          <span class="text-4xl font-bold tabular-nums tracking-tight">{{ peso(balancesToday.total) }}</span>
        </template>
        <!-- This month so far: in and out, as two bars. -->
        <template v-if="!loading" #default>
          <p class="mb-1.5 text-xs font-semibold text-white/80">{{ monthName(current.key) }} so far</p>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2">
              <span class="h-2 rounded-full bg-white" :style="{ width: `${Math.max(monthBars.income, 2)}%` }" aria-hidden="true" />
              <span class="shrink-0 text-xs tabular-nums text-white/85">+{{ peso(current.income) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 rounded-full bg-white/40" :style="{ width: `${Math.max(monthBars.expenses, 2)}%` }" aria-hidden="true" />
              <span class="shrink-0 text-xs tabular-nums text-white/85">−{{ peso(current.expenses) }}</span>
            </div>
          </div>
        </template>
      </DeckCard>

      <DeckCard
        v-else
        :tone="card.tone"
        :icon="card.icon"
        :kicker="card.kicker"
        :title="card.title"
        :detail="card.detail"
        :to="card.to"
        :inset="card.dismissible"
      >
        <DeckChips v-if="card.chips" :tone="card.tone" :items="card.chips" :max="card.chipMax || 4" />
      </DeckCard>
    </template>

    <template #side>
      <AppSidePanel
        title="Latest in the book"
        :rows="latestEntries"
        :loading="loading"
        :count="false"
        :link="{ to: { name: 'Finances' }, label: 'Open the book', short: 'Book' }"
        doodle="bench"
        few="That’s the book so far."
        :empty="{ title: 'Nothing entered yet', line: 'Each entry shows here as it goes in the book.' }"
      />
    </template>
  </AppHome>
</template>

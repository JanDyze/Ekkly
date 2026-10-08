<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, MagnifyingGlass, Plus, SearchX } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import EntryDrawer from '../../components/finances/EntryDrawer.vue'
import { useFinanceOverview } from '../../composables/useFinanceOverview'
import { usePermissions } from '../../composables/usePermissions'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { getDisplayName } from '../../utils/memberUtils'
import { accountShort, categoryLabel } from '../../data/financeChart'
import { formatAmount, formatMoney } from '../../utils/moneyUtils'
import {
  currentMonthKey,
  formatEntryDate,
  formatMonthLabel,
  matchesEntryQuery,
  runningBalances,
  shiftMonth,
} from '../../utils/ledgerUtils'

// The book: every entry of one month, newest first, each with the balance as
// at that line — the page a treasurer writes in.
//
// It was the whole Finances page, with the balances, the month's totals and
// a Book/Statement switch above it. The balances lead the app's home now, and
// the statement is a section of its own; this is the book and only the book,
// so a month of entries starts at the top of the screen.
//
// The month is in the address (/finances/book/2026-09), so a month can be
// linked to and the phone's back button walks back through the months looked
// at. ?new=offering&date=… opens a new Sunday offering already filled in —
// the home's card for a missed Sunday arrives that way.

const route = useRoute()
const router = useRouter()
const { loading, opening, entries, statementForMonth, addEntry, updateEntry, removeEntry } = useFinanceOverview()
const { can, myMember } = usePermissions()
const { user, displayName } = useAuth()
const toast = useToast()

const canManage = computed(() => can('finances.manage'))
const who = computed(() => ({
  uid: user.value?.uid || '',
  name: getDisplayName(myMember.value) || displayName.value,
}))

const monthKey = computed(() => String(route.params.month || currentMonthKey()))
const goMonth = (delta) =>
  router.replace({ name: 'Finances', params: { month: shiftMonth(monthKey.value, delta) } })

const searchQuery = ref('')
const searching = ref(false)
const saving = ref(false)

const showEntry = ref(false)
const editing = ref(null)
const draft = ref(null)
const pendingDelete = ref(null)

const statement = computed(() => statementForMonth(monthKey.value))

/** Newest first on screen, each with the balance as at that line. */
const rows = computed(() =>
  runningBalances(entries.value, opening.value, monthKey.value)
    .slice()
    .reverse()
    .filter(({ entry }) => matchesEntryQuery(entry, searchQuery.value))
)

const subtitle = computed(() => {
  if (loading.value) return formatMonthLabel(monthKey.value)
  return `+${formatAmount(statement.value.income.total)} · −${formatAmount(statement.value.expenses.total)}`
})

const failed = (error, fallback) => {
  console.error(error)
  const code = error?.code ? ` (${error.code})` : ''
  toast.error(
    error?.code === 'permission-denied'
      ? 'Firestore refused that — check the rules on ledgerEntries.'
      : `${fallback}${code}`
  )
}

const openNew = (template = null) => {
  editing.value = null
  draft.value = template
  showEntry.value = true
}

const openEdit = (entry) => {
  if (!canManage.value) return
  draft.value = null
  editing.value = entry
  showEntry.value = true
}

// A missed Sunday's offering, already filled in but for the amount.
onMounted(() => {
  if (route.query.new !== 'offering' || !canManage.value) return
  openNew({
    direction: 'in',
    date: String(route.query.date || ''),
    description: 'Sunday tithes and offering',
    category: 'tithes-offering',
    subcategory: 'onsite',
    account: 'cash',
  })
  router.replace({ query: {} })
})

const handleSave = async (data) => {
  if (saving.value) return
  saving.value = true
  try {
    if (editing.value) await updateEntry(editing.value, data, who.value)
    else await addEntry(data, who.value)
    showEntry.value = false
    editing.value = null
    draft.value = null
  } catch (error) {
    failed(error, 'Could not save that entry')
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  const entry = pendingDelete.value
  if (!entry) return
  try {
    await removeEntry(entry)
    toast.success('Entry deleted')
    showEntry.value = false
    editing.value = null
  } catch (error) {
    failed(error, 'Could not delete that entry')
  } finally {
    pendingDelete.value = null
  }
}

/** Money in adds, money out subtracts, a transfer moves and nets to nothing. */
const signedAmount = (entry) => {
  if (entry.direction === 'transfer') return formatAmount(entry.amount)
  return `${entry.direction === 'in' ? '+' : '−'}${formatAmount(entry.amount)}`
}

const amountClass = (entry) =>
  ({
    in: 'text-green-600 dark:text-green-400',
    out: 'text-red-600 dark:text-red-400',
  })[entry.direction] || 'text-gray-500 dark:text-gray-400'

const spineClass = (entry) =>
  ({
    in: 'border-l-green-500',
    out: 'border-l-red-500',
  })[entry.direction] || 'border-l-gray-300 dark:border-l-gray-600'

const whereLabel = (entry) =>
  entry.direction === 'transfer'
    ? `${accountShort(entry.account)} → ${accountShort(entry.toAccount)}`
    : accountShort(entry.account)

const closeSearch = () => {
  searching.value = false
  searchQuery.value = ''
}
</script>

<template>
  <AppScreen title="Book" :subtitle="subtitle" :back="{ name: 'FinancesHome' }" root="/finances">
    <template #action>
      <button
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        :aria-label="searching ? 'Close search' : 'Search entries'"
        @click="searching ? closeSearch() : (searching = true)"
      >
        <MagnifyingGlass class="size-5" />
      </button>
      <button
        v-if="canManage"
        type="button"
        class="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        @click="openNew()"
      >
        <Plus class="size-4" />
        Entry
      </button>
    </template>

    <!-- Which month is being read -->
    <div class="mb-3 flex items-center gap-1">
      <button
        type="button"
        class="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Previous month"
        @click="goMonth(-1)"
      >
        <ChevronLeft class="size-5" />
      </button>
      <p class="min-w-0 flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
        {{ formatMonthLabel(monthKey) }}
      </p>
      <button
        type="button"
        class="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Next month"
        @click="goMonth(1)"
      >
        <ChevronRight class="size-5" />
      </button>
    </div>

    <input
      v-if="searching"
      v-model="searchQuery"
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      aria-label="Search entries"
      placeholder="Search entries — try “utilities”"
      class="mb-3 h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      @keyup.escape="closeSearch"
    />

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <div
      v-else-if="!rows.length"
      class="flex flex-col items-center rounded-2xl bg-white px-8 py-14 text-center text-gray-500 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700/70"
    >
      <SearchX v-if="searchQuery" class="mb-3 size-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-base font-semibold text-gray-700 dark:text-gray-200">
        <template v-if="searchQuery">Nothing matches “{{ searchQuery }}”</template>
        <template v-else>Nothing entered in {{ formatMonthLabel(monthKey) }}</template>
      </p>
      <p class="text-sm">
        <template v-if="searchQuery">Try a payee, a statement line, or “transfer”.</template>
        <template v-else-if="canManage">Tap Entry to add the first one.</template>
        <template v-else>Nothing to show for this month.</template>
      </p>
    </div>

    <!-- The entries, in one white block, each with its colour on its edge. -->
    <ul
      v-else
      class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
    >
      <li
        v-for="{ entry, balance } in rows"
        :key="entry.id"
        :class="[
          'flex items-start gap-3 border-l-4 py-3 pl-3 pr-4',
          spineClass(entry),
          canManage ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40' : '',
        ]"
        @click="openEdit(entry)"
      >
        <span class="w-11 shrink-0 pt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
          {{ formatEntryDate(entry.date) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium text-gray-900 dark:text-white">{{ entry.description }}</span>
          <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
            {{ categoryLabel(entry) }} · {{ whereLabel(entry) }}<template v-if="entry.payee"> · {{ entry.payee }}</template>
          </span>
        </span>
        <span class="shrink-0 text-right">
          <span :class="['block text-sm font-semibold tabular-nums', amountClass(entry)]">{{ signedAmount(entry) }}</span>
          <span class="block text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ formatAmount(balance) }}</span>
        </span>
      </li>
    </ul>

    <EntryDrawer
      v-model:show="showEntry"
      :entry="editing"
      :draft="draft"
      :saving="saving"
      @save="handleSave"
      @delete="pendingDelete = $event"
    />

    <ConfirmationModal
      :show="Boolean(pendingDelete)"
      title="Delete entry"
      :message="`Delete “${pendingDelete?.description}” for ${formatMoney(pendingDelete?.amount || 0)}? This cannot be undone.`"
      confirm-text="Delete"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="pendingDelete = null"
      @confirm="handleDelete"
      @cancel="pendingDelete = null"
    />
  </AppScreen>
</template>

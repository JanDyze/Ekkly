<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowCounterClockwise, ArrowsLeftRight, CheckCircle, PencilSimple, Trash, Warning } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import ItemThumb from '../../components/inventory/ItemThumb.vue'
import LendSheet from '../../components/inventory/LendSheet.vue'
import RepairSheet from '../../components/inventory/RepairSheet.vue'
import { useInventory } from '../../composables/useInventory'
import { usePermissions } from '../../composables/usePermissions'
import { useToast } from '../../composables/useToast'
import { available, borrowerLine, conditionLabel, loanDueLabel, loanState, onLoan } from '../../utils/inventoryUtils'
import { formatMoney } from '../../utils/moneyUtils'
import { todayKey } from '../../utils/taskUtils'

// One thing the church owns: its picture, large, then what someone standing
// in front of it needs — whether it is here, who has it and when it is due
// back — then the rest of its record, and who borrowed it before.
//
// Whoever keeps the records lends it, takes it back and says it is broken or
// fixed from here, each a tap or a short sheet; changing its name, picture or
// place is the pencil in the header (InventoryEdit). Everyone else reads.

const route = useRoute()
const router = useRouter()
const { items, loading, itemById, lendItem, returnLoan, extendLoan, setCondition, removeItem } = useInventory()
const { canManage } = usePermissions()
const toast = useToast()

const canEdit = computed(() => canManage('inventory'))
const today = todayKey()
const item = computed(() => itemById(String(route.params.id || '')))
const missing = computed(() => !loading.value && !item.value)

const subtitle = computed(() => (item.value ? item.value.category || 'No category' : ''))

const status = computed(() => {
  const it = item.value
  if (!it) return ''
  const out = onLoan(it)
  if (!out) return it.quantity > 1 ? `All ${it.quantity} here` : 'Here'
  if (it.quantity > 1) return `${available(it)} of ${it.quantity} here`
  return 'Out on loan'
})

const details = computed(() => {
  const it = item.value
  if (!it) return []
  return [
    { key: 'place', label: 'Kept in', value: it.location || 'No place set', muted: !it.location },
    { key: 'count', label: 'How many', value: String(it.quantity) },
    {
      key: 'condition',
      label: 'Condition',
      value: it.condition === 'repair' && it.repairNote ? `Needs repair — ${it.repairNote}` : conditionLabel(it.condition),
      warn: it.condition === 'repair',
    },
    it.value ? { key: 'value', label: it.quantity > 1 ? 'Worth, each' : 'Worth', value: formatMoney(it.value) } : null,
    it.acquired ? { key: 'acquired', label: 'Since', value: dateLabel(it.acquired) } : null,
    it.notes ? { key: 'notes', label: 'Notes', value: it.notes } : null,
  ].filter(Boolean)
})

const dateLabel = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, d || 1).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/* ------------------------------------------------------------------ lending */

const showLend = ref(false)
const showRepair = ref(false)
const saving = ref(false)

const lend = async (loan) => {
  saving.value = true
  try {
    await lendItem(item.value, loan)
    showLend.value = false
    toast.success(`${item.value.name} lent to ${loan.to}`)
  } catch (error) {
    console.error('Error lending an item:', error)
    toast.error('Could not lend that. Please try again.')
  } finally {
    saving.value = false
  }
}

const pendingReturn = ref(null)
const confirmReturn = async () => {
  const loan = pendingReturn.value
  pendingReturn.value = null
  if (!loan) return
  try {
    await returnLoan(item.value, loan)
    toast.success(`${item.value.name} is back`)
  } catch (error) {
    console.error('Error returning an item:', error)
    toast.error('Could not mark that as returned. Please try again.')
  }
}

// A week more, counted from the later of today and the day it was due, so a
// late loan extended is due a week from now rather than still late.
const extend = async (loan) => {
  const from = loan.due && loan.due > today ? loan.due : today
  const [y, m, d] = from.split('-').map(Number)
  const next = todayKey(new Date(y, m - 1, d + 7))
  try {
    await extendLoan(item.value, loan, next)
    toast.success(`Due back ${dateLabel(next)}`)
  } catch (error) {
    console.error('Error extending a loan:', error)
    toast.error('Could not change the date. Please try again.')
  }
}

/* ---------------------------------------------------------------- condition */

const markRepair = async (note) => {
  saving.value = true
  try {
    await setCondition(item.value, 'repair', note)
    showRepair.value = false
  } catch (error) {
    console.error('Error marking an item for repair:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const markFixed = async () => {
  try {
    await setCondition(item.value, 'good')
    toast.success(`${item.value.name} is fixed`)
  } catch (error) {
    console.error('Error marking an item fixed:', error)
    toast.error('Could not save that. Please try again.')
  }
}

/* ----------------------------------------------------------------- deleting */

const showDelete = ref(false)
const deleteMessage = computed(() => `Delete "${item.value?.name || 'this item'}"? Its photo and its lending history go with it. This cannot be undone.`)

const confirmDelete = async () => {
  showDelete.value = false
  const it = item.value
  if (!it) return
  try {
    await removeItem(it)
    router.replace({ name: 'InventoryAll' })
  } catch (error) {
    console.error('Error deleting an item:', error)
    toast.error('Could not delete that item. Please try again.')
  }
}

const SOFT =
  'flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light'
</script>

<template>
  <AppScreen :title="item?.name || (missing ? 'Not found' : '')" :subtitle="subtitle" :back="{ name: 'InventoryAll' }" root="/inventory">
    <template #action>
      <RouterLink
        v-if="canEdit && item"
        :to="{ name: 'InventoryEdit', params: { id: item.id } }"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Edit item"
      >
        <PencilSimple class="size-5" />
      </RouterLink>
    </template>

    <div v-if="loading && !items.length" class="flex flex-col gap-3" aria-hidden="true">
      <div class="aspect-[4/3] animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-700" />
      <div class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="missing">
      <ListRow title="This item is not on the list" subtitle="It may have been deleted." :to="{ name: 'InventoryAll' }" />
    </ListGroup>

    <div v-else-if="item" class="flex flex-col gap-5">
      <!-- The picture, and whether it is here. -->
      <section class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <ItemThumb :item="item" size="aspect-[4/3] w-full" large />
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <p class="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-white">{{ status }}</p>
          <span
            v-if="item.condition === 'repair'"
            class="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          >
            Needs repair
          </span>
        </div>
      </section>

      <!-- What whoever keeps the records does here. -->
      <div v-if="canEdit" class="flex gap-2">
        <button v-if="available(item) > 0" type="button" :class="SOFT" @click="showLend = true">
          <ArrowsLeftRight class="size-4" />
          Lend
        </button>
        <button v-if="item.condition === 'repair'" type="button" :class="SOFT" @click="markFixed">
          <CheckCircle class="size-4" />
          It's fixed
        </button>
        <button v-else type="button" :class="SOFT" @click="showRepair = true">
          <Warning class="size-4" />
          Needs repair
        </button>
      </div>

      <!-- Who has it now. -->
      <ListGroup v-if="item.loans.length" title="Out now" :count="item.loans.length">
        <div v-for="loan in item.loans" :key="loan.id" class="px-4 py-3">
          <p class="truncate text-[15px] font-medium text-gray-900 dark:text-white">{{ borrowerLine(loan, item) }}</p>
          <p :class="['mt-0.5 text-sm', loanState(loan, today) === 'overdue' ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400']">
            {{ loanDueLabel(loan, today) }}<template v-if="loan.since"> · since {{ dateLabel(loan.since) }}</template>
          </p>
          <p v-if="loan.note" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{{ loan.note }}</p>
          <div v-if="canEdit" class="mt-2 flex gap-2">
            <button
              type="button"
              class="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
              @click="pendingReturn = loan"
            >
              <ArrowCounterClockwise class="size-4" />
              It's back
            </button>
            <button
              type="button"
              class="h-9 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="extend(loan)"
            >
              A week more
            </button>
          </div>
        </div>
      </ListGroup>

      <!-- The rest of its record. -->
      <ListGroup title="Details">
        <div v-for="row in details" :key="row.key" class="flex gap-3 px-4 py-3 text-[15px]">
          <span class="w-24 shrink-0 text-gray-500 dark:text-gray-400">{{ row.label }}</span>
          <span
            :class="[
              'min-w-0 flex-1 whitespace-pre-line break-words',
              row.warn ? 'font-medium text-amber-700 dark:text-amber-400' : row.muted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white',
            ]"
          >
            {{ row.value }}
          </span>
        </div>
      </ListGroup>

      <!-- Who had it before: the last few, newest first. -->
      <ListGroup v-if="item.history.length" title="Lent before" :count="item.history.length">
        <ListRow
          v-for="entry in item.history.slice(0, 5)"
          :key="`${entry.id}:${entry.returned}`"
          :title="borrowerLine(entry, item)"
          :subtitle="`${dateLabel(entry.since)} to ${dateLabel(entry.returned)}`"
        />
      </ListGroup>

      <button
        v-if="canEdit"
        type="button"
        class="flex h-10 items-center justify-center gap-2 self-center rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        @click="showDelete = true"
      >
        <Trash class="size-4" />
        Delete item
      </button>
    </div>

    <LendSheet :show="showLend" :item="item" :saving="saving" @close="showLend = false" @save="lend" />
    <RepairSheet :show="showRepair" :item="item" :saving="saving" @close="showRepair = false" @save="markRepair" />

    <ConfirmationModal
      :show="Boolean(pendingReturn)"
      title="Mark as returned"
      :message="pendingReturn ? `Is ${item?.name} back from ${pendingReturn.to || 'the borrower'}?` : ''"
      confirm-text="It's back"
      cancel-text="Cancel"
      @update:show="(open) => { if (!open) pendingReturn = null }"
      @confirm="confirmReturn"
      @cancel="pendingReturn = null"
    />
    <ConfirmationModal
      :show="showDelete"
      title="Delete item"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="showDelete = $event"
      @confirm="confirmDelete"
      @cancel="showDelete = false"
    />
  </AppScreen>
</template>

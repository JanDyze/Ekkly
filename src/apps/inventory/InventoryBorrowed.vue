<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import ItemThumb from '../../components/inventory/ItemThumb.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import { useInventory } from '../../composables/useInventory'
import { useInventoryOverview } from '../../composables/useInventoryOverview'
import { useToast } from '../../composables/useToast'
import { borrowerLine, loanDueLabel } from '../../utils/inventoryUtils'

// What is out, one row per loan: overdue first, in red, then what is due this
// week, then the rest. Each row says what, who has it and when it is due, and
// opens the item. Whoever keeps the records can take a thing back from here
// with one tap, because the moment it comes back is usually the moment the
// phone is in hand at the storeroom door.

const { loading, canEdit, loans, today } = useInventoryOverview()
const { returnLoan } = useInventory()
const toast = useToast()

const GROUPS = [
  { key: 'overdue', label: 'Not back yet' },
  { key: 'soon', label: 'Due this week' },
  { key: 'out', label: 'Out' },
]

const groups = computed(() =>
  GROUPS.map((group) => ({ ...group, rows: loans.value.filter((row) => row.state === group.key) })).filter(
    (group) => group.rows.length
  )
)

const subtitle = computed(() => {
  if (loading.value) return ''
  const late = loans.value.filter((row) => row.state === 'overdue').length
  if (!loans.value.length) return 'Everything is here'
  return late ? `${loans.value.length} out · ${late} late` : `${loans.value.length} out`
})

/* --------------------------------------------------------------- returning */

const pending = ref(null)
const returning = ref('')

const confirmReturn = async () => {
  const row = pending.value
  pending.value = null
  if (!row) return
  returning.value = row.loan.id
  try {
    await returnLoan(row.item, row.loan)
    toast.success(`${row.item.name} is back`)
  } catch (error) {
    console.error('Error returning an item:', error)
    toast.error('Could not mark that as returned. Please try again.')
  } finally {
    returning.value = ''
  }
}
</script>

<template>
  <AppScreen title="Borrowed" :subtitle="subtitle" :back="{ name: 'InventoryHome' }" root="/inventory" desk>
    <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!groups.length">
      <ListRow title="Nothing is out" subtitle="When something is lent, it shows here until it comes back." muted />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.key" :title="group.label" :count="group.rows.length">
        <!-- A row is the link to its item, and the Back button sits beside
             it rather than inside it, so neither swallows the other's tap. -->
        <div v-for="row in group.rows" :key="row.loan.id" class="flex items-center">
          <RouterLink
            :to="{ name: 'InventoryItem', params: { id: row.item.id } }"
            class="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/40 dark:active:bg-gray-700/60"
          >
            <ItemThumb :item="row.item" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ row.item.name }}</span>
              <span class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
                {{ borrowerLine(row.loan, row.item) }} ·
                <span :class="row.state === 'overdue' ? 'font-medium text-red-600 dark:text-red-400' : ''">{{ loanDueLabel(row.loan, today) }}</span>
              </span>
            </span>
          </RouterLink>
          <button
            v-if="canEdit"
            type="button"
            :disabled="returning === row.loan.id"
            class="mr-3 h-9 shrink-0 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
            :aria-label="`${row.item.name} is back`"
            @click="pending = row"
          >
            Back
          </button>
        </div>
      </ListGroup>
    </div>

    <ConfirmationModal
      :show="Boolean(pending)"
      title="Mark as returned"
      :message="pending ? `Is ${pending.item.name} back from ${pending.loan.to || 'the borrower'}?` : ''"
      confirm-text="It's back"
      cancel-text="Cancel"
      @update:show="(open) => { if (!open) pending = null }"
      @confirm="confirmReturn"
      @cancel="pending = null"
    />
  </AppScreen>
</template>

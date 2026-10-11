<script setup>
import { computed } from 'vue'
import ListRow from '../appframe/ListRow.vue'
import ItemThumb from './ItemThumb.vue'
import { itemLine, loanState, onLoan } from '../../utils/inventoryUtils'
import { todayKey } from '../../utils/taskUtils'

// One item in a list: its picture, its name, where it is kept and how many,
// and at the end one word for anything out of the ordinary — out, overdue,
// needs repair. Red only for overdue, amber for repair (DESIGN.md).

const props = defineProps({
  item: { type: Object, required: true },
  // The quiet line, when the list has something better to say than the place.
  subtitle: { type: String, default: '' },
})

const today = todayKey()

const flag = computed(() => {
  const loans = props.item.loans || []
  if (loans.some((loan) => loanState(loan, today) === 'overdue')) return { label: 'Overdue', tone: 'red' }
  if (props.item.condition === 'repair') return { label: 'Repair', tone: 'amber' }
  if (onLoan(props.item)) return { label: 'Out', tone: 'plain' }
  return null
})

const TONES = {
  red: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  plain: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
}
</script>

<template>
  <ListRow
    :to="{ name: 'InventoryItem', params: { id: item.id } }"
    :title="item.name || 'Unnamed item'"
    :subtitle="subtitle || itemLine(item)"
  >
    <template #leading>
      <ItemThumb :item="item" />
    </template>
    <template v-if="flag" #trailing>
      <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', TONES[flag.tone]]">{{ flag.label }}</span>
    </template>
  </ListRow>
</template>

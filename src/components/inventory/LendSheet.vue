<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowsLeftRight } from '../../icons'
import InventorySheet from './InventorySheet.vue'
import { useMembers } from '../../composables/useMembers'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import { available, sameName } from '../../utils/inventoryUtils'
import { todayKey } from '../../utils/taskUtils'

// Lending something out: who has it, how many when there are several, and
// when it should be back. The name is typed, with the roll offered as you
// type, because a church lends to people who are not on its roll — a sister
// church, a family borrowing chairs for a wake — and a picker of members only
// would leave nowhere to write them.

const props = defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const { members } = useMembers()

const to = ref('')
const quantity = ref(1)
const due = ref('')
const note = ref('')

const free = computed(() => (props.item ? available(props.item) : 0))
const several = computed(() => (props.item?.quantity || 1) > 1)

// A week from today: most things borrowed from a church go out for one
// Sunday's event and come back the next.
const inDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return todayKey(date)
}

watch(
  () => props.show,
  (open) => {
    if (!open) return
    to.value = ''
    quantity.value = 1
    due.value = inDays(7)
    note.value = ''
  }
)

const names = computed(() =>
  members.value
    .map((member) => getFullName(member).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
)

const valid = computed(() => to.value.trim() && quantity.value >= 1 && quantity.value <= Math.max(1, free.value))

const save = () => {
  if (!valid.value) return
  const member = members.value.find((m) => sameName(getFullName(m), to.value))
  emit('save', {
    to: member ? getFullName(member).trim() : to.value.trim(),
    memberId: member ? memberKey(member) : '',
    quantity: several.value ? Number(quantity.value) : 1,
    due: due.value,
    note: note.value,
  })
}

const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const INPUT =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <InventorySheet :show="show" :title="item ? `Lend ${item.name}` : 'Lend'" :icon="ArrowsLeftRight" @close="emit('close')">
    <form id="inventory-lend" class="space-y-4" @submit.prevent="save">
      <div>
        <label for="lend-to" :class="LABEL">Who is borrowing it <span class="text-red-500">*</span></label>
        <input id="lend-to" v-model="to" list="lend-people" autocomplete="off" placeholder="Ana Reyes" :class="INPUT" />
        <datalist id="lend-people">
          <option v-for="name in names" :key="name" :value="name" />
        </datalist>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Someone on the roll, or anyone else — a sister church, a family.</p>
      </div>

      <div :class="several ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''">
        <div v-if="several">
          <label for="lend-quantity" :class="LABEL">How many</label>
          <input id="lend-quantity" v-model.number="quantity" type="number" inputmode="numeric" min="1" :max="free" :class="INPUT" />
          <p class="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ free }} of {{ item.quantity }} here now</p>
        </div>
        <div>
          <label for="lend-due" :class="LABEL">When it should be back</label>
          <input id="lend-due" v-model="due" type="date" :min="todayKey()" :class="INPUT" />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave it empty if nobody said. It is asked about after a month.</p>
        </div>
      </div>

      <div>
        <label for="lend-note" :class="LABEL">Anything to remember</label>
        <input id="lend-note" v-model="note" placeholder="For the youth camp in Tagaytay" :class="INPUT" />
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="inventory-lend"
        :disabled="!valid || saving"
        :class="[
          'rounded-lg px-4 py-2',
          valid && !saving ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
        ]"
      >
        Lend
      </button>
    </template>
  </InventorySheet>
</template>

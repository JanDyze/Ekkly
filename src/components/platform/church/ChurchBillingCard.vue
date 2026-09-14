<script setup>
import { computed, ref, watch } from 'vue'
import { Loader2, Plus, Receipt, Save, Trash2, X } from '../../../icons'
import SectionCard from '../../common/SectionCard.vue'
import ConfirmationModal from '../../common/ConfirmationModal.vue'
import { callPlatform } from '../../../api/platformService'
import { useToast } from '../../../composables/useToast'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { centavosToInput, formatMoney, parseAmount } from '../../../utils/moneyUtils'
import { TONE_CLASSES, billingBadge, shortDate } from '../../../utils/planUtils'
import { BILLING_STATUSES } from '../../../../lib/platformDefaults.js'

// What a church owes and what it has paid. Tracked here, collected elsewhere:
// the platform takes payment its own way and records it. Recording a payment
// with a "covers until" date moves the paid-through date on by itself.

const props = defineProps({ church: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const toast = useToast()

const today = new Date().toISOString().slice(0, 10)

/* --------------------------------------------------------------- plan */

const form = ref({})
const reset = () => {
  const plan = props.church.plan || {}
  form.value = {
    status: plan.status || 'none',
    paidThrough: plan.paidThrough || '',
    customMonthly: plan.customMonthly === null || plan.customMonthly === undefined ? '' : centavosToInput(plan.customMonthly),
    note: plan.note || '',
  }
}
watch(() => props.church, reset, { immediate: true })

const changed = computed(() => {
  const plan = props.church.plan || {}
  const custom = form.value.customMonthly === '' ? null : parseAmount(form.value.customMonthly)
  return (
    form.value.status !== (plan.status || 'none') ||
    form.value.paidThrough !== (plan.paidThrough || '') ||
    custom !== (plan.customMonthly ?? null) ||
    form.value.note !== (plan.note || '')
  )
})

const saving = ref(false)
const save = async () => {
  saving.value = true
  try {
    emit(
      'updated',
      await callPlatform('setBilling', {
        churchId: props.church.id,
        status: form.value.status,
        paidThrough: form.value.paidThrough,
        customMonthly: form.value.customMonthly === '' ? null : parseAmount(form.value.customMonthly),
        note: form.value.note,
      })
    )
    toast.success('Billing saved')
  } catch (error) {
    console.error('Error saving billing:', error)
    toast.error(error.message || 'Could not save billing. Please try again.')
  } finally {
    saving.value = false
  }
}

const badge = computed(() => billingBadge(props.church.plan, today))

/* ----------------------------------------------------------- payments */

const showPayment = ref(false)
const payment = ref({})
const recording = ref(false)

const addMonth = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m, d))
  return date.toISOString().slice(0, 10)
}

const openPayment = () => {
  const from = props.church.plan?.paidThrough && props.church.plan.paidThrough > today ? props.church.plan.paidThrough : today
  payment.value = {
    amount: centavosToInput(props.church.plan?.monthly || 0),
    paidOn: today,
    coversUntil: addMonth(from),
    method: 'GCash',
    note: '',
  }
  showPayment.value = true
}

const paymentValid = computed(() => parseAmount(payment.value.amount) > 0 && Boolean(payment.value.paidOn))

const recordPayment = async () => {
  if (!paymentValid.value) return
  recording.value = true
  try {
    emit(
      'updated',
      await callPlatform('recordPayment', {
        churchId: props.church.id,
        ...payment.value,
        amount: parseAmount(payment.value.amount),
      })
    )
    showPayment.value = false
    toast.success('Payment recorded')
  } catch (error) {
    console.error('Error recording payment:', error)
    toast.error(error.message || 'Could not record that payment. Please try again.')
  } finally {
    recording.value = false
  }
}

const sheetRef = ref(null)
useFocusTrap(sheetRef, () => showPayment.value, () => (showPayment.value = false))

const pendingRemove = ref(null)
const removeMessage = computed(() =>
  pendingRemove.value
    ? `Remove the payment of ${formatMoney(pendingRemove.value.amount)} from ${shortDate(pendingRemove.value.paidOn)}? The paid-through date stays as it is; change it above if it should move back.`
    : ''
)

const confirmRemove = async () => {
  const target = pendingRemove.value
  if (!target) return
  try {
    emit('updated', await callPlatform('removePayment', { churchId: props.church.id, paymentId: target.id }))
    toast.success('Payment removed')
  } catch (error) {
    console.error('Error removing payment:', error)
    toast.error(error.message || 'Could not remove that payment. Please try again.')
  } finally {
    pendingRemove.value = null
  }
}

const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <SectionCard
    :icon="Receipt"
    title="Billing"
    :subtitle="`${formatMoney(church.plan?.monthly || 0)} a month${church.plan?.customMonthly !== null && church.plan?.customMonthly !== undefined ? ' (custom price)' : ''}`"
  >
    <template #actions>
      <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASSES[badge.tone]]">{{ badge.label }}</span>
    </template>

    <form class="space-y-4 p-4" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="billing-status" :class="label">Status</label>
          <select id="billing-status" v-model="form.status" :class="input">
            <option v-for="status in BILLING_STATUSES" :key="status.key" :value="status.key">{{ status.label }}</option>
          </select>
        </div>
        <div>
          <label for="billing-through" :class="label">Paid through</label>
          <input id="billing-through" v-model="form.paidThrough" type="date" :class="input" />
        </div>
        <div>
          <label for="billing-custom" :class="label">Custom monthly price</label>
          <input
            id="billing-custom"
            v-model="form.customMonthly"
            type="text"
            inputmode="decimal"
            :placeholder="`List price ${formatMoney(church.plan?.listMonthly || 0)}`"
            :class="input"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to charge the list price of its apps.</p>
        </div>
        <div>
          <label for="billing-note" :class="label">Note</label>
          <input id="billing-note" v-model="form.note" type="text" maxlength="500" placeholder="Discount agreed until March" :class="input" />
        </div>
      </div>
      <div class="flex justify-end gap-3">
        <button
          v-if="changed"
          type="button"
          @click="reset"
          class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!changed || saving"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            changed ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save billing
        </button>
      </div>
    </form>

    <div class="border-t border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <h3 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Payments <span class="font-normal tabular-nums text-gray-400">{{ church.payments?.length || 0 }}</span>
        </h3>
        <button
          type="button"
          @click="openPayment"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
        >
          <Plus class="h-4 w-4" />
          Record payment
        </button>
      </div>
      <p v-if="!church.payments?.length" class="px-4 pb-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No payments recorded yet.
      </p>
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
        <li v-for="item in church.payments" :key="item.id" class="flex items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{{ formatMoney(item.amount) }}</p>
            <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {{ shortDate(item.paidOn) }}<template v-if="item.method"> &middot; {{ item.method }}</template>
              <template v-if="item.coversUntil"> &middot; covers to {{ shortDate(item.coversUntil) }}</template>
              <template v-if="item.note"> &middot; {{ item.note }}</template>
            </p>
          </div>
          <button
            type="button"
            @click="pendingRemove = item"
            :aria-label="`Remove the payment from ${shortDate(item.paidOn)}`"
            class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </li>
      </ul>
    </div>

    <!-- Recording a payment: a sheet on a phone, a centred card on a desktop. -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPayment"
          class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          @click.self="showPayment = false"
        >
          <div
            ref="sheetRef"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-title"
            tabindex="-1"
            class="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
              <h3 id="payment-title" class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Receipt class="h-5 w-5 text-primary dark:text-primary-light" />
                Record payment
              </h3>
              <button
                type="button"
                @click="showPayment = false"
                aria-label="Close"
                class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
            <form class="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" @submit.prevent="recordPayment">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="pay-amount" :class="label">Amount (₱) <span class="text-red-500">*</span></label>
                  <input id="pay-amount" v-model="payment.amount" type="text" inputmode="decimal" required :class="input" />
                </div>
                <div>
                  <label for="pay-method" :class="label">How</label>
                  <input id="pay-method" v-model="payment.method" type="text" maxlength="60" placeholder="GCash" :class="input" />
                </div>
                <div>
                  <label for="pay-on" :class="label">Paid on <span class="text-red-500">*</span></label>
                  <input id="pay-on" v-model="payment.paidOn" type="date" required :class="input" />
                </div>
                <div>
                  <label for="pay-covers" :class="label">Covers until</label>
                  <input id="pay-covers" v-model="payment.coversUntil" type="date" :class="input" />
                </div>
              </div>
              <div>
                <label for="pay-note" :class="label">Note</label>
                <input id="pay-note" v-model="payment.note" type="text" maxlength="300" placeholder="Reference number" :class="input" />
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                The paid-through date moves to "covers until" if that is later, and the church is marked paid up.
              </p>
            </form>
            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-gray-700">
              <button
                type="button"
                @click="showPayment = false"
                class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                @click="recordPayment"
                :disabled="!paymentValid || recording"
                :class="[
                  'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
                  paymentValid ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
                ]"
              >
                <Loader2 v-if="recording" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmationModal
      :show="Boolean(pendingRemove)"
      title="Remove payment"
      :message="removeMessage || ' '"
      confirm-text="Remove"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="(open) => { if (!open) pendingRemove = null }"
      @confirm="confirmRemove"
      @cancel="pendingRemove = null"
    />
  </SectionCard>
</template>

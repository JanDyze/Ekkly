<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CreditCard, Loader2, ShieldCheck } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { formatMoney } from '../../utils/moneyUtils'
import { shortDate } from '../../utils/planUtils'
import { MONTHS_PER_YEAR_PAID } from '../../../lib/apps.js'
import { cancelCardBilling, isCardPaymentAvailable, payByCard, syncCardBilling } from '../../api/paymentService'

// Paying for the church's plan with a card that renews on its own, monthly or
// yearly. Part of Apps & plan, for the church's administrators.
//
// The first charge happens here. A church still in its free month keeps it:
// the charge covers a month or a year from when the trial ends. Later charges
// happen at PayMongo without anyone pressing anything, and each moves the
// paid-through date on (see lib/platform/payments.js).

const props = defineProps({
  plan: { type: Object, required: true },
})

const emit = defineEmits(['changed'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { email } = useAuth()

const available = isCardPaymentAvailable()
const card = computed(() => props.plan.card || {})
const cycle = ref('month')

const price = (centavos) => formatMoney(centavos).replace(/\.00$/, '')
const amount = computed(() => (cycle.value === 'year' ? props.plan.monthly * MONTHS_PER_YEAR_PAID : props.plan.monthly))

const todayKey = () => new Date().toISOString().slice(0, 10)
const inTrial = computed(() => props.plan.status === 'trial' && props.plan.paidThrough > todayKey())

const form = ref({ name: '', number: '', expiry: '', cvc: '' })
const error = ref('')
const paying = ref(false)

// 4242424242424242 -> 4242 4242 4242 4242, as it is printed on the card.
const onNumber = (event) => {
  form.value.number = event.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
}
// 0428 -> 04/28
const onExpiry = (event) => {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
  form.value.expiry = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

const ready = computed(() => {
  const f = form.value
  return f.name.trim() && f.number.replace(/\s/g, '').length >= 13 && /^\d{2}\/\d{2}$/.test(f.expiry) && /^\d{3,4}$/.test(f.cvc)
})

const RETURN_FLAG = 'card'

const pay = async () => {
  if (!ready.value || paying.value) return
  error.value = ''
  paying.value = true
  try {
    const [mm, yy] = form.value.expiry.split('/')
    const back = new URL(window.location.href)
    back.searchParams.set('section', 'plan')
    back.searchParams.set(RETURN_FLAG, 'return')
    const result = await payByCard({
      cycle: cycle.value,
      card: { name: form.value.name.trim(), number: form.value.number, expMonth: mm, expYear: `20${yy}`, cvc: form.value.cvc },
      email: email.value,
      returnUrl: back.toString(),
    })
    if (result.status === 'redirect' && result.redirectUrl) {
      // The bank's own check. The page comes back to finish.
      window.location.assign(result.redirectUrl)
      return
    }
    await finish()
  } catch (e) {
    console.error('Error paying by card:', e)
    error.value = e.message || 'Could not take that payment. Please try again.'
  } finally {
    paying.value = false
  }
}

// After paying here, or on the way back from the bank.
const finish = async () => {
  const { card: after } = await syncCardBilling()
  if (after.status === 'active') {
    toast.success('Card saved and paid')
    form.value = { name: '', number: '', expiry: '', cvc: '' }
  } else if (after.status === 'incomplete') {
    error.value = 'The payment has not gone through yet. If your bank asked you to confirm it, try again.'
  }
  emit('changed')
}

onMounted(async () => {
  // With a card on file, a quiet check with PayMongo: a renewal whose webhook
  // went astray is still recorded the next time anyone opens this.
  if (route.query[RETURN_FLAG] !== 'return') {
    if (!card.value.on) return
    try {
      const { card: after } = await syncCardBilling()
      if (after.status !== card.value.status || after.nextBilling !== card.value.nextBilling) emit('changed')
    } catch (e) {
      console.error('Error checking the card:', e)
    }
    return
  }
  const { [RETURN_FLAG]: _drop, ...rest } = route.query
  router.replace({ query: rest })
  try {
    await finish()
  } catch (e) {
    console.error('Error finishing a card payment:', e)
    error.value = e.message || 'Could not check the payment. Please try again.'
  }
})

/* ----------------------------------------------------------------- stop */

const confirmingStop = ref(false)
const stopping = ref(false)

const stop = async () => {
  stopping.value = true
  try {
    await cancelCardBilling()
    toast.success('Card removed. Nothing more will be charged.')
    emit('changed')
  } catch (e) {
    console.error('Error stopping card billing:', e)
    toast.error(e.message || 'Could not remove the card. Please try again.')
  } finally {
    stopping.value = false
  }
}

const statusLine = computed(() => {
  const c = card.value
  if (c.status === 'past_due') return { text: 'The last charge failed. PayMongo will try again each day.', tone: 'text-amber-700 dark:text-amber-300' }
  if (c.status === 'unpaid') return { text: 'Charges kept failing. Add another card to carry on.', tone: 'text-red-600 dark:text-red-400' }
  return { text: c.nextBilling ? `Next charge ${shortDate(c.nextBilling)}` : 'Renews on its own', tone: 'text-gray-500 dark:text-gray-400' }
})

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <SectionCard v-if="available && plan.monthly > 0" :icon="CreditCard" title="Pay by card" subtitle="Renews on its own. Stop any time.">
    <!-- A card is paying. -->
    <div v-if="card.on && card.status !== 'incomplete'" class="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ price(card.amount) }} {{ card.cycle === 'year' ? 'a year' : 'a month' }}
        </p>
        <p :class="['mt-0.5 text-xs', statusLine.tone]">{{ statusLine.text }}</p>
      </div>
      <button type="button" class="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" @click="confirmingStop = true">
        Remove card
      </button>
    </div>

    <!-- No card yet. -->
    <form v-else class="space-y-4 p-4" @submit.prevent="pay">
      <div class="flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700" role="group" aria-label="How often to pay">
        <button
          type="button"
          :aria-pressed="cycle === 'month'"
          :class="['h-9 flex-1 rounded-md px-2.5 text-xs font-medium sm:text-sm', cycle === 'month' ? 'bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light' : 'text-gray-500 dark:text-gray-400']"
          @click="cycle = 'month'"
        >
          Monthly · {{ price(plan.monthly) }}
        </button>
        <button
          type="button"
          :aria-pressed="cycle === 'year'"
          :class="['h-9 flex-1 rounded-md px-2.5 text-xs font-medium sm:text-sm', cycle === 'year' ? 'bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light' : 'text-gray-500 dark:text-gray-400']"
          @click="cycle = 'year'"
        >
          Yearly · {{ price(plan.monthly * MONTHS_PER_YEAR_PAID) }}
        </button>
      </div>

      <div>
        <label for="card-name" :class="label">Name on card</label>
        <input id="card-name" v-model="form.name" type="text" autocomplete="cc-name" maxlength="80" placeholder="Juan dela Cruz" :class="input" />
      </div>
      <div>
        <label for="card-number" :class="label">Card number</label>
        <input id="card-number" :value="form.number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" :class="[input, 'tabular-nums']" @input="onNumber" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="card-expiry" :class="label">Expiry</label>
          <input id="card-expiry" :value="form.expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" :class="[input, 'tabular-nums']" @input="onExpiry" />
        </div>
        <div>
          <label for="card-cvc" :class="label">CVC</label>
          <input id="card-cvc" v-model="form.cvc" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123" :class="[input, 'tabular-nums']" />
        </div>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ price(amount) }} is charged today<template v-if="inTrial">, and your free month still counts: it pays for the {{ cycle === 'year' ? 'year' : 'month' }} after {{ shortDate(plan.paidThrough) }}</template>.
        Then every {{ cycle === 'year' ? 'year' : 'month' }} until you remove the card.
      </p>
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{{ error }}</p>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck class="h-4 w-4" /> Card details go straight to PayMongo
        </span>
        <button
          type="submit"
          :disabled="!ready || paying"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            ready && !paying ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          <Loader2 v-if="paying" class="h-4 w-4 animate-spin" />
          <CreditCard v-else class="h-4 w-4" />
          Pay {{ price(amount) }}
        </button>
      </div>
    </form>

    <ConfirmationModal
      :show="confirmingStop"
      title="Remove card"
      :message="`Stop charging this card? ${plan.paidThrough ? `The church stays paid up until ${shortDate(plan.paidThrough)}.` : ''}`"
      confirm-text="Remove card"
      cancel-text="Cancel"
      @update:show="confirmingStop = $event"
      @confirm="stop"
      @cancel="confirmingStop = false"
    />
  </SectionCard>
</template>

<script setup>
import { computed, onActivated, ref } from 'vue'
import { ChatCircleDots, Loader2, LockSimple, Plus, Receipt, Save, SquaresFour, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ToggleSwitch from '../common/ToggleSwitch.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import CardBillingCard from './CardBillingCard.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { formatMoney } from '../../utils/moneyUtils'
import { TONE_CLASSES, billingBadge, shortDate } from '../../utils/planUtils'
import { SUPPORT_KINDS, supportKindLabel, supportStatusLabel } from '../../../lib/platformDefaults.js'

// What this church pays for, and the way to ask the platform for more.
//
// A church chooses its own apps: turning one off takes its pages away for
// everyone — nothing is deleted, and turning it back on brings them back as
// they were — and lowers the monthly bill by its price. Anything the apps do
// not do yet is a request to the platform, answered here.

const toast = useToast()
const { branding } = usePlatformConfig()

const plan = ref(null)
const catalog = ref([])
const requests = ref([])
const loading = ref(true)
const refused = ref('')

const load = async () => {
  refused.value = ''
  try {
    const [planResult, requestList] = await Promise.all([callPlatform('myPlan'), callPlatform('mySupportRequests')])
    plan.value = planResult.plan
    catalog.value = planResult.catalog
    requests.value = requestList
    reset()
  } catch (error) {
    console.error('Error loading the plan:', error)
    refused.value = error.message || 'Could not load the plan.'
  } finally {
    loading.value = false
  }
}
onActivated(load)

/* ------------------------------------------------------------------ apps */

const enabled = ref(new Set())
const allKeys = computed(() => catalog.value.map((a) => a.key))
const reset = () => {
  enabled.value = new Set(plan.value?.apps || allKeys.value)
}

const locked = computed(() => new Set(plan.value?.lockedOff || []))
const current = computed(() => new Set(plan.value?.apps || allKeys.value))

const toggle = (key, on) => {
  const next = new Set(enabled.value)
  if (on) next.add(key)
  else next.delete(key)
  enabled.value = next
}

const added = computed(() => catalog.value.filter((a) => enabled.value.has(a.key) && !current.value.has(a.key)))
const removed = computed(() => catalog.value.filter((a) => !enabled.value.has(a.key) && current.value.has(a.key)))
const changed = computed(() => added.value.length > 0 || removed.value.length > 0)

const newTotal = computed(() => catalog.value.filter((a) => enabled.value.has(a.key)).reduce((n, a) => n + (a.price || 0), 0))
const hasCustomPrice = computed(() => plan.value?.customMonthly !== null && plan.value?.customMonthly !== undefined)

const confirming = ref(false)
const saving = ref(false)

const confirmMessage = computed(() => {
  const parts = []
  if (added.value.length) parts.push(`turn on ${added.value.map((a) => a.name).join(', ')}`)
  if (removed.value.length) {
    parts.push(`turn off ${removed.value.map((a) => a.name).join(', ')} — their pages disappear for everyone, and nothing in them is deleted`)
  }
  const price = hasCustomPrice.value
    ? 'Your church has an agreed price, so the platform will confirm what this changes.'
    : `Your monthly bill becomes ${formatMoney(newTotal.value)}.`
  return `This will ${parts.join(', and ')}. ${price}`
})

const save = async () => {
  saving.value = true
  try {
    const result = await callPlatform('setMyApps', { apps: [...enabled.value] })
    plan.value = result.plan
    catalog.value = result.catalog
    reset()
    toast.success('Apps saved')
  } catch (error) {
    console.error('Error saving apps:', error)
    toast.error(error.message || 'Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const badge = computed(() => billingBadge(plan.value))

/* ------------------------------------------------------------- requests */

const showRequest = ref(false)
const form = ref({ kind: 'custom-app', title: '', details: '' })
const sending = ref(false)

const openRequest = (kind = 'custom-app', title = '') => {
  form.value = { kind, title, details: '' }
  showRequest.value = true
}

const send = async () => {
  if (!form.value.title.trim()) return
  sending.value = true
  try {
    requests.value = await callPlatform('sendSupportRequest', form.value)
    showRequest.value = false
    toast.success(`Sent to ${branding.value.name}`)
  } catch (error) {
    console.error('Error sending request:', error)
    toast.error(error.message || 'Could not send that. Please try again.')
  } finally {
    sending.value = false
  }
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => showRequest.value, () => (showRequest.value = false))

const STATUS_TONE = {
  new: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  planned: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'in-progress': 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  done: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  declined: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"></div>
    </div>

    <div
      v-else-if="refused"
      class="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-8 py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    >
      <Receipt class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">{{ refused === 'Administrators only' ? 'For administrators' : 'The plan could not be loaded' }}</p>
      <p class="text-sm">
        {{ refused === 'Administrators only' ? 'Only the church’s administrators can see and change what it pays for.' : refused }}
      </p>
    </div>

    <template v-else>
      <SectionCard :icon="Receipt" title="Your plan" :subtitle="`With ${branding.name}`">
        <template #actions>
          <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASSES[badge.tone]]">{{ badge.label }}</span>
        </template>
        <dl class="divide-y divide-gray-100 dark:divide-gray-700">
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Each month</dt>
            <dd class="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
              {{ formatMoney(plan.monthly) }}<span v-if="hasCustomPrice" class="ml-1 text-xs font-normal text-gray-500">agreed price</span>
            </dd>
          </div>
          <div v-if="plan.paidThrough" class="flex items-center justify-between gap-3 px-4 py-3">
            <dt class="text-sm text-gray-500 dark:text-gray-400">{{ plan.status === 'trial' ? 'Trial ends' : 'Paid through' }}</dt>
            <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ shortDate(plan.paidThrough) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Apps on</dt>
            <dd class="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{{ current.size }} of {{ catalog.length }}</dd>
          </div>
        </dl>
        <p v-if="branding.contactEmail" class="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Questions about paying: <a :href="`mailto:${branding.contactEmail}`" class="font-medium text-primary hover:underline dark:text-primary-light">{{ branding.contactEmail }}</a>
        </p>
      </SectionCard>

      <CardBillingCard :plan="plan" @changed="load" />

      <SectionCard :icon="SquaresFour" title="Apps" subtitle="Turn off what the church does not use. Nothing in an app is deleted.">
        <ul class="divide-y divide-gray-100 dark:divide-gray-700">
          <li v-for="app in catalog" :key="app.key" class="flex items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                <span class="truncate">{{ app.name }}</span>
                <LockSimple v-if="locked.has(app.key)" class="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ app.description }}</p>
              <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {{ app.price ? `${formatMoney(app.price)} a month` : 'Included' }}
                <template v-if="app.core"> &middot; always on</template>
                <template v-else-if="locked.has(app.key)"> &middot; switched off by {{ branding.name }}</template>
                <template v-else-if="!app.available && !current.has(app.key)"> &middot; not offered at the moment</template>
              </p>
            </div>
            <button
              v-if="locked.has(app.key)"
              type="button"
              @click="openRequest('change', `Turn ${app.name} back on`)"
              class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 dark:text-primary-light"
            >
              Ask
            </button>
            <ToggleSwitch
              v-else
              :model-value="enabled.has(app.key)"
              :disabled="app.core || (!app.available && !current.has(app.key))"
              :label="`${app.name} on`"
              @update:model-value="toggle(app.key, $event)"
            />
          </li>
        </ul>
        <div v-if="changed" class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <span v-if="!hasCustomPrice" class="mr-auto text-sm text-gray-500 dark:text-gray-400">
            New monthly total <span class="font-medium tabular-nums text-gray-900 dark:text-white">{{ formatMoney(newTotal) }}</span>
          </span>
          <button type="button" @click="reset" class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
            Cancel
          </button>
          <button
            type="button"
            @click="confirming = true"
            :disabled="saving"
            class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Save apps
          </button>
        </div>
      </SectionCard>

      <SectionCard :icon="ChatCircleDots" title="Requests" :subtitle="`A new app, a change, a problem, or feedback for ${branding.name}`">
        <template #actions>
          <button
            type="button"
            @click="openRequest()"
            class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
          >
            <Plus class="h-4 w-4" />
            New
          </button>
        </template>
        <p v-if="!requests.length" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Nothing asked yet. Is there something the app should do for your church?
        </p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
          <li v-for="request in requests" :key="request.id" class="px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ request.title }}</p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ supportKindLabel(request.kind) }} &middot; {{ request.displayName || request.email }}
                  &middot; {{ request.createdAt ? new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '' }}
                </p>
              </div>
              <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONE[request.status]]">
                {{ supportStatusLabel(request.status) }}
              </span>
            </div>
            <p v-if="request.reply" class="mt-2 whitespace-pre-line rounded-lg bg-primary/5 px-3 py-2 text-sm text-gray-700 dark:bg-primary-light/10 dark:text-gray-300">
              <span class="font-medium text-gray-900 dark:text-white">{{ branding.name }}:</span> {{ request.reply }}
            </p>
          </li>
        </ul>
      </SectionCard>
    </template>

    <ConfirmationModal
      :show="confirming"
      title="Change apps"
      :message="confirmMessage"
      confirm-text="Save"
      cancel-text="Cancel"
      confirm-button-class="bg-primary text-white hover:bg-primary-hover"
      @update:show="confirming = $event"
      @confirm="save"
      @cancel="confirming = false"
    />

    <Teleport to="body">
      <div v-if="showRequest" class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" @click.self="showRequest = false">
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-title"
          tabindex="-1"
          class="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <h3 id="request-title" class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <ChatCircleDots class="h-5 w-5 text-primary dark:text-primary-light" />
              New request
            </h3>
            <button type="button" @click="showRequest = false" aria-label="Close" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>
          <form class="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" @submit.prevent="send">
            <div>
              <p class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">What is it</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="kind in SUPPORT_KINDS"
                  :key="kind.key"
                  type="button"
                  @click="form.kind = kind.key"
                  :aria-pressed="form.kind === kind.key"
                  :class="[
                    'rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    form.kind === kind.key
                      ? 'bg-primary/10 font-medium text-primary ring-1 ring-primary/30 dark:bg-primary-light/15 dark:text-primary-light'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                  ]"
                >
                  {{ kind.label }}
                </button>
              </div>
            </div>
            <div>
              <label for="request-title-input" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                In a few words <span class="text-red-500">*</span>
              </label>
              <input
                id="request-title-input"
                v-model="form.title"
                type="text"
                maxlength="140"
                required
                :placeholder="form.kind === 'custom-app' ? 'A page for tracking pledges' : form.kind === 'bug' ? 'Attendance will not save on my phone' : 'Let us export minutes as PDF'"
                :class="input"
              />
            </div>
            <div>
              <label for="request-details" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Details</label>
              <textarea
                id="request-details"
                v-model="form.details"
                rows="5"
                maxlength="4000"
                placeholder="What it should do, who would use it, and anything else that helps"
                :class="[input, 'resize-none']"
              ></textarea>
            </div>
          </form>
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-gray-700">
            <button type="button" @click="showRequest = false" class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button
              type="button"
              @click="send"
              :disabled="!form.title.trim() || sending"
              :class="[
                'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
                form.title.trim() ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
              ]"
            >
              <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
              <ChatCircleDots v-else class="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

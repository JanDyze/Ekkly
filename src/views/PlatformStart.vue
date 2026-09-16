<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, CaretDown, CheckCircle2, Clock, ExternalLink, Loader2, LogOut, Pencil, Send, Trash2, X } from '../icons'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue'
import FrontDoorHeader from '../components/frontdoor/FrontDoorHeader.vue'
import FrontDoorFooter from '../components/frontdoor/FrontDoorFooter.vue'
import CookieBanner from '../components/frontdoor/CookieBanner.vue'
import ChatBubble from '../components/frontdoor/ChatBubble.vue'
import AppArt from '../components/frontdoor/AppArt.vue'
import { TYPE } from '../components/frontdoor/type'
import { initAuth, useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import { useFrontDoorConsent } from '../composables/useFrontDoorConsent'
import { planFrom, useFrontDoor } from '../composables/useFrontDoor'
import { churchLink as linkOf, churchLinkLabel as linkLabel, useChurchRequests } from '../composables/useChurchRequests'
import { submitChurchRequest, withdrawChurchRequest } from '../api/platformService'
import { isValidChurchId, suggestChurchId } from '../../lib/churchId.js'
import { formatMoney } from '../utils/moneyUtils'

// Get started: where every call to action on the front door lands. Someone
// signs in, asks for their church, and comes back here to see what became of
// the request — which is why it is a page with its own link, not the bottom of
// a long one.
//
// The platform's administrators approve requests on /platform; approving one
// is what creates the church, makes this person its first administrator and
// opens its link.

const toast = useToast()
const { user, isAuthenticated, displayName, email, logout } = useAuth()
const { catalog } = usePlatformConfig()
const { answered } = useFrontDoorConsent()
const { picks, namedChurch } = useFrontDoor()
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''

const signedInKnown = ref(false)
initAuth().then(() => {
  signedInKnown.value = true
})

// The requests this account has sent, shared with the home page's status strip.
const { requests, hasPending, ready: requestsKnown } = useChurchRequests()

// Nothing is drawn until both are known: a form that appears and is replaced a
// moment later by "your request is waiting" reads as a page that changed its
// mind. The skeleton holds the place until the answer is in.
const ready = computed(() => signedInKnown.value && (!isAuthenticated.value || requestsKnown.value))

/* ------------------------------------------------------------- the plan */

// The plan they built on the way here, so it goes with the request.
const plan = computed(() => planFrom(catalog.value, picks.value))
const hasPrices = computed(() => plan.value.apps.some((app) => app.price > 0))
const peso = (centavos) => formatMoney(centavos)

/* ------------------------------------------------------------------ form */

// Declared before the watches below, which clear it as the visitor types.
const sending = ref(false)
const error = ref('')

const form = reactive({
  churchName: '',
  churchId: '',
  location: '',
  size: '',
  contactNumber: '',
  message: '',
})

// The church named in the welcome, and the apps picked on the way, fill in
// what they can. Both stay editable.
onMounted(() => {
  if (!form.churchName) form.churchName = namedChurch.value
})
// What the message says before they have written anything of their own. The
// last step reads it too: a message nobody has touched is not an answer.
const suggestedMessage = ref('')
watch(
  () => plan.value.apps.map((app) => app.name).join(', '),
  (names) => {
    if (!names) return
    if (form.message && form.message !== suggestedMessage.value) return
    suggestedMessage.value = `Apps we would use: ${names}.`
    form.message = suggestedMessage.value
  },
  { immediate: true }
)

// The link follows the name until somebody edits it themselves. The name is
// also remembered as their church, for the front door's previews — but not
// emptied when the form is, after sending.
const linkEdited = ref(false)
watch(
  () => form.churchName,
  (name) => {
    if (!linkEdited.value) form.churchId = suggestChurchId(name)
    if (name.trim()) namedChurch.value = name.trim()
    // Typing answers whatever the step was complaining about.
    if (error.value) error.value = ''
  },
  { immediate: true }
)

const onLinkInput = (event) => {
  linkEdited.value = true
  form.churchId = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

const linkValid = computed(() => !form.churchId || isValidChurchId(form.churchId))
const linkPreview = computed(() =>
  rootDomain ? `${form.churchId || 'your-church'}.${rootDomain}` : form.churchId || 'your-church'
)

const SIZES = ['Under 50', '50–150', '150–500', 'Over 500']

/* --------------------------------------------------------------- steps */

// Asked a few at a time rather than as one long form: a church's name, then
// where it is, then how to reach them. Nobody faces six boxes at once, and
// each step can say what it is for.
const STEPS = [
  { title: 'Your church', hint: 'Its name, and the link it will open at.' },
  { title: 'About it', hint: 'So we know what to set up. Both can be skipped.' },
  { title: 'Reaching you', hint: 'How we let you know, and anything else.' },
]
const step = ref(0)
const last = computed(() => step.value === STEPS.length - 1)

// Only the name is asked for; the rest may be left.
const canGoOn = computed(() => (step.value > 0 ? true : Boolean(form.churchName.trim()) && linkValid.value))

// Nothing filled in on a step that did not have to be: the button says so,
// rather than asking them to "continue" past a question they have skipped.
const stepAnswered = computed(() =>
  step.value === 1
    ? Boolean(form.location.trim() || form.size)
    : Boolean(form.contactNumber.trim() || (form.message.trim() && form.message !== suggestedMessage.value))
)
const onwardsLabel = computed(() => {
  if (step.value === 0) return 'Continue'
  if (last.value) return stepAnswered.value ? 'Send request' : 'Skip and send'
  return stepAnswered.value ? 'Continue' : 'Skip'
})

// Which way the steps are going, so one slides out the way the next comes in.
const direction = ref('next')

const back = () => {
  error.value = ''
  direction.value = 'prev'
  step.value = Math.max(0, step.value - 1)
}

const onwards = () => {
  error.value = ''
  if (!canGoOn.value) {
    error.value = form.churchName.trim() ? 'The link can only use lowercase letters, numbers and single hyphens, 3 to 40 long.' : 'Give your church a name.'
    return
  }
  if (last.value) return submit()
  direction.value = 'next'
  step.value += 1
}

// A sideways swipe moves between steps, the way the rest of the front door
// turns. A swipe that is mostly up or down is the page scrolling.
let touch = null
const onTouchStart = (event) => {
  const t = event.touches[0]
  touch = event.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
}
const onTouchEnd = (event) => {
  if (!touch) return
  const t = event.changedTouches[0]
  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y
  touch = null
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0 && !last.value) onwards()
  else if (dx > 0 && step.value > 0) back()
}

// The link follows the name, so it is shown rather than asked for until
// somebody wants to change it.
const showLink = ref(false)

const submit = async () => {
  error.value = ''
  if (!form.churchName.trim()) {
    error.value = 'Give your church a name.'
    return
  }
  if (!linkValid.value) {
    error.value = 'The link can only use lowercase letters, numbers and single hyphens, 3 to 40 long.'
    return
  }
  sending.value = true
  try {
    await submitChurchRequest(user.value, form)
    toast.success('Request sent')
    Object.assign(form, { churchName: '', churchId: '', location: '', size: '', contactNumber: '', message: '' })
    linkEdited.value = false
    showLink.value = false
    step.value = 0
  } catch (e) {
    console.error('Error requesting a church:', e)
    error.value = e.message || 'Could not send your request.'
  } finally {
    sending.value = false
  }
}

const formatDate = (date) =>
  date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''

/* ------------------------------------------------------ a sent request */

// What was sent, for anyone who wants to check it — and, while it is still
// waiting, the way to take it back. Sending again is how a request is changed,
// plan and all, since the one already sent is what we are reading.
const openRequest = ref('')
const toggleRequest = (id) => (openRequest.value = openRequest.value === id ? '' : id)

const detailsOf = (request) =>
  [
    { label: 'Its link', value: linkLabel(request) || request.churchId },
    { label: 'Where', value: request.location },
    { label: 'How many come', value: request.size },
    { label: 'Contact number', value: request.contactNumber },
    { label: 'What you told us', value: request.message },
  ].filter((row) => row.value)

const withdrawing = ref('')
const confirming = ref('')

const cancelRequest = async (request) => {
  if (confirming.value !== request.id) {
    confirming.value = request.id
    return
  }
  withdrawing.value = request.id
  try {
    await withdrawChurchRequest(request.id)
    toast.success('Request taken back')
    confirming.value = ''
    // Their answers come back, so sending again is a change rather than a
    // fresh start.
    Object.assign(form, {
      churchName: request.churchName,
      churchId: request.churchId,
      location: request.location,
      size: request.size,
      contactNumber: request.contactNumber,
      message: request.message,
    })
    linkEdited.value = true
    step.value = 0
  } catch (e) {
    console.error('Error taking back a request:', e)
    toast.error(e.message || 'Could not take that request back.')
  } finally {
    withdrawing.value = ''
  }
}

const input =
  'mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white'
</script>

<template>
  <div class="flex min-h-dvh flex-col overflow-x-clip bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
    <FrontDoorHeader />

    <main class="flex-1 py-12 lg:py-16">
      <div class="mx-auto max-w-2xl px-4 sm:px-6">
        <div class="text-center">
          <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Get started</p>
          <h1 :class="['mt-3', TYPE.title]">Ask for your church</h1>
          <p :class="['mx-auto mt-4 max-w-xl text-gray-600 dark:text-gray-300', TYPE.lead]">
            Sign in, tell us about your church, and we open it for you. You become its first administrator.
          </p>
        </div>

        <!-- The plan they built, with a way back to change it. -->
        <div v-if="plan.apps.length" class="mt-8 flex items-center gap-4 rounded-2xl bg-gray-100 p-4 dark:bg-gray-900">
          <div class="grid shrink-0 grid-cols-2 gap-1">
            <AppArt v-for="app in plan.apps.slice(0, 4)" :key="app.key" :app-key="app.key" class="h-6 w-6" />
          </div>
          <p class="min-w-0 flex-1 text-sm">
            <span class="block font-semibold">
              Your plan: {{ plan.apps.length }} {{ plan.apps.length === 1 ? 'app' : 'apps' }}<template v-if="hasPrices">, {{ peso(plan.total) }} a month</template>
            </span>
            <span class="block text-gray-500 dark:text-gray-400">
              <template v-if="hasPending">Sent with your request. Take the request back to change it.</template>
              <template v-else>
                First month free.
                <RouterLink to="/pricing" class="font-semibold text-primary underline-offset-4 hover:underline dark:text-primary-light">Change plan</RouterLink>
              </template>
            </span>
          </p>
        </div>

        <div class="mt-6">
          <!-- Restoring the session: the card's shape, not a spinner. -->
          <div v-if="!ready" class="animate-pulse space-y-3 rounded-3xl border border-gray-200 p-6 dark:border-gray-800" aria-busy="true">
            <div class="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-4 w-full rounded bg-gray-100 dark:bg-gray-800/60"></div>
            <div class="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800/60"></div>
            <div class="h-12 w-full rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          </div>

          <!-- Signed out -->
          <div v-else-if="!isAuthenticated" class="rounded-3xl bg-gray-900 p-6 text-white shadow-xl sm:p-8 dark:ring-1 dark:ring-gray-800">
            <h2 class="text-2xl font-black tracking-tight">Sign in to ask</h2>
            <p class="mt-2 text-sm leading-relaxed text-white/70">
              Use the Google account you will run the church with. You become its first administrator once the request is
              approved.
            </p>
            <p v-if="error" role="alert" class="mt-4 rounded-xl bg-red-950/60 px-4 py-3 text-xs font-semibold text-red-200">
              {{ error }}
            </p>
            <div class="mt-6">
              <GoogleSignInButton @error="error = $event" />
            </div>
          </div>

          <template v-else>
            <!-- Their requests -->
            <div v-if="requests.length" class="mb-8">
              <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Your requests</h2>
              <ul class="mt-3 space-y-2">
                <li v-for="request in requests" :key="request.id" class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ request.churchName }}</p>
                      <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Asked {{ formatDate(request.createdAt) }}</p>
                    </div>
                    <span
                      v-if="request.status === 'approved'"
                      class="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    >
                      <CheckCircle2 class="h-3.5 w-3.5" /> Approved
                    </span>
                    <span
                      v-else-if="request.status === 'declined'"
                      class="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-400"
                    >
                      <X class="h-3.5 w-3.5" /> Declined
                    </span>
                    <span
                      v-else
                      class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    >
                      <Clock class="h-3.5 w-3.5" /> Waiting
                    </span>
                  </div>
                  <!-- What was sent, for checking it over. -->
                  <div class="mt-3">
                    <button
                      type="button"
                      :aria-expanded="openRequest === request.id"
                      class="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      @click="toggleRequest(request.id)"
                    >
                      {{ openRequest === request.id ? 'Hide details' : 'See details' }}
                      <CaretDown :class="['h-3.5 w-3.5 transition-transform', openRequest === request.id ? 'rotate-180' : '']" />
                    </button>
                    <div class="grid transition-all duration-300" :class="openRequest === request.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
                      <dl class="overflow-hidden text-sm">
                        <div v-for="row in detailsOf(request)" :key="row.label" class="flex gap-3 pt-2">
                          <dt class="w-32 shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
                          <dd class="min-w-0 flex-1 wrap-break-word">{{ row.value }}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <a
                    v-if="request.status === 'approved' && linkOf(request)"
                    :href="linkOf(request)"
                    class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-primary-light"
                  >
                    Open {{ linkLabel(request) }}
                    <ExternalLink class="h-3.5 w-3.5" />
                  </a>

                  <p v-if="request.status === 'declined' && request.note" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    &ldquo;{{ request.note }}&rdquo;
                  </p>

                  <!-- Taking it back, while nobody has answered it. -->
                  <div v-if="request.status === 'pending'" class="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <p v-if="confirming === request.id" class="text-xs text-gray-500 dark:text-gray-400">
                      This takes the request back. Your answers stay in the form, so you can change them and send again.
                    </p>
                    <div class="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        :disabled="withdrawing === request.id"
                        class="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                        @click="cancelRequest(request)"
                      >
                        <Loader2 v-if="withdrawing === request.id" class="h-3.5 w-3.5 animate-spin" />
                        <Trash2 v-else class="h-3.5 w-3.5" />
                        {{ confirming === request.id ? 'Yes, take it back' : 'Cancel this request' }}
                      </button>
                      <button
                        v-if="confirming === request.id"
                        type="button"
                        class="h-9 rounded-lg px-3 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        @click="confirming = ''"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <!-- The form -->
            <div v-if="!hasPending" class="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
              <h2 class="text-2xl font-black tracking-tight">About your church</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">We will look it over and let you know.</p>

              <!-- Where they are, as a line that fills. -->
              <div class="mt-5 flex items-center gap-2" aria-hidden="true">
                <span
                  v-for="(one, index) in STEPS"
                  :key="one.title"
                  :class="[
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    index <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700',
                  ]"
                ></span>
              </div>
              <p class="mt-3 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                Step {{ step + 1 }} of {{ STEPS.length }} · {{ STEPS[step].title }}
              </p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ STEPS[step].hint }}</p>

              <form class="mt-5 overflow-hidden" @submit.prevent="onwards" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
                <Transition :name="`step-${direction}`" mode="out-in">
                <div :key="step" class="space-y-4">
                <!-- 1. The church, and the link it will open at. -->
                <template v-if="step === 0">
                  <div>
                    <label for="church-name" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Church name</label>
                    <input id="church-name" v-model="form.churchName" type="text" maxlength="120" autocomplete="organization" :class="input" />
                  </div>

                  <div v-if="!showLink" class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs dark:bg-gray-800">
                    <span class="min-w-0 flex-1 truncate text-gray-500 dark:text-gray-400">
                      Opens at <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ linkPreview }}</span>
                    </span>
                    <button type="button" class="inline-flex shrink-0 items-center gap-1 font-semibold text-primary dark:text-primary-light" @click="showLink = true">
                      <Pencil class="h-3.5 w-3.5" />
                      Change
                    </button>
                  </div>
                  <div v-else>
                    <label for="church-link" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Your church’s link</label>
                    <input
                      id="church-link"
                      :value="form.churchId"
                      type="text"
                      maxlength="40"
                      inputmode="url"
                      autocapitalize="off"
                      spellcheck="false"
                      :class="[input, 'font-mono', linkValid ? '' : 'border-red-400 focus:border-red-500 focus:ring-red-500']"
                      @input="onLinkInput"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      People will open it at <span class="font-mono font-semibold">{{ linkPreview }}</span>
                    </p>
                  </div>
                </template>

                <!-- 2. Where it is, and how many it holds. -->
                <template v-else-if="step === 1">
                  <div>
                    <label for="church-location" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Where is it?</label>
                    <input id="church-location" v-model="form.location" type="text" maxlength="160" placeholder="City, province" :class="input" />
                  </div>
                  <div>
                    <span class="block text-xs font-semibold text-gray-700 dark:text-gray-300">How many people come?</span>
                    <div class="mt-2 grid grid-cols-2 gap-2">
                      <button
                        v-for="size in SIZES"
                        :key="size"
                        type="button"
                        :aria-pressed="form.size === size"
                        :class="[
                          'h-11 rounded-xl border text-sm font-semibold transition-colors',
                          form.size === size
                            ? 'border-primary bg-primary/10 text-primary dark:border-primary-light dark:bg-primary-light/15 dark:text-primary-light'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300',
                        ]"
                        @click="form.size = form.size === size ? '' : size"
                      >
                        {{ size }}
                      </button>
                    </div>
                  </div>
                </template>

                <!-- 3. How to reach them. -->
                <template v-else>
                  <div>
                    <label for="church-contact" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Contact number</label>
                    <input id="church-contact" v-model="form.contactNumber" type="tel" maxlength="40" inputmode="tel" placeholder="09XX XXX XXXX" :class="input" />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">We answer by email as well, at {{ email || 'your account' }}.</p>
                  </div>
                  <div>
                    <label for="church-message" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Anything we should know</label>
                    <textarea
                      id="church-message"
                      v-model="form.message"
                      rows="3"
                      maxlength="1000"
                      placeholder="The apps you are most interested in, when you would like to start"
                      :class="[input, 'h-auto resize-none py-2.5']"
                    ></textarea>
                  </div>
                </template>

                <p v-if="error" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {{ error }}
                </p>

                </div>
                </Transition>

                <div class="mt-4 flex items-center gap-3">
                  <button
                    v-if="step > 0"
                    type="button"
                    class="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    @click="back"
                  >
                    <ArrowLeft class="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    :disabled="sending"
                    class="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
                    <Send v-else-if="last" class="h-4 w-4" />
                    {{ onwardsLabel }}
                    <ArrowRight v-if="!last" class="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </form>
            </div>

            <div class="mt-6 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span class="min-w-0 truncate">{{ displayName }}<template v-if="email"> &middot; {{ email }}</template></span>
              <button type="button" class="inline-flex shrink-0 items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-white" @click="logout">
                <LogOut class="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </template>
        </div>
      </div>
    </main>

    <FrontDoorFooter />
    <CookieBanner />
    <ChatBubble v-if="answered" />
  </div>
</template>

<style scoped>
/* One step slides away and the next comes in from the side it lies on, as the
   rest of the front door turns. */
.step-next-enter-active,
.step-next-leave-active,
.step-prev-enter-active,
.step-prev-leave-active {
  transition:
    opacity 0.2s ease,
    translate 0.2s ease;
}

.step-next-enter-from,
.step-prev-leave-to {
  opacity: 0;
  translate: 1.5rem 0;
}

.step-next-leave-to,
.step-prev-enter-from {
  opacity: 0;
  translate: -1.5rem 0;
}

@media (prefers-reduced-motion: reduce) {
  .step-next-enter-active,
  .step-next-leave-active,
  .step-prev-enter-active,
  .step-prev-leave-active {
    transition: none;
  }
}
</style>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { CheckCircle2, Clock, ExternalLink, Loader2, LogOut, Send, X } from '../icons'
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
import { submitChurchRequest, subscribeToMyChurchRequests } from '../api/platformService'
import { churchOrigin, isValidChurchId, suggestChurchId } from '../../lib/churchId.js'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'
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

const ready = ref(false)
const requests = ref([])
let unsubscribe = null

initAuth().then(() => {
  ready.value = true
})

watch(
  [ready, () => user.value?.uid],
  ([isReady, uid]) => {
    unsubscribe?.()
    unsubscribe = null
    requests.value = []
    if (!isReady || !uid) return
    unsubscribe = subscribeToMyChurchRequests(uid, (list) => {
      requests.value = list
    })
  },
  { immediate: true }
)

onUnmounted(() => unsubscribe?.())

const hasPending = computed(() => requests.value.some((r) => r.status === 'pending'))

/* ------------------------------------------------------------- the plan */

// The plan they built on the way here, so it goes with the request.
const plan = computed(() => planFrom(catalog.value, picks.value))
const hasPrices = computed(() => plan.value.apps.some((app) => app.price > 0))
const peso = (centavos) => formatMoney(centavos).replace(/\.00$/, '')

/* ------------------------------------------------------------------ form */

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
watch(
  () => plan.value.apps.map((app) => app.name).join(', '),
  (names) => {
    if (names && (!form.message || form.message.startsWith('Apps we would use:'))) form.message = `Apps we would use: ${names}.`
  },
  { immediate: true }
)

// The link follows the name until somebody edits it themselves.
const linkEdited = ref(false)
watch(
  () => form.churchName,
  (name) => {
    if (!linkEdited.value) form.churchId = suggestChurchId(name)
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

const sending = ref(false)
const error = ref('')

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
  } catch (e) {
    console.error('Error requesting a church:', e)
    error.value = e.message || 'Could not send your request.'
  } finally {
    sending.value = false
  }
}

// On localhost there is no domain to give a church a link under, so it opens
// on this same address instead (see devChurchOverride).
const linkOf = (request) =>
  rootDomain
    ? churchOrigin(request.churchId, { rootDomain })
    : canSwitchChurchHere() && request.churchId
      ? devChurchLink(request.churchId)
      : ''
const linkLabel = (request) => linkOf(request).replace(/^https:\/\//, '').replace(/^\/\?church=/, 'localhost ▸ ')

const formatDate = (date) =>
  date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''

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
              First month free.
              <RouterLink to="/pricing" class="font-semibold text-primary underline-offset-4 hover:underline dark:text-primary-light">Change plan</RouterLink>
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
                </li>
              </ul>
            </div>

            <!-- The form -->
            <div v-if="!hasPending" class="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
              <h2 class="text-2xl font-black tracking-tight">About your church</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">We will look it over and let you know.</p>

              <form class="mt-6 space-y-4" @submit.prevent="submit">
                <div>
                  <label for="church-name" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Church name</label>
                  <input id="church-name" v-model="form.churchName" type="text" maxlength="120" required :class="input" />
                </div>

                <div>
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

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="church-location" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Location</label>
                    <input id="church-location" v-model="form.location" type="text" maxlength="160" placeholder="City, province" :class="input" />
                  </div>
                  <div>
                    <label for="church-size" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Congregation size</label>
                    <select id="church-size" v-model="form.size" :class="input">
                      <option value="">Choose one</option>
                      <option v-for="size in SIZES" :key="size" :value="size">{{ size }}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label for="church-contact" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Contact number</label>
                  <input id="church-contact" v-model="form.contactNumber" type="tel" maxlength="40" :class="input" />
                </div>

                <div>
                  <label for="church-message" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Anything we should know</label>
                  <textarea
                    id="church-message"
                    v-model="form.message"
                    rows="3"
                    maxlength="1000"
                    placeholder="How many people would use it, when you would like to start"
                    :class="[input, 'h-auto resize-none py-2.5']"
                  ></textarea>
                </div>

                <p v-if="error" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {{ error }}
                </p>

                <button
                  type="submit"
                  :disabled="sending"
                  class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
                  <Send v-else class="h-4 w-4" />
                  Send request
                </button>
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

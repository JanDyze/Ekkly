<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { Building2, CheckCircle2, Clock, ExternalLink, Loader2, LogOut, Send, ShieldCheck, X } from '../icons'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue'
import { initAuth, useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import {
  isPlatformAdmin,
  submitChurchRequest,
  subscribeToMyChurchRequests,
} from '../api/platformService'
import { churchOrigin, isValidChurchId, suggestChurchId } from '../../lib/churchId.js'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'

// The platform's front door: church.app itself, and app.church.app.
//
// No church is served here. It is where a congregation's leader signs in and
// asks for a church of their own, and sees what became of that request. The
// platform's administrators approve requests on /platform, and approving one
// is what creates the church, makes this person its first administrator and
// opens its address.

const toast = useToast()
const { user, isAuthenticated, displayName, email, logout } = useAuth()

// The name and the words come from the console (Name & front door), falling
// back to VITE_PLATFORM_NAME and the wording the app shipped with.
const { branding } = usePlatformConfig()
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''

const ready = ref(false)
const requests = ref([])
const admin = ref(false)
let unsubscribe = null

initAuth().then(() => {
  ready.value = true
})

watch(
  [ready, () => user.value?.uid],
  async ([isReady, uid]) => {
    unsubscribe?.()
    unsubscribe = null
    requests.value = []
    admin.value = false
    if (!isReady || !uid) return
    unsubscribe = subscribeToMyChurchRequests(uid, (list) => {
      requests.value = list
    })
    admin.value = await isPlatformAdmin(uid)
  },
  { immediate: true }
)

onUnmounted(() => unsubscribe?.())

const hasPending = computed(() => requests.value.some((r) => r.status === 'pending'))

/* ------------------------------------------------------------------ form */

const form = reactive({
  churchName: '',
  churchId: '',
  location: '',
  size: '',
  contactNumber: '',
  message: '',
})

// The address follows the name until somebody edits it themselves.
const addressEdited = ref(false)
watch(
  () => form.churchName,
  (name) => {
    if (!addressEdited.value) form.churchId = suggestChurchId(name)
  }
)

const onAddressInput = (event) => {
  addressEdited.value = true
  form.churchId = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

const addressValid = computed(() => !form.churchId || isValidChurchId(form.churchId))
const addressPreview = computed(() =>
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
  if (!addressValid.value) {
    error.value = 'The address can only use lowercase letters, numbers and single hyphens, 3 to 40 long.'
    return
  }
  sending.value = true
  try {
    await submitChurchRequest(user.value, form)
    toast.success('Request sent')
    Object.assign(form, { churchName: '', churchId: '', location: '', size: '', contactNumber: '', message: '' })
    addressEdited.value = false
  } catch (e) {
    console.error('Error requesting a church:', e)
    error.value = e.message || 'Could not send your request.'
  } finally {
    sending.value = false
  }
}

// On localhost there is no domain to give a church an address under, so the
// link opens it on this same address instead (see devChurchOverride).
const addressOf = (request) =>
  rootDomain
    ? churchOrigin(request.churchId, { rootDomain })
    : canSwitchChurchHere() && request.churchId
      ? devChurchLink(request.churchId)
      : ''
const addressLabel = (request) => addressOf(request).replace(/^https:\/\//, '').replace(/^\/\?church=/, 'localhost ▸ ')

const formatDate = (date) =>
  date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''
</script>

<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-950">
    <header class="bg-gradient-to-b from-primary to-primary-hover dark:from-gray-900 dark:to-gray-900">
      <div class="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-5">
        <div class="flex items-center gap-2.5 text-white">
          <Building2 class="h-6 w-6" />
          <span class="text-lg font-black tracking-tight">{{ branding.name }}</span>
        </div>
        <RouterLink
          v-if="admin"
          to="/platform"
          class="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"
        >
          <ShieldCheck class="h-4 w-4" />
          Console
        </RouterLink>
      </div>
      <div class="mx-auto max-w-2xl px-6 pb-10 pt-4">
        <h1 class="text-3xl font-black tracking-tight text-white">{{ branding.frontDoor.headline }}</h1>
        <p class="mt-2 max-w-lg text-sm leading-relaxed text-white/75">
          {{ branding.frontDoor.intro }}
        </p>
        <p v-if="branding.contactEmail" class="mt-3 text-xs text-white/60">
          Questions? <a :href="`mailto:${branding.contactEmail}`" class="font-semibold text-white/80 underline underline-offset-2">{{ branding.contactEmail }}</a>
        </p>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-6 py-8">
      <div v-if="!ready" class="flex justify-center py-12">
        <Loader2 class="h-6 w-6 animate-spin text-gray-400" />
      </div>

      <!-- Signed out -->
      <section
        v-else-if="!isAuthenticated"
        class="rounded-2xl bg-gray-900 p-6 text-white shadow-sm dark:border dark:border-gray-800"
      >
        <h2 class="text-lg font-bold">Ask for a church</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-white/70">
          Sign in with the Google account you will run the church with. You become its first
          administrator once the request is approved.
        </p>
        <p v-if="error" role="alert" class="mt-4 rounded-xl bg-red-950/60 px-4 py-3 text-xs font-semibold text-red-200">
          {{ error }}
        </p>
        <div class="mt-6">
          <GoogleSignInButton @error="error = $event" />
        </div>
      </section>

      <template v-else>
        <!-- Their requests -->
        <section v-if="requests.length" class="mb-8">
          <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Your requests
          </h2>
          <ul class="mt-3 space-y-2">
            <li
              v-for="request in requests"
              :key="request.id"
              class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {{ request.churchName }}
                  </p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Asked {{ formatDate(request.createdAt) }}
                  </p>
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
                v-if="request.status === 'approved' && addressOf(request)"
                :href="addressOf(request)"
                class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-primary-light"
              >
                Open {{ addressLabel(request) }}
                <ExternalLink class="h-3.5 w-3.5" />
              </a>
              <p v-if="request.status === 'declined' && request.note" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                &ldquo;{{ request.note }}&rdquo;
              </p>
            </li>
          </ul>
        </section>

        <!-- The form -->
        <section
          v-if="!hasPending"
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Ask for a church</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            We will look it over and let you know. You become its first administrator.
          </p>

          <form class="mt-5 space-y-4" @submit.prevent="submit">
            <div>
              <label for="church-name" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Church name
              </label>
              <input
                id="church-name"
                v-model="form.churchName"
                type="text"
                maxlength="120"
                required
                class="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label for="church-address" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Address you would like
              </label>
              <input
                id="church-address"
                :value="form.churchId"
                type="text"
                maxlength="40"
                inputmode="url"
                autocapitalize="off"
                spellcheck="false"
                :class="[
                  'mt-1 h-11 w-full rounded-xl border bg-white px-3 font-mono text-sm text-gray-900 focus:ring-1 dark:bg-gray-800 dark:text-white',
                  addressValid
                    ? 'border-gray-200 focus:border-primary focus:ring-primary dark:border-gray-700'
                    : 'border-red-400 focus:border-red-500 focus:ring-red-500',
                ]"
                @input="onAddressInput"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your church will be at <span class="font-mono font-semibold">{{ addressPreview }}</span>
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="church-location" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <input
                  id="church-location"
                  v-model="form.location"
                  type="text"
                  maxlength="160"
                  placeholder="City, province"
                  class="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label for="church-size" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Congregation size
                </label>
                <select
                  id="church-size"
                  v-model="form.size"
                  class="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Choose one</option>
                  <option v-for="size in SIZES" :key="size" :value="size">{{ size }}</option>
                </select>
              </div>
            </div>

            <div>
              <label for="church-contact" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Contact number
              </label>
              <input
                id="church-contact"
                v-model="form.contactNumber"
                type="tel"
                maxlength="40"
                class="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label for="church-message" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Anything we should know
              </label>
              <textarea
                id="church-message"
                v-model="form.message"
                rows="3"
                maxlength="1000"
                class="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              ></textarea>
            </div>

            <p v-if="error" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {{ error }}
            </p>

            <button
              type="submit"
              :disabled="sending"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition-transform hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              Send request
            </button>
          </form>
        </section>

        <div class="mt-6 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span class="min-w-0 truncate">{{ displayName }}<template v-if="email"> &middot; {{ email }}</template></span>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-white"
            @click="logout"
          >
            <LogOut class="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

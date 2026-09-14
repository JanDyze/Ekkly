<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Clock, Loader2, LogOut, Send, ShieldAlert } from '../icons'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue'
import { initAuth, useAuth } from '../composables/useAuth'
import { initChurchAccess, useChurchAccess } from '../composables/useChurchAccess'
import { useToast } from '../composables/useToast'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'

// The door between a Google account and a church.
//
// Signing in proves who somebody is; it no longer lets them into anything.
// Whoever reaches a church's app without an access document lands here, asks
// to join, and waits for one of that church's administrators — and the page
// watches their access live, so the moment somebody approves it the app opens
// by itself. It is also the only page an address with no church behind it, or
// a church that has been closed, will show.

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { user, isAuthenticated, logout, displayName, email } = useAuth()
const { profile, status, joinRequest, churchName, requestToJoin } = useChurchAccess()

const ready = ref(false)
initAuth().then(() => {
  ready.value = true
})

watch(
  [ready, () => user.value?.uid],
  () => {
    if (ready.value) initChurchAccess(user.value)
  },
  { immediate: true }
)

const HOME = '/home'

// In already, or let in while waiting: carry on to wherever they were going.
watch(
  status,
  (now) => {
    if (now !== 'granted') return
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' && redirect !== '/join' ? redirect : HOME)
  },
  { immediate: true }
)

const missing = computed(() => profile.value && !profile.value.exists)
const closed = computed(() => profile.value?.exists && profile.value.status !== 'active')
const title = computed(() => churchName.value || 'Your church')

// The platform's own front door, for somebody who arrived at an address with
// no church behind it.
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN
const platformUrl = rootDomain
  ? `https://app.${rootDomain}`
  : canSwitchChurchHere()
    ? devChurchLink('')
    : ''

const message = ref('')
const sending = ref(false)
const error = ref('')

const ask = async () => {
  if (!user.value) return
  sending.value = true
  error.value = ''
  try {
    await requestToJoin(user.value, message.value)
    toast.success('Request sent')
  } catch (e) {
    console.error('Error requesting to join:', e)
    error.value = 'Could not send your request. Check your connection and try again.'
  } finally {
    sending.value = false
  }
}

const switchAccount = async () => {
  await logout()
  message.value = ''
}

const onSignInError = (text) => {
  error.value = text
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-gray-900">
    <div
      class="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-gray-900 dark:from-gray-900 dark:via-gray-900 dark:to-black"
    ></div>

    <main class="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <!-- No church here -->
      <template v-if="missing">
        <ShieldAlert class="h-10 w-10 text-white/60" />
        <h1 class="mt-5 text-2xl font-black tracking-tight text-white">No church at this address</h1>
        <p class="mt-2 text-sm leading-relaxed text-white/70">
          Check the address for typos. If your congregation would like a church of its own,
          ask for one<template v-if="platformUrl">
            at <a :href="platformUrl" class="font-semibold text-white underline">{{ rootDomain ? platformUrl.replace('https://', '') : 'the front door' }}</a></template>.
        </p>
      </template>

      <!-- Closed -->
      <template v-else-if="closed">
        <ShieldAlert class="h-10 w-10 text-white/60" />
        <h1 class="mt-5 text-2xl font-black tracking-tight text-white">{{ title }} is closed</h1>
        <p class="mt-2 text-sm leading-relaxed text-white/70">
          This church's app is not available right now. Speak to your church's administrator.
        </p>
      </template>

      <template v-else>
        <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Welcome to</p>
        <h1 class="mt-1.5 text-3xl font-black tracking-tighter text-white">{{ title }}</h1>

        <p
          v-if="error"
          role="alert"
          class="mt-6 rounded-xl border border-red-400/30 bg-red-950/60 px-4 py-3 text-xs font-semibold text-red-200"
        >
          {{ error }}
        </p>

        <!-- Restoring the session, or reading access -->
        <div v-if="!ready || status === 'checking'" class="mt-10 flex justify-center">
          <Loader2 class="h-6 w-6 animate-spin text-white/70" />
        </div>

        <!-- Signed out -->
        <template v-else-if="!isAuthenticated">
          <p class="mt-3 text-sm leading-relaxed text-white/70">
            Sign in with Google to open the app. If this is your first time, you can ask to join
            once you have.
          </p>
          <div class="mt-8">
            <GoogleSignInButton @error="onSignInError" />
          </div>
        </template>

        <template v-else>
          <!-- Waiting -->
          <div v-if="status === 'pending'" class="mt-8 rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
            <div class="flex items-center gap-2 text-sm font-bold text-white">
              <Clock class="h-4 w-4" />
              Request sent
            </div>
            <p class="mt-2 text-sm leading-relaxed text-white/75">
              An administrator of {{ title }} will let you in. Keep this page open, or come back
              later: the app opens as soon as they do.
            </p>
          </div>

          <!-- Not asked yet, or asked and declined -->
          <div v-else class="mt-8 rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
            <template v-if="status === 'declined'">
              <p class="text-sm font-bold text-white">Your request was not approved</p>
              <p v-if="joinRequest?.note" class="mt-1.5 text-sm text-white/75">
                &ldquo;{{ joinRequest.note }}&rdquo;
              </p>
              <p class="mt-1.5 text-sm text-white/60">
                If you think that was a mistake, you can ask again.
              </p>
            </template>
            <template v-else>
              <p class="text-sm font-bold text-white">Ask to join</p>
              <p class="mt-1.5 text-sm leading-relaxed text-white/75">
                You are signed in, but this account is not part of {{ title }} yet. An
                administrator will see your request.
              </p>
            </template>

            <label for="join-message" class="mt-4 block text-[11px] font-bold uppercase tracking-wider text-white/60">
              Message <span class="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="join-message"
              v-model="message"
              rows="3"
              maxlength="500"
              placeholder="Who you are, so they know it's you"
              class="mt-1.5 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none focus:ring-0"
            ></textarea>

            <button
              type="button"
              :disabled="sending"
              class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[11px] font-black uppercase tracking-[0.15em] text-gray-800 transition-transform active:scale-[0.98] disabled:opacity-60"
              @click="ask"
            >
              <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              {{ status === 'declined' ? 'Ask again' : 'Ask to join' }}
            </button>
          </div>

          <!-- Which account this is -->
          <div class="mt-6 flex items-center justify-between gap-3 text-xs text-white/60">
            <span class="min-w-0 truncate">
              <Check class="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
              {{ displayName }}<template v-if="email"> &middot; {{ email }}</template>
            </span>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1 font-semibold text-white/80 hover:text-white"
              @click="switchAccount"
            >
              <LogOut class="h-3.5 w-3.5" />
              Switch account
            </button>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

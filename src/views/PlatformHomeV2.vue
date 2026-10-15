<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, CheckCircle2, Clock, X } from '../icons'
import CookieBanner from '../components/frontdoor/CookieBanner.vue'
import ChatBubble from '../components/frontdoor/ChatBubble.vue'
import WelcomeSheet from '../components/frontdoor/WelcomeSheet.vue'
import AppArt from '../components/common/AppArt.vue'
import FrontDoorHeader from '../components/frontdoor/FrontDoorHeader.vue'
import FrontDoorFooter from '../components/frontdoor/FrontDoorFooter.vue'
import FrontDoorFaq from '../components/frontdoor/FrontDoorFaq.vue'
import SundayStory from '../components/frontdoor/sunday/SundayStory.vue'
import { FAQS, HOME_FAQS } from '../components/frontdoor/faqs'
import { TYPE } from '../components/frontdoor/type'
import { initAuth, useAuth } from '../composables/useAuth'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import { useFrontDoorConsent } from '../composables/useFrontDoorConsent'
import { planFrom, useFrontDoor } from '../composables/useFrontDoor'
import { churchLink, useChurchRequests } from '../composables/useChurchRequests'
import { knownChurch } from '../components/frontdoor/knownChurches'
import { formatMoney } from '../utils/moneyUtils'
import { vScrollLight } from '../components/frontdoor/scrollLight'

// The second front door, at /v2, to try beside the first (PlatformHome).
//
// The first opens on a device playing a tour of the apps. This one opens on
// the church itself, and the page is one Sunday: scrolling opens its doors,
// walks the reader in, and goes through the service part by part — the
// welcome, worship, the sermon, prayer, the offering, the notices, the
// meeting after — each the moment one of the apps takes a list off somebody,
// until the doors shut at night on the last call (SundayStory). What follows
// is the short word about price and the first questions, as on the first.

const router = useRouter()
const { isAuthenticated } = useAuth()
const { branding, catalog } = usePlatformConfig()
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''
const sampleDomain = rootDomain || 'ekkly.online'
const { picks, namedChurch, signal } = useFrontDoor()

const ready = ref(false)
initAuth().then(() => {
  ready.value = true
})

// One visit per page load, once they have agreed to be counted.
const { allowed, answered } = useFrontDoorConsent()
const counted = ref(false)
watch(
  allowed,
  (yes) => {
    if (!yes || counted.value) return
    counted.value = true
    signal('visit')
  },
  { immediate: true }
)

const offeredApps = computed(() => catalog.value.filter((app) => app.available))
const appNames = computed(() => Object.fromEntries(catalog.value.map((app) => [app.key, app.name])))

// As on the first front door: somebody who has already asked for a church is
// offered what they came back for instead of being sold to again.
const { latest, approved } = useChurchRequests()
const heroCall = computed(() => {
  if (approved.value) return { label: 'Open ' + approved.value.churchName, href: churchLink(approved.value) }
  if (latest.value) return { label: 'See your request', href: '' }
  return { label: 'Get your church on ' + branding.value.name, href: '' }
})
const heroNote = computed(() => {
  const request = latest.value
  if (!request) return { icon: CheckCircle2, mark: 'text-emerald-500', says: 'First month free · your church’s own link' }
  if (request.status === 'approved') {
    return { icon: CheckCircle2, mark: 'text-emerald-500', says: `${request.churchName} is open — you are its first administrator.` }
  }
  if (request.status === 'declined') {
    return { icon: X, mark: 'text-gray-400 dark:text-gray-500', says: `We could not open ${request.churchName}. Your request says why.` }
  }
  return { icon: Clock, mark: 'text-amber-500', says: `We are looking over ${request.churchName}. We will email you the moment it is open.` }
})

const goToStart = () => {
  signal('start')
  router.push('/start')
}
const heroPress = () => {
  if (heroCall.value.href) window.location.assign(heroCall.value.href)
  else goToStart()
}

// The welcome, once per visitor and never for someone signed in, as on the
// first front door; "say hello" at the end of the Sunday brings it back.
const welcomeSeen = (() => {
  try {
    return Boolean(localStorage.getItem('ekkly.frontDoor.welcomed'))
  } catch {
    return false
  }
})()
const welcomeDone = ref(welcomeSeen)
watch(isAuthenticated, (signedIn) => {
  if (signedIn) welcomeDone.value = true
})
const welcomeAgain = ref(false)
const showWelcome = computed(() => ready.value && (welcomeAgain.value || (!welcomeDone.value && !isAuthenticated.value)))
const closeWelcome = () => {
  welcomeDone.value = true
  welcomeAgain.value = false
}

// The church named in the welcome hangs on the banner and goes up on the
// screen inside.
const welcomeChurch = (name) => {
  namedChurch.value = name
}
const demoChurch = computed(() => knownChurch(namedChurch.value)?.name || namedChurch.value)

/* ------------------------------------------------------------- pricing */

const plan = computed(() => planFrom(catalog.value, picks.value))
const priceLine = computed(() => {
  const prices = offeredApps.value.map((app) => app.price || 0).filter((price) => price > 0)
  if (!prices.length) return 'Priced for your church.'
  const low = Math.min(...prices)
  return low === Math.max(...prices) ? `${formatMoney(low)} an app, a month.` : `From ${formatMoney(low)} an app, a month.`
})
const PRICE_WINS = ['First month free', 'Monthly, or a year for the price of ten', 'Add or drop apps any month']
const faqs = FAQS.slice(0, HOME_FAQS)

const HEADING_LIGHT = { start: 0.92, end: 0.5 }
</script>

<template>
  <!-- overflow-x-clip, not hidden: hidden makes this a scroll container, and
       the sticky header and the Sunday's stage would scroll away with it. -->
  <div class="min-h-dvh overflow-x-clip bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
    <FrontDoorHeader />

    <SundayStory
      :church="demoChurch"
      :name="branding.name"
      :call="heroCall.label"
      :note="heroNote"
      :apps="appNames"
      @start="heroPress"
      @hello="welcomeAgain = true"
    />

    <!-- ============================================================ pricing -->
    <section id="plan" class="scroll-mt-20 py-20 lg:py-28">
      <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div class="text-center lg:text-left">
          <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Pricing</p>
          <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading mt-3', TYPE.title]">Pay only for the apps you use</h2>
          <p :class="['mt-4 text-gray-600 dark:text-gray-300', TYPE.lead]">{{ priceLine }} Turn on what your church needs.</p>
          <ul class="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-600 lg:justify-start dark:text-gray-300">
            <li v-for="win in PRICE_WINS" :key="win" class="inline-flex items-center gap-1.5">
              <CheckCircle2 class="h-4 w-4 text-emerald-500" />
              {{ win }}
            </li>
          </ul>
          <RouterLink
            to="/pricing"
            class="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
          >
            Build your plan
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </RouterLink>
        </div>

        <aside class="rounded-2xl bg-gray-900 p-6 text-white dark:bg-gray-800">
          <p class="text-xs font-semibold uppercase tracking-wider text-white/60">Your plan so far</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <AppArt v-for="app in plan.apps" :key="app.key" :app-key="app.key" :title="app.name" class="h-10 w-10" />
          </div>
          <p v-if="plan.total" class="mt-5 flex items-baseline gap-1">
            <span class="text-3xl font-black tabular-nums">{{ formatMoney(plan.total) }}</span>
            <span class="text-sm text-white/60">/ month</span>
          </p>
          <p class="mt-1 text-sm text-white/70">
            {{ plan.apps.length }} {{ plan.apps.length === 1 ? 'app' : 'apps' }}. Your first month is free.
          </p>
          <RouterLink to="/pricing" class="mt-5 inline-flex text-sm font-semibold text-white underline-offset-4 hover:underline">
            Change it
          </RouterLink>
        </aside>
      </div>
    </section>

    <!-- ================================================================ faq -->
    <section id="faq" class="scroll-mt-20 border-t border-gray-100 bg-gray-50/60 py-20 dark:border-gray-900 dark:bg-gray-900/40 lg:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <div class="text-center">
          <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Questions</p>
          <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading mt-3', TYPE.title]">Questions churches ask</h2>
        </div>
        <FrontDoorFaq :items="faqs" class="mt-10" />
        <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          More about paying on
          <RouterLink to="/pricing" class="font-semibold text-primary underline-offset-4 hover:underline dark:text-primary-light">Pricing</RouterLink>
        </p>
      </div>
    </section>

    <WelcomeSheet
      v-if="showWelcome"
      :domain="sampleDomain"
      :delay="welcomeAgain ? 0 : 1400"
      @done="closeWelcome"
      @church="welcomeChurch"
    />
    <CookieBanner v-if="welcomeDone" />
    <ChatBubble v-if="answered" />

    <FrontDoorFooter />
  </div>
</template>

<style scoped>
/* The headings below the Sunday are lit as on the first front door: a band
   of the window's colours crosses each as it is read (scrollLight.js). */
.lit-heading {
  --glass-warm: color-mix(in oklch, var(--color-primary) 62%, oklch(0.8 0.16 75));
  --glass: var(--color-primary);
  --glass-cool: color-mix(in oklch, var(--color-primary) 62%, oklch(0.68 0.2 330));
  padding-bottom: 0.08em;
  background-image: linear-gradient(
    100deg,
    currentColor 38%,
    var(--glass-warm) 44%,
    var(--glass) 50%,
    var(--glass-cool) 56%,
    color-mix(in oklab, currentColor 22%, transparent) 62%
  );
  background-size: 300% 100%;
  background-position: calc((1 - var(--p, 1)) * 100%) 0;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>

<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  LogOut,
  Send,
  ShieldCheck,
  HandPointing,
  HandWaving,
  X,
} from '../icons'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue'
import PlatformLogo from '../components/common/PlatformLogo.vue'
import AnimatedMark from '../components/common/AnimatedMark.vue'
import CookieBanner from '../components/frontdoor/CookieBanner.vue'
import ChatBubble from '../components/frontdoor/ChatBubble.vue'
import WelcomeSheet from '../components/frontdoor/WelcomeSheet.vue'
import HeroStage from '../components/frontdoor/HeroStage.vue'
import PlanBuilder from '../components/frontdoor/PlanBuilder.vue'
import AppsInside from '../components/frontdoor/AppsInside.vue'
import { initAuth, useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import {
  isPlatformAdmin,
  sendFrontDoorSignal,
  submitChurchRequest,
  subscribeToMyChurchRequests,
} from '../api/platformService'
import { useFrontDoorConsent } from '../composables/useFrontDoorConsent'
import { churchOrigin, isValidChurchId, suggestChurchId } from '../../lib/churchId.js'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'
import { vScrollLight } from '../components/frontdoor/scrollLight'

// The platform's front door: church.app itself, and app.church.app.
//
// Two jobs, in this order. First it sells: a visitor who has never heard of
// Ekkly should come away knowing what it does for a church, what it costs, and
// that starting is one button away — so the page opens on a hero with the app
// in a phone, walks through what is inside, lets them build a plan, and
// answers the questions they would otherwise have to ask. Then it signs them
// up: every call to action lands on the last section, where they sign in and
// ask for their church, and see what became of that request.
//
// The platform's administrators approve requests on /platform; approving one
// is what creates the church, makes this person its first administrator and
// opens its address.

const toast = useToast()
const { user, isAuthenticated, displayName, email, logout } = useAuth()

// The name and the words come from the console (Name & front door), falling
// back to VITE_PLATFORM_NAME and the wording the app shipped with. The app
// prices come from Apps & prices.
const { branding, catalog } = usePlatformConfig()
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

/* ------------------------------------------------------------ the story */

const offeredApps = computed(() => catalog.value.filter((app) => app.available))

const sampleDomain = rootDomain || 'ekkly.church'

// The headline arrives a word at a time, and its closing phrase is drawn in the
// colours of Ekkly's window. The words are the console's, so the phrase is
// found rather than written: whatever follows the last comma, or else the last
// two words.
const headline = computed(() => {
  const text = branding.value.frontDoor.headline.trim()
  const comma = text.lastIndexOf(',')
  const words = text.split(/\s+/)
  const [lead, glow] =
    comma > 0 && comma < text.length - 1
      ? [text.slice(0, comma + 1), text.slice(comma + 1).trim()]
      : words.length > 2
        ? [words.slice(0, -2).join(' '), words.slice(-2).join(' ')]
        : ['', text]
  const leadWords = lead ? lead.split(/\s+/) : []
  return { text, lead: leadWords, glow, glowDelay: 120 + leadWords.length * 90 }
})

/* ------------------------------------------------------------- counting */

// What the console is told about this page, and only with the visitor's
// say-so: how many people looked, and whether they pressed a call to action. Nothing here is waited on — a signal that
// fails changes nothing on the page.
const { allowed, answered } = useFrontDoorConsent()

const signal = (kind) => {
  if (!allowed.value) return
  // The visitor's own date, so an evening here is not tomorrow in UTC.
  const day = new Date().toLocaleDateString("en-CA")
  sendFrontDoorSignal(kind, { day })
}

// One visit per page load, once they have agreed — which may be now, or may be
// a previous visit's answer, so it waits for the answer rather than the load.
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

// The chip above the headline, unless it only says the headline again.
const sameWords = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
const showTagline = computed(
  () => !!branding.value.tagline?.trim() && !sameWords(branding.value.tagline, branding.value.frontDoor.headline)
)

// The church a visitor named in the welcome. It goes on the phone in the hero
// and into "How it works", so the page shows their church rather than a sample.
const namedChurch = ref('')

// A soft light follows the pointer across the hero. Only a mouse or trackpad
// moves it; on a touch screen it rests where it starts.
const hero = ref(null)
let spotFrame = 0
const moveSpotlight = (event) => {
  if (event.pointerType !== 'mouse' || spotFrame) return
  spotFrame = requestAnimationFrame(() => {
    spotFrame = 0
    const box = hero.value?.getBoundingClientRect()
    if (!box) return
    hero.value.style.setProperty('--mx', `${event.clientX - box.left}px`)
    hero.value.style.setProperty('--my', `${event.clientY - box.top}px`)
  })
}
onUnmounted(() => cancelAnimationFrame(spotFrame))

// One type scale for every section's heading — the small label above it, the
// title, and the line under it — so no section reads louder or quieter than
// the next. Colour is left to each section, since some sit on a dark band.
const TYPE = {
  eyebrow: 'text-sm font-bold uppercase tracking-wider',
  title: 'text-balance text-3xl font-black tracking-tight sm:text-4xl',
  lead: 'text-lg leading-relaxed',
}

const STEPS = [
  { title: 'Ask for your church', body: 'Sign in with Google and tell us your church’s name and the address you would like. It takes two minutes.' },
  { title: 'We set it up', body: 'We look it over and open your church. You become its first administrator, with everything ready to fill in.' },
  { title: 'Bring your people in', body: 'Share your address. Members sign in and ask to join, and you let them in with one tap.' },
]

const FAQS = [
  {
    q: 'Is our church’s information private?',
    a: 'Yes. Each church’s records are kept apart, and only people your administrators let in can open them. Contact numbers and addresses stay inside your church.',
  },
  {
    q: 'Can we start small?',
    a: 'That is how most churches start. Turn on the apps you need today and add more from Settings whenever you are ready. Turning one off never deletes anything.',
  },
  {
    q: 'Do our members need to install anything?',
    a: 'No. It opens in any phone’s browser, and anyone who wants the app on their home screen can add it in a tap.',
  },
  {
    q: 'How do we pay?',
    a: 'The first month is free. After that, by card for the apps your church uses: monthly, or yearly for the price of ten months. It renews on its own, and you can stop any time.',
  },
  {
    q: 'What if we need something the apps do not do?',
    a: 'Ask. Every church can send a request for a new app, a change, or feedback from its own Settings, and we answer there.',
  },
]
const openFaq = ref(0)

// Every call to action ends here: the sign-in, or the request form.
const startSection = ref(null)
const goToStart = async () => {
  signal('start')
  await nextTick()
  startSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// The welcome, once per visitor and never for someone signed in: which church
// are they with, and may someone reach out? The cookie question waits until it
// is answered, so a first visit is asked one thing at a time.
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

// "Say hello" in the hero brings it back whenever they like, straight away,
// signed in or not.
const welcomeAgain = ref(false)
const showWelcome = computed(() => ready.value && (welcomeAgain.value || (!welcomeDone.value && !isAuthenticated.value)))
const openWelcome = () => {
  welcomeAgain.value = true
}
const closeWelcome = () => {
  welcomeDone.value = true
  welcomeAgain.value = false
}

// The church named in the welcome goes on the hero's phone, and into the
// request form should they go on to ask.
const welcomeChurch = (name) => {
  namedChurch.value = name
  form.churchName = name
}

// "Add to my plan" on an app in What's inside: it is ticked in the plan
// builder, and the page goes there so they see it join the total.
const planBuilder = ref(null)
const addToPlan = (key) => {
  planBuilder.value?.add(key)
  goTo('plan')
}

// Scrolling down the page is a room catching the light, not sections fading up
// (see scrollLight.js). Headings are lit as a band of the window's colours
// crosses them, the apps switch on as they come into view, and the last call
// opens out of an arched window.

// The heading's light has crossed by the time it is halfway up the screen.
const HEADING_LIGHT = { start: 0.92, end: 0.5 }
const WINDOW_OPENS = { start: 1, end: 0.85 }

// "How it works" plays one church's request through the three steps as the
// reader scrolls past them: the name is typed, the request is approved, and
// people start joining. It is the church they named in the welcome, if they did.
// It finishes while the steps are still in the lower part of the screen, so a
// reader who stops with them in the middle sees the whole story.
const howProgress = ref(1)
const HOW_RUN = { start: 0.95, end: 0.75, onProgress: (p) => (howProgress.value = p) }

const sampleChurch = computed(() => namedChurch.value.trim() || 'Grace Baptist Church')
const sampleAddress = computed(() => `${suggestChurchId(sampleChurch.value)}.${sampleDomain}`)

// Each step runs through its own third of the scroll.
const stepProgress = (index) => Math.min(1, Math.max(0, howProgress.value * 3 - index))
const typedName = computed(() => {
  const name = sampleChurch.value
  return name.slice(0, Math.round(Math.min(1, stepProgress(0) / 0.8) * name.length))
})
const approved = computed(() => stepProgress(1) >= 0.5)
const JOINED = 24
const joined = computed(() => Math.round(stepProgress(2) * JOINED))
const JOINER_INITIALS = ['AM', 'JR', 'LC', 'PD', 'RS', 'MV']

const year = new Date().getFullYear()

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

const input =
  'mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white'
</script>

<template>
  <div class="min-h-dvh overflow-x-clip bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
    <!-- overflow-x-clip, not hidden: hidden makes this a scroll container, and
         the sticky header would then scroll away with the page. -->
    <!-- ================================================================ nav -->
    <header class="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <a href="#top" @click.prevent="goTo('top')" class="min-w-0">
          <PlatformLogo mark-class="h-8 w-8" text-class="text-2xl" />
        </a>
        <nav class="ml-6 hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex dark:text-gray-300">
          <button type="button" @click="goTo('features')" class="hover:text-gray-900 dark:hover:text-white">What’s inside</button>
          <button type="button" @click="goTo('how')" class="hover:text-gray-900 dark:hover:text-white">How it works</button>
          <button type="button" @click="goTo('plan')" class="hover:text-gray-900 dark:hover:text-white">Pricing</button>
          <button type="button" @click="goTo('faq')" class="hover:text-gray-900 dark:hover:text-white">Questions</button>
        </nav>
        <div class="ml-auto flex items-center gap-2">
          <RouterLink
            v-if="admin"
            to="/platform"
            class="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:inline-flex dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ShieldCheck class="h-4 w-4" />
            Console
          </RouterLink>
          <button
            type="button"
            @click="goToStart"
            class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-colors hover:bg-primary-hover"
          >
            {{ isAuthenticated ? 'Your church' : 'Get started' }}
          </button>
        </div>
      </div>
    </header>

    <!-- =============================================================== hero -->
    <section id="top" ref="hero" class="hero relative isolate" @pointermove="moveSpotlight">
      <!-- Light through stained glass: the logo's four colours, blurred into
           the background, over a fine grid of dots that a soft light follows
           the pointer across. -->
      <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div class="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl dark:bg-primary/15"></div>
        <div class="absolute right-0 top-10 h-96 w-96 rounded-full bg-primary-light/30 blur-3xl dark:bg-primary/10"></div>
        <div class="absolute bottom-0 left-1/3 h-96 w-md rounded-full bg-primary/20 blur-3xl dark:bg-primary/10"></div>
        <div class="absolute -bottom-20 right-10 h-80 w-80 rounded-full bg-primary-light/25 blur-3xl dark:bg-primary-light/10"></div>
        <div class="dots absolute inset-0 text-gray-900/15 dark:text-white/10"></div>
        <div class="spotlight absolute inset-0"></div>
      </div>

      <!-- On a desktop the hero fills the first screen, less the header. -->
      <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 sm:px-6 lg:min-h-[calc(100dvh-4.25rem)] lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-10">
        <div class="text-center lg:text-left">
          <span v-if="showTagline" class="hero-in inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-600 backdrop-blur dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
            <AnimatedMark mode="once" class="h-4 w-4" />
            {{ branding.tagline }}
          </span>

          <h1 class="mt-5 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" :aria-label="headline.text">
            <span aria-hidden="true">
              <template v-for="(word, i) in headline.lead" :key="`${word}-${i}`">
                <span class="word inline-block" :style="{ animationDelay: `${120 + i * 90}ms` }">{{ word }}</span>{{ ' ' }}
              </template>
              <span class="glow-phrase relative inline-block" :style="{ '--glow-delay': `${headline.glowDelay}ms` }">
                <span class="glow-text">{{ headline.glow }}</span>
                <!-- A stroke of the accent, drawn once under the phrase. -->
                <svg class="absolute -bottom-2 left-0 h-3 w-full text-primary dark:text-primary-light" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path class="underline-draw" d="M3 9 C 50 3, 120 2, 197 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" pathLength="1" />
                </svg>
              </span>
            </span>
          </h1>

          <p class="hero-in mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-600 sm:mt-6 sm:text-base lg:mx-0 lg:text-lg dark:text-gray-300" :style="{ animationDelay: `${headline.glowDelay + 250}ms` }">
            {{ branding.frontDoor.intro }}
          </p>
          <div class="hero-in mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" :style="{ animationDelay: `${headline.glowDelay + 350}ms` }">
            <button
              type="button"
              @click="goToStart"
              class="cta group inline-flex h-14 items-center gap-2 rounded-2xl bg-primary px-7 text-base font-bold text-white shadow-xl shadow-primary/30 transition-colors hover:bg-primary-hover"
            >
              Get your church on {{ branding.name }}
              <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              @click="goTo('features')"
              class="inline-flex h-14 items-center gap-2 rounded-2xl px-6 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              See what’s inside
            </button>
          </div>
          <p class="hero-in mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500 lg:justify-start dark:text-gray-400" :style="{ animationDelay: `${headline.glowDelay + 450}ms` }">
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> First month free</span>
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Your church’s own web address</span>
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Pay only for the apps you turn on</span>
          </p>

          <!-- The welcome again, for anyone who skipped it and changed their
               mind: name the church, leave a way to be reached. -->
          <div class="hero-in mt-8 flex justify-center lg:justify-start" :style="{ animationDelay: `${headline.glowDelay + 550}ms` }">
            <button
              type="button"
              class="group inline-flex h-11 items-center gap-2.5 rounded-full border border-gray-200 bg-white/70 pl-1.5 pr-4 text-sm font-semibold text-gray-700 backdrop-blur transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-900"
              @click="openWelcome"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
                <HandWaving class="h-4.5 w-4.5" />
              </span>
              Say hello, we’ll reach out
              <ArrowRight class="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <HeroStage :domain="sampleDomain" :apps="offeredApps" :church="namedChurch" @explore="goTo('features')" />
      </div>
    </section>

    <!-- ===================================================== what's inside -->
    <!-- On a desktop the section is one screen, less the header, so arriving
         from the nav shows all of it at once. Spacing inside is measured in
         dvh so a short laptop screen tightens it rather than cutting it off. -->
    <section
      id="features"
      class="scroll-mt-20 border-t border-gray-100 bg-gray-50/60 py-16 dark:border-gray-900 dark:bg-gray-900/40 lg:flex lg:min-h-[calc(100dvh-4.25rem)] lg:scroll-mt-17 lg:flex-col lg:justify-center lg:py-[clamp(0.75rem,3dvh,3rem)]"
    >
      <div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <!-- One card for each part of church life, whose apps light up as the
             cards rise into view. Opening an app shows everything it does, and
             its button carries it into the plan builder further down. -->
        <AppsInside :apps="offeredApps" @plan="addToPlan">
          <template #heading>
            <div class="mx-auto max-w-2xl text-center lg:mx-0 lg:flex lg:max-w-none lg:items-end lg:justify-between lg:gap-12 lg:text-left">
              <div class="lg:max-w-xl">
                <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">What’s inside</p>
                <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading mt-3', TYPE.title]">Everything your church runs on, in one place</h2>
              </div>
              <div class="lg:max-w-md lg:shrink-0">
                <p :class="['mt-4 text-gray-600 lg:mt-0 dark:text-gray-300', TYPE.lead]">
                  Stop keeping the roll in one spreadsheet, the schedule in a group chat and the minutes in someone’s notebook.
                </p>
                <p class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary lg:mt-2 dark:text-primary-light">
                  <HandPointing class="h-4 w-4" />
                  Tap an app to see how it helps
                </p>
              </div>
            </div>
          </template>
        </AppsInside>
      </div>
    </section>

    <!-- ======================================================= how it works -->
    <section id="how" class="scroll-mt-20 bg-gray-900 py-20 text-white lg:py-28 dark:bg-gray-900">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p :class="[TYPE.eyebrow, 'text-primary-light']">How it works</p>
          <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading lit-bright mt-3', TYPE.title]">Up and running this week</h2>
        </div>
        <!-- One request, played through the steps by the scroll. A thread runs
             from each step's number to the next, filling as the request moves
             on: across the row on a desktop, down the column on a phone. -->
        <ol v-scroll-light="HOW_RUN" class="relative mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <li
            v-for="(step, index) in STEPS"
            :key="step.title"
            :class="['step relative flex gap-4 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 lg:block', { reached: stepProgress(index) > 0 }]"
          >
            <span
              v-if="index < STEPS.length - 1"
              class="thread pointer-events-none absolute left-12 top-18 h-[calc(100%-1.5rem)] w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-white/10 lg:left-18 lg:top-12 lg:h-0.5 lg:w-[calc(100%-1.5rem)] lg:translate-x-0 lg:-translate-y-1/2"
              :style="{ '--fill': stepProgress(index) }"
              aria-hidden="true"
            >
              <span class="thread-fill absolute inset-0 rounded-full"></span>
            </span>
            <span class="step-number relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black">
              {{ index + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="text-xl font-bold lg:mt-5">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-white/70">{{ step.body }}</p>

              <!-- What the step looks like for one church. Sample data. -->
              <div class="mt-5 min-h-14 rounded-2xl bg-white/5 px-3.5 py-3 text-sm ring-1 ring-white/10" aria-hidden="true">
                <template v-if="index === 0">
                  <p class="text-xs text-white/50">Church name</p>
                  <p class="mt-0.5 truncate font-semibold">
                    {{ typedName }}<span v-if="typedName.length < sampleChurch.length && stepProgress(0) > 0" class="caret">|</span>
                  </p>
                </template>
                <template v-else-if="index === 1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="min-w-0 truncate font-semibold">{{ sampleChurch }}</p>
                    <span
                      :class="[
                        'status inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                        approved ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300',
                      ]"
                    >
                      <CheckCircle2 v-if="approved" class="h-3.5 w-3.5" />
                      <Clock v-else class="h-3.5 w-3.5" />
                      {{ approved ? 'Approved' : 'Waiting' }}
                    </span>
                  </div>
                  <p :class="['mt-0.5 truncate font-mono text-xs transition-colors duration-500', approved ? 'text-primary-light' : 'text-white/30']">
                    {{ sampleAddress }}
                  </p>
                </template>
                <template v-else>
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex -space-x-2">
                      <span
                        v-for="(initials, i) in JOINER_INITIALS"
                        :key="initials"
                        :class="[
                          'joiner flex h-8 w-8 items-center justify-center rounded-full text-[0.625rem] font-bold ring-2 ring-gray-900',
                          joined > (i * JOINED) / JOINER_INITIALS.length ? 'bg-primary text-white' : 'bg-white/10 text-transparent',
                        ]"
                      >{{ initials }}</span>
                    </div>
                    <p class="shrink-0 text-right text-xs text-white/60">
                      <span class="block text-lg font-black tabular-nums text-white">{{ joined }}</span>
                      joined
                    </p>
                  </div>
                </template>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- ========================================================= your plan -->
    <section id="plan" class="scroll-mt-20 py-20 lg:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Pricing</p>
          <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading mt-3', TYPE.title]">Build the plan your church needs</h2>
          <p :class="['mt-4 text-gray-600 dark:text-gray-300', TYPE.lead]">
            Tap the apps you would use. Your first month is free.
          </p>
        </div>
        <div class="mt-12">
          <PlanBuilder ref="planBuilder" :catalog="catalog" @start="goToStart" />
        </div>
      </div>
    </section>

    <!-- ================================================================ faq -->
    <section id="faq" class="scroll-mt-20 border-t border-gray-100 bg-gray-50/60 py-20 dark:border-gray-900 dark:bg-gray-900/40 lg:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <div class="text-center">
          <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Questions</p>
          <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading mt-3', TYPE.title]">Questions churches ask</h2>
        </div>
        <ul class="mt-10 space-y-3">
          <li v-for="(item, index) in FAQS" :key="item.q" class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              @click="openFaq = openFaq === index ? -1 : index"
              :aria-expanded="openFaq === index"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span class="text-base font-semibold">{{ item.q }}</span>
              <ChevronDown :class="['h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300', openFaq === index ? 'rotate-180' : '']" />
            </button>
            <div class="faq-answer grid transition-all duration-300" :class="openFaq === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
              <p class="overflow-hidden px-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400" :class="openFaq === index ? 'pb-5' : ''">
                {{ item.a }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- ========================================================= final call -->
    <!-- The last call opens out of an arched window as it comes into view. The
         wrapper is a size container, so the arch is measured against the card's
         own width. -->
    <section class="px-4 py-20 sm:px-6 lg:py-24">
      <div class="arch-frame mx-auto max-w-5xl">
        <div
          v-scroll-light="WINDOW_OPENS"
          class="arch-window relative overflow-hidden rounded-4xl bg-linear-to-br from-primary via-primary-hover to-gray-900 px-6 py-14 text-center text-white shadow-2xl shadow-primary/30 sm:px-12"
        >
          <div class="pointer-events-none absolute -right-10 -top-10 h-56 w-56 opacity-20" aria-hidden="true">
            <AnimatedMark mode="once" />
          </div>
          <h2 :class="['relative', TYPE.title]">Give your church one place to gather its work</h2>
          <p :class="['relative mx-auto mt-4 max-w-xl text-white/80', TYPE.lead]">
            Ask today. Once it is open, your people can be in it by Sunday.
          </p>
          <button
            type="button"
            @click="goToStart"
            class="cta group relative mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-gray-900 shadow-xl transition-colors hover:bg-gray-100"
          >
            Get your church on {{ branding.name }}
            <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>

    <!-- ==================================================== sign up / status -->
    <section id="start" ref="startSection" class="scroll-mt-20 pb-24">
      <div class="mx-auto max-w-2xl px-4 sm:px-6">
        <!-- Restoring the session: the card's shape, not a spinner. -->
        <div v-if="!ready" class="animate-pulse space-y-3 rounded-3xl border border-gray-200 p-6 dark:border-gray-800" aria-busy="true">
          <div class="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800"></div>
          <div class="h-4 w-full rounded bg-gray-100 dark:bg-gray-800/60"></div>
          <div class="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800/60"></div>
          <div class="h-12 w-full rounded-xl bg-gray-200 dark:bg-gray-800"></div>
        </div>

        <!-- Signed out -->
        <div
          v-else-if="!isAuthenticated"
          class="rounded-3xl bg-gray-900 p-6 text-white shadow-xl sm:p-8 dark:ring-1 dark:ring-gray-800"
        >
          <h2 class="text-2xl font-black tracking-tight">Ask for your church</h2>
          <p class="mt-2 text-sm leading-relaxed text-white/70">
            Sign in with the Google account you will run the church with. You become its first administrator once
            the request is approved.
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
              <li
                v-for="request in requests"
                :key="request.id"
                class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
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
          </div>

          <!-- The form -->
          <div
            v-if="!hasPending"
            class="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 sm:p-8 dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 class="text-2xl font-black tracking-tight">Ask for your church</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              We will look it over and let you know. You become its first administrator.
            </p>

            <form class="mt-6 space-y-4" @submit.prevent="submit">
              <div>
                <label for="church-name" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Church name</label>
                <input id="church-name" v-model="form.churchName" type="text" maxlength="120" required :class="input" />
              </div>

              <div>
                <label for="church-address" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Address you would like</label>
                <input
                  id="church-address"
                  :value="form.churchId"
                  type="text"
                  maxlength="40"
                  inputmode="url"
                  autocapitalize="off"
                  spellcheck="false"
                  :class="[input, 'font-mono', addressValid ? '' : 'border-red-400 focus:border-red-500 focus:ring-red-500']"
                  @input="onAddressInput"
                />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your church will be at <span class="font-mono font-semibold">{{ addressPreview }}</span>
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
                  placeholder="The apps you are most interested in, how many people use it, when you would like to start"
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
      </div>
    </section>

    <WelcomeSheet v-if="showWelcome" :domain="sampleDomain" :delay="welcomeAgain ? 0 : 1400" @done="closeWelcome" @church="welcomeChurch" />
    <CookieBanner v-if="welcomeDone" />
    <!-- After the cookie question, which sits in the same corner of a phone. -->
    <ChatBubble v-if="answered" />

    <!-- ============================================================= footer -->
    <footer class="border-t border-gray-100 py-10 dark:border-gray-900">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row sm:px-6 dark:text-gray-400">
        <PlatformLogo mark-class="h-6 w-6" text-class="text-lg" />
        <p class="text-center">
          © {{ year }} {{ branding.name }}
          <template v-if="branding.contactEmail">
            &middot; <a :href="`mailto:${branding.contactEmail}`" class="font-medium hover:text-gray-900 dark:hover:text-white">{{ branding.contactEmail }}</a>
          </template>
        </p>
        <RouterLink v-if="admin" to="/platform" class="font-medium hover:text-gray-900 dark:hover:text-white">Console</RouterLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* The hero arrives in a quick, staggered rise, coming into focus. */
.hero-in {
  animation: hero-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(1.25rem);
    filter: blur(8px);
  }
}

/* The headline, a word at a time. */
.word {
  animation: word-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes word-in {
  from {
    opacity: 0;
    transform: translateY(0.35em);
    filter: blur(10px);
  }
}

/* Its closing phrase lands last, in the colours of the window. */
.glow-phrase {
  animation: word-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) var(--glow-delay) both;
}

/* The accent, with light passing through it — the mark's warm end on one
   side and its cool end on the other. Both ends are mostly the accent itself,
   so the platform's colour carries the headline and a re-colour in the console
   changes it here too, while it still reads as stained glass rather than one
   flat word. The padding keeps the descenders inside the text's box, which the
   clip would otherwise cut. */
.glow-text {
  padding-bottom: 0.08em;
  background-image: linear-gradient(
    100deg,
    color-mix(in oklch, var(--color-primary) 62%, oklch(0.8 0.16 75)),
    var(--color-primary) 45%,
    color-mix(in oklch, var(--color-primary) 62%, oklch(0.68 0.2 330))
  );
  background-clip: text;
  color: transparent;
}

.dark .glow-text {
  background-image: linear-gradient(
    100deg,
    color-mix(in oklch, var(--color-primary) 55%, oklch(0.85 0.15 80)),
    var(--color-primary) 45%,
    color-mix(in oklch, var(--color-primary) 55%, oklch(0.78 0.16 330))
  );
}

.underline-draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: underline 0.7s cubic-bezier(0.65, 0, 0.35, 1) calc(var(--glow-delay) + 500ms) forwards;
}

@keyframes underline {
  to {
    stroke-dashoffset: 0;
  }
}

/* A fine grid of dots, fading out towards the edges. */
.dots {
  background-image: radial-gradient(currentColor 1px, transparent 1.5px);
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse 75% 65% at 50% 40%, black 30%, transparent 75%);
}

/* The light that follows the pointer. It rests over the phone until the
   pointer moves. */
.spotlight {
  background: radial-gradient(
    32rem circle at var(--mx, 75%) var(--my, 40%),
    color-mix(in oklab, var(--color-primary) 12%, transparent),
    transparent 70%
  );
}

/* The main buttons: a sheen crosses once when the pointer arrives. The button
   itself stays where it is. */
.cta {
  position: relative;
  overflow: hidden;
}

.cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / 0.3) 50%, transparent 65%);
  transform: translateX(-120%);
  pointer-events: none;
}

.cta:hover::after {
  transform: translateX(120%);
  transition: transform 0.7s ease-in-out;
}

/* ------------------------------------------------------ scrolling down */

/* `--p` is how far the reader has scrolled past an element, from 0 to 1, set by
   v-scroll-light. Every rule reads it as `var(--p, 1)`, so without it the page
   simply shows everything finished. */

/* The window's colours: the accent, warmed on one side and cooled on the other,
   as in the headline. A dark page's accent is already its light one. */
.lit-heading,
.thread-fill {
  --glass-warm: color-mix(in oklch, var(--color-primary) 62%, oklch(0.8 0.16 75));
  --glass: var(--color-primary);
  --glass-cool: color-mix(in oklch, var(--color-primary) 62%, oklch(0.68 0.2 330));
}

.lit-heading.lit-bright,
.thread-fill {
  --glass-warm: color-mix(in oklch, var(--color-primary-light) 55%, oklch(0.85 0.15 80));
  --glass: var(--color-primary-light);
  --glass-cool: color-mix(in oklch, var(--color-primary-light) 55%, oklch(0.78 0.16 330));
}

/* A heading, lit by a band of coloured light crossing it. The gradient is three
   times the heading's width — lit text, the band, then text still in shadow —
   and the scroll slides it from the shadowed end to the lit one. The text keeps
   its colour (only its fill is see-through), so currentColor is the heading's
   own ink in light, dark and the dark "How it works" band alike. */
.lit-heading {
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

/* "How it works": the number lights when the request reaches its step, and the
   thread to the next step fills as the request travels along it. */
.step-number {
  background-color: rgb(255 255 255 / 0.08);
  color: rgb(255 255 255 / 0.4);
  transition:
    background-color 0.4s ease,
    color 0.4s ease,
    box-shadow 0.4s ease;
}

.step.reached .step-number {
  background-color: var(--color-primary);
  color: white;
  box-shadow: 0 10px 24px -6px color-mix(in oklab, var(--color-primary) 60%, transparent);
}

.thread-fill {
  background: linear-gradient(to bottom, var(--glass-warm), var(--glass), var(--glass-cool));
  transform-origin: top;
  transform: scaleY(var(--fill, 1));
}

@media (min-width: 1024px) {
  .thread-fill {
    background: linear-gradient(to right, var(--glass-warm), var(--glass), var(--glass-cool));
    transform-origin: left;
    transform: scaleX(var(--fill, 1));
  }
}

.caret {
  margin-left: 1px;
  color: var(--color-primary-light);
  font-weight: 400;
}

.status,
.joiner {
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

/* The last call, seen first through a narrow arched window that widens into
   the whole card. The frame is a size container, so 100cqw is the card's own
   width: shut, the window is the middle 40% with a round top half as wide;
   open, the clip stands 4rem outside the card, so its shadow shows and its
   corners are its own. */
.arch-frame {
  container-type: inline-size;
}

.arch-window {
  --shut: calc(1 - var(--p, 1));
  --side: calc(var(--shut) * 30cqw - var(--p, 1) * 4rem);
  --arch: max(2rem, calc(var(--shut) * (50cqw - var(--shut) * 30cqw)));
  clip-path: inset(
    calc(var(--shut) * 5cqw - var(--p, 1) * 4rem) var(--side) calc(var(--p, 1) * -4rem) var(--side)
      round var(--arch) var(--arch) 2rem 2rem
  );
}

@media (prefers-reduced-motion: reduce) {
  .hero-in,
  .word,
  .glow-phrase {
    animation: none;
  }
  .underline-draw {
    animation: none;
    stroke-dashoffset: 0;
  }
  .cta:hover::after {
    transition: none;
  }
}
</style>

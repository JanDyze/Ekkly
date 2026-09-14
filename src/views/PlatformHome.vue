<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  LogOut,
  Send,
  ShieldCheck,
  DeviceMobile,
  SquaresFour,
  X,
} from '../icons'
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue'
import PlatformLogo from '../components/common/PlatformLogo.vue'
import AnimatedMark from '../components/common/AnimatedMark.vue'
import HeroStage from '../components/frontdoor/HeroStage.vue'
import PlanBuilder from '../components/frontdoor/PlanBuilder.vue'
import { appIcon } from '../components/frontdoor/appIcons'
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
const exampleAddress = computed(() => `yourchurch.${sampleDomain}`)

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

// "Curious? Type your church's name." Nothing is sent and nothing is claimed
// about whether the address is free; it only shows what the address would be,
// and hands the name to the request form if they want it.
const tryName = ref('')
const trySlug = computed(() => suggestChurchId(tryName.value))
const tryAddress = computed(() => `${trySlug.value}.${sampleDomain}`)

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

const REASONS = computed(() => [
  {
    icon: Globe,
    title: 'An address of its own',
    body: `Your church lives at ${exampleAddress.value}, or on a domain you already own. Nobody else's records are ever in the way.`,
  },
  {
    icon: SquaresFour,
    title: 'Pay only for what you use',
    body: 'Start with the roll and the calendar. Add finances, minutes or small groups the week you need them, and drop what you do not.',
  },
  {
    icon: ShieldCheck,
    title: 'Only the people you let in',
    body: 'Signing in with Google is not enough to see anything. Your administrators decide who belongs, and every change is logged with a name.',
  },
  {
    icon: DeviceMobile,
    title: 'On every phone in the pew',
    body: 'It runs in the browser and installs to the home screen like an app. Nothing to download from a store, nothing to update.',
  },
  {
    icon: Bell,
    title: 'Everyone in the loop',
    body: 'New tasks, Sunday schedules and events reach the right people by notification and email, without another group chat.',
  },
  {
    icon: appIcon('ai'),
    title: 'Minutes that write themselves',
    body: 'Type your notes during the meeting. AI assist turns them into minutes the church can file, and lays out song lyrics too.',
  },
])

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
    a: 'Monthly, for the apps your church uses. Once your church is approved we arrange payment with you directly.',
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
  await nextTick()
  startSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// Taking up the hero's offer: the name they tried fills the request form, and
// the address follows it the way it would if they had typed it there.
const startWithTriedName = () => {
  form.churchName = tryName.value.trim()
  addressEdited.value = false
  goToStart()
}

// Sections rise into place as they scroll into view, once each.
const vReveal = {
  mounted(el, binding) {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.classList.add('reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        el.classList.add('revealed')
        observer.disconnect()
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    el._revealObserver = observer
  },
  unmounted(el) {
    el._revealObserver?.disconnect()
  },
}

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
  <div class="min-h-dvh overflow-x-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
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
          <span class="hero-in inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-600 backdrop-blur dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
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

          <p class="hero-in mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0 dark:text-gray-300" :style="{ animationDelay: `${headline.glowDelay + 250}ms` }">
            {{ branding.frontDoor.intro }}
          </p>
          <div class="hero-in mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" :style="{ animationDelay: `${headline.glowDelay + 350}ms` }">
            <button
              type="button"
              @click="goToStart"
              class="cta group inline-flex h-14 items-center gap-2 rounded-2xl bg-primary px-7 text-base font-bold text-white shadow-xl shadow-primary/30 transition-colors hover:bg-primary-hover"
            >
              Start your church
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
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Free to ask</span>
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Your own address</span>
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Pay for what you use</span>
          </p>

          <!-- An offer, not a demand: type a church's name and see the address
               it would have. Nothing is sent, and nothing appears until there
               is something to show. Saying yes carries the name down to the
               request form so it does not have to be typed twice. -->
          <div class="hero-in mt-8 max-w-sm lg:mx-0 mx-auto" :style="{ animationDelay: `${headline.glowDelay + 550}ms` }">
            <label for="try-name" class="block text-sm text-gray-500 dark:text-gray-400">Curious? Type your church’s name.</label>
            <input
              id="try-name"
              v-model="tryName"
              type="text"
              maxlength="120"
              autocomplete="organization"
              placeholder="Grace Baptist Church"
              class="mt-1.5 h-11 w-full rounded-xl border border-dashed border-gray-300 bg-white/70 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-solid focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-900/60 dark:text-white"
            />
            <p v-if="trySlug" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              It would live at
              <span class="font-mono font-semibold text-primary dark:text-primary-light">{{ tryAddress }}</span>.
              <button type="button" class="font-semibold underline underline-offset-4 transition-colors hover:text-gray-900 dark:hover:text-white" @click="startWithTriedName">
                Ask for it
              </button>
            </p>
          </div>
        </div>

        <HeroStage :domain="sampleDomain" :apps="offeredApps" :church="tryName" @explore="goTo('features')" />
      </div>
    </section>

    <!-- ===================================================== what's inside -->
    <section id="features" class="scroll-mt-20 border-t border-gray-100 bg-gray-50/60 py-20 dark:border-gray-900 dark:bg-gray-900/40 lg:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-bold uppercase tracking-wider text-primary dark:text-primary-light">What’s inside</p>
          <h2 class="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">Everything your church runs on, in one place</h2>
          <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Stop keeping the roll in one spreadsheet, the schedule in a group chat and the minutes in someone’s notebook.
          </p>
        </div>

        <ul class="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <li
            v-for="(app, index) in offeredApps"
            :key="app.key"
            v-reveal="(index % 3) * 70"
            class="feature group rounded-2xl border border-gray-200 bg-white p-4 transition-shadow sm:p-5 hover:shadow-xl hover:shadow-gray-900/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-black/30"
          >
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:bg-primary-light/15 dark:text-primary-light">
              <component :is="appIcon(app.key)" class="h-5.5 w-5.5" />
            </span>
            <h3 class="mt-3 text-sm font-bold sm:mt-4 sm:text-base">{{ app.name }}</h3>
            <p class="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600 sm:mt-1.5 sm:line-clamp-none sm:text-sm dark:text-gray-400">{{ app.description }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- ============================================================ reasons -->
    <section class="py-20 lg:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-bold uppercase tracking-wider text-primary dark:text-primary-light">Why churches choose it</p>
          <h2 class="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">Made for how a church actually works</h2>
        </div>
        <div class="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="(reason, index) in REASONS" :key="reason.title" v-reveal="(index % 3) * 90" class="flex gap-4">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg dark:bg-white dark:text-gray-900">
              <component :is="reason.icon" class="h-6 w-6" />
            </span>
            <div>
              <h3 class="text-lg font-bold">{{ reason.title }}</h3>
              <p class="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{{ reason.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================= how it works -->
    <section id="how" class="scroll-mt-20 bg-gray-900 py-20 text-white lg:py-28 dark:bg-gray-900">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-bold uppercase tracking-wider text-primary-light">How it works</p>
          <h2 class="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">Up and running this week</h2>
        </div>
        <ol class="relative mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <li
            v-for="(step, index) in STEPS"
            :key="step.title"
            v-reveal="index * 120"
            class="relative rounded-3xl bg-white/5 p-6 ring-1 ring-white/10"
          >
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-hover text-lg font-black text-white shadow-lg shadow-primary/30">
              {{ index + 1 }}
            </span>
            <h3 class="mt-5 text-xl font-bold">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-white/70">{{ step.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ========================================================= your plan -->
    <section id="plan" class="scroll-mt-20 py-20 lg:py-28">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-bold uppercase tracking-wider text-primary dark:text-primary-light">Pricing</p>
          <h2 class="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">Build the plan your church needs</h2>
          <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Tap the apps you would use. That is your plan — change it whenever your church does.
          </p>
        </div>
        <div v-reveal class="mt-12">
          <PlanBuilder :catalog="catalog" @start="goToStart" />
        </div>
      </div>
    </section>

    <!-- ================================================================ faq -->
    <section id="faq" class="scroll-mt-20 border-t border-gray-100 bg-gray-50/60 py-20 dark:border-gray-900 dark:bg-gray-900/40 lg:py-28">
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 v-reveal class="text-center text-3xl font-black tracking-tight sm:text-4xl">Questions churches ask</h2>
        <ul class="mt-10 space-y-3">
          <li v-for="(item, index) in FAQS" :key="item.q" v-reveal="index * 50" class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
    <section class="px-4 py-20 sm:px-6 lg:py-24">
      <div
        v-reveal
        class="relative mx-auto max-w-5xl overflow-hidden rounded-4xl bg-linear-to-br from-primary via-primary-hover to-gray-900 px-6 py-14 text-center text-white shadow-2xl shadow-primary/30 sm:px-12"
      >
        <div class="pointer-events-none absolute -right-10 -top-10 h-56 w-56 opacity-20" aria-hidden="true">
          <AnimatedMark mode="once" />
        </div>
        <h2 class="relative text-balance text-3xl font-black tracking-tight sm:text-4xl">Give your church one place to gather its work</h2>
        <p class="relative mx-auto mt-4 max-w-xl text-lg text-white/80">
          Ask today. Once it is open, your people can be in it by Sunday.
        </p>
        <button
          type="button"
          @click="goToStart"
          class="cta group relative mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-gray-900 shadow-xl transition-colors hover:bg-gray-100"
        >
          Start your church
          <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
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

/* Scroll reveal (v-reveal). The class is only added where motion is welcome. */
:deep(.reveal),
.reveal {
  opacity: 0;
  transform: translateY(1.5rem);
  transition: opacity 0.7s ease-out, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

:deep(.revealed),
.revealed {
  opacity: 1;
  transform: none;
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

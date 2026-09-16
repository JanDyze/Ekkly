<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, CheckCircle2, HandPointing, HandWaving } from '../icons'
import AnimatedMark from '../components/common/AnimatedMark.vue'
import CookieBanner from '../components/frontdoor/CookieBanner.vue'
import ChatBubble from '../components/frontdoor/ChatBubble.vue'
import WelcomeSheet from '../components/frontdoor/WelcomeSheet.vue'
import HeroStage from '../components/frontdoor/HeroStage.vue'
import AppsInside from '../components/frontdoor/AppsInside.vue'
import HowItWorks from '../components/frontdoor/HowItWorks.vue'
import AppArt from '../components/frontdoor/AppArt.vue'
import FrontDoorHeader from '../components/frontdoor/FrontDoorHeader.vue'
import FrontDoorFooter from '../components/frontdoor/FrontDoorFooter.vue'
import FrontDoorFaq from '../components/frontdoor/FrontDoorFaq.vue'
import { FAQS, HOME_FAQS } from '../components/frontdoor/faqs'
import { TYPE } from '../components/frontdoor/type'
import { initAuth, useAuth } from '../composables/useAuth'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import { useFrontDoorConsent } from '../composables/useFrontDoorConsent'
import { planFrom, useFrontDoor } from '../composables/useFrontDoor'
import { knownChurch } from '../components/frontdoor/knownChurches'
import { formatMoney } from '../utils/moneyUtils'
import { vScrollLight } from '../components/frontdoor/scrollLight'

// The platform's front door: church.app itself, and app.church.app.
//
// It sells: a visitor who has never heard of Ekkly should come away knowing
// what it does for a church, roughly what it costs, and that starting is one
// button away — so the page opens on a hero with the app in a phone, walks
// through what is inside and how a church gets started, says a word about
// price, and answers the first questions they would ask. The detail has pages
// of its own: Pricing builds the plan, and Get started is where every call to
// action lands, to sign in and ask for a church.

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

// The name and the words come from the console (Name & front door), falling
// back to VITE_PLATFORM_NAME and the wording the app shipped with. The app
// prices come from Apps & prices.
const { branding, catalog } = usePlatformConfig()
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''
const { picks, addPick, namedChurch, signal } = useFrontDoor()

const ready = ref(false)
initAuth().then(() => {
  ready.value = true
})

/* ------------------------------------------------------------ the story */

const offeredApps = computed(() => catalog.value.filter((app) => app.available))

const sampleDomain = rootDomain || 'ekkly.online'

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

// One visit per page load, once they have agreed to be counted — which may be
// now, or may be a previous visit's answer, so it waits for the answer rather
// than the load.
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

// The chip above the headline, unless it only says the headline again.
const sameWords = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
const showTagline = computed(
  () => !!branding.value.tagline?.trim() && !sameWords(branding.value.tagline, branding.value.frontDoor.headline)
)

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

const faqs = FAQS.slice(0, HOME_FAQS)

// Every call to action goes to Get started.
const goToStart = () => {
  signal('start')
  router.push('/start')
}
const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// Arriving from another page's link to a section ("/#features"): go to it once
// the page has drawn, then take the hash off, so a reload starts at the top.
onMounted(async () => {
  if (!route.hash) return
  await nextTick()
  document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: 'start' })
  router.replace({ hash: '' })
})

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

// The church named in the welcome goes on the hero's phone, into "How it
// works", and into the request form on Get started.
const welcomeChurch = (name) => {
  namedChurch.value = name
}

// A church the front door knows goes on the previews by its proper name, however
// it was typed ("cp" is City Praise), and wears its own logo there.
const demoChurch = computed(() => knownChurch(namedChurch.value)?.name || namedChurch.value)

// "Add to my plan" on an app in What's inside adds it to the plan the front
// door keeps (useFrontDoor) and leaves the reader where they are; "See my
// plan" goes to Pricing, where it is already ticked.
const viewPlan = () => router.push('/pricing')

/* ------------------------------------------------------------- pricing */

// A word about price, and the plan so far. The whole builder is on Pricing.
const peso = (centavos) => formatMoney(centavos).replace(/\.00$/, '')
const plan = computed(() => planFrom(catalog.value, picks.value))
const priceLine = computed(() => {
  const prices = offeredApps.value.map((app) => app.price || 0).filter((price) => price > 0)
  if (!prices.length) return 'Priced for your church.'
  const low = Math.min(...prices)
  return low === Math.max(...prices) ? `${peso(low)} an app, a month.` : `From ${peso(low)} an app, a month.`
})
const PRICE_WINS = ['First month free', 'Monthly, or a year for the price of ten', 'Add or drop apps any month']

// Scrolling down the page is a room catching the light, not sections fading up
// (see scrollLight.js). Headings are lit as a band of the window's colours
// crosses them, the apps switch on as they come into view, and the last call
// opens out of an arched window.

// The heading's light has crossed by the time it is halfway up the screen.
const HEADING_LIGHT = { start: 0.92, end: 0.5 }
const WINDOW_OPENS = { start: 1, end: 0.85 }

</script>

<template>
  <div class="min-h-dvh overflow-x-clip bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
    <!-- overflow-x-clip, not hidden: hidden makes this a scroll container, and
         the sticky header would then scroll away with the page. -->
    <FrontDoorHeader />

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
              class="hidden h-14 items-center gap-2 rounded-2xl px-6 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-100 lg:inline-flex dark:text-gray-200 dark:hover:bg-gray-800"
            >
              See what’s inside
            </button>
          </div>
          <p class="hero-in mt-5 flex items-center justify-center gap-1.5 text-sm text-gray-500 lg:hidden dark:text-gray-400" :style="{ animationDelay: `${headline.glowDelay + 450}ms` }">
            <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-500" />
            First month free · your own link
          </p>
          <p class="hero-in mt-6 hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 lg:flex dark:text-gray-400" :style="{ animationDelay: `${headline.glowDelay + 450}ms` }">
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> First month free</span>
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Your church’s own link</span>
            <span class="inline-flex items-center gap-1.5"><CheckCircle2 class="h-4 w-4 text-emerald-500" /> Pay only for the apps you turn on</span>
          </p>

          <!-- The welcome again, for anyone who skipped it and changed their
               mind: name the church, leave a way to be reached. -->
          <div class="hero-in mt-8 hidden justify-center lg:flex lg:justify-start" :style="{ animationDelay: `${headline.glowDelay + 550}ms` }">
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

        <HeroStage :domain="sampleDomain" :apps="offeredApps" :church="demoChurch" @explore="goTo('features')" />
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
        <!-- Every app, lighting up as it comes into view. Opening one shows
             everything it does, and its button adds it to the plan. -->
        <AppsInside :apps="offeredApps" :planned="picks" @plan="addPick" @view-plan="viewPlan">
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
    <section id="how" class="scroll-mt-20 bg-gray-900 text-white lg:scroll-mt-17 dark:bg-gray-900">
      <HowItWorks :church="demoChurch" :domain="sampleDomain" @start="goToStart">
        <template #heading>
          <div class="text-center lg:text-left">
            <p :class="[TYPE.eyebrow, 'text-primary-light']">How it works</p>
            <h2 v-scroll-light="HEADING_LIGHT" :class="['lit-heading lit-bright mt-3', TYPE.title]">Up and running this week</h2>
          </div>
        </template>
      </HowItWorks>
    </section>

    <!-- ============================================================ pricing -->
    <!-- A word about price and the plan so far; building it is Pricing's. -->
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
            class="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover"
          >
            Build your plan
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </RouterLink>
        </div>

        <!-- The plan so far: the starter apps, and whatever was added above. -->
        <aside class="rounded-3xl bg-gray-900 p-6 text-white shadow-2xl dark:bg-gray-800">
          <p class="text-xs font-semibold uppercase tracking-wider text-white/60">Your plan so far</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <AppArt v-for="app in plan.apps" :key="app.key" :app-key="app.key" :title="app.name" class="h-10 w-10" />
          </div>
          <p v-if="plan.total" class="mt-5 flex items-baseline gap-1">
            <span class="text-3xl font-black tabular-nums">{{ peso(plan.total) }}</span>
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
          <!-- Not ready to ask: the welcome, where the hero offers it on a
               wider screen. -->
          <p class="relative mt-5 lg:hidden">
            <button type="button" class="inline-flex items-center gap-2 text-sm font-semibold text-white/80 underline-offset-4 hover:underline" @click="openWelcome">
              <HandWaving class="h-4.5 w-4.5" />
              Or say hello, we’ll reach out
            </button>
          </p>
        </div>
      </div>
    </section>

    <WelcomeSheet v-if="showWelcome" :domain="sampleDomain" :delay="welcomeAgain ? 0 : 1400" @done="closeWelcome" @church="welcomeChurch" />
    <CookieBanner v-if="welcomeDone" />
    <!-- After the cookie question, which sits in the same corner of a phone. -->
    <ChatBubble v-if="answered" />

    <FrontDoorFooter />
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
.lit-heading {
  --glass-warm: color-mix(in oklch, var(--color-primary) 62%, oklch(0.8 0.16 75));
  --glass: var(--color-primary);
  --glass-cool: color-mix(in oklch, var(--color-primary) 62%, oklch(0.68 0.2 330));
}

.lit-heading.lit-bright {
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

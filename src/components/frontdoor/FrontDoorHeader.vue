<script setup>
import { useRoute, useRouter } from 'vue-router'
import { Moon, ShieldCheck, Sun } from '../../icons'
import PlatformLogo from '../common/PlatformLogo.vue'
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { planFrom, useFrontDoor } from '../../composables/useFrontDoor'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { formatMoney } from '../../utils/moneyUtils'
import { yearlyPrice } from '../../../lib/apps.js'
import { useTheme } from '../../composables/useTheme'

// The bar across the top of every front door page. Its links go to the home
// page's sections, to Pricing, and to Get started; on the home page a section
// link scrolls there rather than reloading anything.

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const { admin, signal, picks, yearly } = useFrontDoor()
const { catalog } = usePlatformConfig()

// On Pricing, the button carries the plan as it is built, so the total is in
// view wherever the reader has got to.
const onPricing = computed(() => route.path === '/pricing')
const plan = computed(() => planFrom(catalog.value, picks.value))
const total = computed(() => (yearly.value ? yearlyPrice(plan.value.total) : plan.value.total))
const price = computed(() => formatMoney(total.value))

// Light or dark, the same switch the app has, with the same moment when it
// changes (App.vue draws it).
const { isDark, toggleTheme } = useTheme()

// The second front door (/v2, the Sunday) is a home page too. The Sunday is
// the page itself, so it needs no link of its own; the gospel, the questions
// and Pricing are the ways past it, and its logo takes it back to its own top
// rather than across to the first.
const homePath = computed(() => (route.path === '/v2' ? '/v2' : '/'))

const SECTIONS = computed(() =>
  homePath.value === '/v2'
    ? [{ id: 'gospel', label: 'The gospel' }]
    : [
        { id: 'features', label: 'What’s inside' },
        { id: 'how', label: 'How it works' },
      ]
)

const section = (id) => {
  if (route.path === homePath.value) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  else router.push({ path: homePath.value, hash: `#${id}` })
}

const home = () => {
  if (route.path === homePath.value) window.scrollTo({ top: 0, behavior: 'smooth' })
  else router.push(homePath.value)
}

// The Sunday is drawn under a deep navy bar, the same as its card, so the
// bar stays quiet over the picture; the other front door pages keep theirs.
const sunday = computed(() => route.path === '/v2')

// Every link and plain button on the bar is the same shape, so the links and
// the controls after them read as one row rather than two kinds of thing.
// Their grey comes from the row around them, so the page you are on can be
// darker without two text colours fighting on one element.
const item = 'h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white'
const current = 'text-gray-900 dark:text-white'
</script>

<template>
  <header
    :class="['front-door-bar sticky top-0 z-40 border-b', sunday ? 'dark border-slate-800 bg-slate-900' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950']"
    :style="sunday ? { '--color-primary': 'inherit', '--color-primary-hover': 'inherit' } : null"
  >
    <!-- The logo alone on the left, and everything else together on the
         right: the links, then the controls, then the one button that
         matters, so the eye ends where the reader should. -->
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <a :href="homePath" class="min-w-0 shrink-0" @click.prevent="home">
        <PlatformLogo mark-class="h-8 w-8" text-class="text-2xl" />
      </a>

      <div class="flex min-w-0 items-center gap-1 text-gray-600 dark:text-gray-300">
        <nav aria-label="Front door" class="flex items-center gap-1">
          <button
            v-for="link in SECTIONS"
            :key="link.id"
            type="button"
            :class="[item, 'hidden md:inline-flex']"
            @click="section(link.id)"
          >
            {{ link.label }}
          </button>
          <!-- A phone has no room for the whole menu, but Pricing is its own
               page, so it keeps a way there — except on Pricing itself, where
               the button beside it already carries the plan. -->
          <RouterLink
            to="/pricing"
            :class="[item, onPricing ? ['hidden md:inline-flex', current] : 'inline-flex']"
          >
            Pricing
          </RouterLink>
          <button type="button" :class="[item, 'hidden md:inline-flex']" @click="section('faq')">Questions</button>
        </nav>

        <span class="mx-2 hidden h-5 w-px bg-gray-200 md:block dark:bg-gray-700" aria-hidden="true"></span>

        <!-- Not on the Sunday, whose pictures do not change with it. -->
        <button
          v-if="!sunday"
          type="button"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          :class="[item, 'inline-flex w-10 justify-center px-0']"
          @click="toggleTheme($event)"
        >
          <Sun v-if="isDark" class="h-5 w-5" />
          <Moon v-else class="h-5 w-5" />
        </button>
        <RouterLink v-if="admin" to="/platform" :class="[item, 'hidden sm:inline-flex']">
          <ShieldCheck class="h-4 w-4" />
          Console
        </RouterLink>
        <RouterLink
          v-if="route.path !== '/start'"
          to="/start"
          class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:ml-2"
          @click="signal('start')"
        >
          <template v-if="onPricing && plan.total">
            <span class="hidden sm:inline">Start ·&nbsp;</span>
            <span class="tabular-nums">{{ price }}</span>
            <span class="hidden text-white/70 sm:inline">/ {{ yearly ? 'year' : 'month' }}</span>
          </template>
          <template v-else>{{ isAuthenticated ? 'Your church' : 'Get started' }}</template>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style>
/* On the Sunday the bar holds back while the story's title is up
   (SundayStory sets .sunday-opening on the page), so the logo and the ways on
   are on the screen once; it comes in with the church. Not scoped, because
   the class it answers to is on <html>: Vue's :global() would make the whole
   rule global and hide the page, not the bar. */
.front-door-bar {
  transition: opacity 0.4s ease;
}
.sunday-opening .front-door-bar {
  opacity: 0;
  pointer-events: none;
}
</style>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { Moon, ShieldCheck, Sun } from '../../icons'
import PlatformLogo from '../common/PlatformLogo.vue'
import { useAuth } from '../../composables/useAuth'
import { useFrontDoor } from '../../composables/useFrontDoor'
import { useTheme } from '../../composables/useTheme'

// The bar across the top of every front door page. Its links go to the home
// page's sections, to Pricing, and to Get started; on the home page a section
// link scrolls there rather than reloading anything.

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const { admin, signal } = useFrontDoor()

// Light or dark, the same switch the app has, with the same moment when it
// changes (App.vue draws it).
const { isDark, toggleTheme } = useTheme()

const SECTIONS = [
  { id: 'features', label: 'What’s inside' },
  { id: 'how', label: 'How it works' },
]

const section = (id) => {
  if (route.path === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  else router.push({ path: '/', hash: `#${id}` })
}

const home = () => {
  if (route.path === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
  else router.push('/')
}

const link = 'hover:text-gray-900 dark:hover:text-white'
const current = 'text-gray-900 dark:text-white'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
    <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
      <a href="/" class="min-w-0" @click.prevent="home">
        <PlatformLogo mark-class="h-8 w-8" text-class="text-2xl" />
      </a>
      <nav class="ml-6 hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex dark:text-gray-300">
        <button v-for="item in SECTIONS" :key="item.id" type="button" :class="link" @click="section(item.id)">{{ item.label }}</button>
        <RouterLink to="/pricing" :class="[link, route.path === '/pricing' && current]">Pricing</RouterLink>
        <button type="button" :class="link" @click="section('faq')">Questions</button>
      </nav>
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <!-- A phone has no room for the whole menu, but Pricing is its own page
             now, so it keeps a way there. -->
        <RouterLink
          to="/pricing"
          :class="['flex h-10 items-center rounded-lg px-3 text-sm font-medium text-gray-600 md:hidden dark:text-gray-300', route.path === '/pricing' && current]"
        >
          Pricing
        </RouterLink>
        <button
          type="button"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          @click="toggleTheme($event)"
        >
          <Sun v-if="isDark" class="h-5 w-5" />
          <Moon v-else class="h-5 w-5" />
        </button>
        <RouterLink
          v-if="admin"
          to="/platform"
          class="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:inline-flex dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ShieldCheck class="h-4 w-4" />
          Console
        </RouterLink>
        <RouterLink
          v-if="route.path !== '/start'"
          to="/start"
          class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-colors hover:bg-primary-hover"
          @click="signal('start')"
        >
          {{ isAuthenticated ? 'Your church' : 'Get started' }}
        </RouterLink>
      </div>
    </div>
  </header>
</template>

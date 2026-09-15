<script setup>
import PlatformLogo from '../common/PlatformLogo.vue'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { useFrontDoor } from '../../composables/useFrontDoor'

// The foot of every front door page: who runs it, how to write to them, and
// the pages a church reads before it pays — Pricing, Privacy and Terms.

const { branding } = usePlatformConfig()
const { admin } = useFrontDoor()
const year = new Date().getFullYear()

const link = 'font-medium hover:text-gray-900 dark:hover:text-white'
</script>

<template>
  <footer class="border-t border-gray-100 py-10 dark:border-gray-900">
    <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row sm:px-6 dark:text-gray-400">
      <PlatformLogo mark-class="h-6 w-6" text-class="text-lg" />
      <nav class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="More">
        <RouterLink to="/pricing" :class="link">Pricing</RouterLink>
        <RouterLink to="/privacy" :class="link">Privacy</RouterLink>
        <RouterLink to="/terms" :class="link">Terms</RouterLink>
        <RouterLink v-if="admin" to="/platform" :class="link">Console</RouterLink>
      </nav>
      <p class="text-center">
        © {{ year }} {{ branding.name }}
        <template v-if="branding.contactEmail">
          &middot; <a :href="`mailto:${branding.contactEmail}`" :class="link">{{ branding.contactEmail }}</a>
        </template>
      </p>
    </div>
  </footer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, DownloadSimple, ShieldCheck } from '../icons'
import PlatformLogo from '../components/common/PlatformLogo.vue'

// Ekkly's QR code, to look at and to download: it opens https://ekkly.online.
//
// The images are made by brand/ekkly/build-qr.mjs and served from
// public/brand-qr. That script reads each one back at several sizes, blurred
// too, before it is kept, so what is here is known to scan.

const TARGET = 'https://ekkly.online'

const VERSIONS = {
  card: { label: 'With address', png: '/brand-qr/ekkly-online-qr-card.png', svg: '/brand-qr/ekkly-online-qr-card.svg' },
  code: { label: 'Code only', png: '/brand-qr/ekkly-online-qr.png', svg: '/brand-qr/ekkly-online-qr.svg' },
}

const version = ref('card')
const current = computed(() => VERSIONS[version.value])
</script>

<template>
  <div class="min-h-dvh bg-gray-50 px-4 py-6 text-gray-900 sm:py-10 dark:bg-gray-950 dark:text-white">
    <div class="mx-auto flex max-w-md flex-col">
      <header class="flex items-center justify-between">
        <RouterLink to="/" class="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
          <ArrowLeft class="h-4 w-4" />
          <PlatformLogo mark-class="h-6 w-6" text-class="text-lg" />
        </RouterLink>
      </header>

      <h1 class="mt-6 text-3xl font-black tracking-tight">QR code</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Opens <a :href="TARGET" class="font-semibold text-primary hover:underline dark:text-primary-light">ekkly.online</a>
      </p>

      <!-- Which image: two choices, so a segment control. -->
      <div class="mt-5 flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800" role="group" aria-label="Which version">
        <button
          v-for="(item, key) in VERSIONS"
          :key="key"
          type="button"
          :aria-pressed="version === key"
          :class="[
            'h-9 flex-1 rounded-md px-2.5 text-sm font-medium transition-colors',
            version === key ? 'bg-white text-primary shadow-sm dark:bg-gray-700 dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
          ]"
          @click="version = key"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- Shown on white whatever the page's theme: a code is printed on white. -->
      <div class="mt-4 overflow-hidden rounded-3xl bg-white p-3 shadow-xl shadow-gray-900/5 ring-1 ring-gray-200 dark:ring-gray-800">
        <img :src="current.svg" :alt="`QR code that opens ${TARGET}`" class="mx-auto h-auto w-full" />
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <a
          :href="current.png"
          :download="current.png.split('/').pop()"
          class="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <DownloadSimple class="h-4 w-4" />
          PNG
        </a>
        <a
          :href="current.svg"
          :download="current.svg.split('/').pop()"
          class="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
        >
          <DownloadSimple class="h-4 w-4" />
          SVG for print
        </a>
      </div>

      <p class="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck class="h-4 w-4" />
        Tested to scan from large to small
      </p>
    </div>
  </div>
</template>

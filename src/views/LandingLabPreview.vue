<script setup>
import { ref } from 'vue'
import { ArrowLeft, DeviceMobile, Monitor } from '../icons'
import LabPreview from '../components/landinglab/LabPreview.vue'
import { model } from '../composables/useLandingLab'

// PROTOTYPE — /landing-lab/preview. The page the builder builds, on its own
// screen and nothing else: no rail, no fields, no outlines. A church's front
// door should be judged the way a visitor meets it, which a preview squeezed
// into a third of a builder cannot show.
//
// The model comes from src/composables/useLandingLab.js, shared with the
// builder, so walking between the two keeps the arrangement.

// Phone by default, because that is how nearly every visitor arrives. The
// frame is the phone; wide drops it and lets the page have the window.
const wide = ref(false)
</script>

<template>
  <div class="min-h-dvh bg-gray-100 dark:bg-gray-900">
    <!-- The way back, and the only control. Floating rather than a header, so
         nothing of ours sits above the page being judged. -->
    <div
      class="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center p-3"
      style="padding-top: max(0.75rem, env(safe-area-inset-top))"
    >
      <div
        class="pointer-events-auto flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95"
      >
        <RouterLink
          to="/landing-lab"
          class="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft class="h-4 w-4" />
          Builder
        </RouterLink>
        <span class="h-5 w-px bg-gray-200 dark:bg-gray-600"></span>
        <button
          :class="[
            'rounded-full p-2 transition-colors',
            !wide ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light' : 'text-gray-400',
          ]"
          aria-label="Phone width"
          @click="wide = false"
        >
          <DeviceMobile class="h-4 w-4" />
        </button>
        <button
          :class="[
            'rounded-full p-2 transition-colors',
            wide ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light' : 'text-gray-400',
          ]"
          aria-label="Full width"
          @click="wide = true"
        >
          <Monitor class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Wide: the page takes the window, the way it will in a browser. Phone:
         framed, so the edges of the layout are visible. -->
    <div v-if="wide">
      <LabPreview :model="model" />
    </div>
    <div v-else class="px-3 pb-6 pt-20">
      <div
        class="mx-auto max-w-sm overflow-hidden rounded-3xl border border-gray-300 shadow-xl dark:border-gray-600"
      >
        <LabPreview :model="model" />
      </div>
    </div>
  </div>
</template>

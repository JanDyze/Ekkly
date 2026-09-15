<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FrontDoorHeader from '../components/frontdoor/FrontDoorHeader.vue'
import FrontDoorFooter from '../components/frontdoor/FrontDoorFooter.vue'
import CookieBanner from '../components/frontdoor/CookieBanner.vue'
import { TYPE } from '../components/frontdoor/type'
import { UPDATED, privacy, terms } from '../components/frontdoor/legal'
import { usePlatformConfig } from '../composables/usePlatformConfig'

// Privacy and Terms: what a church reads before it pays, and what a card
// processor asks to see before it will take payments. One page, two documents;
// the route says which (legal.js holds the words).

const route = useRoute()
const { branding } = usePlatformConfig()

const doc = computed(() => {
  const who = {
    name: branding.value.name,
    email: branding.value.contactEmail || branding.value.chat?.hostEmail || 'us',
  }
  return route.meta.doc === 'terms' ? terms(who) : privacy(who)
})
</script>

<template>
  <div class="flex min-h-dvh flex-col overflow-x-clip bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
    <FrontDoorHeader />

    <main class="flex-1 py-12 lg:py-16">
      <article class="mx-auto max-w-2xl px-4 sm:px-6">
        <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Updated {{ UPDATED }}</p>
        <h1 :class="['mt-3', TYPE.title]">{{ doc.title }}</h1>
        <p :class="['mt-4 text-gray-600 dark:text-gray-300', TYPE.lead]">{{ doc.intro }}</p>

        <section v-for="section in doc.sections" :key="section.heading" class="mt-10">
          <h2 class="text-xl font-bold">{{ section.heading }}</h2>
          <p v-for="text in section.body || []" :key="text" class="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">{{ text }}</p>
          <ul v-if="section.list" class="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-gray-600 marker:text-gray-400 dark:text-gray-300">
            <li v-for="text in section.list" :key="text">{{ text }}</li>
          </ul>
        </section>
      </article>
    </main>

    <FrontDoorFooter />
    <CookieBanner />
  </div>
</template>

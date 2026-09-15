<script setup>
import { useRouter } from 'vue-router'
import FrontDoorHeader from '../components/frontdoor/FrontDoorHeader.vue'
import FrontDoorFooter from '../components/frontdoor/FrontDoorFooter.vue'
import FrontDoorFaq from '../components/frontdoor/FrontDoorFaq.vue'
import PlanBuilder from '../components/frontdoor/PlanBuilder.vue'
import CookieBanner from '../components/frontdoor/CookieBanner.vue'
import ChatBubble from '../components/frontdoor/ChatBubble.vue'
import { FAQS } from '../components/frontdoor/faqs'
import { TYPE } from '../components/frontdoor/type'
import { usePlatformConfig } from '../composables/usePlatformConfig'
import { useFrontDoorConsent } from '../composables/useFrontDoorConsent'
import { useFrontDoor } from '../composables/useFrontDoor'

// Pricing: the plan builder, and every question about paying. It was the
// longest part of the home page — fourteen apps, one under another on a phone
// — so it has a page of its own, and the home page keeps a short word about it.

const router = useRouter()
const { catalog } = usePlatformConfig()
const { answered } = useFrontDoorConsent()
const { signal } = useFrontDoor()

const start = () => {
  signal('start')
  router.push('/start')
}
</script>

<template>
  <div class="min-h-dvh overflow-x-clip bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
    <FrontDoorHeader />

    <main>
      <section class="py-14 lg:py-20">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="mx-auto max-w-2xl text-center">
            <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Pricing</p>
            <h1 :class="['mt-3', TYPE.title]">Build the plan your church needs</h1>
            <p :class="['mt-4 text-gray-600 dark:text-gray-300', TYPE.lead]">
              Tap the apps you would use. Your first month is free.
            </p>
          </div>
          <div class="mt-10 lg:mt-12">
            <PlanBuilder :catalog="catalog" @start="start" />
          </div>
        </div>
      </section>

      <section class="border-t border-gray-100 bg-gray-50/60 py-16 dark:border-gray-900 dark:bg-gray-900/40 lg:py-24">
        <div class="mx-auto max-w-3xl px-4 sm:px-6">
          <div class="text-center">
            <p :class="[TYPE.eyebrow, 'text-primary dark:text-primary-light']">Questions</p>
            <h2 :class="['mt-3', TYPE.title]">Questions churches ask</h2>
          </div>
          <FrontDoorFaq :items="FAQS" class="mt-10" />
        </div>
      </section>
    </main>

    <FrontDoorFooter />
    <CookieBanner />
    <ChatBubble v-if="answered" />
  </div>
</template>

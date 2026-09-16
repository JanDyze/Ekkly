<script setup>
import { computed } from 'vue'
import { CaretRight, CheckCircle2, Clock, X } from '../../icons'
import { churchLink, useChurchRequests } from '../../composables/useChurchRequests'

// Where a church that has asked for Ekkly stands, above the home page's hero.
//
// Somebody who has already sent a request does not need the page to sell it to
// them again: they want to know whether it is open yet. The whole strip is the
// way on — to the church once it is open, to the request while it is being
// looked over — so it carries no button of its own; the hero's own call says
// the same thing in the same words.

const { latest, ready } = useChurchRequests()

const show = computed(() => ready.value && Boolean(latest.value))

// Approved, it opens the church; anything else, it goes to the request.
const link = computed(() => (latest.value?.status === 'approved' && churchLink(latest.value)) || '')

const tone = computed(() => {
  if (latest.value?.status === 'approved') {
    return {
      icon: CheckCircle2,
      badge: 'bg-emerald-600',
      skin: 'bg-emerald-50 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/25 dark:hover:bg-emerald-500/15',
      title: 'text-emerald-900 dark:text-emerald-200',
      body: 'text-emerald-800/80 dark:text-emerald-300/80',
      arrow: 'text-emerald-700 dark:text-emerald-300',
    }
  }
  if (latest.value?.status === 'declined') {
    return {
      icon: X,
      badge: 'bg-gray-500',
      skin: 'bg-gray-100 ring-gray-200 hover:bg-gray-200/70 dark:bg-gray-800 dark:ring-gray-700 dark:hover:bg-gray-700/70',
      title: 'text-gray-900 dark:text-white',
      body: 'text-gray-600 dark:text-gray-400',
      arrow: 'text-gray-500 dark:text-gray-400',
    }
  }
  return {
    icon: Clock,
    badge: 'bg-amber-500',
    skin: 'bg-amber-50 ring-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/25 dark:hover:bg-amber-500/15',
    title: 'text-amber-900 dark:text-amber-200',
    body: 'text-amber-800/80 dark:text-amber-300/80',
    arrow: 'text-amber-700 dark:text-amber-300',
  }
})

const said = computed(() => {
  const request = latest.value
  if (!request) return { title: '', body: '' }
  if (request.status === 'approved') return { title: `${request.churchName} is open`, body: 'You are its first administrator. Open it →' }
  if (request.status === 'declined') {
    return { title: `We could not open ${request.churchName}`, body: request.note || 'Ask again, or send us a message and we will help.' }
  }
  return { title: `We are looking over ${request.churchName}`, body: 'We will email you the moment it is open.' }
})
</script>

<template>
  <Transition name="strip">
    <div v-if="show" class="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <component
        :is="link ? 'a' : 'RouterLink'"
        v-bind="link ? { href: link } : { to: '/start' }"
        :class="['group flex items-center gap-3 rounded-2xl p-4 text-left ring-1 transition-colors sm:gap-4', tone.skin]"
      >
        <span :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white', tone.badge]">
          <component :is="tone.icon" class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1 text-sm">
          <span :class="['block font-bold', tone.title]">{{ said.title }}</span>
          <span :class="['block truncate', tone.body]">{{ said.body }}</span>
        </span>
        <CaretRight :class="['h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5', tone.arrow]" />
      </component>
    </div>
  </Transition>
</template>

<style scoped>
/* It arrives once the request is known, rather than appearing mid-read. */
.strip-enter-active {
  transition:
    opacity 0.4s ease,
    translate 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.strip-enter-from {
  opacity: 0;
  translate: 0 -0.5rem;
}

@media (prefers-reduced-motion: reduce) {
  .strip-enter-active {
    transition: none;
  }
}
</style>

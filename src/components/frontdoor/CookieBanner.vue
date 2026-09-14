<script setup>
import { Cookie } from '../../icons'
import { useFrontDoorConsent } from '../../composables/useFrontDoorConsent'

// The question the front door asks before it counts anything. It says exactly
// what is kept, in the words of what it is for, and takes no for an answer:
// the page works the same either way, and nobody is asked twice.

const { answered, allow, refuse } = useFrontDoorConsent()
</script>

<template>
  <Transition name="ask">
    <div
      v-if="!answered"
      class="fixed inset-x-0 bottom-0 z-100 px-4 pb-4"
      role="region"
      aria-label="Counting visits"
    >
      <div class="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/95">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
          <Cookie class="h-5 w-5" />
        </span>
        <p class="flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          <span class="font-semibold text-gray-900 dark:text-white">May we count you?</span>
          We keep a count of visits to this page and the church names people try above, so we know what churches are
          looking for. Nothing follows you to other sites, and nothing is sold or shared.
        </p>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            @click="refuse"
            class="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            No thanks
          </button>
          <button
            type="button"
            @click="allow"
            class="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ask-enter-active {
  transition: opacity 0.4s ease 0.8s, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.8s;
}

.ask-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.ask-enter-from,
.ask-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

@media (prefers-reduced-motion: reduce) {
  .ask-enter-active,
  .ask-leave-active {
    transition: opacity 0.2s ease;
  }
  .ask-enter-from,
  .ask-leave-to {
    transform: none;
  }
}
</style>

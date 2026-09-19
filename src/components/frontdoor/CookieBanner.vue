<script setup>
import { Cookie } from '../../icons'
import { useFrontDoorConsent } from '../../composables/useFrontDoorConsent'

// The question the front door asks before it counts anything. It says what is
// kept in one line — a longer paragraph at the bottom of a phone is a wall to
// be dismissed, not a thing to be read — and takes no for an answer: the page
// works the same either way, and nobody is asked twice.

const { answered, allow, refuse } = useFrontDoorConsent()
</script>

<template>
  <Transition name="ask">
    <div
      v-if="!answered"
      class="fixed inset-x-0 bottom-0 z-100 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
      role="region"
      aria-label="Counting visits"
    >
      <!-- On a phone the question is one row and the answers the next, each
           half the width, so neither is the easier tap. -->
      <div class="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:flex-nowrap sm:gap-4 sm:p-4 dark:border-gray-800 dark:bg-gray-900/95">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
          <Cookie class="h-4.5 w-4.5" />
        </span>
        <p class="min-w-40 flex-1 text-sm leading-snug text-gray-600 dark:text-gray-300">
          <span class="font-semibold text-gray-900 dark:text-white">May we count you?</span>
          Just visits to this page &mdash; nothing follows you anywhere else.
        </p>
        <div class="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            type="button"
            @click="refuse"
            class="h-11 flex-1 rounded-lg px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 sm:h-10 sm:flex-none dark:text-gray-300 dark:hover:bg-gray-800"
          >
            No thanks
          </button>
          <button
            type="button"
            @click="allow"
            class="h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover sm:h-10 sm:flex-none"
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

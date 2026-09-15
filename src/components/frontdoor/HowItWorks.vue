<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ArrowRight, CheckCircle2 } from '../../icons'
import { useMediaQuery } from '../../composables/useMediaQuery'
import HowVisual from './HowVisual.vue'
import { vScrollLight } from './scrollLight'
import { prefersStill } from './useSceneTimeline'

// "How it works": three steps from asking to a full church.
//
// On a desktop the section holds still while the scroll walks through the
// steps, one at a time: the list on the left lights the step being read, and
// the card on the right shows it happening — so a visitor meets each step
// before the next, rather than taking in three boxes at once. The section is
// as tall as the walk (a screen, plus most of a screen per step), and its
// content is pinned under the header for all of it.
//
// A phone has no room for that, so the steps stack, each with its card, and
// each card plays as it comes up the screen.
//
// The heading comes in through the slot, so it keeps the page's own styles.

defineProps({
  church: { type: String, default: '' },
  domain: { type: String, default: 'ekkly.church' },
})

const emit = defineEmits(['start'])

const STEPS = [
  {
    title: 'Ask for your church',
    body: 'Sign in with Google, type your church’s name and choose its link. It takes about two minutes.',
  },
  {
    title: 'We open it for you',
    body: 'We look your request over and open your church, with you as its first administrator.',
  },
  {
    title: 'Bring your people in',
    body: 'Share the link. People sign in and ask to join, and you let each one in with a tap.',
  },
]

const isDesktop = useMediaQuery('(min-width: 1024px)')
const still = prefersStill()

/* -------------------------------------------------------------- desktop */

// The header's height, which the pinned content sits under.
const HEADER = 68
// How much scrolling each step takes, in screens.
const PER_STEP = 0.8

const track = ref(null)
const progress = ref(0)

const measure = () => {
  const box = track.value?.getBoundingClientRect()
  if (!box) return
  const room = box.height - (window.innerHeight - HEADER)
  progress.value = room > 0 ? Math.min(1, Math.max(0, (HEADER - box.top) / room)) : 1
}

let frame = 0
const onScroll = () => {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    measure()
  })
}

watch(
  isDesktop,
  (desktop) => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    if (!desktop) return
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    requestAnimationFrame(measure)
  },
  { immediate: true }
)

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(frame)
})

const active = computed(() => Math.min(STEPS.length - 1, Math.floor(progress.value * STEPS.length)))
// How far into the step being read, from 0 to 1.
const within = computed(() => (still ? 1 : Math.min(1, progress.value * STEPS.length - active.value)))

// The step names are buttons: pressing one scrolls to where that step begins.
const goToStep = (index) => {
  const box = track.value?.getBoundingClientRect()
  if (!box) return
  const room = box.height - (window.innerHeight - HEADER)
  const top = window.scrollY + box.top - HEADER + room * ((index + 0.02) / STEPS.length)
  window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' })
}

// Which way the card turns: forward as the reader goes down, back as they go up.
const direction = ref('next')
watch(active, (now, before) => (direction.value = now > before ? 'next' : 'prev'))

/* ---------------------------------------------------------------- phone */

const phone = ref(STEPS.map(() => (still ? 1 : 0)))
const phoneLight = (index) => ({
  start: 0.85,
  end: 0.45,
  onProgress: (p) => (phone.value[index] = p),
})
</script>

<template>
  <!-- ------------------------------------------------------------ desktop -->
  <div v-if="isDesktop" ref="track" :style="{ height: `calc(${100 + STEPS.length * PER_STEP * 100}dvh - ${HEADER}px)` }">
    <div class="sticky flex items-center" :style="{ top: `${HEADER}px`, height: `calc(100dvh - ${HEADER}px)` }">
      <div class="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_minmax(0,28rem)] items-center gap-16 px-6">
        <div>
          <slot name="heading" />

          <!-- The steps, as a line with a stop for each. The line fills as the
               reader goes; the step being read is open, the ones before it
               ticked, and the ones to come still dim. -->
          <ol class="relative mt-10">
            <span class="pointer-events-none absolute bottom-6 left-6 top-6 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <span class="rail-fill absolute inset-0 origin-top rounded-full" :style="{ transform: `scaleY(${progress})` }"></span>
            </span>
            <li v-for="(step, index) in STEPS" :key="step.title" class="relative">
              <button
                type="button"
                :aria-current="index === active ? 'step' : undefined"
                class="group flex w-full gap-5 rounded-2xl py-3 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
                @click="goToStep(index)"
              >
                <span
                  :class="[
                    'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black transition-colors duration-300',
                    index === active
                      ? 'bg-primary text-white shadow-lg shadow-primary/40'
                      : index < active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-gray-800 text-white/40 ring-1 ring-white/10',
                  ]"
                >
                  <CheckCircle2 v-if="index < active" class="h-6 w-6" />
                  <template v-else>{{ index + 1 }}</template>
                </span>
                <span class="min-w-0 flex-1 pt-1">
                  <span :class="['block text-xs font-bold uppercase tracking-wider transition-colors duration-300', index === active ? 'text-primary-light' : 'text-white/40']">
                    Step {{ index + 1 }} of {{ STEPS.length }}
                  </span>
                  <span :class="['mt-0.5 block text-xl font-bold transition-colors duration-300', index === active ? 'text-white' : index < active ? 'text-white/70' : 'text-white/35 group-hover:text-white/60']">
                    {{ step.title }}
                  </span>
                  <span class="body grid transition-[grid-template-rows] duration-500" :class="index === active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
                    <span class="overflow-hidden">
                      <span class="block pt-2 text-base leading-relaxed text-white/70">{{ step.body }}</span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          </ol>

          <button
            type="button"
            class="group ml-17 mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-100"
            @click="emit('start')"
          >
            Ask for your church
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <!-- The step being read, happening. -->
        <div>
          <!-- As tall as the tallest card, so turning to a shorter one does not
               move everything around it. -->
          <div class="relative flex min-h-84 items-center">
            <Transition :name="`turn-${direction}`" mode="out-in">
              <HowVisual class="w-full" :key="active" :step="active" :p="within" :church="church" :domain="domain" />
            </Transition>
          </div>
          <p class="mt-5 text-center text-sm text-white/50">
            {{ active < STEPS.length - 1 ? 'Keep scrolling for the next step' : 'That’s it. Your church is in.' }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- -------------------------------------------------------------- phone -->
  <div v-else class="mx-auto max-w-xl px-4 py-20 sm:px-6">
    <slot name="heading" />
    <ol class="mt-12 space-y-14">
      <li v-for="(step, index) in STEPS" :key="step.title" v-scroll-light="phoneLight(index)">
        <div class="flex gap-4">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/40">
            {{ index + 1 }}
          </span>
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wider text-primary-light">Step {{ index + 1 }} of {{ STEPS.length }}</p>
            <h3 class="mt-0.5 text-xl font-bold">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-white/70">{{ step.body }}</p>
          </div>
        </div>
        <HowVisual class="mt-5" :step="index" :p="still ? 1 : phone[index]" :church="church" :domain="domain" />
      </li>
    </ol>
    <button
      type="button"
      class="group mt-12 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-gray-900 transition-colors hover:bg-gray-100"
      @click="emit('start')"
    >
      Ask for your church
      <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </button>
  </div>
</template>

<style scoped>
/* The line between the steps, in the window's colours. */
.rail-fill {
  background: linear-gradient(
    to bottom,
    color-mix(in oklch, var(--color-primary-light) 55%, oklch(0.85 0.15 80)),
    var(--color-primary-light),
    color-mix(in oklch, var(--color-primary-light) 55%, oklch(0.78 0.16 330))
  );
}

/* The card turns to the next step: the old one slides up and away and the new
   one rises in; scrolling back runs it the other way. */
.turn-next-enter-active,
.turn-next-leave-active,
.turn-prev-enter-active,
.turn-prev-leave-active {
  transition:
    opacity 0.25s ease,
    translate 0.25s ease;
}

.turn-next-enter-from,
.turn-prev-leave-to {
  opacity: 0;
  translate: 0 1.5rem;
}

.turn-next-leave-to,
.turn-prev-enter-from {
  opacity: 0;
  translate: 0 -1.5rem;
}

@media (prefers-reduced-motion: reduce) {
  .turn-next-enter-active,
  .turn-next-leave-active,
  .turn-prev-enter-active,
  .turn-prev-leave-active,
  .body {
    transition: none;
  }
}
</style>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ArrowRight, CheckCircle2, ChevronLeft } from '../../icons'
import { useMediaQuery } from '../../composables/useMediaQuery'
import HowVisual from './HowVisual.vue'
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
// A phone gets the same walk without holding the page: a walkthrough of tabs,
// swipes and a "Next step" button, each step's card playing as it comes up.
//
// The heading comes in through the slot, so it keeps the page's own styles.

defineProps({
  church: { type: String, default: '' },
  domain: { type: String, default: 'ekkly.online' },
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

// A phone gets the steps as a walkthrough to tap or swipe through: one step at
// a time, its card playing on its own when the step comes up (and again when
// its tab is tapped), and a button for the next step.
const phoneStep = ref(0)
const phoneP = ref(still ? 1 : 0)
const PLAY_MS = 2600

let playFrame = 0
const play = () => {
  cancelAnimationFrame(playFrame)
  if (still) {
    phoneP.value = 1
    return
  }
  const start = performance.now()
  const tick = (now) => {
    phoneP.value = Math.min(1, (now - start) / PLAY_MS)
    if (phoneP.value < 1) playFrame = requestAnimationFrame(tick)
  }
  phoneP.value = 0
  playFrame = requestAnimationFrame(tick)
}
onUnmounted(() => cancelAnimationFrame(playFrame))

const goPhone = (index) => {
  if (index < 0 || index >= STEPS.length) return
  direction.value = index >= phoneStep.value ? 'next' : 'prev'
  phoneStep.value = index
  play()
}

// The first card waits until the walkthrough is on the screen, so it is seen
// playing rather than already finished.
const walkthrough = ref(null)
let seen = null
watch(walkthrough, (el) => {
  seen?.disconnect()
  if (!el) return
  seen = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      seen.disconnect()
      play()
    },
    { threshold: 0.4 }
  )
  seen.observe(el)
})
onUnmounted(() => seen?.disconnect())

// A sideways swipe on the card turns the step, as a phone's own screens turn.
let touch = null
const onTouchStart = (event) => {
  const t = event.touches[0]
  touch = event.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
}
const onTouchEnd = (event) => {
  if (!touch) return
  const t = event.changedTouches[0]
  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y
  touch = null
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goPhone(phoneStep.value + (dx < 0 ? 1 : -1))
}
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

    <div ref="walkthrough" class="mt-8">
      <!-- The three steps as tabs. The one showing fills as its card plays;
           the ones before it are ticked. -->
      <div class="grid grid-cols-3 gap-2" role="tablist" aria-label="Steps">
        <button
          v-for="(step, index) in STEPS"
          :key="step.title"
          type="button"
          role="tab"
          :aria-selected="index === phoneStep"
          class="group flex flex-col gap-2 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          @click="goPhone(index)"
        >
          <span class="flex items-center gap-1.5">
            <span
              :class="[
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors duration-300',
                index === phoneStep ? 'bg-primary text-white' : index < phoneStep ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50',
              ]"
            >
              <CheckCircle2 v-if="index < phoneStep" class="h-4 w-4" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span :class="['truncate text-xs font-semibold transition-colors duration-300', index === phoneStep ? 'text-white' : 'text-white/50']">
              {{ ['Ask', 'We open it', 'Invite'][index] }}
            </span>
          </span>
          <span class="h-1 overflow-hidden rounded-full bg-white/10">
            <span
              class="rail-fill block h-full origin-left rounded-full"
              :style="{ transform: `scaleX(${index < phoneStep ? 1 : index === phoneStep ? phoneP : 0})` }"
            ></span>
          </span>
        </button>
      </div>

      <!-- The step: what it is, then it happening. Swipe the card, or use the
           button, for the next. -->
      <div class="mt-6 overflow-hidden" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
        <Transition :name="`slide-${direction}`" mode="out-in">
          <div :key="phoneStep">
            <p class="text-xs font-bold uppercase tracking-wider text-primary-light">Step {{ phoneStep + 1 }} of {{ STEPS.length }}</p>
            <h3 class="mt-1 text-2xl font-bold">{{ STEPS[phoneStep].title }}</h3>
            <p class="mt-2 min-h-12 text-base leading-relaxed text-white/70">{{ STEPS[phoneStep].body }}</p>
            <!-- As tall as the tallest card, so the buttons below stay put. -->
            <div class="mt-5 min-h-92">
              <HowVisual :step="phoneStep" :p="phoneP" :church="church" :domain="domain" @click="play" />
            </div>
          </div>
        </Transition>
      </div>

      <div class="mt-6 flex items-center gap-3">
        <!-- Back is there only once there is somewhere to go back to, so the
             first step's button spans the whole row rather than leaving a gap. -->
        <button
          v-if="phoneStep > 0"
          type="button"
          aria-label="Back a step"
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/10"
          @click="goPhone(phoneStep - 1)"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <button
          v-if="phoneStep < STEPS.length - 1"
          type="button"
          class="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-gray-900 transition-colors hover:bg-gray-100"
          @click="goPhone(phoneStep + 1)"
        >
          Next step
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
        <button
          v-else
          type="button"
          class="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/40 transition-colors hover:bg-primary-hover"
          @click="emit('start')"
        >
          Ask for your church
          <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
      <p class="mt-3 text-center text-xs text-white/40">Swipe the card, or tap a step</p>
    </div>
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

/* A phone's walkthrough turns sideways, the way it was swiped. */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition:
    opacity 0.2s ease,
    translate 0.2s ease;
}

.slide-next-enter-from,
.slide-prev-leave-to {
  opacity: 0;
  translate: 2rem 0;
}

.slide-next-leave-to,
.slide-prev-enter-from {
  opacity: 0;
  translate: -2rem 0;
}

@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-active,
  .slide-next-leave-active,
  .slide-prev-enter-active,
  .slide-prev-leave-active,
  .turn-next-enter-active,
  .turn-next-leave-active,
  .turn-prev-enter-active,
  .turn-prev-leave-active,
  .body {
    transition: none;
  }
}
</style>

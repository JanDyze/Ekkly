<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowRight, Check, HandWaving } from '../../../icons'
import AppArt from '../../common/AppArt.vue'
import ChurchOutside from './ChurchOutside.vue'
import ChurchInside from './ChurchInside.vue'
import SundayNote from './SundayNote.vue'
import { SEATED, VISITOR } from './pews'
import { alongKeys, blend, cameraFor, regionOf, toScreen, viewBoxOf } from './camera'
import { BEATS, INSIDE_KEYS, LENGTH, ORDER, OUTSIDE, SUNDAY_LABEL, WORDS, beatAt, clockAt, lerp, phase, span } from './timeline'

// The front door's Sunday (the second front door, /v2): one service, told by
// the scroll, from the doors opening in the morning to the lights going off
// at night. The section is LENGTH screens tall and its stage is pinned while
// the reader scrolls through it; every picture on the stage is worked out
// from how far they have got (timeline.js), so it plays backwards as well as
// forwards and holds still when they stop.
//
// Beside it (under it, on a phone) is the bulletin: the order of service, the
// church's clock, and for each part what the people still do and what Ekkly
// keeps. The camera frames each part in whatever the bulletin leaves free.

const props = defineProps({
  // The church on the banner and the screen: the visitor's, once named.
  church: { type: String, default: '' },
  // The platform's name, from the console.
  name: { type: String, default: 'Ekkly' },
  // What the main button says and the line under it, as the hero has them.
  call: { type: String, required: true },
  note: { type: Object, default: null },
  // The app names from the console, by key.
  apps: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['start', 'hello'])

const churchName = computed(() => props.church.trim() || 'Grace Fellowship')

/* ------------------------------------------------------------- scrolling */

const root = ref(null)
const panel = ref(null)
const t = ref(0)
const size = reactive({ width: 1280, height: 800, head: 65, phone: false })
const panelBox = reactive({ top: 600, right: 440 })

// Asked for less motion, the camera cuts from part to part instead of flying,
// and each part is shown as it looks finished.
const still = ref(false)

let frame = 0
const read = () => {
  frame = 0
  const box = root.value?.getBoundingClientRect()
  if (!box) return
  const travel = box.height - window.innerHeight
  t.value = travel > 0 ? Math.min(1, Math.max(0, -box.top / travel)) * LENGTH : 0
}
const onScroll = () => {
  if (!frame) frame = requestAnimationFrame(read)
}

const measure = () => {
  size.width = window.innerWidth
  size.height = window.innerHeight
  size.phone = window.innerWidth < 1024
  size.head = document.querySelector('header')?.offsetHeight || 65
  // Measured against the stage rather than the window, so it is right
  // wherever the page happens to be scrolled when it is measured.
  const box = panel.value
  if (box) {
    panelBox.top = box.offsetTop
    panelBox.right = box.offsetLeft + box.offsetWidth
  }
  read()
}

let resizer = null
let motion = null
const onMotion = () => (still.value = !!motion?.matches)

onMounted(async () => {
  motion = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null
  onMotion()
  motion?.addEventListener?.('change', onMotion)
  await nextTick()
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  if (typeof ResizeObserver !== 'undefined' && panel.value) {
    resizer = new ResizeObserver(measure)
    resizer.observe(panel.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', measure)
  motion?.removeEventListener?.('change', onMotion)
  resizer?.disconnect()
  cancelAnimationFrame(frame)
})

const beat = computed(() => beatAt(t.value))
// The time the pictures are drawn at: the scroll itself, or for anyone who
// asked for less motion, the finished look of the part they are in.
const at = computed(() => (still.value ? beat.value.rest : t.value))

/** Scroll to a part of the service, as it looks finished. */
const go = (key) => {
  const target = BEATS.find((item) => item.key === key)
  const box = root.value?.getBoundingClientRect()
  if (!target || !box) return
  const travel = box.height - window.innerHeight
  const top = window.scrollY + box.top + (target.rest / LENGTH) * travel
  window.scrollTo({ top, behavior: still.value ? 'auto' : 'smooth' })
}

/* ---------------------------------------------------------------- camera */

// The part of the screen the pictures are framed in: right of the bulletin on
// a desktop, above it on a phone, and under the header either way.
const free = computed(() => {
  if (size.phone) {
    const y = size.head + 4
    return { x: 8, y, w: size.width - 16, h: Math.max(120, panelBox.top - y - 8) }
  }
  const x = panelBox.right + 24
  const y = size.head + 16
  return { x, y, w: Math.max(200, size.width - x - 24), h: size.height - y - 24 }
})

const outsideAt = (name) => cameraFor(regionOf(OUTSIDE[name], size.phone), free.value)

const outCamera = computed(() => {
  const x = at.value
  if (x < 0.85) return outsideAt('whole')
  if (x < 1.05) return blend(outsideAt('whole'), outsideAt('near'), phase(x, 0.85, 1.05))
  if (x < 9.3) return blend(outsideAt('near'), outsideAt('door'), phase(x, 1.05, 1.6))
  if (x < 9.75) return blend(outsideAt('door'), outsideAt('near'), phase(x, 9.3, 9.75))
  return blend(outsideAt('near'), outsideAt('whole'), phase(x, 9.75, 10.25))
})

// The room as seen through the doorway: as tall as about one and a half
// doorways, centred in it, so it grows more slowly than the church around it
// as the camera comes in — it is further away.
const throughDoor = (camera) => {
  const door = toScreen(camera, 800, 776)
  return { cx: 800, cy: 520, s: (150 * camera.s) / 800, ax: door.x, ay: door.y }
}

const inCamera = computed(() => {
  const x = at.value
  const inside = (time) => alongKeys(INSIDE_KEYS, time, free.value, size.phone)
  if (x < 1) return throughDoor(outCamera.value)
  if (x < 1.6) return blend(throughDoor(outCamera.value), inside(1.6), phase(x, 1, 1.6))
  if (x <= 9.3) return inside(x)
  if (x < 9.9) return blend(inside(9.3), throughDoor(outCamera.value), phase(x, 9.3, 9.9))
  return throughDoor(outCamera.value)
})

const outBox = computed(() => viewBoxOf(outCamera.value, size.width, size.height))
const inBox = computed(() => viewBoxOf(inCamera.value, size.width, size.height))

/* ------------------------------------------------------------ the church */

const outside = computed(() => {
  const x = at.value
  const evening = x > 5
  return {
    opacity: evening ? span(x, 9.3, 9.42) : 1 - span(x, 1.42, 1.58),
    open: evening ? 1 - phase(x, 10.15, 10.5) : phase(x, 0.5, 0.95),
    dusk: phase(x, 9.45, 9.95),
    night: phase(x, 9.9, 10.45),
    walkIn: span(x, 0.05, 1),
    walkOut: span(x, 10, 10.9),
  }
})

const insideShown = computed(() => outside.value.opacity < 1 || outside.value.open > 0)

const scene = computed(() => {
  const x = at.value
  const fill = phase(x, 1.65, 2.75)
  const seated = lerp(6, SEATED, fill) * (1 - phase(x, 8.55, 9.25))
  const worship = phase(x, 3.05, 3.25) * (1 - phase(x, 4.1, 4.3))
  const prayer = phase(x, 5.45, 5.7) * (1 - phase(x, 6.25, 6.45))
  const welcomeEnds = 1 - phase(x, 2.95, 3.1)
  const screen =
    x < 3 ? 'welcome' : x < 4.25 ? 'lyrics' : x < 5.45 ? 'reading' : x < 6.45 ? 'pray' : x < 7.45 ? 'offering' : x < 8.35 ? 'notices' : 'bye'
  return {
    seated,
    count: Math.round(seated),
    stand: Math.min(1, worship + phase(x, 8.35, 8.5)),
    bow: phase(x, 5.5, 5.7) * (1 - phase(x, 6.25, 6.4)),
    dim: Math.max(worship * 0.3, prayer),
    spots: worship,
    band: 1 - phase(x, 4.2, 4.4),
    preacher: phase(x, 4.35, 4.55) * (1 - phase(x, 6.3, 6.5)),
    // The band plays as the reader scrolls, and only then.
    play: x * 9,
    screen,
    lyric: span(x, 3, 4.2) < 0.5 ? 0 : 1,
    basket: x > 6.6 && x < 7.35 ? span(x, 6.6, 7.35) : -1,
    usher: phase(x, 1.5, 1.7) * welcomeEnds,
    visitor: Math.min(1, Math.max(0, seated - VISITOR.rank)) * welcomeEnds,
  }
})

/* --------------------------------------------------------------- bulletin */

const clock = computed(() => clockAt(at.value))
const local = computed(() => (still.value ? 1 : span(t.value, beat.value.from, beat.value.to)))
const words = computed(() => WORDS[beat.value.key] || null)
const step = computed(() => ORDER.indexOf(beat.value.key))

// "9:15", the time each part of the service starts.
const startsAt = (key) => {
  const minutes = BEATS.find((item) => item.key === key).clock[0]
  const hour = Math.floor(minutes / 60)
  return `${((hour + 11) % 12) + 1}:${String(minutes % 60).padStart(2, '0')}`
}

const appName = (key) => props.apps[key] || key
</script>

<template>
  <section
    id="sunday"
    ref="root"
    class="relative"
    :style="{ height: `${(LENGTH + 1) * 100}svh`, marginTop: `-${size.head}px` }"
    :aria-label="`A Sunday with ${name}`"
  >
    <div class="sticky top-0 h-dvh overflow-hidden bg-[var(--sunday-ground)]">
      <ChurchInside v-show="insideShown" class="absolute inset-0 h-full w-full" :view-box="inBox" :scene="scene" :church="churchName" />
      <ChurchOutside
        v-show="outside.opacity > 0"
        class="absolute inset-0 h-full w-full"
        :style="{ opacity: outside.opacity }"
        :view-box="outBox"
        :open="outside.open"
        :dusk="outside.dusk"
        :night="outside.night"
        :walk-in="outside.walkIn"
        :walk-out="outside.walkOut"
      />

      <!-- The bulletin. On a phone it keeps one height from part to part, so
           the picture above it is not reframed every time the words change
           length. -->
      <div
        ref="panel"
        class="absolute inset-x-0 bottom-0 flex min-h-[min(21rem,46dvh)] flex-col lg:min-h-0 rounded-t-2xl border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-gray-900 lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[26rem] lg:rounded-2xl lg:border lg:p-6 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        :style="size.phone ? null : { top: `${size.head + 20}px` }"
      >
        <!-- Its head: the order of service and the church's clock. -->
        <div class="flex items-center justify-between gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <span class="min-w-0 truncate">{{ churchName }} · {{ SUNDAY_LABEL }}</span>
          <span class="shrink-0 tabular-nums text-gray-900 dark:text-white" aria-hidden="true">{{ clock }}</span>
        </div>

        <!-- On a desktop, the order of service down the side, each part a
             way to jump there. -->
        <ol v-if="beat.key !== 'hero' && beat.key !== 'night'" class="mt-4 hidden border-y border-gray-100 py-2 lg:block dark:border-gray-800">
          <li v-for="(key, i) in ORDER" :key="key">
            <button
              type="button"
              :class="[
                'flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                i === step ? 'font-bold text-gray-900 dark:text-white' : i < step ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500',
              ]"
              :aria-current="i === step ? 'step' : undefined"
              @click="go(key)"
            >
              <span class="w-10 shrink-0 tabular-nums text-xs">{{ startsAt(key) }}</span>
              <span class="min-w-0 flex-1 truncate">{{ WORDS[key].label }}</span>
              <Check v-if="i < step" class="h-4 w-4 shrink-0 text-emerald-500" />
              <span v-else-if="i === step" class="h-2 w-2 shrink-0 rounded-full bg-primary dark:bg-primary-light"></span>
            </button>
          </li>
        </ol>

        <div class="relative min-h-0 flex-1 overflow-hidden">
          <Transition :name="still ? '' : 'turn'" mode="out-in">
            <!-- The cover: what the page is, and the way in. -->
            <div v-if="beat.key === 'hero'" key="hero" class="pt-3 lg:flex lg:h-full lg:flex-col lg:justify-center lg:pt-0">
              <h1 class="text-balance text-[1.75rem] font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.6rem]">
                Sunday takes a lot of lists. Let {{ name }} keep them.
              </h1>
              <p class="mt-3 text-sm leading-relaxed text-gray-600 lg:mt-4 lg:text-base dark:text-gray-300">
                Scroll through one Sunday, from the doors opening to the lights going off, and see the work it takes off your church — so your people have more time for the ministry itself.
              </p>
              <div class="mt-4 flex flex-col gap-2 lg:mt-6">
                <button
                  type="button"
                  class="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-white transition-colors hover:bg-primary-hover lg:h-14 lg:self-start"
                  @click="emit('start')"
                >
                  {{ call }}
                  <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <p v-if="note" class="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <component :is="note.icon" :class="['mt-0.5 h-4 w-4 shrink-0', note.mark]" />
                  {{ note.says }}
                </p>
              </div>
              <button
                type="button"
                class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary lg:mt-8 dark:text-primary-light"
                @click="go('doors')"
              >
                <ArrowDown class="h-4 w-4" />
                Scroll, and the doors open
              </button>
            </div>

            <!-- Sunday night: the doors shut and the last call. -->
            <div v-else-if="beat.key === 'night'" key="night" class="pt-3 lg:flex lg:h-full lg:flex-col lg:justify-center lg:pt-0">
              <p class="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light">Sunday night</p>
              <h2 class="mt-2 text-balance text-2xl font-black leading-tight tracking-tight lg:text-4xl">
                The lights go off. The lists are already kept.
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-gray-600 lg:text-base dark:text-gray-300">
                That was one Sunday on {{ name }}. Your church gets its own link, only the apps it needs, and its first month free.
              </p>
              <div class="mt-4 flex flex-col gap-2 lg:mt-6">
                <button
                  type="button"
                  class="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-white transition-colors hover:bg-primary-hover lg:h-14 lg:self-start"
                  @click="emit('start')"
                >
                  Get your church on {{ name }}
                  <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 self-center text-sm font-semibold text-gray-600 underline-offset-4 hover:underline lg:self-start dark:text-gray-300"
                  @click="emit('hello')"
                >
                  <HandWaving class="h-4.5 w-4.5" />
                  Or say hello, we’ll reach out
                </button>
              </div>
            </div>

            <!-- A part of the service. -->
            <div v-else-if="words" :key="beat.key" class="pt-3 lg:pt-5">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                  {{ startsAt(beat.key) }} · {{ words.label }}
                </p>
                <!-- Where they are in the service, on a phone, which has no
                     room for the whole order. -->
                <div class="flex shrink-0 gap-1 lg:hidden" aria-hidden="true">
                  <span
                    v-for="(key, i) in ORDER"
                    :key="key"
                    :class="['h-1.5 rounded-full transition-all', i === step ? 'w-4 bg-primary dark:bg-primary-light' : i < step ? 'w-1.5 bg-gray-400 dark:bg-gray-500' : 'w-1.5 bg-gray-200 dark:bg-gray-700']"
                  ></span>
                </div>
              </div>
              <h2 class="mt-2 text-balance text-lg font-bold leading-snug lg:text-xl">{{ words.title }}</h2>
              <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{{ words.body }}</p>
              <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                <li v-for="key in words.apps" :key="key" class="flex items-center gap-2 text-sm font-semibold">
                  <AppArt :app-key="key" :play="step" class="h-7 w-7 shrink-0" />
                  {{ appName(key) }}
                </li>
              </ul>
              <SundayNote :beat="beat.key" :u="local" :count="scene.count" class="sunday-note mt-4 hidden lg:block" />
            </div>
          </Transition>
        </div>

        <!-- A way past the service, for anyone who came for the price. -->
        <a
          v-if="beat.key !== 'night'"
          href="#plan"
          class="mt-3 hidden self-start text-xs font-semibold text-gray-500 underline-offset-4 hover:underline lg:inline dark:text-gray-400"
        >
          Skip to pricing
        </a>
      </div>
    </div>

    <!-- The whole service in words, for a screen reader, which cannot see
         the pictures change. -->
    <ol class="sr-only">
      <li v-for="key in ORDER" :key="key">{{ startsAt(key) }}, {{ WORDS[key].label }}. {{ WORDS[key].title }} {{ WORDS[key].body }}</li>
    </ol>
  </section>
</template>

<style scoped>
/* What shows outside the drawings, should a camera ever see past an edge:
   the inside's back wall. */
section {
  --sunday-ground: #f6eedf;
}

/* A part of the service gives way to the next like a page of the bulletin
   turning over: the old one leaves to the left, the new one comes in from
   the right. Short, because the reader is still scrolling. */
.turn-enter-active,
.turn-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.turn-enter-from {
  opacity: 0;
  transform: translateX(1rem);
}
.turn-leave-to {
  opacity: 0;
  transform: translateX(-1rem);
}

/* A short laptop has no room for the sample under the words. */
@media (max-height: 760px) {
  .sunday-note {
    display: none;
  }
}
</style>

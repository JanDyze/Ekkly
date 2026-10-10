<script setup>
import { computed, ref, watch } from 'vue'
import AppArt from '../common/AppArt.vue'
import { APP_DETAILS } from '../frontdoor/appDetails'
import { APPS } from '../../../lib/apps'
import { useScrollLock } from '../../composables/useScrollLock'

// What an app is, shown while its tile on the home of all apps is held, and
// gone the moment the finger lifts (src/views/Apps.vue, usePressAndHold).
//
// The screen opens out of the tile: the church's colour grows from the app's
// plate to fill it, and the plate itself flies up to the middle and grows,
// its artwork playing as it lands. Then the app's name, what is true in it
// right now (the tile's own line), and what a church gets from it — the
// front door's headline and three wins (frontdoor/appDetails.js), kept as
// short as they are there. Letting go runs it all backwards, the plate
// settling back into its tile, so it reads as a look inside rather than a
// place you went.
//
// Nothing in it can be pressed: the finger that opened it is still down on
// the tile underneath, and lifting it is the only way out.

const props = defineProps({
  // The navigation entry of the app being held, or null.
  app: { type: Object, default: null },
  // The tile it was held on, which it opens out of and closes back into.
  from: { type: Object, default: null },
  // The tile's line of what is true inside the app right now.
  line: { type: String, default: '' },
})

// The app and its tile stay drawn while the screen closes, after `app` has
// already gone back to null.
const shown = ref(null)
const origin = ref(null)
const shownLine = ref('')
const plays = ref(0)

watch(
  () => props.app,
  (app) => {
    if (!app) return
    shown.value = app
    origin.value = props.from
    shownLine.value = props.line
    plays.value++
  }
)

useScrollLock(() => !!props.app)

const detail = computed(() => APP_DETAILS[shown.value?.art] || null)
const headline = computed(
  () => detail.value?.headline || APPS.find((a) => a.key === shown.value?.art)?.description || shown.value?.description || ''
)
const wins = computed(() => detail.value?.wins || [])

// Where an app has nothing live to say, the tile's line is its description,
// which would only repeat the headline.
const live = computed(() => {
  const line = shownLine.value
  if (!line || line === shown.value?.description || APPS.some((a) => a.description === line)) return ''
  return line
})

/* ----------------------------------------------------------- the motion */

const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const EASE_IN = 'cubic-bezier(0.4, 0, 0.6, 1)'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The tile's plate, where there is one to open out of. */
const originRect = () => {
  const tile = origin.value
  if (!tile?.isConnected) return null
  return (tile.querySelector('[data-art-plate]') || tile).getBoundingClientRect()
}

/**
 * The two shapes everything moves between: the screen as a circle drawn
 * round the tile's plate, and the screen whole; the plate at the tile's size
 * and place, and the plate where it stands here.
 */
const frames = (el, from) => {
  const plate = el.querySelector('[data-peek-plate]').getBoundingClientRect()
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  const reach = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy))
  const dx = cx - (plate.left + plate.width / 2)
  const dy = cy - (plate.top + plate.height / 2)
  return {
    small: `circle(${from.width * 0.72}px at ${cx}px ${cy}px)`,
    whole: `circle(${reach}px at ${cx}px ${cy}px)`,
    tile: `translate(${dx}px, ${dy}px) scale(${from.width / plate.width})`,
  }
}

const settled = (animations) => Promise.allSettled(animations.map((a) => a.finished))

const onEnter = (el, done) => {
  const from = originRect()
  if (reduced() || !from) {
    settled([el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 })]).then(done)
    return
  }
  const f = frames(el, from)
  const plate = el.querySelector('[data-peek-plate]')
  settled([
    el.animate([{ clipPath: f.small }, { clipPath: f.whole }], { duration: 460, easing: EASE_OUT }),
    plate.animate([{ transform: f.tile }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.08)' }),
  ]).then(done)
}

const onLeave = (el, done) => {
  const from = originRect()
  if (reduced() || !from) {
    settled([el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' })]).then(done)
    return
  }
  const f = frames(el, from)
  const plate = el.querySelector('[data-peek-plate]')
  settled([
    ...[...el.querySelectorAll('[data-peek-words]')].map((words) =>
      words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
    ),
    el.animate([{ clipPath: f.whole }, { clipPath: f.small }, { clipPath: f.small, opacity: 0 }], { duration: 340, easing: EASE_IN, fill: 'forwards' }),
    plate.animate([{ transform: 'none' }, { transform: f.tile }], { duration: 320, easing: EASE_IN, fill: 'forwards' }),
  ]).then(done)
}
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div
        v-if="app && shown"
        aria-hidden="true"
        class="app-peek fixed inset-0 z-100 flex select-none flex-col items-center justify-center overflow-hidden px-6 pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white"
      >
        <!-- Light through an arched window, the outline of Ekkly's mark
             (BRAND.md: the window is the motif), as on the home's day card. -->
        <svg class="pointer-events-none absolute -bottom-24 left-1/2 h-[34rem] w-80 -translate-x-1/2" viewBox="0 0 144 240" fill="none">
          <defs>
            <linearGradient id="peek-arch-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="white" stop-opacity="0.16" />
              <stop offset="0.75" stop-color="white" stop-opacity="0.03" />
              <stop offset="1" stop-color="white" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M4 72a68 68 0 0 1 136 0V240H4Z" fill="url(#peek-arch-light)" />
          <path d="M4 72a68 68 0 0 1 136 0V240H4Z" stroke="white" stroke-opacity="0.12" stroke-width="1" />
        </svg>

        <div class="relative flex w-full max-w-sm flex-col items-center text-center">
          <span
            data-peek-plate
            class="flex size-28 items-center justify-center rounded-[30px] bg-linear-to-b from-white to-gray-50 shadow-2xl shadow-black/25 ring-1 ring-white/60 dark:from-gray-600 dark:to-gray-700 dark:ring-gray-500/40"
          >
            <AppArt :app-key="shown.art" :play="plays" class="size-20" />
          </span>

          <div data-peek-words class="flex w-full flex-col items-center">
            <h2 class="peek-in mt-6 text-3xl font-bold leading-tight" style="--d: 160ms">{{ shown.name }}</h2>
            <p v-if="live" class="peek-in mt-2.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold" style="--d: 200ms">
              {{ live }}
            </p>
            <p class="peek-in mt-4 text-lg leading-snug text-white/90" style="--d: 240ms">{{ headline }}</p>

            <ul v-if="wins.length" class="mt-7 flex w-full flex-col gap-2 text-left">
              <li
                v-for="(win, index) in wins"
                :key="win.text"
                class="peek-in flex items-center gap-3 rounded-2xl bg-white/10 p-3"
                :style="{ '--d': `${320 + index * 70}ms` }"
              >
                <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <component :is="win.icon" class="size-5" />
                </span>
                <span class="text-[15px] font-medium leading-snug">{{ win.text }}</span>
              </li>
            </ul>
          </div>
        </div>

        <p
          data-peek-words
          class="peek-in absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs font-medium text-white/65"
          style="--d: 600ms"
        >
          Let go to come back
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* The church's colour, lit from one corner, as the drawer's spotlight is. */
.app-peek {
  background-color: var(--color-primary);
  background-image:
    radial-gradient(110% 80% at 100% 0%, color-mix(in oklab, white 22%, transparent), transparent 55%),
    radial-gradient(90% 70% at 0% 100%, color-mix(in oklab, black 24%, transparent), transparent 60%);
}

.dark .app-peek {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

/* Each line rises in after the plate has landed, in reading order. */
.peek-in {
  animation: app-rise 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--d, 0ms);
}

@media (prefers-reduced-motion: reduce) {
  .peek-in {
    animation: none;
  }
}
</style>

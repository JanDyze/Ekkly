<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import { APP_DETAILS } from '../frontdoor/appDetails'
import { APPS } from '../../../lib/apps'
import { useScrollLock } from '../../composables/useScrollLock'
import { usePermissions } from '../../composables/usePermissions'
import { hueOf } from '../../data/appHues'

// What an app is, shown while its tile on the home of all apps is held, and
// gone the moment the finger lifts (src/views/Apps.vue, usePressAndHold).
//
// The screen opens out of the tile: the app's own colour (data/appHues.js,
// the one its card on the home wears) grows from its picture to fill the
// screen, and the picture flies up to the middle and grows, its artwork
// playing as it lands. Then the app's name, what is true in it right now
// (the tile's own line), one line on what it is for, and what is inside it:
// its sections, each with its own drawing, as its home lays them out — a look
// inside rather than a pitch. An app with no sections of its own yet shows
// the front door's three wins instead (frontdoor/appDetails.js). Letting go runs it all backwards, the plate
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

// The app's sections, from its routes: one step in (meta.depth 1), named
// (meta.title), with a drawing (meta.art), and open to this person.
const router = useRouter()
const { can } = usePermissions()
const sections = computed(() => {
  const base = shown.value?.path
  if (!base) return []
  return router
    .getRoutes()
    .filter(
      (r) =>
        r.path.startsWith(`${base}/`) &&
        // An optional part of the address (the book's month) is still the
        // section; one that must be filled in is a step further in.
        !r.path.replace(/:\w+(\([^)]*\))?\?/g, '').includes(':') &&
        r.meta?.depth === 1 &&
        r.meta?.title &&
        r.meta?.art &&
        (!r.meta.capability || can(r.meta.capability))
    )
    .map((r) => ({ path: r.path, title: r.meta.title, art: r.meta.art }))
})

const hue = computed(() => hueOf(shown.value?.art))

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
        :style="{ '--hue': hue }"
        class="app-peek fixed inset-0 z-100 flex select-none flex-col items-center justify-center overflow-hidden px-6 pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white"
      >
        <!-- Ekkly's panes of light in the corner, the same shapes as in the
             home's sky (HomeScene), so holding an app feels like a look
             through the same window. Not the arch that used to stand here: an
             arch running off the foot of the screen read as a door, and its
             outline showed through the section tiles. -->
        <svg class="pointer-events-none absolute left-0 top-0 h-[60%] w-[75%] max-w-md" viewBox="0 0 338 522" preserveAspectRatio="xMinYMin meet" aria-hidden="true">
          <path d="M0 0H338V285C338 345 300 385 240 415L0 522Z" fill="white" fill-opacity="0.05" />
          <path d="M123 163L297 0H338V285C338 345 300 385 240 415L123 468Z" fill="white" fill-opacity="0.08" />
          <path d="M0 0H113V165L0 232Z" fill="white" fill-opacity="0.06" />
        </svg>

        <div class="relative flex w-full max-w-sm flex-col items-center text-center">
          <!-- Two fine rings round the picture: lines, not a glow, so it reads
               as the centre of the screen rather than lit from behind. -->
          <span class="pointer-events-none absolute left-1/2 top-14 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" aria-hidden="true" />
          <span class="pointer-events-none absolute left-1/2 top-14 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8" aria-hidden="true" />
          <span
            data-peek-plate
            class="flex size-28 items-center justify-center rounded-[30px] bg-white ring-1 ring-white/60 dark:bg-gray-700 dark:ring-gray-500/40"
          >
            <AppArt :app-key="shown.art" :play="plays" class="size-20" />
          </span>

          <div data-peek-words class="flex w-full flex-col items-center">
            <h2 class="peek-in mt-6 text-3xl font-bold leading-tight" style="--d: 160ms">{{ shown.name }}</h2>
            <p v-if="live" class="peek-in mt-2.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold" style="--d: 200ms">
              {{ live }}
            </p>
            <p class="peek-in mt-3 text-base leading-snug text-white/85" style="--d: 240ms">{{ headline }}</p>

            <!-- What is inside: its sections, each with its own drawing. -->
            <div v-if="sections.length" class="mt-7 w-full">
              <p class="peek-in mb-2 text-left text-xs font-semibold uppercase tracking-wider text-white/60" style="--d: 300ms">Inside</p>
              <ul class="grid grid-cols-3 gap-2">
                <li
                  v-for="(section, index) in sections"
                  :key="section.path"
                  class="peek-in flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-white/12 px-1.5 py-3"
                  :style="{ '--d': `${320 + index * 45}ms` }"
                >
                  <span class="flex size-10 items-center justify-center rounded-xl bg-white/90">
                    <AppArt :app-key="section.art" flat class="peek-hue size-7" />
                  </span>
                  <span class="w-full truncate text-xs font-semibold">{{ section.title }}</span>
                </li>
              </ul>
            </div>

            <ul v-else-if="wins.length" class="mt-7 flex w-full flex-col gap-2 text-left">
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
/* The app's own colour, deepened so white reads on it however light the
   colour is, lit from one corner as the drawer's spotlight is. */
.app-peek {
  background-color: color-mix(in oklab, var(--hue) 62%, black);
  background-image:
    radial-gradient(110% 80% at 100% 0%, color-mix(in oklab, white 22%, transparent), transparent 55%),
    radial-gradient(90% 70% at 0% 100%, color-mix(in oklab, black 24%, transparent), transparent 60%);
}

.dark .app-peek {
  background-color: color-mix(in oklab, var(--hue) 52%, black);
}

/* A section's drawing, in the app's own colour on its white chip. */
.peek-hue {
  color: color-mix(in oklab, var(--hue) 85%, black);
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

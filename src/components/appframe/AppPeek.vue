<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowCounterClockwise, CaretUp, Lock, X } from '../../icons'
import AppArt from '../common/AppArt.vue'
import WindowLight from '../common/WindowLight.vue'
import StoryScreen from './stories/StoryScreen.vue'
import { storyOf } from './stories'
import { APP_DETAILS } from '../frontdoor/appDetails'
import { APPS } from '../../../lib/apps'
import { useScrollLock } from '../../composables/useScrollLock'
import { usePermissions } from '../../composables/usePermissions'
import { hueOf } from '../../data/appHues'

// What an app is, shown while its tile on the home of all apps is held
// (src/views/Apps.vue, usePressAndHold).
//
// The screen opens out of the tile: the app's own colour (data/appHues.js,
// the one its card on the home wears) grows from its picture to fill the
// screen, and the picture flies up to its place, its artwork playing as it
// lands. Letting go runs it all backwards, the plate settling back into its
// tile, so it reads as a look inside rather than a place you went.
//
// An app with a story (stories/index.js) plays it: an advert in scenes, one
// after another the way a phone's stories play, a bar for each along the top
// and the app's picture and name under them. Each scene shows one thing the
// app does, happening on a screen drawn like the app's, with a line saying
// what it is. After the last, what the app is for and what is inside it. An
// app with no story yet goes straight to that: its name, what is true in it
// right now (the tile's own line), one line on what it is for, and its
// sections, each with its own drawing — or, with no sections of its own yet,
// the front door's three wins (frontdoor/appDetails.js).
//
// While the finger is down nothing in it can be pressed: the finger is still
// on the tile underneath. Sliding it up keeps the screen open, for anyone who
// wants to watch without holding on (a lock at the foot fills as the finger
// rises, as a voice note's does). Kept open, it can be pressed: a tap on the
// right of a scene skips on, on the left goes back, Close (or Escape) puts it
// away and Open goes into the app.

const props = defineProps({
  // The navigation entry of the app being held, or null.
  app: { type: Object, default: null },
  // The tile it was held on, which it opens out of and closes back into.
  from: { type: Object, default: null },
  // The tile's line of what is true inside the app right now.
  line: { type: String, default: '' },
  // How far the finger has slid since the hold came on (usePressAndHold).
  drag: { type: Object, default: () => ({ dx: 0, dy: 0 }) },
  // What the button at the foot says once the screen is kept open: "Open
  // People" by default; an app not on the church's plan yet asks to be added.
  openLabel: { type: String, default: '' },
})

const emit = defineEmits(['keep', 'close', 'open'])

// The app and its tile stay drawn while the screen closes, after `app` has
// already gone back to null.
const shown = ref(null)
const origin = ref(null)
const shownLine = ref('')
const plays = ref(0)

/* ------------------------------------------------------------ the story */

const story = computed(() => storyOf(shown.value?.art))
const index = ref(0)
// How long the scene showing has played, in ms. It starts below nothing so
// the first scene waits for the screen to finish opening.
const elapsed = ref(0)
const LEAD = 450

const current = computed(() => story.value?.[index.value] || null)
const atEnd = computed(() => !!story.value && index.value >= story.value.length)

let frame = 0
let last = 0
const run = (now) => {
  const scene = current.value
  if (scene) {
    elapsed.value += now - last
    if (elapsed.value >= scene.duration) go(index.value + 1)
  }
  last = now
  frame = requestAnimationFrame(run)
}
const play = () => {
  cancelAnimationFrame(frame)
  index.value = 0
  elapsed.value = -LEAD
  last = performance.now()
  if (story.value) frame = requestAnimationFrame(run)
}
const stop = () => cancelAnimationFrame(frame)
onBeforeUnmount(stop)

const go = (to) => {
  if (!story.value) return
  index.value = Math.max(0, Math.min(to, story.value.length))
  elapsed.value = 0
}

// How full each scene's bar is: the ones gone by full, the one playing as far
// as it has got, the ones to come empty.
const fill = (i) => {
  if (i < index.value) return 1
  if (i > index.value || !current.value) return 0
  return Math.max(0, Math.min(1, elapsed.value / current.value.duration))
}

/* ------------------------------------------------------------- the lock */

// How far up the finger slides to keep the screen, in px, and how far the
// knob travels in its track as it does.
const LOCK_DISTANCE = 96
const KNOB_TRAVEL = 32

const kept = ref(false)
const slide = computed(() => (kept.value ? 0 : Math.max(0, Math.min(1, -(props.drag?.dy || 0) / LOCK_DISTANCE))))

const closeButton = ref(null)
watch(slide, (value) => {
  if (value < 1 || kept.value || !props.app) return
  kept.value = true
  emit('keep')
  nextTick(() => closeButton.value?.focus({ preventScroll: true }))
})

// Kept open, a tap on a scene moves the story: the left third back, the rest
// on. The finger that is still holding never lands here as a tap.
const onStageTap = (event) => {
  if (!kept.value || !story.value) return
  const box = event.currentTarget.getBoundingClientRect()
  const back = event.clientX - box.left < box.width / 3
  go(back ? (atEnd.value ? story.value.length - 1 : index.value - 1) : index.value + 1)
}

const onKey = (event) => {
  if (!kept.value) return
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'ArrowRight') go(index.value + 1)
  else if (event.key === 'ArrowLeft') go(index.value - 1)
}

watch(
  () => props.app,
  (app) => {
    if (!app) {
      stop()
      window.removeEventListener('keydown', onKey)
      return
    }
    shown.value = app
    origin.value = props.from
    shownLine.value = props.line
    plays.value++
    kept.value = false
    play()
    window.addEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

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
        :aria-hidden="kept ? undefined : 'true'"
        :role="kept ? 'dialog' : undefined"
        :aria-modal="kept ? 'true' : undefined"
        :aria-label="kept ? `${shown.name}, what it does` : undefined"
        :style="{ '--hue': hue }"
        class="app-peek fixed inset-0 z-100 flex select-none flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
      >
        <!-- Ekkly's window in the corner, its light falling in toward the
             app, the same window as in the home's sky (HomeScene), so holding
             an app feels like a look through it. Whole and filled, never the
             outlined arch that used to stand here: an arch running off the
             foot of the screen read as a door, and its outline showed through
             the section tiles. -->
        <WindowLight
          mirror
          class="peek-window pointer-events-none absolute left-0 top-[max(0.5rem,env(safe-area-inset-top))] h-auto w-full max-w-md"
        />

        <!-- Kept open, the way out. Without a story it has the corner to
             itself; with one it sits in the story's header instead. -->
        <button
          v-if="kept && !story"
          ref="closeButton"
          type="button"
          class="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex size-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          aria-label="Close"
          @click="emit('close')"
        >
          <X class="size-5" />
        </button>

        <!-- ------------------------------------------------------ the story -->
        <div v-if="story" class="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <!-- A bar for each scene, filling as it plays. -->
          <div data-peek-words class="flex gap-1" aria-hidden="true">
            <span v-for="(scene, i) in story" :key="i" class="h-[3px] flex-1 rounded-full bg-white/30">
              <span class="block h-full origin-left rounded-full bg-white" :style="{ transform: `scaleX(${fill(i)})` }" />
            </span>
          </div>

          <!-- Whose story it is: the app's picture, which flew here from its
               tile, and its name, with what is true in it right now. -->
          <div class="mt-3 flex items-center gap-3">
            <span data-peek-plate class="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-white ring-1 ring-white/60 dark:bg-gray-700 dark:ring-gray-500/40">
              <AppArt :app-key="shown.art" :play="plays" class="size-8" />
            </span>
            <div data-peek-words class="min-w-0 flex-1">
              <p class="truncate text-base font-bold leading-tight">{{ shown.name }}</p>
              <p v-if="live" class="truncate text-xs text-white/75">{{ live }}</p>
            </div>
            <button
              v-if="kept"
              ref="closeButton"
              type="button"
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
              aria-label="Close"
              @click="emit('close')"
            >
              <X class="size-5" />
            </button>
          </div>

          <!-- The scene: what it shows, then the app doing it. -->
          <div data-peek-words class="mt-5 flex min-h-0 flex-1 flex-col" @click="onStageTap">
            <template v-if="current">
              <div :key="`words-${index}`" class="shrink-0">
                <h2 class="peek-in text-[26px] font-bold leading-tight">{{ current.caption }}</h2>
                <p class="peek-in mt-1.5 text-[15px] leading-snug text-white/80" style="--d: 60ms">{{ current.line }}</p>
              </div>
              <StoryScreen class="mt-4">
                <component :is="current.scene" :key="index" />
              </StoryScreen>
            </template>

            <!-- After the last scene: what the app is for and what is inside. -->
            <div v-else class="flex flex-1 flex-col items-center justify-center text-center">
              <span class="peek-in flex size-20 items-center justify-center rounded-[24px] bg-white dark:bg-gray-700">
                <AppArt :app-key="shown.art" :play="plays + index" class="size-14" />
              </span>
              <h2 class="peek-in mt-5 text-3xl font-bold leading-tight" style="--d: 80ms">{{ shown.name }}</h2>
              <p class="peek-in mt-2 text-base leading-snug text-white/85" style="--d: 140ms">{{ headline }}</p>
              <div v-if="sections.length" class="mt-6 w-full max-w-sm">
                <ul class="grid grid-cols-3 gap-2">
                  <li
                    v-for="(section, i) in sections"
                    :key="section.path"
                    class="peek-in flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-white/12 px-1.5 py-3"
                    :style="{ '--d': `${200 + i * 45}ms` }"
                  >
                    <span class="flex size-10 items-center justify-center rounded-xl bg-white/90">
                      <AppArt :app-key="section.art" flat class="peek-hue size-7" />
                    </span>
                    <span class="w-full truncate text-xs font-semibold">{{ section.title }}</span>
                  </li>
                </ul>
              </div>
              <button
                v-if="kept"
                type="button"
                class="peek-in mt-6 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
                style="--d: 400ms"
                @click.stop="go(0)"
              >
                <ArrowCounterClockwise class="size-4" />
                Watch again
              </button>
            </div>
          </div>
        </div>

        <!-- ------------------------------------------- no story: the preview -->
        <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center px-2">
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
                    v-for="(section, i) in sections"
                    :key="section.path"
                    class="peek-in flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-white/12 px-1.5 py-3"
                    :style="{ '--d': `${320 + i * 45}ms` }"
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
                  v-for="(win, i) in wins"
                  :key="win.text"
                  class="peek-in flex items-center gap-3 rounded-2xl bg-white/10 p-3"
                  :style="{ '--d': `${320 + i * 70}ms` }"
                >
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <component :is="win.icon" class="size-5" />
                  </span>
                  <span class="text-[15px] font-medium leading-snug">{{ win.text }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ------------------------------------------------------- the foot -->
        <!-- Held: the lock. Its knob rises with the finger, and reaching the
             lock keeps the screen open. Kept: the way into the app. -->
        <div data-peek-words class="relative mx-auto mt-4 flex h-40 w-full max-w-md shrink-0 flex-col items-center justify-end">
          <div v-if="!kept" class="peek-in flex flex-col items-center" style="--d: 600ms">
            <!-- The lock stands above the track, where the knob is going, so
                 it stays in sight the whole way up and lights as it nears. -->
            <span
              :class="[
                'flex size-9 items-center justify-center rounded-full ring-1',
                slide > 0.6 ? 'peek-hue bg-white ring-white' : 'bg-white/12 text-white/80 ring-white/25',
              ]"
            >
              <Lock class="size-4.5" />
            </span>
            <div class="relative mt-1.5 h-20 w-12 rounded-full bg-white/12 ring-1 ring-white/20">
              <span
                class="peek-hue absolute bottom-1 left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-full bg-white"
                :style="{ transform: `translateY(${-slide * KNOB_TRAVEL}px)` }"
              >
                <CaretUp class="size-5" />
              </span>
            </div>
            <p class="mt-2 text-xs font-semibold text-white/85">Slide up to keep it open</p>
            <p class="text-[11px] text-white/60">or let go to come back</p>
          </div>

          <button
            v-else
            type="button"
            class="peek-hue flex h-12 w-full max-w-xs items-center justify-center rounded-lg bg-white text-base font-semibold transition-colors hover:bg-gray-100"
            @click="emit('open')"
          >
            {{ openLabel || `Open ${shown.name}` }}
          </button>
        </div>
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

/* The window a shade fainter than on a card: it is the whole screen here, and
   the sections' tiles sit over its light. */
.peek-window {
  --window-glass-opacity: 0.12;
  --window-beam-opacity: 0.12;
  --window-cast-opacity: 0.1;
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

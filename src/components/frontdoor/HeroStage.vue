<script setup>
import { computed, markRaw, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ChatCircleDots,
  ClipboardText,
  DeviceMobile,
  GlobeSimple,
  Home,
  MagicWand,
  Monitor,
  MusicNotes,
  Pause,
  Play,
  ProjectorScreen,
  SquaresFour,
} from '../../icons'
import { appIcon } from './appIcons'
import ScaledScreen from './ScaledScreen.vue'
import { prefersStill } from './useSceneTimeline'
import SceneChurches from './scenes/SceneChurches.vue'
import SceneAttendance from './scenes/SceneAttendance.vue'
import SceneWorship from './scenes/SceneWorship.vue'
import ScenePresent from './scenes/ScenePresent.vue'
import SceneMinutes from './scenes/SceneMinutes.vue'
import SceneAssistant from './scenes/SceneAssistant.vue'
import SceneMore from './scenes/SceneMore.vue'

// The front door's hero: a device that plays through the things Ekkly does
// that a spreadsheet and a group chat cannot, one short scene at a time. Each
// scene is a few seconds of the real thing happening — a church getting its own
// address and colour, a head count going in, minutes writing themselves — so a
// visitor sees what it is like before reading a word about it.
//
// It runs twice. First every scene on a phone, which is where most of a church
// uses it, then every scene again on a computer, which is where the office and
// the tech booth work; the device changes shape between the two rather than
// being swapped, so the eye follows it across. Then a last scene for everything
// the tour did not have time for, because six scenes are not the whole app.
//
// The scenes advance on their own while the hero is on screen, and stop when
// the pointer or keyboard focus is on it, when it scrolls away, when the tab is
// hidden, or when someone presses pause. Anyone who has asked their device for
// less motion gets no autoplay: each scene shows finished, and the chips pick
// between them.
//
// Motion here always shows something happening. Nothing idles: no breathing,
// no bobbing, and no button that lifts or grows under the pointer.
//
// Everything on the device is sample data.

const props = defineProps({
  // The address a sample church lives under, such as "ekkly.church".
  domain: { type: String, default: 'ekkly.church' },
  // The apps on sale, for the last scene.
  apps: { type: Array, default: () => [] },
  // The church the visitor named in the welcome. The scenes that name a
  // church use theirs instead of the sample one.
  church: { type: String, default: '' },
})

const emit = defineEmits(['explore'])

// `tab` is the page the phone's bottom bar highlights; a scene without one
// (the assistant, which has its own input) hides the bar.
const SCENES = [
  {
    key: 'churches',
    chip: 'Your address',
    icon: GlobeSimple,
    title: 'Your address, your colours',
    component: markRaw(SceneChurches),
    duration: 7000,
    tab: 0,
  },
  {
    key: 'attendance',
    chip: 'Attendance',
    icon: ClipboardText,
    title: 'Sunday’s count in a minute',
    component: markRaw(SceneAttendance),
    duration: 5500,
    tab: 1,
  },
  {
    key: 'worship',
    chip: 'Worship',
    icon: MusicNotes,
    title: 'Sunday, planned',
    component: markRaw(SceneWorship),
    duration: 6000,
    tab: 2,
  },
  {
    key: 'present',
    chip: 'Present',
    icon: ProjectorScreen,
    title: 'Lyrics, verses and slides on the big screen',
    component: markRaw(ScenePresent),
    duration: 7500,
    tab: 3,
  },
  {
    key: 'minutes',
    chip: 'AI minutes',
    icon: MagicWand,
    title: 'Minutes that write themselves',
    component: markRaw(SceneMinutes),
    duration: 7000,
    tab: 4,
  },
  {
    key: 'assistant',
    chip: 'Ask EKRIS',
    icon: ChatCircleDots,
    title: 'Ask EKRIS about your church',
    component: markRaw(SceneAssistant),
    duration: 7000,
  },
  {
    key: 'more',
    chip: 'And more',
    icon: SquaresFour,
    title: 'And there’s more inside',
    component: markRaw(SceneMore),
    duration: 6500,
    tab: 0,
  },
]

const LAST_FEATURE = SCENES.length - 2
const MORE = SCENES.length - 1

const index = ref(0)
const pass = ref('phone')
const current = computed(() => SCENES[index.value])
const desktop = computed(() => pass.value === 'desktop')

// Each pick gets a fresh run of the scene and of the bar that times it, even a
// pick of the chip that is already showing.
const run = ref(0)
const show = (i, on = pass.value) => {
  index.value = i
  pass.value = on
  run.value++
}

// The tour in order: every scene on a phone, every scene on a computer, then
// what was left out — and round again.
const next = () => {
  if (index.value < LAST_FEATURE) show(index.value + 1)
  else if (index.value > LAST_FEATURE) show(0, 'phone')
  else if (desktop.value) show(MORE)
  else show(0, 'desktop')
}

// The phone's bottom bar.
const TABS = [Home, appIcon('attendance'), appIcon('lineups'), ProjectorScreen, appIcon('minutes')]
const showTabs = computed(() => !desktop.value && current.value.tab !== undefined)

const DEVICES = [
  { key: 'phone', label: 'Phone', icon: DeviceMobile },
  { key: 'desktop', label: 'Computer', icon: Monitor },
]

// Typing a church name is worth seeing, so the tour goes back to the scene
// that shows a church its address and colour.
watch(
  () => props.church.trim(),
  (name, before) => {
    if (name && name !== before && index.value !== 0) show(0)
  }
)

/* ---------------------------------------------------------------- playing */

const still = prefersStill()
const hovered = ref(false)
const focused = ref(false)
const onScreen = ref(true)
const pageHidden = ref(false)
const userPaused = ref(false)

const playing = computed(
  () => !still && !hovered.value && !focused.value && onScreen.value && !pageHidden.value && !userPaused.value
)

const root = ref(null)
let observer = null
const onVisibility = () => (pageHidden.value = document.visibilityState === 'hidden')

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  if (typeof IntersectionObserver === 'undefined' || !root.value) return
  observer = new IntersectionObserver(([entry]) => (onScreen.value = entry.isIntersecting), { threshold: 0.25 })
  observer.observe(root.value)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  observer?.disconnect()
})

// Focus moving between two chips passes through the stage, so only count it as
// leaving when it lands outside.
const onFocusOut = (event) => {
  if (!root.value?.contains(event.relatedTarget)) focused.value = false
}

/* ------------------------------------------------------------------ colour */

// A scene can dress the device in a sample church's colour. The app's own
// utilities read --color-primary, so setting it on the device re-colours every
// bg-primary and text-primary inside without a class changing (see the style
// block, and useBrandTheme for the same trick across the whole app).
const tint = ref(null)
const tintStyle = computed(() =>
  tint.value ? { '--tint-light': tint.value.light, '--tint-dark': tint.value.dark } : null
)
</script>

<template>
  <div
    ref="root"
    class="relative"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
  >
    <div class="stage tint relative mx-auto mt-8 w-full" :class="{ tinted: tint, 'is-desktop': desktop }" :style="tintStyle">
      <!-- Two still rings behind the device, for depth, at every width. On a
           phone-width page they run past the edges of the screen, which the
           page clips. -->
      <div class="rings pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[max(100cqh,100cqw)] w-[max(100cqh,100cqw)]" aria-hidden="true">
        <div class="ring-in absolute inset-0 rounded-full border border-dashed border-gray-300/70 dark:border-gray-700/70"></div>
        <div class="ring-in absolute inset-10 rounded-full border border-gray-200/60 sm:inset-16 dark:border-gray-800/60" style="animation-delay: 150ms"></div>
      </div>

      <!-- The device: a phone, or a monitor for the computer pass. -->
      <div :class="['device absolute left-1/2', desktop ? 'is-desktop' : 'is-phone']">
        <!-- The accent's light, pooled under it. -->
        <div class="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-primary/25 blur-3xl" aria-hidden="true"></div>

        <!-- Its body. The scenes draw the screen. -->
        <div class="frame absolute inset-0 border-10 border-gray-900 bg-gray-50 shadow-2xl shadow-gray-900/25 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/50" aria-hidden="true"></div>

        <!-- A monitor's stand. -->
        <Transition name="fade">
          <div v-if="desktop" class="pointer-events-none absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center" aria-hidden="true">
            <span class="h-6 w-14 bg-linear-to-b from-gray-700 to-gray-500 sm:h-10 sm:w-20 dark:from-gray-700 dark:to-gray-600"></span>
            <span class="h-2 w-32 rounded-t-lg bg-gray-400 sm:h-2.5 sm:w-48 dark:bg-gray-600"></span>
          </div>
        </Transition>

        <Transition name="scene">
          <component
            :is="current.component"
            :key="`${current.key}-${pass}-${run}`"
            :domain="domain"
            :desktop="desktop"
            :apps="apps"
            :church="church"
            @tint="tint = $event"
          />
        </Transition>

        <!-- The phone's own furniture: the status bar at the top and the app's
             bottom bar below. Drawn in the same 272-wide space the scenes are,
             so a bar's columns and its sliding highlight keep their proportions
             however far the phone has been scaled down. -->
        <Transition name="fade">
          <ScaledScreen
            v-if="!desktop"
            :width="272"
            :height="544"
            round="rounded-[2.1rem]"
            ground=""
            class="pointer-events-none z-20"
            aria-hidden="true"
          >
            <div class="absolute inset-x-0 top-0 flex h-8 items-center justify-between px-6 text-[10px] font-semibold text-gray-900 dark:text-white">
              <span class="tabular-nums">9:41</span>
              <span class="absolute left-1/2 top-1.5 h-5 w-18 -translate-x-1/2 rounded-full bg-gray-900 dark:bg-gray-700"></span>
              <span class="flex items-center gap-1">
                <span class="flex items-end gap-px">
                  <span v-for="h in [3, 5, 7, 9]" :key="h" class="w-0.5 rounded-full bg-current" :style="{ height: `${h}px` }"></span>
                </span>
                <span class="ml-1 h-2.5 w-5 rounded-[3px] border border-current p-px"><span class="block h-full w-3/4 rounded-[1px] bg-current"></span></span>
              </span>
            </div>

            <!-- Its highlight slides to the page being shown. -->
            <Transition name="fade">
              <div
                v-if="showTabs"
                class="absolute inset-x-0 bottom-0 border-t border-gray-200/80 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90"
              >
                <div class="relative mx-4 grid h-14 grid-cols-5 items-center pb-1">
                  <span class="tab-highlight absolute left-0 top-2.5 h-9 w-1/5" :style="{ translate: `${current.tab * 100}% 0` }">
                    <span class="mx-auto block h-full w-11 rounded-full bg-primary/10 dark:bg-primary/20"></span>
                  </span>
                  <span
                    v-for="(icon, i) in TABS"
                    :key="i"
                    :class="['relative flex justify-center transition-colors duration-300', i === current.tab ? 'text-primary dark:text-primary-light' : 'text-gray-400']"
                  >
                    <component :is="icon" class="h-5 w-5" />
                  </span>
                </div>
              </div>
            </Transition>
          </ScaledScreen>
        </Transition>
      </div>
    </div>

    <!-- What this scene is showing. -->
    <div class="relative mx-auto mt-6 max-w-sm text-center" aria-live="polite">
      <Transition name="fade" mode="out-in">
        <div :key="current.key">
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ current.title }}</p>
          <button
            v-if="index === MORE"
            type="button"
            class="mt-1.5 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline dark:text-primary-light"
            @click="emit('explore')"
          >
            See everything inside
          </button>
        </div>
      </Transition>
    </div>

    <!-- On a phone, or on a computer: the same scenes, either way. -->
    <div class="mt-4 flex items-center justify-center gap-2">
      <div class="relative flex h-9 items-center rounded-full bg-gray-100 p-0.5 dark:bg-gray-800">
        <span
          class="thumb absolute left-0.5 top-0.5 h-8 w-[calc(50%-0.125rem)] rounded-full bg-white shadow-sm dark:bg-gray-700"
          :style="{ translate: desktop ? '100% 0' : '0 0' }"
          aria-hidden="true"
        ></span>
        <button
          v-for="option in DEVICES"
          :key="option.key"
          type="button"
          :aria-pressed="pass === option.key"
          @click="show(index, option.key)"
          :class="[
            'relative flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-300',
            pass === option.key ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400',
          ]"
        >
          <component :is="option.icon" class="h-4 w-4" />
          {{ option.label }}
        </button>
      </div>

      <button
        v-if="!still"
        type="button"
        @click="userPaused = !userPaused"
        :aria-label="userPaused ? 'Play the tour' : 'Pause the tour'"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:ring-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <Play v-if="userPaused" class="h-4 w-4" />
        <Pause v-else class="h-4 w-4" />
      </button>
    </div>

    <!-- The scenes, to pick from; the chosen one fills as it plays and opens
         out to show its name. -->
    <div class="mt-2 flex items-center justify-center gap-1.5">
      <button
        v-for="(scene, i) in SCENES"
        :key="scene.key"
        type="button"
        :aria-current="i === index ? 'true' : undefined"
        :aria-label="scene.title"
        @click="show(i)"
        :class="[
          'relative flex h-9 items-center overflow-hidden whitespace-nowrap rounded-full px-2.5 text-xs font-semibold transition-colors duration-300',
          i === index
            ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 dark:bg-white dark:text-gray-900'
            : 'bg-white/80 text-gray-600 ring-1 ring-gray-200 backdrop-blur hover:text-gray-900 dark:bg-gray-900/70 dark:text-gray-400 dark:ring-gray-800 dark:hover:text-white',
        ]"
      >
        <component :is="scene.icon" class="h-4 w-4 shrink-0" />
        <!-- The name opens and closes with the chip. There is no room for it
             on a phone, where the caption above names the scene instead. -->
        <span :class="['label hidden sm:grid', i === index ? 'is-open' : '']">
          <span class="overflow-hidden">{{ scene.chip }}</span>
        </span>
        <span
          v-if="i === index && !still"
          :key="run"
          class="progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary dark:bg-primary-light"
          :style="{ animationDuration: `${scene.duration}ms`, animationPlayState: playing ? 'running' : 'paused' }"
          @animationend="next"
        ></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A colour that can be animated: without registering it, a custom property
   jumps from one value to the next instead of blending. */
@property --demo-accent {
  syntax: '<color>';
  inherits: true;
  initial-value: transparent;
}

/* The stage reads the app's real accent; everything inside it reads the demo
   one. They must live on different elements, or --color-primary would be
   defined in terms of itself. */
.tint {
  --real-primary: var(--color-primary);
  --demo-accent: var(--color-primary);
  transition: --demo-accent 0.8s ease;
}

.tint.tinted {
  --demo-accent: var(--tint-light);
}

.dark .tint.tinted {
  --demo-accent: var(--tint-dark);
}

.tint > * {
  --color-primary: var(--demo-accent);
  --color-primary-hover: color-mix(in oklab, var(--demo-accent) 78%, black);
  --color-primary-light: color-mix(in oklab, var(--demo-accent) 60%, white);
}

/* The stage takes its height from the screen, so the whole device is in view
   on a short laptop and a tall phone alike, with a floor below which the
   scenes would be cut off. Everything inside is sized against it. */
.stage {
  height: clamp(26rem, 56dvh, 34rem);
  container-type: size;
  transition: height 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}

/* On a phone-width page a monitor is as wide as the page and so only half as
   tall as a phone; left at a phone's height the stage would leave a wide
   empty band under it. There the stage shrinks to the monitor and its stand,
   which is worked out from the page's width because the width is what sizes
   the monitor. */
@media (max-width: 39.99rem) {
  .stage.is-desktop {
    height: calc((100vw - 2rem) * 0.625 + 4.5rem);
  }
}

/* The device's two shapes. Width, height and corners ease between them; the
   screen inside follows because the scenes are laid out against this box. A
   phone is half as wide as it is tall; a monitor is 16:10, as wide as the
   stage allows, and sits above centre to leave room for its stand. */
.device {
  transition:
    width 0.55s cubic-bezier(0.65, 0, 0.35, 1),
    height 0.55s cubic-bezier(0.65, 0, 0.35, 1),
    top 0.55s cubic-bezier(0.65, 0, 0.35, 1),
    translate 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}

.device.is-phone {
  top: 0;
  translate: -50% 0;
  width: 50cqh;
  height: 100cqh;
}

/* On a phone-width page the monitor sits at the top of its shrunken stage,
   with its stand in the room left below; wider, it sits a little above the
   middle of a full-height stage. */
.device.is-desktop {
  top: 0.5rem;
  translate: -50% 0;
  width: min(34rem, 100cqw);
  height: calc(min(34rem, 100cqw) * 0.625);
}

@media (min-width: 40rem) {
  .device.is-desktop {
    top: 45%;
    translate: -50% -50%;
  }
}

.frame {
  border-radius: 2.75rem;
  transition: border-radius 0.55s cubic-bezier(0.65, 0, 0.35, 1);
  animation: device-in 1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.is-desktop .frame {
  border-radius: 1rem;
}

@keyframes device-in {
  from {
    opacity: 0;
    transform: translateY(2.5rem) rotate(-3deg) scale(0.96);
  }
}

/* The rings do not turn; they open out once behind the device. They are as
   wide as the stage or as tall, whichever is more, so a monitor that fills a
   phone-width page still has one around it, and they resize with the device. */
.rings {
  translate: -50% -50%;
  transition:
    width 0.55s cubic-bezier(0.65, 0, 0.35, 1),
    height 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}

.ring-in {
  animation: ring-in 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes ring-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
}

.tab-highlight,
.thumb {
  transition: translate 0.45s cubic-bezier(0.65, 0, 0.35, 1);
}

/* A chip's name opens out of nothing and folds back in. A column that goes
   from no width to its content's width is the one way to do that without
   knowing how wide the word is. */
.label {
  grid-template-columns: 0fr;
  margin-left: 0;
  transition:
    grid-template-columns 0.5s cubic-bezier(0.65, 0, 0.35, 1),
    margin-left 0.5s cubic-bezier(0.65, 0, 0.35, 1);
}

.label.is-open {
  grid-template-columns: 1fr;
  margin-left: 0.375rem;
}

.progress {
  animation-name: fill;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes fill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* One scene hands over to the next: the old one blurs away as the new one
   comes into focus, waiting long enough for the device to change shape if it
   is going to. */
.scene-enter-active {
  transition: opacity 0.45s ease 0.4s, filter 0.45s ease 0.4s;
}

.scene-leave-active {
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.scene-enter-from,
.scene-leave-to {
  opacity: 0;
  filter: blur(6px);
}

.fade-enter-active {
  transition: opacity 0.3s ease 0.3s;
}

.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .frame,
  .ring-in {
    animation: none;
  }
  .tint,
  .device,
  .label,
  .tab-highlight,
  .thumb {
    transition: none;
  }
}
</style>

<!-- Shared by the scenes, which are separate components and so cannot see
     this file's scoped styles. Prefixed so nothing else on the page matches.
     A scene sets --d on an element to delay its entrance. Every one of these
     plays once and stops. -->
<style>
.fd-rise {
  animation: fd-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms) both;
}

.fd-pop {
  animation: fd-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) var(--d, 0ms) both;
}

.fd-grow {
  transform-origin: bottom;
  animation: fd-grow 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) var(--d, 0ms) both;
}

/* A note beside the phone on a phone-width page. There is only a strip of
   room either side of the phone there, so the note moves out until its own
   edge meets the stage's, covering as little of the screen as the page's width
   allows. The strip is half of what the stage is wider than the phone, and the
   phone is half as wide as the stage is tall. From sm up the scene's own
   placement takes over. */
@media (max-width: 39.99rem) {
  .fd-out-right {
    right: calc(-1 * ((100cqw - 50cqh) / 2 - 0.25rem));
  }

  .fd-out-left {
    left: calc(-1 * ((100cqw - 50cqh) / 2 - 0.25rem));
  }
}

.fd-caret::after {
  content: '';
  display: inline-block;
  width: 1.5px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: currentColor;
  animation: fd-blink 1s steps(1) infinite;
}

@keyframes fd-rise {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

@keyframes fd-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes fd-grow {
  from {
    transform: scaleY(0);
  }
}

@keyframes fd-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fd-rise,
  .fd-pop,
  .fd-grow,
  .fd-caret::after {
    animation: none;
  }
}
</style>

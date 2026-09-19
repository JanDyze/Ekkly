<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { suggestChurchId } from '../../../../lib/churchId.js'
import { Calendar, LockSimple, Palette } from '../../../icons'
import AppArt from '../../common/AppArt.vue'
import AppWindow from '../AppWindow.vue'
import ChurchMark from '../ChurchMark.vue'
import { knownChurch } from '../knownChurches'
import ScaledScreen from '../ScaledScreen.vue'
import FloatNote from '../FloatNote.vue'
import { useSceneTimeline } from '../useSceneTimeline'

// Scene: many churches, each its own. The address bar types one church's
// address after another, and as each arrives the app takes on that church's
// name and colour — the way Ekkly really serves every church from one app.
//
// If the visitor has typed their own church's name into the hero, it is their
// church on the screen instead, at the address it would have, and only the
// colours go round: the same point, made about them.
//
// The last church wears the platform's own accent, so the scene ends where
// the rest of the tour carries on: Grace Fellowship, in Ekkly's colour. The
// others are sample colours, written out here because they stand for other
// churches' choices and must not follow this page's accent; the stage applies
// them.

const props = defineProps({
  domain: { type: String, default: 'ekkly.online' },
  desktop: { type: Boolean, default: false },
  church: { type: String, default: '' },
})

const emit = defineEmits(['tint'])

const CHURCHES = [
  { id: 'livingword', name: 'Living Word', tint: { light: 'oklch(0.58 0.19 25)', dark: 'oklch(0.74 0.14 25)' } },
  { id: 'hope', name: 'Hope Community', tint: { light: 'oklch(0.55 0.2 293)', dark: 'oklch(0.74 0.14 293)' } },
  { id: 'cornerstone', name: 'Cornerstone', tint: { light: 'oklch(0.56 0.12 163)', dark: 'oklch(0.76 0.13 163)' } },
  { id: 'grace', name: 'Grace Fellowship', tint: null },
]

// The home screen's apps, each in its own artwork, under the short name the
// app's home shows.
const TILES = [
  { key: 'members', name: 'People' },
  { key: 'events', name: 'Events' },
  { key: 'attendance', name: 'Attendance' },
  { key: 'lineups', name: 'Schedules' },
  { key: 'minutes', name: 'Minutes' },
  { key: 'finances', name: 'Finances' },
]
const WEEK = [
  { day: 'Wed', what: 'Prayer meeting · 7:00 PM' },
  { day: 'Fri', what: 'Youth fellowship · 6:30 PM' },
  { day: 'Sun', what: 'Worship Service · 9:00 AM' },
]

const visitor = computed(() => props.church.trim())
// A church the front door knows: its logo on the device, and its own colour as
// the one the colours come round to.
const known = computed(() => knownChurch(visitor.value))
const palette = computed(() =>
  known.value ? CHURCHES.map((c, i) => (i === CHURCHES.length - 1 ? { ...c, tint: known.value.tint } : c)) : CHURCHES
)

const church = ref(0)
// Their name and address when they have given one, the sample church's
// otherwise. The colour keeps coming from whichever swatch is showing.
const current = computed(() =>
  visitor.value ? { ...palette.value[church.value], id: suggestChurchId(visitor.value), name: visitor.value } : CHURCHES[church.value]
)
// A sample church wears its made-up logo; the visitor's own church has none.
const logo = computed(() => (visitor.value ? '' : CHURCHES[church.value].id))
const address = ref('')
const shownAddress = computed(() => (visitor.value ? current.value.id : address.value))
const { at, type, erase, still } = useSceneTimeline()

const pick = (i) => {
  church.value = i
  emit('tint', palette.value[i].tint)
}

if (still) {
  address.value = CHURCHES[0].id
  pick(0)
} else {
  let t = type(address, CHURCHES[0].id, 500, 60)
  for (let i = 1; i < CHURCHES.length; i++) {
    t = erase(address, CHURCHES[i - 1].id, t + 700)
    const now = t
    at(now, () => pick(i))
    t = type(address, CHURCHES[i].id, now + 80, 60)
  }
}

// Leaving the scene hands the device back its own colour.
onUnmounted(() => emit('tint', null))

const swatchClass = (c, i) => [
  'swatch rounded-full ring-offset-2 ring-offset-white transition-shadow duration-300 dark:ring-offset-gray-800',
  c.tint ? '' : 'swatch-own',
  i === church.value ? 'ring-2 ring-gray-900 dark:ring-white' : '',
]
const swatchStyle = (c) => (c.tint ? { '--light': c.tint.light, '--dark': c.tint.dark } : null)
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="px-4 pt-12">
        <div class="fd-rise flex items-center gap-2.5">
          <span class="h-9 w-9 shrink-0 text-sm">
            <ChurchMark :church="logo" :initial="current.name[0]" :image="known?.logo || ''" />
          </span>
          <div class="min-w-0">
            <Transition name="swap" mode="out-in">
              <p :key="current.name" class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ current.name }}</p>
            </Transition>
            <p class="text-[11px] text-gray-500 dark:text-gray-400">Good morning, Ana</p>
          </div>
        </div>

        <div class="fd-rise mt-4 rounded-2xl bg-linear-to-br from-primary to-primary-hover p-3.5 text-white shadow-lg shadow-primary/30" style="--d: 120ms">
          <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/75">
            <Calendar class="h-3.5 w-3.5" /> This Sunday
          </p>
          <p class="mt-1 text-sm font-bold">Worship Service · 9:00 AM</p>
          <div class="mt-3 flex items-center justify-between">
            <div class="flex -space-x-2">
              <span v-for="c in ['bg-amber-300', 'bg-orange-300', 'bg-sky-300', 'bg-teal-300']" :key="c" :class="['h-6 w-6 rounded-full border-2 border-white/80', c]"></span>
            </div>
            <span class="text-[11px] font-medium text-white/85">12 serving</span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <div
            v-for="(tile, i) in TILES"
            :key="tile.key"
            class="fd-pop flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-white shadow-sm dark:bg-gray-800"
            :style="{ '--d': `${260 + i * 60}ms` }"
          >
            <AppArt :app-key="tile.key" class="h-8 w-8" />
            <span class="text-[9px] font-semibold leading-tight text-gray-700 dark:text-gray-300">{{ tile.name }}</span>
          </div>
        </div>

        <div class="fd-rise mt-3 flex items-center justify-between rounded-2xl bg-white px-3.5 py-3 shadow-sm dark:bg-gray-800" style="--d: 700ms">
          <span class="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
            <Palette class="h-4 w-4 text-primary dark:text-primary-light" /> Church colour
          </span>
          <span class="flex items-center gap-1.5">
            <span v-for="(c, i) in palette" :key="c.id" :class="[swatchClass(c, i), 'h-4 w-4']" :style="swatchStyle(c)"></span>
          </span>
        </div>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <AppWindow v-else page="Home" :subtitle="`${current.name} · Good morning, Ana`" :logo="logo" :initial="current.name[0]" active="home">
      <div class="grid grid-cols-[1.35fr_1fr] gap-2.5">
        <div class="fd-rise rounded-xl bg-linear-to-br from-primary to-primary-hover p-3 text-white shadow-md shadow-primary/30">
          <p class="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-white/75">
            <Calendar class="h-3 w-3" /> This Sunday
          </p>
          <p class="mt-1 text-[13px] font-bold">Worship Service · 9:00 AM</p>
          <div class="mt-3 flex items-center justify-between">
            <div class="flex -space-x-1.5">
              <span v-for="c in ['bg-amber-300', 'bg-orange-300', 'bg-sky-300', 'bg-teal-300']" :key="c" :class="['h-5 w-5 rounded-full border-2 border-white/80', c]"></span>
            </div>
            <span class="text-[9px] font-medium text-white/85">12 serving</span>
          </div>
        </div>
        <div class="fd-rise rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800" style="--d: 100ms">
          <p class="flex items-center gap-1 text-[10px] font-semibold text-gray-900 dark:text-white">
            <Palette class="h-3.5 w-3.5 text-primary dark:text-primary-light" /> Church colour
          </p>
          <div class="mt-2.5 flex items-center gap-2">
            <span v-for="(c, i) in palette" :key="c.id" :class="[swatchClass(c, i), 'h-5 w-5']" :style="swatchStyle(c)"></span>
          </div>
          <p class="mt-2.5 truncate font-mono text-[9px] text-gray-400">{{ current.id }}.{{ domain }}</p>
        </div>
      </div>

      <div class="mt-2.5 grid grid-cols-6 gap-2">
        <div
          v-for="(tile, i) in TILES"
          :key="tile.key"
          class="fd-pop flex h-15 flex-col items-center justify-center gap-1 rounded-xl bg-white shadow-sm dark:bg-gray-800"
          :style="{ '--d': `${200 + i * 50}ms` }"
        >
          <AppArt :app-key="tile.key" class="h-7 w-7" />
          <span class="truncate text-[8px] font-semibold text-gray-700 dark:text-gray-300">{{ tile.name }}</span>
        </div>
      </div>

      <div class="fd-rise mt-2.5 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800" style="--d: 550ms">
        <p class="text-[10px] font-semibold text-gray-900 dark:text-white">This week</p>
        <div v-for="item in WEEK" :key="item.day" class="mt-1.5 flex items-center gap-2 text-[10px]">
          <span class="w-7 rounded bg-primary/10 py-0.5 text-center text-[8px] font-bold text-primary dark:bg-primary/20 dark:text-primary-light">{{ item.day }}</span>
          <span class="text-gray-600 dark:text-gray-300">{{ item.what }}</span>
        </div>
      </div>
    </AppWindow>

    <!-- The address bar, over the top of the device. -->
    <div class="fd-pop absolute -top-6 left-1/2 z-30 flex h-10 w-60 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3.5 text-sm shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10" style="--d: 250ms">
      <LockSimple class="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span class="min-w-0 truncate font-mono text-[13px] text-gray-500 dark:text-gray-400">
        <span class="fd-caret font-semibold text-primary dark:text-primary-light">{{ shownAddress }}</span>.{{ domain }}
      </span>
    </div>

    <FloatNote :icon="Palette" title="Your colour" body="everywhere in the app" :delay="1100" :class="props.desktop ? '-right-3 sm:-right-8 -bottom-6' : 'fd-out-right sm:-right-36 top-52'" />
    <FloatNote :icon="LockSimple" tone="emerald" title="Records kept apart" body="for each church" :delay="1400" :class="props.desktop ? '-bottom-6 -left-3 sm:-left-10' : 'fd-out-left sm:-left-36 bottom-24'" />
  </div>
</template>

<style scoped>
/* The sample swatches show each church's own colour, light or dark. */
.swatch {
  background-color: var(--light);
}

.dark .swatch {
  background-color: var(--dark);
}

/* The first church wears the platform's accent, read from outside the
   stage's demo colour (see HeroStage). */
.swatch.swatch-own,
.dark .swatch.swatch-own {
  background-color: var(--real-primary);
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  filter: blur(4px);
}
</style>

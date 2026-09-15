<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { CheckCircle, HandTap, Plus, TrendUp } from '../../../icons'
import AppWindow from '../AppWindow.vue'
import ScaledScreen from '../ScaledScreen.vue'
import FloatNote from '../FloatNote.vue'
import { useSceneTimeline } from '../useSceneTimeline'
import { SUNDAY, WEEK_LABELS } from '../sceneDates'

// Scene: Sunday's head count. The count climbs as an usher taps people in, the
// weeks behind it rise into a chart, and it saves. Attendance in Ekkly is a
// count per gathering, not a register of names, and this shows exactly that.

const props = defineProps({
  domain: { type: String, default: '' },
  desktop: { type: Boolean, default: false },
  church: { type: String, default: '' },
})

const TOTAL = 148
const WEEKS = [58, 64, 61, 70, 67, 74, 79, 86]

const count = ref(0)
const saved = ref(false)
const tapping = ref(false)
const { at, still } = useSceneTimeline()

// The count eases in, quick at first and slowing as the last people sit down.
let frame = 0
const climb = (duration) => {
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration)
    count.value = Math.round(TOTAL * (1 - Math.pow(1 - p, 3)))
    if (p < 1) frame = requestAnimationFrame(tick)
    else tapping.value = false
  }
  frame = requestAnimationFrame(tick)
}

if (still) {
  count.value = TOTAL
  saved.value = true
} else {
  at(500, () => {
    tapping.value = true
    climb(1800)
  })
  at(2900, () => (saved.value = true))
}

onUnmounted(() => cancelAnimationFrame(frame))

const done = computed(() => count.value === TOTAL)
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="px-4 pt-12">
        <div class="fd-rise">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Attendance</p>
          <p class="text-sm font-bold text-gray-900 dark:text-white">Worship Service · Sunday 9:00</p>
        </div>

        <div class="fd-rise mt-3 rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-gray-800" style="--d: 100ms">
          <p class="text-6xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white">{{ count }}</p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">present</p>
          <p class="mt-1 h-5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Transition name="fade"><span v-if="done" class="inline-flex items-center gap-1"><TrendUp class="h-3.5 w-3.5" />+12 on last Sunday</span></Transition>
          </p>
          <div class="relative mx-auto mt-3 flex h-14 w-14 items-center justify-center">
            <span v-if="tapping" class="tap-ring absolute inset-0 rounded-full bg-primary/40"></span>
            <span class="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
              <Plus class="h-6 w-6" />
            </span>
          </div>
        </div>

        <div class="fd-rise mt-3 rounded-2xl bg-white p-3.5 shadow-sm dark:bg-gray-800" style="--d: 200ms">
          <p class="text-xs font-semibold text-gray-900 dark:text-white">Last 8 Sundays</p>
          <div class="mt-3 flex h-20 items-end gap-1.5">
            <span
              v-for="(h, i) in WEEKS"
              :key="i"
              :class="['fd-grow flex-1 rounded-t-md', i === WEEKS.length - 1 ? 'bg-primary dark:bg-primary-light' : 'bg-primary/25 dark:bg-primary-light/25']"
              :style="{ height: `${h}%`, '--d': `${400 + i * 70}ms` }"
            ></span>
          </div>
        </div>

        <Transition name="fade">
          <div v-if="saved" class="fd-rise absolute inset-x-4 bottom-20 flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900">
            <CheckCircle class="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
            Saved for {{ SUNDAY }}
          </div>
        </Transition>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <AppWindow v-else page="Attendance" :subtitle="`Worship Service · Sunday ${SUNDAY}`" active="attendance" :church="props.church">
      <div class="grid h-full grid-cols-[160px_1fr] gap-2.5">
        <div class="fd-rise flex flex-col items-center justify-center rounded-xl bg-white p-3 text-center shadow-sm dark:bg-gray-800">
          <p class="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Head count</p>
          <p class="mt-1 text-5xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white">{{ count }}</p>
          <p class="text-[10px] text-gray-500 dark:text-gray-400">present</p>
          <p class="mt-1 h-4 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Transition name="fade"><span v-if="done" class="inline-flex items-center gap-1"><TrendUp class="h-3 w-3" />+12 on last Sunday</span></Transition>
          </p>
          <div class="relative mt-3 flex h-11 w-11 items-center justify-center">
            <span v-if="tapping" class="tap-ring absolute inset-0 rounded-full bg-primary/40"></span>
            <span class="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30">
              <Plus class="h-5 w-5" />
            </span>
          </div>
        </div>

        <div class="fd-rise flex flex-col rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800" style="--d: 120ms">
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-semibold text-gray-900 dark:text-white">Last 8 Sundays</p>
          </div>
          <div class="mt-3 flex flex-1 items-end gap-2.5">
            <div v-for="(h, i) in WEEKS" :key="i" class="flex h-full flex-1 flex-col justify-end">
              <span
                :class="['fd-grow block w-full rounded-t-md', i === WEEKS.length - 1 ? 'bg-primary dark:bg-primary-light' : 'bg-primary/25 dark:bg-primary-light/25']"
                :style="{ height: `${h}%`, '--d': `${300 + i * 60}ms` }"
              ></span>
              <span class="mt-1 text-center text-[8px] text-gray-400">{{ WEEK_LABELS[i] }}</span>
            </div>
          </div>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="saved" class="fd-rise absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-gray-900 px-2.5 py-2 text-[10px] font-semibold text-white shadow-xl dark:bg-white dark:text-gray-900">
          <CheckCircle class="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
          Saved for {{ SUNDAY }}
        </div>
      </Transition>
    </AppWindow>

    <FloatNote :icon="HandTap" title="One tap a person" body="at the door" :delay="900" :class="props.desktop ? '-right-3 sm:-right-8 -top-5' : 'fd-out-left sm:-left-40 top-40'" />
    <FloatNote title="Up 9% this month" :delay="1500" :class="props.desktop ? '-bottom-8 -left-3 sm:-left-10' : 'fd-out-right sm:-right-40 top-72'">
      <svg viewBox="0 0 100 32" class="mt-1 h-6 w-24 overflow-visible text-emerald-500 sm:mt-1.5 sm:h-8 sm:w-32" aria-hidden="true">
        <path class="draw" d="M2 26 L18 22 L32 24 L48 16 L62 18 L78 10 L98 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
      </svg>
    </FloatNote>
  </div>
</template>

<style scoped>
/* A ring spreads from the button with each tap while the count is climbing. */
.tap-ring {
  animation: tap 0.45s ease-out infinite;
}

@keyframes tap {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.7);
  }
}

.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 1.2s cubic-bezier(0.65, 0, 0.35, 1) 1.8s forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tap-ring {
    display: none;
  }
  .draw {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>

<script setup>
import { ref } from 'vue'
import { ArrowRight, CheckCircle, FileText, MagicWand, Sparkle } from '../../../icons'
import AppWindow from '../AppWindow.vue'
import ScaledScreen from '../ScaledScreen.vue'
import FloatNote from '../FloatNote.vue'
import { useSceneTimeline } from '../useSceneTimeline'

// Scene: minutes that write themselves. Rough notes are typed the way anyone
// types in a meeting, the AI button is pressed, a sweep of light passes over,
// and the notes come back as minutes the church can file. On a phone the
// minutes replace the notes; on a computer there is room for both, so the
// notes stay on the left and the minutes arrive beside them.

const props = defineProps({
  domain: { type: String, default: '' },
  desktop: { type: Boolean, default: false },
})

const NOTES = 'youth camp nov 14-16, 25k ok\nben - quotes to repaint hall\nnext mtg oct 5'

const SECTIONS = [
  { label: 'Decided', icon: CheckCircle, tone: 'text-emerald-500', text: 'Youth camp approved for 14–16 November, with a ₱25,000 budget.' },
  { label: 'To do', icon: ArrowRight, tone: 'text-primary dark:text-primary-light', text: 'Ben Cruz to get quotes for repainting the fellowship hall.' },
  { label: 'Next meeting', icon: null, tone: '', text: 'Sunday, 5 October' },
]

const notes = ref('')
const pressed = ref(false)
const sweeping = ref(false)
const written = ref(false)
const filed = ref(false)
const { at, type } = useSceneTimeline()

const typed = type(notes, NOTES, 400, 24)
at(typed + 400, () => (pressed.value = true))
at(typed + 650, () => (sweeping.value = true))
at(typed + 1250, () => (written.value = true))
at(typed + 3000, () => (filed.value = true))
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="px-4 pt-12">
        <div class="fd-rise flex items-center justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Minutes</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">Church board meeting</p>
          </div>
          <FileText class="h-5 w-5 text-gray-400" />
        </div>

        <div class="relative mt-3 overflow-hidden rounded-2xl bg-white p-3.5 shadow-sm dark:bg-gray-800">
          <Transition name="write" mode="out-in">
            <div v-if="!written" key="notes">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Notes</p>
              <p class="fd-caret mt-2 min-h-24 whitespace-pre-line font-mono text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">{{ notes }}</p>
              <div
                :class="[
                  'mt-3 flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white transition-colors duration-200',
                  pressed ? 'bg-primary-hover' : 'bg-primary',
                ]"
              >
                <MagicWand class="h-4 w-4" />
                Write up with AI
              </div>
            </div>

            <div v-else key="minutes" class="space-y-3">
              <div v-for="(section, i) in SECTIONS" :key="section.label" class="fd-rise" :style="{ '--d': `${i * 180}ms` }">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-primary dark:text-primary-light">{{ section.label }}</p>
                <p class="mt-1 flex gap-1.5 text-[11px] leading-snug text-gray-800 dark:text-gray-200">
                  <component :is="section.icon" v-if="section.icon" :class="['mt-px h-3.5 w-3.5 shrink-0', section.tone]" />
                  {{ section.text }}
                </p>
              </div>
            </div>
          </Transition>

          <span v-if="sweeping" class="sweep pointer-events-none absolute inset-0" aria-hidden="true"></span>
        </div>

        <Transition name="write">
          <div v-if="filed" class="fd-rise mt-3 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-xs text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
            <CheckCircle class="h-4 w-4 text-emerald-500" />
            Filed to Minutes · shared with the board
          </div>
        </Transition>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <AppWindow v-else page="Minutes" subtitle="Church board meeting · 14 September" active="minutes">
      <div class="grid h-full grid-cols-2 gap-2.5">
        <div class="flex flex-col rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
          <p class="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Notes</p>
          <p class="fd-caret mt-2 flex-1 whitespace-pre-line font-mono text-[10px] leading-relaxed text-gray-700 dark:text-gray-300">{{ notes }}</p>
          <div
            :class="[
              'mt-2 flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold text-white transition-colors duration-200',
              pressed ? 'bg-primary-hover' : 'bg-primary',
            ]"
          >
            <MagicWand class="h-3.5 w-3.5" />
            Write up with AI
          </div>
        </div>

        <div class="relative overflow-hidden rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
          <div class="flex items-center justify-between">
            <p class="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Minutes</p>
            <Transition name="write">
              <span v-if="filed" class="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle class="h-3 w-3" /> Filed · shared with the board
              </span>
            </Transition>
          </div>
          <Transition name="write" mode="out-in">
            <div v-if="!written" key="waiting" class="mt-3 space-y-2" aria-hidden="true">
              <span v-for="w in ['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-full']" :key="w" :class="['block h-2 rounded-full bg-gray-100 dark:bg-gray-700', w]"></span>
            </div>
            <div v-else key="written" class="mt-2 space-y-2.5">
              <div v-for="(section, i) in SECTIONS" :key="section.label" class="fd-rise" :style="{ '--d': `${i * 180}ms` }">
                <p class="text-[9px] font-semibold uppercase tracking-wider text-primary dark:text-primary-light">{{ section.label }}</p>
                <p class="mt-0.5 flex gap-1.5 text-[10px] leading-snug text-gray-800 dark:text-gray-200">
                  <component :is="section.icon" v-if="section.icon" :class="['mt-px h-3 w-3 shrink-0', section.tone]" />
                  {{ section.text }}
                </p>
              </div>
            </div>
          </Transition>
          <span v-if="sweeping" class="sweep pointer-events-none absolute inset-0" aria-hidden="true"></span>
        </div>
      </div>

    </AppWindow>

    <FloatNote :icon="FileText" title="Type as you talk" body="no tidy notes needed" :delay="700" :class="props.desktop ? '-left-3 sm:-left-10 top-20' : 'fd-out-right sm:-right-36 top-28'" />
    <Transition name="write">
      <FloatNote
        v-if="written"
        :icon="Sparkle"
        tone="violet"
        title="Written up"
        body="in a few seconds"
        :delay="300"
        :class="props.desktop ? '-bottom-6 -right-3 sm:-right-8' : 'fd-out-left sm:-left-40 top-44'"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* A band of the accent's light crosses the card once. */
.sweep {
  background: linear-gradient(
    100deg,
    transparent 20%,
    color-mix(in oklab, var(--color-primary) 25%, transparent) 45%,
    color-mix(in oklab, white 60%, transparent) 50%,
    color-mix(in oklab, var(--color-primary) 25%, transparent) 55%,
    transparent 80%
  );
  transform: translateX(-100%);
  animation: sweep 0.9s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

@keyframes sweep {
  to {
    transform: translateX(100%);
  }
}

.write-enter-active,
.write-leave-active {
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.write-enter-from,
.write-leave-to {
  opacity: 0;
  filter: blur(6px);
}

@media (prefers-reduced-motion: reduce) {
  .sweep {
    display: none;
  }
}
</style>

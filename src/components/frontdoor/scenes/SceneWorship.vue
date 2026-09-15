<script setup>
import { ref } from 'vue'
import { Bell, CheckCircle, MicrophoneStage } from '../../../icons'
import AppWindow from '../AppWindow.vue'
import ScaledScreen from '../ScaledScreen.vue'
import FloatNote from '../FloatNote.vue'
import { useSceneTimeline } from '../useSceneTimeline'
import { SUNDAY, SUNDAY_DAY } from '../sceneDates'

// Scene: a Sunday's lineup. The people serving come in, the songs are listed
// with their keys and played through, and the team is reminded. Putting the
// words on the screen is the next scene's (ScenePresent). All three hymns are
// in the public domain.

const props = defineProps({
  domain: { type: String, default: '' },
  desktop: { type: Boolean, default: false },
  church: { type: String, default: '' },
})

const TEAM = [
  { initials: 'AR', name: 'Ana Reyes', short: 'Ana', role: 'Leads', tone: 'bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
  { initials: 'BC', name: 'Ben Cruz', short: 'Ben', role: 'Keys', tone: 'bg-sky-200 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300' },
  { initials: 'CS', name: 'Carla Santos', short: 'Carla', role: 'Sound', tone: 'bg-teal-200 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300' },
]

const SONGS = [
  { title: 'Holy, Holy, Holy', key: 'D', lead: 'Ana' },
  { title: 'Amazing Grace', key: 'G', lead: 'Ana' },
  { title: 'Blessed Assurance', key: 'D', lead: 'Ben' },
]

const playing = ref(-1)
const reminded = ref(false)
const { at } = useSceneTimeline()

at(1200, () => (playing.value = 0))
at(2500, () => (playing.value = 1))
at(3800, () => (playing.value = 2))
at(4300, () => (reminded.value = true))
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="px-4 pt-12">
        <div class="fd-rise">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Schedule</p>
          <p class="text-sm font-bold text-gray-900 dark:text-white">Sunday {{ SUNDAY_DAY }} · Worship Service</p>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <div
            v-for="(person, i) in TEAM"
            :key="person.name"
            class="fd-pop flex flex-col items-center rounded-2xl bg-white px-1 py-2.5 shadow-sm dark:bg-gray-800"
            :style="{ '--d': `${150 + i * 110}ms` }"
          >
            <span :class="['flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold', person.tone]">{{ person.initials }}</span>
            <span class="mt-1.5 text-[11px] font-semibold text-gray-900 dark:text-white">{{ person.short }}</span>
            <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ person.role }}</span>
          </div>
        </div>

        <div class="fd-rise mt-3 space-y-1 rounded-2xl bg-white p-2 shadow-sm dark:bg-gray-800" style="--d: 500ms">
          <p class="px-1.5 pb-1 pt-1 text-xs font-semibold text-gray-900 dark:text-white">Songs</p>
          <div
            v-for="(song, i) in SONGS"
            :key="song.title"
            :class="['flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-300', playing === i ? 'bg-primary/10 dark:bg-primary/20' : '']"
          >
            <span
              :class="[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors duration-300',
                playing === i ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
              ]"
            >{{ song.key }}</span>
            <span :class="['min-w-0 flex-1 truncate text-xs', playing === i ? 'font-semibold text-primary dark:text-primary-light' : 'text-gray-700 dark:text-gray-300']">{{ song.title }}</span>
            <span v-if="playing === i" class="flex h-3.5 items-end gap-0.5 text-primary dark:text-primary-light" aria-hidden="true">
              <span v-for="n in 3" :key="n" class="eq w-0.5 rounded-full bg-current" :style="{ animationDelay: `${n * 120}ms` }"></span>
            </span>
          </div>
        </div>

        <div class="fd-rise mt-3 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 shadow-sm dark:bg-gray-800" style="--d: 650ms">
          <MicrophoneStage class="h-4 w-4 text-primary dark:text-primary-light" />
          <span class="flex-1 text-xs text-gray-600 dark:text-gray-300">12 serving</span>
          <Transition name="fade" mode="out-in">
            <span v-if="reminded" class="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle class="h-3.5 w-3.5" /> Reminded
            </span>
            <span v-else class="text-[11px] text-gray-400">Sending…</span>
          </Transition>
        </div>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <AppWindow v-else page="Schedules" :subtitle="`Sunday ${SUNDAY} · Worship Service`" active="lineups" :church="props.church">
      <div class="grid h-full grid-cols-[150px_1fr] gap-2.5">
        <div class="fd-rise flex flex-col rounded-xl bg-white p-2.5 shadow-sm dark:bg-gray-800">
          <p class="px-1 text-[10px] font-semibold text-gray-900 dark:text-white">Serving</p>
          <div
            v-for="(person, i) in TEAM"
            :key="person.name"
            class="fd-rise mt-2 flex items-center gap-2 px-1"
            :style="{ '--d': `${150 + i * 100}ms` }"
          >
            <span :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold', person.tone]">{{ person.initials }}</span>
            <span class="min-w-0">
              <span class="block truncate text-[10px] font-semibold text-gray-900 dark:text-white">{{ person.name }}</span>
              <span class="block text-[9px] text-gray-500 dark:text-gray-400">{{ person.role }}</span>
            </span>
          </div>
          <div class="mt-auto flex items-center gap-1.5 border-t border-gray-100 px-1 pt-2 text-[9px] dark:border-gray-700">
            <Transition name="fade" mode="out-in">
              <span v-if="reminded" class="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle class="h-3 w-3" /> 12 reminded
              </span>
              <span v-else class="text-gray-400">Sending reminders…</span>
            </Transition>
          </div>
        </div>

        <div class="fd-rise rounded-xl bg-white p-2.5 shadow-sm dark:bg-gray-800" style="--d: 150ms">
          <div class="grid grid-cols-[36px_1fr_60px] px-2 pb-1.5 text-[8px] font-bold uppercase tracking-wider text-gray-400">
            <span>Key</span><span>Song</span><span>Leads</span>
          </div>
          <div
            v-for="(song, i) in SONGS"
            :key="song.title"
            :class="['grid grid-cols-[36px_1fr_60px] items-center rounded-lg px-2 py-2 transition-colors duration-300', playing === i ? 'bg-primary/10 dark:bg-primary/20' : '']"
          >
            <span
              :class="[
                'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold transition-colors duration-300',
                playing === i ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
              ]"
            >{{ song.key }}</span>
            <span :class="['flex items-center gap-2 truncate text-[11px]', playing === i ? 'font-semibold text-primary dark:text-primary-light' : 'text-gray-700 dark:text-gray-300']">
              {{ song.title }}
              <span v-if="playing === i" class="flex h-3 items-end gap-0.5" aria-hidden="true">
                <span v-for="n in 3" :key="n" class="eq w-0.5 rounded-full bg-current" :style="{ animationDelay: `${n * 120}ms` }"></span>
              </span>
            </span>
            <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ song.lead }}</span>
          </div>
        </div>
      </div>
    </AppWindow>

    <FloatNote :icon="MicrophoneStage" tone="amber" title="Keys for the band" body="set once, on every song" :delay="900" :class="props.desktop ? '-right-3 sm:-right-8 top-24' : 'fd-out-right sm:-right-40 top-40'" />
    <Transition name="fade">
      <FloatNote
        v-if="reminded"
        :icon="Bell"
        title="Team reminded"
        body="by notification and email"
        :class="props.desktop ? '-bottom-6 -left-3 sm:-left-10' : 'fd-out-left sm:-left-40 bottom-16'"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* A small level meter beside the song that is being sung. */
.eq {
  height: 30%;
  animation: eq 0.8s ease-in-out infinite alternate;
}

@keyframes eq {
  to {
    height: 100%;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease, filter 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .eq {
    animation: none;
    height: 70%;
  }
}
</style>

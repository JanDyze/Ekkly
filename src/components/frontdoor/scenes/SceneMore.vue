<script setup>
import { computed } from 'vue'
import { Plus, SquaresFour } from '../../../icons'
import AppArt from '../AppArt.vue'
import AppWindow from '../AppWindow.vue'
import ScaledScreen from '../ScaledScreen.vue'
import FloatNote from '../FloatNote.vue'

// The last scene: what the tour did not show. The apps a church can switch on
// come from the console (Apps & prices), so this list is whatever is actually
// on sale, less the ones the earlier scenes already walked through.

const props = defineProps({
  domain: { type: String, default: '' },
  desktop: { type: Boolean, default: false },
  apps: { type: Array, default: () => [] },
  church: { type: String, default: '' },
})

const churchName = computed(() => props.church.trim() || 'Grace Fellowship')

// Already shown, in their own scene: the worship scene has the song list in
// it. People is on every church's home, so it leads the rest.
const SHOWN = ['attendance', 'songs', 'lineups', 'minutes', 'ai']

// A church that has no catalogue yet still gets a sensible list.
const FALLBACK = [
  { key: 'members', name: 'People' },
  { key: 'events', name: 'Events' },
  { key: 'smallgroups', name: 'Small Groups' },
  { key: 'bible', name: 'Bible' },
  { key: 'prayer', name: 'Prayer Concerns' },
  { key: 'finances', name: 'Finances' },
  { key: 'tasks', name: 'Tasks' },
  { key: 'gallery', name: 'Gallery' },
  { key: 'links', name: 'Links' },
]

const rest = computed(() => {
  const offered = props.apps.filter((app) => !SHOWN.includes(app.key))
  return (offered.length ? offered : FALLBACK).slice(0, 9)
})
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="px-4 pt-12">
        <div class="fd-rise">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Apps</p>
          <p class="text-sm font-bold text-gray-900 dark:text-white">And the rest of it</p>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <div
            v-for="(app, i) in rest"
            :key="app.key"
            class="fd-pop flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-white p-1 text-center shadow-sm dark:bg-gray-800"
            :style="{ '--d': `${120 + i * 80}ms` }"
          >
            <AppArt :app-key="app.key" class="h-8 w-8" />
            <span class="text-[9px] font-semibold leading-tight text-gray-700 dark:text-gray-300">{{ app.name }}</span>
          </div>
        </div>

        <div class="fd-rise mt-3 flex items-center gap-2 rounded-2xl bg-primary/10 px-3.5 py-3 dark:bg-primary/20" style="--d: 900ms">
          <Plus class="h-4 w-4 text-primary dark:text-primary-light" />
          <span class="text-xs font-semibold text-primary dark:text-primary-light">Switch on what your church needs</span>
        </div>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <AppWindow
      v-else
      page="Apps"
      :subtitle="`${churchName} · switch on what you need`"
      :logo="props.church.trim() ? '' : 'grace'"
      :initial="churchName[0]"
      active="apps"
    >
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="(app, i) in rest"
          :key="app.key"
          class="fd-pop flex h-15 items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm dark:bg-gray-800"
          :style="{ '--d': `${120 + i * 70}ms` }"
        >
          <AppArt :app-key="app.key" class="h-8 w-8 shrink-0" />
          <span class="truncate text-[10px] font-semibold text-gray-900 dark:text-white">{{ app.name }}</span>
        </div>
      </div>

      <div class="fd-rise mt-2.5 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 dark:bg-primary/20" style="--d: 800ms">
        <Plus class="h-3.5 w-3.5 text-primary dark:text-primary-light" />
        <span class="text-[10px] font-semibold text-primary dark:text-primary-light">Add or drop any of them from Settings, any month</span>
      </div>
    </AppWindow>

    <FloatNote
      :icon="SquaresFour"
      title="Pay for what you use"
      body="not for the whole of Ekkly"
      :delay="1000"
      :class="props.desktop ? '-bottom-6 -right-3 sm:-right-8' : 'fd-out-right sm:-right-40 top-44'"
    />
  </div>
</template>

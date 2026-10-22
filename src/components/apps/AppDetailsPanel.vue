<script setup>
import { computed } from 'vue'
import { ArrowRight, Plus, Star, StarFill } from '../../icons'
import AppArt from '../common/AppArt.vue'
import AppStoryPlayer from './AppStoryPlayer.vue'
import { storyOf } from '../appframe/stories'
import { hueOf } from '../../data/appHues'

// One app's page, for the All apps page (AllApps.vue): picked from its grid,
// before it is opened. Laid out as an app store lays out an app, and dressed
// in the app's own colour (appHues.js, the colour its tile wears on the home)
// so each app's page looks like that app's rather than a form:
//
//   1. The app on its colour: its picture large on its white plate, its
//      name, what it is for in a few words, its group, and the one button.
//   2. What it does, shown rather than told: its story playing
//      (AppStoryPlayer, the commercial holding its tile plays full screen) on
//      a stage of the same colour, paler; its artwork large there where it has
//      no story yet.
//   3. In Ekkly's own words (frontdoor/appDetails.js): its headline, its three
//      practical wins as three small cards, and what it is.
//
// The colours are Ekkly's, fixed like the artwork, never the church's: the
// church's colour is the buttons'. Flat, as every card is: tints and a
// hairline, no shadow.
//
// `fill`, on a desktop: the panel is the height of the page and nothing in it
// scrolls; the story takes whatever room is left and its screen scales to it.
// On a phone, in a sheet from the foot, the story has a height of its own.

const props = defineProps({
  // { name, art, tagline, headline, wins, description, group, forSale }
  app: { type: Object, required: true },
  // A small label over the name: "Today's pick", when nothing was chosen.
  kicker: { type: String, default: '' },
  onHome: { type: Boolean, default: false },
  // Putting it on the home is underway (the shelf is asking which to swap).
  pinning: { type: Boolean, default: false },
  fill: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'pin', 'add'])

const hasStory = computed(() => Boolean(storyOf(props.app.art)?.length))

// The app's colour, as tints of it — the header's, and the stage's paler —
// and as an ink for words and icons drawn in it.
//
// On a dark page the tints are mixed into the panel's own grey (gray-800),
// not the page's darker one, or the header and the stage read as holes cut
// in the card. The ink is the colour taken down toward black on a light page
// and up toward white on a dark one, so it reads on its own tint either way:
// the apps' amber was faint on a pale amber, and their navy all but vanished
// on a dark panel.
const hue = computed(() => hueOf(props.app.art))
const tints = computed(() => ({
  '--app-tint': `color-mix(in oklab, ${hue.value} 14%, white)`,
  '--app-wash': `color-mix(in oklab, ${hue.value} 7%, white)`,
  '--app-ink': `color-mix(in oklab, ${hue.value} 72%, black)`,
  '--app-tint-dark': `color-mix(in oklab, ${hue.value} 26%, rgb(31 41 55))`,
  '--app-wash-dark': `color-mix(in oklab, ${hue.value} 12%, rgb(31 41 55))`,
  '--app-ink-dark': `color-mix(in oklab, ${hue.value} 55%, white)`,
}))

const PLATED = 'grid shrink-0 place-items-center bg-white ring-1 ring-black/5 dark:bg-gray-700 dark:ring-white/15'
const PRIMARY = 'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover'
</script>

<template>
  <div :class="fill ? 'flex h-full min-h-0 flex-col' : 'flex flex-col'" :style="tints">
    <!-- 1. The app, on its colour, and the one thing to do with it. -->
    <div class="app-tint shrink-0 rounded-2xl p-4">
      <div class="flex items-center gap-3.5">
        <span :class="[PLATED, 'size-16 rounded-[20px]']">
          <AppArt :app-key="app.art" :play="1" class="size-12" />
        </span>
        <div class="min-w-0 flex-1">
          <p v-if="kicker" class="text-[11px] font-bold uppercase tracking-wide app-ink">{{ kicker }}</p>
          <h2 class="truncate text-xl font-bold leading-tight text-gray-900 dark:text-white">{{ app.name }}</h2>
          <p v-if="app.tagline" class="truncate text-sm text-gray-600 dark:text-gray-300">{{ app.tagline }}</p>
          <p v-if="app.group" class="mt-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {{ app.group }}
          </p>
        </div>
      </div>
      <div class="mt-3.5 flex flex-wrap items-center gap-2">
        <button v-if="app.forSale" type="button" :class="PRIMARY" @click="emit('add')">
          <Plus class="size-4" />
          Add to your plan
        </button>
        <template v-else>
          <button type="button" :class="PRIMARY" @click="emit('open')">
            Open {{ app.name }}
            <ArrowRight class="size-4" />
          </button>
          <span v-if="onHome" class="inline-flex h-10 items-center gap-1.5 px-2 text-sm font-semibold app-ink">
            <StarFill class="size-4" />
            On your home
          </span>
          <button
            v-else
            type="button"
            :class="[
              'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
              pinning
                ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                : 'bg-white/80 text-gray-800 hover:bg-white dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/15',
            ]"
            @click="emit('pin')"
          >
            <Star class="size-4" />
            {{ pinning ? 'Choose one to swap out' : 'Put on your home' }}
          </button>
        </template>
      </div>
    </div>

    <p v-if="app.headline" class="mt-3.5 line-clamp-2 shrink-0 px-1 text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
      {{ app.headline }}
    </p>

    <!-- 2. What it does, shown: its story on a stage of its colour, or its
         picture large there. -->
    <div :class="['app-wash mt-3 flex min-h-0 flex-col rounded-2xl p-3', fill ? 'flex-1' : 'h-[44dvh]']">
      <AppStoryPlayer v-if="hasStory" :art="app.art" />
      <div v-else class="flex min-h-0 flex-1 items-center justify-center">
        <span :class="[PLATED, 'size-32 rounded-[36px]']">
          <AppArt :app-key="app.art" :play="1" class="size-24" />
        </span>
      </div>
    </div>

    <!-- 3. Its wins, three small cards, and what it is. -->
    <ul v-if="app.wins?.length" class="mt-3 grid shrink-0 grid-cols-3 gap-2">
      <li
        v-for="win in app.wins"
        :key="win.text"
        class="flex min-w-0 flex-col gap-1.5 rounded-xl bg-white p-2.5 ring-1 ring-gray-200/70 dark:bg-gray-900/50 dark:ring-white/10"
      >
        <span class="app-tint flex size-7 items-center justify-center rounded-lg app-ink">
          <component :is="win.icon" class="size-4" />
        </span>
        <span class="line-clamp-2 text-xs font-medium leading-snug text-gray-700 dark:text-gray-300">{{ win.text }}</span>
      </li>
    </ul>
    <p v-if="app.description" class="mt-2.5 line-clamp-2 shrink-0 px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ app.description }}</p>
  </div>
</template>

<style scoped>
.app-tint {
  background-color: var(--app-tint);
}
.app-wash {
  background-color: var(--app-wash);
}
.app-ink {
  color: var(--app-ink);
}
.dark .app-tint {
  background-color: var(--app-tint-dark);
}
.dark .app-wash {
  background-color: var(--app-wash-dark);
}
.dark .app-ink {
  color: var(--app-ink-dark);
}
</style>

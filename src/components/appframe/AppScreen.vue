<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from '../../icons'
import AppArt from '../common/AppArt.vue'

// One screen of an app inside Ekkly: its home, or a section one step off it.
//
// An app sits under Ekkly's top bar, which names it and leads back out, with
// the rest of Ekkly's chrome stepped aside (meta.frame: 'app', AdminLayout).
// So everything else a screen needs is here: one centred column, room at the
// foot, and on every screen but the app's home a header with a way back.
//
// The home has no header. Its first card is its header — what the app is,
// what is true today, and the way back out to Ekkly — so the screen opens on
// what you came for rather than on a bar.
//
// A section's header is the top of the screen: Ekkly's own bar steps aside one
// step into an app (AdminLayout), so this clears the phone's notch itself.
//
// The header hides as the page scrolls down and comes back the moment it
// scrolls up, so reading a long list costs nothing at the top, and the way
// back is never more than a flick away.

const props = defineProps({
  // Leave both out for an app's home.
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  // Where back goes when there is nowhere earlier in this app to return to.
  back: { type: [String, Object], default: null },
  // Every route inside this app starts with it, so back can tell a screen of
  // this app's from one somewhere else in Ekkly.
  root: { type: String, default: '' },
  // A screen that scrolls itself — a month grid, with its day and its event
  // opening beside it — rather than one long page: the screen does not
  // scroll, the header stays, and the content fills the height under it.
  fill: { type: Boolean, default: false },
  // Room for two panes side by side on a desktop, where a phone's column
  // would squeeze them. Only for a screen that has two.
  wide: { type: Boolean, default: false },
  // The drawing beside the title, by name in src/assets/app-icons. Left out,
  // it is the route's own (meta.art): each section names the drawing its tile
  // on the app's home wears, a screen further in borrows its section's, and
  // the app's own drawing stands in for a section that has none.
  art: { type: String, default: '' },
})

const column = computed(() => (props.wide ? 'max-w-5xl' : 'max-w-xl'))

const router = useRouter()
const route = useRoute()
const hasHeader = computed(() => Boolean(props.title || props.back))

// Flat, in the church's colour, the way a section's tile draws it (BRAND.md):
// a room of the app, never mistaken for the app's own glossy picture.
const headerArt = computed(() => props.art || route.meta?.art || '')

// Back returns to the screen you came from when it was one of this app's — a
// Sunday opened from My turns goes back to My turns — and otherwise to the
// screen above this one. Never as a new entry in the history: a back button
// that pushed would make the phone's own back step forward again.
const goBack = () => {
  const previous = window.history.state?.back
  if (previous && props.root && String(previous).startsWith(props.root)) router.back()
  else if (props.back) router.replace(props.back)
}

/* -------------------------------------------------------- hiding on scroll */

const scroller = ref(null)
const hidden = ref(false)
let lastY = 0

// Eight pixels either way before it moves, so a resting thumb does not set it
// flickering, and always shown near the top, where there is nothing to make
// room for.
const onScroll = () => {
  const y = scroller.value?.scrollTop || 0
  if (y < 24) {
    hidden.value = false
    lastY = y
    return
  }
  if (y - lastY > 8) {
    hidden.value = true
    lastY = y
  } else if (lastY - y > 8) {
    hidden.value = false
    lastY = y
  }
}

defineExpose({ scroller })
</script>

<template>
  <!-- An app's home (no header) is laid out to fit one screen, the way the
       home of all apps is, so it does not scroll: the bottom padding alone
       used to tip it over and let it slide. Sections are lists and scroll. -->
  <div
    ref="scroller"
    :class="[
      'h-full bg-gray-50 dark:bg-gray-900',
      fill ? 'flex flex-col overflow-hidden' : hasHeader ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
    ]"
    @scroll.passive="onScroll"
  >
    <header
      v-if="hasHeader"
      :class="[
        'sticky top-0 z-30 border-b border-gray-200/70 bg-gray-50/85 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-transform duration-300 ease-out dark:border-gray-800/70 dark:bg-gray-900/85',
        hidden ? '-translate-y-full' : '',
      ]"
      @focusin="hidden = false"
    >
      <div :class="['mx-auto flex h-16 w-full items-center gap-3 px-4', column]">
        <button
          v-if="back"
          type="button"
          class="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="Back"
          @click="goBack"
        >
          <ChevronLeft class="size-5" />
        </button>
        <!-- The tile that opened this section flies its drawing here too
             (router/viewTransitions.js). -->
        <AppArt
          v-if="headerArt"
          :app-key="headerArt"
          :play="1"
          flat
          :data-morph-icon="route.path"
          class="size-9 shrink-0 text-primary dark:text-primary-light"
        />
        <div class="min-w-0 flex-1">
          <!-- Named by its path, so the tile that opened this section can fly
               its name up into this title (router/viewTransitions.js). -->
          <h1 :data-morph-label="route.path" class="truncate text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
        </div>
        <slot name="action" />
      </div>
    </header>

    <main
      :class="[
        'mx-auto w-full px-4',
        column,
        fill ? 'flex min-h-0 flex-1 flex-col pb-[max(1rem,env(safe-area-inset-bottom))]' : 'pb-[max(3rem,env(safe-area-inset-bottom))]',
        hasHeader ? 'pt-4' : 'pt-4 sm:pt-6',
      ]"
    >
      <slot />
    </main>
  </div>
</template>

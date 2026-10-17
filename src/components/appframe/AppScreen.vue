<script setup>
import { computed, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from '../../icons'
import AppArt from '../common/AppArt.vue'
import AppRail from './AppRail.vue'
import AppCrumbs from './AppCrumbs.vue'
import { useCrumbs } from '../../composables/useCrumbs'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { interiorVars } from './churchInterior'

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
  // An app's home laid out as a board on a desktop (AppHome), the way the
  // home of all apps is: the width of the screen and its height, in panels
  // that scroll inside themselves, so the screen itself never does.
  board: { type: Boolean, default: false },
  // A section laid out for a desktop's width (a table, a grid of cards,
  // columns side by side) rather than a phone's column: there it takes the
  // room beside the rail, as wide as reads well. A phone's screen is the same.
  desk: { type: Boolean, default: false },
  // The way here, for a screen whose place is not its section's: [{ label,
  // to }] after the app's name, in place of the section (a session is in its
  // group, not in Sessions). Left out, the trail is read off the routes.
  trail: { type: Array, default: null },
})

// The lists on a desktop's screen (ListGroup) lay their rows out as cards
// across its width rather than one long column down the middle of it.
provide('appScreenDesk', computed(() => props.desk))

const column = computed(() => {
  if (props.board) return 'max-w-xl lg:h-full lg:max-w-[112rem] lg:px-6 lg:pt-5 lg:pb-5'
  if (props.desk) return `${props.wide ? 'max-w-5xl' : 'max-w-xl'} lg:max-w-[90rem] lg:px-8`
  return props.wide ? 'max-w-5xl' : 'max-w-xl'
})

const router = useRouter()
const route = useRoute()
const hasHeader = computed(() => Boolean(props.title || props.back))

/* ------------------------------------------------------------ the trail */

// Two steps or more into an app on a desktop, the way here over the title
// (AppCrumbs, useCrumbs). The header grows a line for it.
const desktop = useMediaQuery('(min-width: 1024px)')
const crumbs = useCrumbs(() => props.trail)
const withTrail = computed(() => hasHeader.value && desktop.value && crumbs.value.length > 0)

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

// `hidden` too, so something at the foot of a screen can step aside on the
// same flick as the header (People's search dock, PeopleDock.vue).
defineExpose({ scroller, hidden })
</script>

<template>
  <!-- An app's home (no header) is laid out to fit one screen, the way the
       home of all apps is, so it does not scroll: the bottom padding alone
       used to tip it over and let it slide. Sections are lists and scroll.
       With the bottom bar on, though, the bar takes the foot of the screen,
       so a home that no longer fits above it scrolls rather than leave its
       last tiles under the bar. -->
  <!-- A section stands beside its app's rail on a desktop (AppRail): the way
       home to the app and every other section, down the left. The screen
       itself scrolls beside it, so the rail holds still. -->
  <div :class="hasHeader ? 'flex h-full bg-gray-50 dark:bg-gray-900' : 'contents'">
  <AppRail v-if="hasHeader" />
  <div
    ref="scroller"
    :class="[
      hasHeader ? 'min-w-0 flex-1' : '',
      // The room is drawn on an app's home only. A section is somewhere
      // things are read — a roll, a month, a record — and windows and pews
      // behind its rows pulled the eye off them, so it stands on plain ground.
      hasHeader ? 'h-full bg-gray-50 dark:bg-gray-900' : 'app-interior h-full bg-gray-50 dark:bg-gray-900',
      board ? 'app-board' : '',
      fill
        ? 'flex flex-col overflow-hidden'
        : hasHeader
          ? 'overflow-y-auto overscroll-contain'
          : 'overflow-hidden with-bar:overflow-y-auto with-bar:overscroll-contain',
    ]"
    :style="[interiorVars, { '--screen-head': hasHeader && !hidden ? (withTrail ? '5rem' : '4rem') : '0px' }]"
    @scroll.passive="onScroll"
  >
    <!-- The way back and the screen's name are for the screen, never the
         paper: a printed session report starts with the report. -->
    <header
      v-if="hasHeader"
      :class="[
        'no-print sticky top-0 z-30 border-b border-gray-200/70 bg-gray-50/85 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-transform duration-300 ease-out dark:border-gray-800/70 dark:bg-gray-900/85',
        hidden ? '-translate-y-full' : '',
      ]"
      @focusin="hidden = false"
    >
      <div :class="['mx-auto flex w-full items-center gap-3 px-4', withTrail ? 'h-20' : 'h-16', column]">
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
             (router/viewTransitions.js), and it lands as the tile wore it: in
             full colour. It used to be flattened into the accent here, so the
             drawing changed colour on the way from the tile to the header. -->
        <AppArt
          v-if="headerArt"
          :app-key="headerArt"
          :play="1"
          :data-morph-icon="route.path"
          class="size-9 shrink-0"
        />
        <div class="min-w-0 flex-1">
          <AppCrumbs v-if="withTrail" :trail="trail" class="mb-0.5" />
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

    <!-- The screen runs to the foot of the phone, behind the bottom bar when
         someone has it on, so the foot of the column clears the bar
         (--bottom-bar-space, 0 without one): the last row of a list scrolls
         up past it, and a screen that fills the height ends above it. -->
    <main
      :class="[
        'mx-auto w-full px-4',
        column,
        fill
          ? 'flex min-h-0 flex-1 flex-col pb-[max(1rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+0.5rem))]'
          : 'pb-[max(3rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+1.5rem))]',
        hasHeader ? 'pt-4' : 'pt-4 sm:pt-6',
      ]"
    >
      <slot />
    </main>
  </div>
  </div>
</template>

<style scoped>
/* Inside the church (churchInterior.js): its windows high on the back wall,
   a little below the top so a short list does not hide them, no wider than a
   phone's column so a desktop does not blow them up, and its pews along the
   foot. A scrolling element's own background stays where it is while the
   list moves over it, so the room holds still under a scroll. */
.app-interior {
  background-image: var(--interior-windows), var(--interior-pews);
  background-repeat: no-repeat;
  background-position:
    center 38%,
    center bottom;
  background-size:
    min(100%, 30rem) auto,
    min(100%, 42rem) auto;
}

.dark .app-interior {
  background-image: var(--interior-windows-dark), var(--interior-pews-dark);
}

/* A desktop's board (AppHome) covers the room with its panels, and what
   showed of it between them read as something broken, not as a room: there,
   the ground is plain. */
@media (min-width: 64rem) {
  .app-interior.app-board,
  .dark .app-interior.app-board {
    background-image: none;
  }
}

/* On paper a report is the page, with nothing behind it. */
@media print {
  .app-interior {
    background-image: none;
  }
}
</style>

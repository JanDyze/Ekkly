<script setup>
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import AppRail from './AppRail.vue'
import { nameThisScreen } from '../../composables/useTrail'
import { interiorVars } from './churchInterior'
import { useSimpleView } from '../../composables/useSimpleView'

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
// A section's header sits under Ekkly's own bar, which stays on every screen
// of an app with the trail of how deep you are (Topbar, useTrail). The
// header still names the section in full and goes up one level; the bar's
// trail goes up to any level at once.
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
  // An app's home on plain ground, without the church's room behind it: for
  // a home that is a working list rather than a launcher (Tickets), where the
  // windows and pews behind its rows pulled the eye off them as on a section.
  plain: { type: Boolean, default: false },
  // A section laid out for a desktop's width (a table, a grid of cards,
  // columns side by side) rather than a phone's column: there it takes the
  // room beside the rail, as wide as reads well. A phone's screen is the same.
  desk: { type: Boolean, default: false },
  // The way here, for a screen whose place is not its section's: [{ label,
  // to }] after the app's name, in place of the section (a session is in its
  // group, not in Sessions). Left out, the trail is read off the routes.
  trail: { type: Array, default: null },
  // The app's rail beside a section on a desktop. Off for a screen opened by
  // someone who may not go into the app's sections (their own record, when
  // they may not see the roll), where every door on it would be refused.
  rail: { type: Boolean, default: true },
})

// The lists on a desktop's screen (ListGroup) lay their rows out as cards
// across its width rather than one long column down the middle of it.
// In simple view the sidebar (SimpleSidebar) lists every app and the open
// one's sections, so the rail beside a section steps aside, in every app.
const { simpleView: simple } = useSimpleView()
const desk = computed(() => props.desk)
provide('appScreenDesk', desk)

const column = computed(() => {
  if (props.board) return 'max-w-xl lg:h-full lg:max-w-[112rem] lg:px-6 lg:pt-5 lg:pb-5'
  if (desk.value) return `${props.wide ? 'max-w-5xl' : 'max-w-xl'} lg:max-w-[90rem] lg:px-8`
  return props.wide ? 'max-w-5xl' : 'max-w-xl'
})

const route = useRoute()
const hasHeader = computed(() => Boolean(props.title || props.back))

/* ------------------------------------------------------------ the trail */

// The way here is the top bar's (useTrail): Home › People › Ministries ›
// Worship, at every size. It used to be a line over this header's title on a
// desktop, two steps in; with the bar on every screen of an app that said it
// twice. This screen gives the bar its name — a section's title, or a
// record's (a ministry, an album, a Sunday) once it has loaded — and, where
// its place is not its section's, the way to it.
nameThisScreen(
  () => (hasHeader.value ? props.title : ''),
  () => props.trail
)

// Flat, in the church's colour, the way a section's tile draws it (BRAND.md):
// a room of the app, never mistaken for the app's own glossy picture.
const headerArt = computed(() => props.art || route.meta?.art || '')

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
  <AppRail v-if="hasHeader && rail && !simple" />
  <!-- The page never scrolls; what is in it does. The header (the way back,
       the name, the screen's buttons) stands outside what scrolls, so it is
       always where it was left, and only the content under it moves. It used
       to scroll with the page and tuck itself away going down, which made
       the whole screen move to read a list. -->
  <div
    :class="[
      'flex h-full flex-col overflow-hidden',
      hasHeader ? 'min-w-0 flex-1' : '',
      // The room is drawn on an app's home only. A section is somewhere
      // things are read — a roll, a month, a record — and windows and pews
      // behind its rows pulled the eye off them, so it stands on plain ground.
      hasHeader || plain ? 'bg-gray-50 dark:bg-gray-900' : 'app-interior bg-gray-50 dark:bg-gray-900',
      board ? 'app-board' : '',
    ]"
    :style="[interiorVars, { '--screen-head': '0px' }]"
  >
    <!-- The way back and the screen's name are for the screen, never the
         paper: a printed session report starts with the report. -->
    <header
      v-if="hasHeader"
      class="no-print z-30 shrink-0 border-b border-gray-200/70 bg-gray-50 dark:border-gray-800/70 dark:bg-gray-900"
    >
      <div :class="['mx-auto flex h-16 w-full items-center gap-3 px-4', column]">
        <!-- No back arrow of its own: the top bar's mark, over every screen of
             an app, is the way up a level, and a second arrow under it did
             the same thing. -->
        <!-- The section's drawing, in full colour as its tile wears it. -->
        <!-- Simple view keeps it, flat in the church's colour, as its sidebar
             draws every app. -->
        <AppArt
          v-if="headerArt"
          :app-key="headerArt"
          :flat="simple"
          :class="simple ? 'size-7 shrink-0 text-primary dark:text-primary-light' : 'size-9 shrink-0'"
        />
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
        </div>
        <slot name="action" />
      </div>
    </header>

    <div
      ref="scroller"
      :class="[
        'min-h-0 flex-1',
        fill
          ? 'flex flex-col overflow-hidden'
          : hasHeader
            ? 'overflow-y-auto overscroll-contain'
            : 'overflow-hidden with-bar:overflow-y-auto with-bar:overscroll-contain',
      ]"
      @scroll.passive="onScroll"
    >
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

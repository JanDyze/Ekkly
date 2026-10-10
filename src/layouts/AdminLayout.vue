<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '../components/Topbar.vue'
import RightSidebar from '../components/RightSidebar.vue'
import BottomBar from '../components/BottomBar.vue'
import { useBottomBar } from '../composables/useBottomBar'
import { initPresence, stopPresence } from '../composables/usePresence'
import { useFocusModeValue } from '../composables/useFocusMode'

// The heartbeat belongs to the signed-in shell rather than to any one panel:
// this layout only exists while someone is authenticated, and unmounting it
// (signing out) is exactly when the presence record should disappear.
onMounted(initPresence)
onUnmounted(stopPresence)

// Focus routes drop the chrome. Between the top bar, the bottom bar and this
// layout's padding, roughly 140px of a phone screen goes to navigation — a
// fifth of the viewport, which matters when the page is a swipe deck or a
// long form.
//
// Opt-in per route rather than blanket for detail pages, because the two are
// different animals: a task has a beginning and an end and should not offer
// ways to wander off mid-way, while a page you are reading and browsing from
// still wants its navigation. A focus route must carry its own way back, or
// it strands whoever opens it.
const route = useRoute()
const { bottomBar } = useBottomBar()

// Either the whole route is a focus route, or the page on it has asked for the
// screen while it shows a record of its own (useFocusMode) - Settings does
// that for an open section on a phone.
const pageWantsFocus = useFocusModeValue()
const isFocus = computed(() => Boolean(route.meta?.focus) || pageWantsFocus.value)

// The bottom bar, for whoever turned it on, everywhere but a focus route.
const showBar = computed(() => bottomBar.value && !isFocus.value)

// The bar floats over the foot of the screen, so what is under it needs to
// know it is there. Marked on the root element rather than passed down,
// because what has to make room is everywhere - the home, every app's screens,
// their floating buttons, sheets teleported to the body - and style.css turns
// the mark into --bottom-bar-space (0 when there is no bar) for all of them.
watch(showBar, (on) => document.documentElement.toggleAttribute('data-bottom-bar', on), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-bottom-bar'))

// A page that puts up its own header does not want the app's as well: two
// stacked bars, the top one saying "Bible" over a row already saying "Juan 3".
// Narrower than `focus` on purpose — the sidebar and the bottom bar stay, so
// the page is still somewhere you browse from rather than a task you finish.
const hidesTopbar = computed(() => Boolean(route.meta?.hideTopbar))

// An app inside Ekkly (src/components/appframe/) has its own home and its own
// way between its sections, so Ekkly's sidebar, bottom bar and people rail
// step aside — around it they would be a second set of everything. The top
// bar stays: it names the app, and it is the way back out to the rest of
// Ekkly (Topbar.vue turns its mark into a back arrow inside an app).
const isApp = computed(() => route.matched.some((record) => record.meta?.frame === 'app'))
const bare = computed(() => isFocus.value || isApp.value)

// The home of all apps lays itself out, edge to edge, like an app's home.
const isRoot = computed(() => Boolean(route.meta?.root))

// Only on an app's home, though. One step into it — a section, a Sunday — the
// screen has its own header with its own back arrow, and a second bar above it
// leading out of the whole app is one way back too many: the section's arrow
// goes up a level, and the app's home is where you leave from.
const inAppSection = computed(() => isApp.value && Number(route.meta?.depth) >= 1)

// Pages kept in memory after you leave them, by component name (the file's
// name). Only lists that open a record as its own page belong here - it costs
// memory to keep one, and a page kept alive must cope with being shown again
// rather than mounted afresh (see useTitleCount and useListScrollMemory).
const KEPT_ALIVE = ['PeopleEveryone']
</script>

<template>
  <div class="flex h-dvh bg-gray-50 dark:bg-gray-900 print-root">
    <!-- No sidebar: every app is a screen of its own, and the home of all
         apps (/home, Apps.vue) is the way between them. The top bar's mark
         leads back to it from everywhere else. A bottom bar is there only for
         whoever turned it on in Preferences (useBottomBar). -->
    <!-- Main content area -->
    <div class="flex-1 min-w-0 flex flex-col overflow-hidden lg:ml-0 print-main">
      <!-- Topbar. Hidden, not removed, on a focus route (and the rail below
           with it): each opens listeners and builds a fair
           amount of screen when it mounts, and tearing them down to open a
           record meant rebuilding all three on the way back - the lag between
           pressing back and the list sliding in. A wrapper does the hiding,
           because v-show needs one root element and these have several;
           display: contents leaves the layout as if it were not there. -->
      <div v-show="!isFocus && !hidesTopbar && !inAppSection" class="contents">
        <Topbar />
      </div>

      <!-- Main content, the full height of the screen on a phone too. An
           ordinary page ends above the bottom bar, so nothing in it can end
           up behind the bar, while the page's own surface carries on under
           the floating island. Inside, the bar's space is set back to 0: the
           page has already been given it, and its own floating buttons and
           scrolling areas would otherwise make room twice. The home and an
           app's screens run to the foot of the screen behind the bar and make
           room for it themselves (style.css, --bottom-bar-space). -->
      <!-- data-morph-page: where a page appears, so a tapped card can grow
           into it and the page shrink back into its card (the card becoming the page in
           router/viewTransitions.js). -->
      <main data-morph-page :class="['flex-1 overflow-hidden bg-white dark:bg-gray-900 print-main', bare || isRoot ? '' : 'pb-(--bottom-bar-space)']">
        <!-- A focus route gets the raw box and handles its own padding and
             safe areas: the deck should reach the edges of the screen. -->
        <div :class="['h-full print-main', bare || isRoot ? '' : 'p-0 sm:p-4 lg:px-8 lg:py-3 [--bottom-bar-space:0px]']">
          <!-- The lists you open records from stay built while a record is
               open, so back is a re-show rather than a rebuild: every row,
               every photo, the search, the sort and the scroll are where they
               were left. -->
          <router-view v-slot="{ Component }">
            <KeepAlive :include="KEPT_ALIVE">
              <component :is="Component" />
            </KeepAlive>
          </router-view>
        </div>
      </main>

      <!-- It floats over the foot of the screen, and what is under it makes
           room (data-bottom-bar above), so a page ends above the bar rather
           than behind it. Not on a focus route: that is a task, with its own
           way out. -->
      <BottomBar v-if="showBar" />
    </div>

    <!-- People rail - wide screens; a drawer everywhere else. A focus route
         is a task, so the live presence list sits it out too. -->
    <div v-show="!bare" class="contents">
      <RightSidebar />
    </div>
  </div>
</template>

<style scoped>
/* Layout styles handled by Tailwind */
</style>

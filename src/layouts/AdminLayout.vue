<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
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

      <!-- Main content, the full height of the screen on a phone too. -->
      <main class="flex-1 overflow-hidden bg-white dark:bg-gray-900 print-main">
        <!-- A focus route gets the raw box and handles its own padding and
             safe areas: the deck should reach the edges of the screen. -->
        <div :class="['h-full print-main', bare || isRoot ? '' : 'p-0 sm:p-4 lg:px-8 lg:py-3']">
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

      <!-- At the foot of the column rather than floating over it, so every
           page simply ends above it and nothing is hidden behind it. Not on
           a focus route: that is a task, with its own way out. -->
      <BottomBar v-if="bottomBar && !isFocus" />
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

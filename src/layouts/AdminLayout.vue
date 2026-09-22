<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '../components/Topbar.vue'
import Sidebar from '../components/Sidebar.vue'
import RightSidebar from '../components/RightSidebar.vue'
import BottomBar from '../components/BottomBar.vue'
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

// Pages kept in memory after you leave them, by component name (the file's
// name). Only lists that open a record as its own page belong here - it costs
// memory to keep one, and a page kept alive must cope with being shown again
// rather than mounted afresh (see useTitleCount and useListScrollMemory).
const KEPT_ALIVE = ['Members']
</script>

<template>
  <div class="flex h-dvh bg-gray-50 dark:bg-gray-900 print-root">
    <!-- Sidebar - Desktop only -->
    <Sidebar />

    <!-- Main content area -->
    <div class="flex-1 min-w-0 flex flex-col overflow-hidden lg:ml-0 print-main">
      <!-- Topbar. Hidden, not removed, on a focus route (and the rail and
           bottom bar below with it): each opens listeners and builds a fair
           amount of screen when it mounts, and tearing them down to open a
           record meant rebuilding all three on the way back - the lag between
           pressing back and the list sliding in. A wrapper does the hiding,
           because v-show needs one root element and these have several;
           display: contents leaves the layout as if it were not there. -->
      <div v-show="!isFocus && !hidesTopbar" class="contents">
        <Topbar />
      </div>

      <!-- Main content, the full height of the screen on a phone too. The
           bottom bar floats over the page rather than taking a band of the
           screen off it: it is a frosted island with the page visible round
           and through it, and reserving space under it would leave an empty
           strip that the island only covers part of. -->
      <main class="flex-1 overflow-hidden bg-white dark:bg-gray-900 print-main">
        <!-- A focus route gets the raw box and handles its own padding and
             safe areas: the deck should reach the edges of the screen. -->
        <div :class="['h-full print-main', isFocus ? '' : 'p-0 sm:p-4 lg:px-8 lg:py-3']">
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
    </div>

    <!-- People rail - wide screens; a drawer everywhere else. A focus route
         is a task, so the live presence list sits it out too. -->
    <div v-show="!isFocus" class="contents">
      <RightSidebar />
    </div>

    <!-- Bottom Bar - Mobile only -->
    <div v-show="!isFocus" class="contents">
      <BottomBar />
    </div>
  </div>
</template>

<style scoped>
/* Layout styles handled by Tailwind */
</style>

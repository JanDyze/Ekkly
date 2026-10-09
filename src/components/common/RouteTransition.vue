<script setup>
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

/**
 * A thin bar along the top of the screen, while a page is on its way.
 *
 * Every view in the router is a dynamic import, so the first visit to any of
 * them is a chunk fetch — on the mobile data this app is mostly used on, long
 * enough that a tap seems to have done nothing. This says that it did.
 *
 * It used to be a curtain: the church's mark over the whole screen in Ekkly's
 * navy. That covered the wait, but it also dropped a screen of its own between
 * every slow page and the next, which read as the app stumbling rather than
 * moving. A bar leaves the page that was tapped on in place, under the finger,
 * until the next one slides in over it (router/viewTransitions.js).
 *
 * It only appears for a navigation that is actually slow. A chunk the browser
 * already has swaps in a few milliseconds, and a bar flickering over that is
 * noise — so it is armed on every navigation and shown by few of them.
 */

const router = useRouter()

// How long a navigation has to be taking before the bar is shown. Short, now
// that what it shows is a line rather than a curtain: a tap that has done
// nothing visible for a fifth of a second already feels missed.
const SHOW_AFTER = 180

// 'idle' → 'loading' (creeping towards the end, never reaching it) →
// 'done' (runs to the end and fades) → 'idle'.
const state = ref('idle')
let showTimer = null
let doneTimer = null

const stopTimers = () => {
  clearTimeout(showTimer)
  clearTimeout(doneTimer)
}

const stopBefore = router.beforeEach((to, from) => {
  // The projector window takes nothing of ours over it — it is on a second
  // screen in front of a congregation.
  if (to.meta?.projector || from.meta?.projector) return true

  // The first navigation of the session is covered by index.html's boot
  // screen, which clears only when Vue mounts. `matched` is empty only for
  // the router's start location.
  if (!from.matched.length) return true

  // Only a real change of page. A view that writes its search or its open tab
  // into the query string navigates constantly.
  if (to.path === from.path) return true

  stopTimers()
  showTimer = setTimeout(() => {
    state.value = 'loading'
  }, SHOW_AFTER)
  return true
})

// afterEach, not a watcher on the route: it fires for a redirected, cancelled
// or failed navigation too, so nothing can leave the bar running.
const stopAfter = router.afterEach(() => {
  // A navigation that finished inside the wait never shows the bar at all.
  clearTimeout(showTimer)
  if (state.value !== 'loading') return
  state.value = 'done'
  doneTimer = setTimeout(() => {
    state.value = 'idle'
  }, 360)
})

onUnmounted(() => {
  stopTimers()
  stopBefore()
  stopAfter()
})
</script>

<template>
  <!-- aria-hidden: the navigation announces itself through the page that
       arrives. pointer-events off, so it can never swallow a tap. -->
  <div v-if="state !== 'idle'" :class="['rt', `rt-${state}`]" aria-hidden="true">
    <div class="rt-bar"></div>
    <div class="rt-bar rt-finish"></div>
  </div>
</template>

<style scoped>
.rt {
  position: fixed;
  top: env(safe-area-inset-top, 0px);
  left: 0;
  right: 0;
  height: 2.5px;
  /* Over the app and its sheets, under the toasts (9999) and the theme
     reveal. */
  z-index: 9000;
  pointer-events: none;
  overflow: hidden;
}

.rt-bar {
  height: 100%;
  width: 100%;
  background: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary);
  border-radius: 0 999px 999px 0;
  transform-origin: left;
  transform: scaleX(0);
}

/* Quick to start, then slower and slower, so a long wait still looks like
   progress without the bar ever claiming to be finished. It holds where it
   got to once the page arrives… */
.rt .rt-bar {
  animation: rt-creep 8s cubic-bezier(0.1, 0.7, 0.2, 1) forwards;
}

.rt-done .rt-bar {
  animation-play-state: paused;
}

/* …and a second fill sweeps out over it to the end, as the whole line fades.
   A second fill rather than a transition on the first, because a transition
   cannot start from wherever an animation happened to leave off. */
.rt .rt-finish {
  position: absolute;
  inset: 0;
  animation: none;
}

.rt-done .rt-finish {
  animation: rt-finish 0.2s ease-out forwards;
}

.rt-done {
  animation: rt-fade 0.36s ease-out forwards;
}

@keyframes rt-finish {
  to {
    transform: scaleX(1);
  }
}

@keyframes rt-creep {
  from {
    transform: scaleX(0);
  }
  10% {
    transform: scaleX(0.35);
  }
  to {
    transform: scaleX(0.9);
  }
}

@keyframes rt-fade {
  0%,
  45% {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rt .rt-bar {
    animation: none;
    transform: scaleX(0.6);
  }
}
</style>

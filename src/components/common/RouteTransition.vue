<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppSettings } from '../../composables/useAppSettings'
import AnimatedMark from './AnimatedMark.vue'

/**
 * The church's mark, over the gap between one page and the next.
 *
 * Every view in the router is a dynamic import, so the first visit to any of
 * them is a chunk fetch — on the mobile data this app is mostly used on, long
 * enough to leave the screen holding the page the user has already left. This
 * fills that gap with the logo instead of nothing.
 *
 * It shows the church's own logo (Ekkly's mark until one is uploaded) with a
 * soft pulse, where it used to loop a clip cut from UEC's logo animation — a
 * clip only one congregation's logo could have.
 *
 * The curtain is deliberately short, and it is not waiting for the navigation
 * — the new page renders underneath it and is ready before it lifts. Its whole
 * job is to make the swap read as one movement rather than a flicker.
 */

const router = useRouter()
// A church with a logo of its own sees it breathing; one without sees Ekkly's
// window light up pane by pane.
const { logoUrl, hasCustomLogo } = useAppSettings()

// How long the mark holds once a navigation starts. Short enough that a member
// clicking through the sidebar is not waiting on it, long enough that the logo
// registers as a logo rather than a flash. If it ever wears out its welcome,
// the gentler setting is to show it only when a navigation is genuinely slow:
// start a ~100ms timer in the guard below and show from that instead, so a
// warm, already-fetched chunk swaps with no curtain at all.
const HOLD = 420

const active = ref(false)
let holdTimer = null

// The mark is only in the DOM while the curtain is down, so without this the
// browser would not begin fetching it until the first navigation — and the
// first curtain, the one covering the slowest chunk fetch of the session,
// would be the one with nothing on it. Warmed when the browser is idle, so it
// never competes with the work of getting the first page up.
onMounted(() => {
  const warm = () => {
    new Image().src = logoUrl.value
  }
  if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 3000 })
  else setTimeout(warm, 1500)
})

const stopBefore = router.beforeEach((to, from) => {
  // The projector window takes nothing of ours over it — it is on a second
  // screen in front of a congregation, and a logo swelling over a hymn is
  // exactly the interruption that route's meta exists to prevent.
  if (to.meta?.projector || from.meta?.projector) return true

  // Only a real change of page. A view that writes its search or its open tab
  // into the query string navigates constantly, and curtaining every keystroke
  // would make the app feel like it were fighting the user.
  if (to.path === from.path) return true

  // Anyone who has asked their system to stop animating things gets the swap
  // plain, the same bargain PullToRefresh strikes with its spin.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true

  clearTimeout(holdTimer)
  active.value = true
  return true
})

// afterEach, not a watcher on the route: it fires for a redirected, cancelled
// or failed navigation too, so a guard that bounces the user — or a chunk that
// fails to load — cannot leave the curtain down over the app.
const stopAfter = router.afterEach(() => {
  if (!active.value) return
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    active.value = false
  }, HOLD)
})

onUnmounted(() => {
  clearTimeout(holdTimer)
  stopBefore()
  stopAfter()
})
</script>

<template>
  <!-- aria-hidden: the navigation announces itself through the page that
       arrives. pointer-events stay off throughout — a curtain that could
       swallow a tap is one that can strand someone if it ever fails to lift. -->
  <Transition name="rt">
    <div v-if="active" class="rt" aria-hidden="true">
      <img v-if="hasCustomLogo" :src="logoUrl" alt="" class="rt-mark" />
      <AnimatedMark v-else class="rt-anim" />
    </div>
  </Transition>
</template>

<style scoped>
.rt {
  position: fixed;
  inset: 0;
  /* Over the app and its sheets, under the toasts (9999) and the theme
     reveal — a toast that lands mid-navigation still has something to say. */
  z-index: 9000;
  display: grid;
  place-items: center;
  pointer-events: none;
  /* Ekkly's navy rather than a flat black, so the curtain belongs to this app
     rather than to the browser. Not quite opaque: the page underneath stays
     faintly legible, which keeps it reading as a transition rather than as a
     screen of its own. */
  background: rgba(15, 28, 77, 0.94);
}

:global(.dark) .rt {
  background: rgba(17, 24, 39, 0.94);
}

/* A flat logo fills its box, where the old clip drew inside a margin of its
   own, so the box is smaller than it was. A slow breath while it holds. */
.rt-mark {
  width: 4.5rem;
  height: 4.5rem;
  object-fit: contain;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.35));
  animation: rt-breathe 1.6s ease-in-out infinite;
}

@media (min-width: 640px) {
  .rt-mark {
    width: 5.5rem;
    height: 5.5rem;
  }
}

.rt-anim {
  width: 5.5rem;
  height: 5.5rem;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.35));
}

@media (min-width: 640px) {
  .rt-anim {
    width: 6.5rem;
    height: 6.5rem;
  }
}

@keyframes rt-breathe {
  50% {
    transform: scale(1.06);
  }
}

/* In fast, out slower: the curtain should arrive before the eye notices the
   old page has gone, and leave slowly enough to hand over to the new one. */
.rt-enter-active {
  transition: opacity 0.12s ease-out;
}

.rt-leave-active {
  transition: opacity 0.22s ease-in;
}

.rt-enter-from,
.rt-leave-to {
  opacity: 0;
}

.rt-enter-active .rt-mark {
  animation: rt-settle 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes rt-settle {
  from {
    transform: scale(0.92);
    opacity: 0;
  }
}
</style>

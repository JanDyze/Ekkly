<script>
// Counted across every copy on the page, for the names below.
let copies = 0
</script>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

// One app's artwork, drawn into the page rather than loaded as an image, so its
// parts can move: a check drawing itself, a star arriving, coins stacking.
//
// Each animation plays once, whenever `play` changes — the icon coming on as
// the page scrolls to it, the pointer arriving, the app being opened. Nothing
// loops, and before the first play (or for anyone who asks for less motion)
// the picture simply shows finished.
//
// The SVGs come from src/assets/app-icons (brand/ekkly/make-app-icons.mjs), and
// every moving part carries an `a-…` class; the motions are defined below.

const props = defineProps({
  appKey: { type: String, required: true },
  // Change it (a counter works) to play the animation again.
  play: { type: Number, default: 0 },
})

const RAW = import.meta.glob('../../assets/app-icons/*.svg', { query: '?raw', import: 'default', eager: true })

// Several of these share a page, and each one's gradients and clips are named
// o, b, c… — the first on the page would win for all of them. Every copy gets
// names of its own.
const prefix = `art${++copies}-`

const markup = computed(() => {
  const raw = RAW[`../../assets/app-icons/${props.appKey}.svg`] || RAW['../../assets/app-icons/ai.svg'] || ''
  return raw
    .replace(/<svg /, '<svg aria-hidden="true" focusable="false" ')
    .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
})

// Off, then on again a frame later, so the same animation can play twice.
const playing = ref(false)
watch(
  () => props.play,
  async (value) => {
    if (!value) return
    playing.value = false
    await nextTick()
    requestAnimationFrame(() => (playing.value = true))
  },
  // A picture that mounts already asked to play — an app just opened — plays.
  { immediate: true }
)
</script>

<template>
  <span :class="['app-art', `app-art-${appKey}`, { playing }]" v-html="markup"></span>
</template>

<style>
/* Not scoped: the SVG is drawn with v-html, which scoped styles do not reach.
   Everything is under .app-art, so none of it leaks. */
.app-art {
  display: block;
  line-height: 0;
}

.app-art svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Parts scale and turn about their own middle. */
.app-art [class^='a-'],
.app-art [class*=' a-'] {
  transform-box: fill-box;
  transform-origin: center;
}

.app-art {
  --art-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --art-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* A line drawing itself. */
.app-art .a-draw {
  stroke-dasharray: 1;
}

.app-art.playing .a-draw {
  animation: art-draw 0.5s var(--art-ease) calc(0.15s + var(--i, 0) * 0.12s) both;
}

@keyframes art-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Something arriving with a little give. */
.app-art.playing .a-pop {
  animation: art-pop 0.5s var(--art-spring) calc(0.05s + var(--i, 0) * 0.12s) both;
}

@keyframes art-pop {
  from {
    opacity: 0;
    scale: 0.55;
  }
}

/* People stepping out from behind. */
.app-art.playing .a-left {
  animation: art-from-right 0.5s var(--art-ease) 0.18s both;
}

.app-art.playing .a-right {
  animation: art-from-left 0.5s var(--art-ease) 0.18s both;
}

@keyframes art-from-right {
  from {
    opacity: 0;
    translate: 8px 0;
  }
}

@keyframes art-from-left {
  from {
    opacity: 0;
    translate: -8px 0;
  }
}

/* A calendar's days, one after another, then the one that matters. */
.app-art.playing .a-cell {
  animation: art-cell 0.3s var(--art-ease) calc(var(--i, 0) * 0.06s) both;
}

@keyframes art-cell {
  from {
    opacity: 0;
    scale: 0.5;
  }
}

.app-art.playing .a-day {
  animation: art-pop 0.45s var(--art-spring) 0.35s both;
}

/* A gear, turning to a stop. Half a turn rather than a full one: a whole
   revolution on an eight-toothed gear ends exactly where it started, which
   reads as a glitch rather than as a turn. */
.app-art.playing .a-spin {
  animation: art-spin 0.8s var(--art-ease) both;
}

@keyframes art-spin {
  from {
    rotate: -180deg;
  }
}

/* A star, turning as it lands. */
.app-art.playing .a-star {
  animation: art-star 0.6s var(--art-spring) 0.1s both;
}

@keyframes art-star {
  from {
    opacity: 0;
    scale: 0.2;
    rotate: -60deg;
  }
}

/* Lines being written, left to right. */
.app-art .a-line {
  transform-origin: left center;
}

.app-art.playing .a-line {
  animation: art-line 0.35s var(--art-ease) calc(0.1s + var(--i, 0) * 0.11s) both;
}

@keyframes art-line {
  from {
    scale: 0 1;
  }
}

/* Something dropped into place. */
.app-art.playing .a-drop {
  animation: art-drop 0.5s var(--art-spring) calc(0.1s + var(--i, 0) * 0.13s) both;
}

@keyframes art-drop {
  from {
    opacity: 0;
    translate: 0 -10px;
  }
}

/* The Bible's ribbon, falling from the top. */
.app-art .a-ribbon {
  transform-origin: top center;
}

.app-art.playing .a-ribbon {
  animation: art-ribbon 0.4s var(--art-ease) 0.45s both;
}

@keyframes art-ribbon {
  from {
    scale: 1 0;
  }
}

/* A pencil coming down to write. */
.app-art.playing .a-write {
  animation: art-write 0.55s var(--art-ease) both;
}

@keyframes art-write {
  from {
    opacity: 0;
    translate: 0 -8px;
  }
}

/* Light coming out around something. */
.app-art.playing .a-ray {
  animation: art-ray 0.35s var(--art-ease) calc(0.35s + var(--i, 0) * 0.07s) both;
}

@keyframes art-ray {
  from {
    opacity: 0;
    scale: 0.2;
  }
}

/* The sun rising over hills that settle first. */
.app-art.playing .a-hills {
  animation: art-hills 0.45s var(--art-ease) both;
}

.app-art.playing .a-sun {
  animation: art-sun 0.7s var(--art-ease) 0.2s both;
}

@keyframes art-hills {
  from {
    translate: 0 8px;
  }
}

@keyframes art-sun {
  from {
    opacity: 0;
    translate: 0 16px;
  }
}

/* Two links coming together, along their own line. */
.app-art.playing .a-join-left {
  animation: art-join-left 0.45s var(--art-spring) 0.05s both;
}

.app-art.playing .a-join-right {
  animation: art-join-right 0.45s var(--art-spring) 0.05s both;
}

@keyframes art-join-left {
  from {
    translate: -7px 0;
  }
}

@keyframes art-join-right {
  from {
    translate: 7px 0;
  }
}

/* A single blink. */
.app-art.playing .a-blink {
  animation: art-blink 0.36s ease-in-out 0.55s both;
}

@keyframes art-blink {
  50% {
    scale: 1 0.1;
  }
}

/* A speech bubble opening from where it points, and its dots, one by one. */
.app-art .a-bubble {
  transform-origin: 15% 100%;
}

.app-art.playing .a-bubble {
  animation: art-pop 0.45s var(--art-spring) 0.15s both;
}

.app-art.playing .a-dot {
  animation: art-cell 0.25s var(--art-ease) calc(0.5s + var(--i, 0) * 0.12s) both;
}

@media (prefers-reduced-motion: reduce) {
  .app-art.playing [class^='a-'],
  .app-art.playing [class*=' a-'] {
    animation: none !important;
  }
}
</style>
